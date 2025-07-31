/**
 * 分类查询模块
 * 包含分类树查询和分类层级关系相关查询
 */

import { prisma } from '../connection-manager'
import { isPostgreSQL } from './system.queries'
import type { CategoryHierarchyMap } from '@/types/database/raw-queries'

// ============================================================================
// 分类树查询模块
// ============================================================================

/**
 * 获取分类及其所有子分类的 ID 列表（递归查询）
 * 统一处理 PostgreSQL 和 SQLite 的递归 CTE 语法差异
 *
 * @param categoryId 根分类 ID
 * @returns 包含根分类及所有子分类的 ID 数组
 */
export async function getCategoryTreeIds(
  categoryId: string
): Promise<string[]> {
  try {
    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用递归 CTE
      const result = await prisma.$queryRaw<{ id: string }[]>`
        WITH RECURSIVE category_tree AS (
          -- 基础查询：选择根分类
          SELECT id, "parentId"
          FROM categories
          WHERE id = ${categoryId}

          UNION ALL

          -- 递归查询：选择子分类
          SELECT c.id, c."parentId"
          FROM categories c
          INNER JOIN category_tree ct ON c."parentId" = ct.id
        )
        SELECT id FROM category_tree
      `
      return result.map(row => row.id)
    } else {
      // SQLite 版本：使用递归 CTE（语法略有不同）
      const result = await prisma.$queryRaw<{ id: string }[]>`
        WITH RECURSIVE category_tree AS (
          -- 基础查询：选择根分类
          SELECT id, parentId
          FROM categories
          WHERE id = ${categoryId}

          UNION ALL

          -- 递归查询：选择子分类
          SELECT c.id, c.parentId
          FROM categories c
          INNER JOIN category_tree ct ON c.parentId = ct.id
        )
        SELECT id FROM category_tree
      `
      return result.map(row => row.id)
    }
  } catch (error) {
    console.error('获取分类树 ID 失败:', error)
    throw new Error('获取分类树失败')
  }
}

/**
 * 构建分类层级关系映射
 * 一次性获取所有分类的层级关系，避免循环查询
 *
 * @param userId 用户 ID
 * @param categoryTypes 可选的分类类型过滤
 * @returns 分类层级关系映射
 */
export async function buildCategoryHierarchyMap(
  userId: string,
  categoryTypes?: string[]
): Promise<CategoryHierarchyMap> {
  try {
    // 1. 一次性获取用户的所有分类
    const whereCondition: any = { userId }
    if (categoryTypes && categoryTypes.length > 0) {
      whereCondition.type = { in: categoryTypes }
    }

    const allCategories = await prisma.category.findMany({
      where: whereCondition,
      select: {
        id: true,
        parentId: true,
      },
    })

    // 2. 构建子分类映射
    const childrenMap = new Map<string, string[]>()
    const allCategoryIds = new Set(allCategories.map(c => c.id))

    allCategories.forEach(category => {
      if (category.parentId) {
        if (!childrenMap.has(category.parentId)) {
          childrenMap.set(category.parentId, [])
        }
        const children = childrenMap.get(category.parentId)
        if (children) {
          children.push(category.id)
        }
      }
    })

    // 3. 构建后代关系映射（包含自身）
    const descendantsMap = new Map<string, string[]>()

    /**
     * 递归获取所有后代ID（内存操作，不涉及数据库查询）
     */
    const getDescendantsFromMemory = (categoryId: string): string[] => {
      const existing = descendantsMap.get(categoryId)
      if (existing) {
        return existing
      }

      const descendants = [categoryId] // 包含自身
      const children = childrenMap.get(categoryId) || []

      children.forEach(childId => {
        const childDescendants = getDescendantsFromMemory(childId)
        descendants.push(...childDescendants)
      })

      descendantsMap.set(categoryId, descendants)
      return descendants
    }

    // 为所有分类计算后代关系
    allCategories.forEach(category => {
      getDescendantsFromMemory(category.id)
    })

    return {
      childrenMap,
      descendantsMap,
      allCategoryIds,
    }
  } catch (error) {
    console.error('构建分类层级关系映射失败:', error)
    throw new Error('构建分类层级关系失败')
  }
}
