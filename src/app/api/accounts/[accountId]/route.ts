import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证账户是否存在且属于当前用户
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id
      }
    })

    if (!existingAccount) {
      return notFoundResponse('账户不存在')
    }

    const body = await request.json()
    const { name, categoryId, description, color } = body

    if (!name) {
      return errorResponse('账户名称不能为空', 400)
    }

    // 如果要更改分类，验证新分类是否属于当前用户
    if (categoryId && categoryId !== existingAccount.categoryId) {
      const [currentCategory, newCategory] = await Promise.all([
        prisma.category.findFirst({
          where: {
            id: existingAccount.categoryId,
            userId: user.id
          }
        }),
        prisma.category.findFirst({
          where: {
            id: categoryId,
            userId: user.id
          }
        })
      ])

      if (!newCategory) {
        return errorResponse('目标分类不存在', 400)
      }

      // 验证账户类型是否匹配（只能在同类型分类间移动）
      if (currentCategory && currentCategory.type && newCategory.type) {
        if (currentCategory.type !== newCategory.type) {
          return errorResponse('只能在相同账户类型的分类间移动账户', 400)
        }
      }
    }

    // 检查同一用户下是否已存在同名账户（排除当前账户）
    const duplicateAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        name,
        id: { not: accountId }
      }
    })

    if (duplicateAccount) {
      return errorResponse('该账户名称已存在', 400)
    }

    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: {
        name,
        categoryId: categoryId || existingAccount.categoryId,
        description: description || null,
        color: color || null
      },
      include: {
        category: true
      }
    })

    return successResponse(updatedAccount, '账户更新成功')
  } catch (error) {
    console.error('Update account error:', error)
    return errorResponse('更新账户失败', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证账户是否存在且属于当前用户
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id
      }
    })

    if (!existingAccount) {
      return notFoundResponse('账户不存在')
    }

    // 检查账户是否有交易记录
    const transactionCount = await prisma.transaction.count({
      where: {
        accountId: accountId
      }
    })

    if (transactionCount > 0) {
      return errorResponse('该账户存在交易记录，无法删除', 400)
    }

    // 删除账户
    await prisma.account.delete({
      where: { id: accountId }
    })

    return successResponse(null, '账户删除成功')
  } catch (error) {
    console.error('Delete account error:', error)
    return errorResponse('删除账户失败', 500)
  }
}
