import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response'

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
        userId: user.id
      }
    })

    if (!existingCategory) {
      return notFoundResponse('分类不存在')
    }

    const body = await request.json()
    const { name, parentId, order } = body

    if (!name) {
      return errorResponse('分类名称不能为空', 400)
    }

    // 如果要更改父分类，验证新父分类是否属于当前用户且不是自己或自己的子分类
    if (parentId && parentId !== existingCategory.parentId) {
      if (parentId === categoryId) {
        return errorResponse('分类不能设置自己为父分类', 400)
      }

      const parentCategory = await prisma.category.findFirst({
        where: {
          id: parentId,
          userId: user.id
        }
      })

      if (!parentCategory) {
        return errorResponse('父分类不存在', 400)
      }

      // 检查是否会形成循环引用
      const isDescendant = await checkIfDescendant(categoryId, parentId)
      if (isDescendant) {
        return errorResponse('不能将分类移动到其子分类下', 400)
      }
    }

    // 检查同一父分类下是否已存在同名分类（排除当前分类）
    const duplicateCategory = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name,
        parentId: parentId || null,
        id: { not: categoryId }
      }
    })

    if (duplicateCategory) {
      return errorResponse('该分类名称已存在', 400)
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name,
        parentId: parentId || null,
        order: order !== undefined ? order : existingCategory.order
      }
    })

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
        userId: user.id
      }
    })

    if (!existingCategory) {
      return notFoundResponse('分类不存在')
    }

    // 检查分类是否有子分类
    const childrenCount = await prisma.category.count({
      where: {
        parentId: categoryId
      }
    })

    if (childrenCount > 0) {
      return errorResponse('该分类存在子分类，无法删除', 400)
    }

    // 检查分类是否有账户
    const accountCount = await prisma.account.count({
      where: {
        categoryId: categoryId
      }
    })

    if (accountCount > 0) {
      return errorResponse('该分类存在账户，无法删除', 400)
    }

    // 删除分类
    await prisma.category.delete({
      where: { id: categoryId }
    })

    return successResponse(null, '分类删除成功')
  } catch (error) {
    console.error('Delete category error:', error)
    return errorResponse('删除分类失败', 500)
  }
}

// 辅助函数：检查是否是后代分类（防止循环引用）
async function checkIfDescendant(categoryId: string, potentialAncestorId: string): Promise<boolean> {
  const descendants = await prisma.category.findMany({
    where: {
      parentId: categoryId
    }
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
