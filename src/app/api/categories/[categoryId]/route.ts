import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response'
import type { Prisma, Category, AccountType } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 获取分类详情
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
      },
      include: {
        parent: true,
        children: {
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        },
      },
    })

    if (!category) {
      return notFoundResponse('分类不存在')
    }

    return successResponse(category)
  } catch (error) {
    console.error('Get category error:', error)
    return errorResponse('获取分类失败', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证分类是否存在且属于当前用户
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
      },
    })

    if (!existingCategory) {
      return notFoundResponse('分类不存在')
    }

    const body = await request.json()
    const { name, parentId, order, type } = body

    if (!name) {
      return errorResponse('分类名称不能为空', 400)
    }

    // 如果要更改父分类，验证新父分类是否属于当前用户且不是自己或自己的子分类
    if (parentId && parentId !== existingCategory.parentId) {
      // 检查是否是顶层分类（顶层分类不允许移动）
      if (!existingCategory.parentId) {
        return errorResponse('顶层分类不允许移动', 400)
      }

      if (parentId === categoryId) {
        return errorResponse('分类不能设置自己为父分类', 400)
      }

      const parentCategory = await prisma.category.findFirst({
        where: {
          id: parentId,
          userId: user.id,
        },
      })

      if (!parentCategory) {
        return errorResponse('父分类不存在', 400)
      }

      // 检查是否会形成循环引用
      const isDescendant = await checkIfDescendant(categoryId, parentId)
      if (isDescendant) {
        return errorResponse('不能将分类移动到其子分类下', 400)
      }

      // 获取当前分类的根分类类型
      const currentRootCategory = await getRootCategory(existingCategory.id)
      const targetRootCategory = await getRootCategory(parentId)

      // 验证只能在同类型分类范围内移动
      if (currentRootCategory?.type !== targetRootCategory?.type) {
        return errorResponse('子分类只能在同类型的分类范围内移动', 400)
      }
    }

    // 检查同一父分类下是否已存在同名分类（排除当前分类）
    const duplicateCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name,
        parentId: parentId || null,
        id: { not: categoryId },
      },
    })

    if (duplicateCategory) {
      return errorResponse('该分类名称已存在', 400)
    }

    // 准备更新数据
    const updateData: Prisma.CategoryUpdateInput = {
      name,
      parent: parentId ? { connect: { id: parentId } } : { disconnect: true },
      order: order !== undefined ? order : existingCategory.order,
    }

    // 只有顶级分类可以设置账户类型
    if (!parentId && type) {
      // 如果要变更类型，检查是否安全
      if (existingCategory.type && type !== existingCategory.type) {
        const canChange = await checkTypeChangeSafety(categoryId)
        if (!canChange) {
          return errorResponse(
            '无法变更分类类型：该分类下存在账户或交易数据，变更类型会导致数据不一致',
            400
          )
        }
      }
      updateData.type = type
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
    })

    // 如果是顶级分类且更新了账户类型，需要更新所有子分类的类型
    if (!parentId && type) {
      await updateChildrenAccountType(categoryId, type)
    }

    return successResponse(updatedCategory, '分类更新成功')
  } catch (error) {
    console.error('Update category error:', error)
    return errorResponse('更新分类失败', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证分类是否存在且属于当前用户
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
      },
    })

    if (!existingCategory) {
      return notFoundResponse('分类不存在')
    }

    // 检查分类是否有子分类
    const childrenCount = await prisma.category.count({
      where: {
        parentId: categoryId,
      },
    })

    if (childrenCount > 0) {
      return errorResponse('该分类存在子分类，无法删除', 400)
    }

    // 检查分类是否有账户
    const accountCount = await prisma.account.count({
      where: {
        categoryId: categoryId,
      },
    })

    if (accountCount > 0) {
      return errorResponse('该分类存在账户，无法删除', 400)
    }

    // 删除分类
    await prisma.category.delete({
      where: { id: categoryId },
    })

    return successResponse(null, '分类删除成功')
  } catch (error) {
    console.error('Delete category error:', error)
    return errorResponse('删除分类失败', 500)
  }
}

// 辅助函数：检查是否是后代分类（防止循环引用）
async function checkIfDescendant(
  categoryId: string,
  potentialAncestorId: string
): Promise<boolean> {
  const descendants = await prisma.category.findMany({
    where: {
      parentId: categoryId,
    },
  })

  for (const descendant of descendants) {
    if (descendant.id === potentialAncestorId) {
      return true
    }
    if (await checkIfDescendant(descendant.id, potentialAncestorId)) {
      return true
    }
  }

  return false
}

// 辅助函数：获取根分类
async function getRootCategory(categoryId: string): Promise<Category | null> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  })

  if (!category) {
    return null
  }

  // 如果没有父分类，说明自己就是根分类
  if (!category.parentId) {
    return category
  }

  // 递归查找根分类
  return getRootCategory(category.parentId)
}

// 辅助函数：检查类型变更的安全性
async function checkTypeChangeSafety(categoryId: string): Promise<boolean> {
  // 获取该分类及其所有子分类的ID
  const allCategoryIds = await getAllCategoryIds(categoryId)

  // 检查是否有账户
  const accountCount = await prisma.account.count({
    where: {
      categoryId: {
        in: allCategoryIds,
      },
    },
  })

  // 检查是否有交易记录
  const transactionCount = await prisma.transaction.count({
    where: {
      accountId: {
        in: await prisma.account
          .findMany({
            where: {
              categoryId: {
                in: allCategoryIds,
              },
            },
            select: {
              id: true,
            },
          })
          .then(accounts => accounts.map(a => a.id)),
      },
    },
  })

  // 如果有账户或交易数据，则不能安全变更
  return accountCount === 0 && transactionCount === 0
}

// 辅助函数：递归获取所有子分类ID
async function getAllCategoryIds(categoryId: string): Promise<string[]> {
  const result = [categoryId]

  const children = await prisma.category.findMany({
    where: {
      parentId: categoryId,
    },
    select: {
      id: true,
    },
  })

  for (const child of children) {
    const childIds = await getAllCategoryIds(child.id)
    result.push(...childIds)
  }

  return result
}

// 辅助函数：递归更新所有子分类的账户类型
async function updateChildrenAccountType(
  parentId: string,
  accountType: AccountType
): Promise<void> {
  // 获取所有直接子分类
  const children = await prisma.category.findMany({
    where: {
      parentId: parentId,
    },
  })

  // 更新所有子分类的账户类型
  for (const child of children) {
    await prisma.category.update({
      where: { id: child.id },
      data: { type: accountType },
    })

    // 递归更新子分类的子分类
    await updateChildrenAccountType(child.id, accountType)
  }
}
