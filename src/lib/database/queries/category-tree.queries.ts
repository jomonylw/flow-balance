/**
 * 分类树查询模块 - 优化版本
 * 使用基于CTE的单次递归查询替代应用层递归，消除N+1查询问题
 */

import { prisma } from '../connection-manager'
import { isPostgreSQL } from './system.queries'
import type { Category } from '@prisma/client'

/**
 * 检查是否是后代分类（防止循环引用）- 优化版本
 * 使用CTE递归查询替代应用层递归
 */
export async function checkIfDescendantOptimized(
  categoryId: string,
  potentialAncestorId: string
): Promise<boolean> {
  try {
    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用递归 CTE
      const result = await prisma.$queryRaw<{ found: boolean }[]>`
        WITH RECURSIVE descendant_tree AS (
          -- 基础查询：选择直接子分类
          SELECT id, "parentId"
          FROM categories
          WHERE "parentId" = ${categoryId}

          UNION ALL

          -- 递归查询：选择子分类的子分类
          SELECT c.id, c."parentId"
          FROM categories c
          INNER JOIN descendant_tree dt ON c."parentId" = dt.id
        )
        SELECT EXISTS(
          SELECT 1 FROM descendant_tree 
          WHERE id = ${potentialAncestorId}
        ) as found
      `

      return result[0]?.found || false
    } else {
      // SQLite 版本：使用递归 CTE
      const result = await prisma.$queryRaw<{ found: number }[]>`
        WITH RECURSIVE descendant_tree AS (
          -- 基础查询：选择直接子分类
          SELECT id, parentId
          FROM categories
          WHERE parentId = ${categoryId}

          UNION ALL

          -- 递归查询：选择子分类的子分类
          SELECT c.id, c.parentId
          FROM categories c
          INNER JOIN descendant_tree dt ON c.parentId = dt.id
        )
        SELECT EXISTS(
          SELECT 1 FROM descendant_tree 
          WHERE id = ${potentialAncestorId}
        ) as found
      `

      return (result[0]?.found || 0) > 0
    }
  } catch (error) {
    console.error('检查后代分类失败:', error)
    throw new Error('检查分类层级关系失败')
  }
}

/**
 * 获取根分类 - 优化版本
 * 使用CTE递归查询替代应用层递归
 */
export async function getRootCategoryOptimized(
  categoryId: string
): Promise<Category | null> {
  try {
    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用递归 CTE
      const result = await prisma.$queryRaw<Category[]>`
        WITH RECURSIVE ancestor_tree AS (
          -- 基础查询：选择起始分类
          SELECT id, name, "parentId", type, "userId", "order", "createdAt", "updatedAt"
          FROM categories
          WHERE id = ${categoryId}

          UNION ALL

          -- 递归查询：选择父分类
          SELECT c.id, c.name, c."parentId", c.type, c."userId", c."order", c."createdAt", c."updatedAt"
          FROM categories c
          INNER JOIN ancestor_tree at ON c.id = at."parentId"
        )
        SELECT * FROM ancestor_tree 
        WHERE "parentId" IS NULL
        LIMIT 1
      `

      return result[0] || null
    } else {
      // SQLite 版本：使用递归 CTE
      const result = await prisma.$queryRaw<Category[]>`
        WITH RECURSIVE ancestor_tree AS (
          -- 基础查询：选择起始分类
          SELECT id, name, parentId, type, userId, "order", createdAt, updatedAt
          FROM categories
          WHERE id = ${categoryId}

          UNION ALL

          -- 递归查询：选择父分类
          SELECT c.id, c.name, c.parentId, c.type, c.userId, c."order", c.createdAt, c.updatedAt
          FROM categories c
          INNER JOIN ancestor_tree at ON c.id = at.parentId
        )
        SELECT * FROM ancestor_tree 
        WHERE parentId IS NULL
        LIMIT 1
      `

      return result[0] || null
    }
  } catch (error) {
    console.error('获取根分类失败:', error)
    throw new Error('获取根分类失败')
  }
}

/**
 * 获取分类的所有祖先分类 - 优化版本
 * 使用CTE递归查询一次性获取所有祖先
 */
export async function getCategoryAncestorsOptimized(
  categoryId: string
): Promise<Category[]> {
  try {
    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用递归 CTE，按层级排序
      const result = await prisma.$queryRaw<Category[]>`
        WITH RECURSIVE ancestor_tree AS (
          -- 基础查询：选择起始分类的父分类，层级为1
          SELECT c.id, c.name, c."parentId", c.type, c."userId", c."order", c."createdAt", c."updatedAt", 1 as level
          FROM categories c
          INNER JOIN categories start ON start.id = ${categoryId}
          WHERE c.id = start."parentId"

          UNION ALL

          -- 递归查询：选择父分类的父分类，层级+1
          SELECT c.id, c.name, c."parentId", c.type, c."userId", c."order", c."createdAt", c."updatedAt", at.level + 1
          FROM categories c
          INNER JOIN ancestor_tree at ON c.id = at."parentId"
        )
        -- 选择分类数据，并按层级从高到低排序（根在前）
        SELECT id, name, "parentId", type, "userId", "order", "createdAt", "updatedAt"
        FROM ancestor_tree
        ORDER BY level DESC
      `
      return result
    } else {
      // SQLite 版本：使用递归 CTE，按层级排序
      const result = await prisma.$queryRaw<Category[]>`
        WITH RECURSIVE ancestor_tree AS (
          -- 基础查询：选择起始分类的父分类，层级为1
          SELECT c.id, c.name, c.parentId, c.type, c.userId, c."order", c.createdAt, c.updatedAt, 1 as level
          FROM categories c
          INNER JOIN categories start ON start.id = ${categoryId}
          WHERE c.id = start.parentId

          UNION ALL

          -- 递归查询：选择父分类的父分类，层级+1
          SELECT c.id, c.name, c.parentId, c.type, c.userId, c."order", c.createdAt, c.updatedAt, at.level + 1
          FROM categories c
          INNER JOIN ancestor_tree at ON c.id = at.parentId
        )
        -- 选择分类数据，并按层级从高到低排序（根在前）
        SELECT id, name, parentId, type, userId, "order", createdAt, updatedAt
        FROM ancestor_tree
        ORDER BY level DESC
      `
      return result
    }
  } catch (error) {
    console.error('获取祖先分类失败:', error)
    throw new Error('获取祖先分类失败')
  }
}

/**
 * 获取分类的所有后代分类 - 优化版本
 * 使用CTE递归查询一次性获取所有后代
 */
export async function getCategoryDescendantsOptimized(
  categoryId: string
): Promise<Category[]> {
  try {
    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用递归 CTE
      const result = await prisma.$queryRaw<Category[]>`
        WITH RECURSIVE descendant_tree AS (
          -- 基础查询：选择直接子分类
          SELECT id, name, "parentId", type, "userId", "order", "createdAt", "updatedAt"
          FROM categories
          WHERE "parentId" = ${categoryId}

          UNION ALL

          -- 递归查询：选择子分类的子分类
          SELECT c.id, c.name, c."parentId", c.type, c."userId", c."order", c."createdAt", c."updatedAt"
          FROM categories c
          INNER JOIN descendant_tree dt ON c."parentId" = dt.id
        )
        SELECT * FROM descendant_tree 
        ORDER BY "order" ASC, name ASC
      `

      return result
    } else {
      // SQLite 版本：使用递归 CTE
      const result = await prisma.$queryRaw<Category[]>`
        WITH RECURSIVE descendant_tree AS (
          -- 基础查询：选择直接子分类
          SELECT id, name, parentId, type, userId, "order", createdAt, updatedAt
          FROM categories
          WHERE parentId = ${categoryId}

          UNION ALL

          -- 递归查询：选择子分类的子分类
          SELECT c.id, c.name, c.parentId, c.type, c.userId, c."order", c.createdAt, c.updatedAt
          FROM categories c
          INNER JOIN descendant_tree dt ON c.parentId = dt.id
        )
        SELECT * FROM descendant_tree 
        ORDER BY "order" ASC, name ASC
      `

      return result
    }
  } catch (error) {
    console.error('获取后代分类失败:', error)
    throw new Error('获取后代分类失败')
  }
}

/**
 * 获取分类的完整路径（从根到当前分类）- 优化版本
 * 使用CTE递归查询一次性获取完整路径
 */
export async function getCategoryPathOptimized(
  categoryId: string
): Promise<Category[]> {
  try {
    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用递归 CTE
      const result = await prisma.$queryRaw<(Category & { level: number })[]>`
        WITH RECURSIVE category_path AS (
          -- 基础查询：选择起始分类
          SELECT id, name, "parentId", type, "userId", "order", "createdAt", "updatedAt", 0 as level
          FROM categories
          WHERE id = ${categoryId}

          UNION ALL

          -- 递归查询：选择父分类
          SELECT c.id, c.name, c."parentId", c.type, c."userId", c."order", c."createdAt", c."updatedAt", cp.level + 1
          FROM categories c
          INNER JOIN category_path cp ON c.id = cp."parentId"
        )
        SELECT * FROM category_path 
        ORDER BY level DESC
      `

      return result.map(({ level: _level, ...category }) => category)
    } else {
      // SQLite 版本：使用递归 CTE
      const result = await prisma.$queryRaw<(Category & { level: number })[]>`
        WITH RECURSIVE category_path AS (
          -- 基础查询：选择起始分类
          SELECT id, name, parentId, type, userId, "order", createdAt, updatedAt, 0 as level
          FROM categories
          WHERE id = ${categoryId}

          UNION ALL

          -- 递归查询：选择父分类
          SELECT c.id, c.name, c.parentId, c.type, c.userId, c."order", c.createdAt, c.updatedAt, cp.level + 1
          FROM categories c
          INNER JOIN category_path cp ON c.id = cp.parentId
        )
        SELECT * FROM category_path 
        ORDER BY level DESC
      `

      return result.map(({ level: _level, ...category }) => category)
    }
  } catch (error) {
    console.error('获取分类路径失败:', error)
    throw new Error('获取分类路径失败')
  }
}

/**
 * 批量检查多个分类的层级关系 - 优化版本
 * 一次查询检查多个分类之间的关系
 */
export async function batchCheckCategoryRelationships(
  relationships: Array<{ categoryId: string; potentialAncestorId: string }>
): Promise<
  Array<{
    categoryId: string
    potentialAncestorId: string
    isDescendant: boolean
  }>
> {
  if (relationships.length === 0) {
    return []
  }

  try {
    const results: Array<{
      categoryId: string
      potentialAncestorId: string
      isDescendant: boolean
    }> = []

    // 为了简化，我们仍然逐个检查，但使用优化的单次查询
    for (const { categoryId, potentialAncestorId } of relationships) {
      const isDescendant = await checkIfDescendantOptimized(
        categoryId,
        potentialAncestorId
      )
      results.push({ categoryId, potentialAncestorId, isDescendant })
    }

    return results
  } catch (error) {
    console.error('批量检查分类关系失败:', error)
    throw new Error('批量检查分类关系失败')
  }
}
