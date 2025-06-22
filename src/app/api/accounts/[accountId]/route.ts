import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response'

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
        userId: user.id,
      },
      include: {
        currency: true,
        transactions: {
          select: { id: true },
          take: 1, // 只需要知道是否有交易记录
        },
      },
    })

    if (!existingAccount) {
      return notFoundResponse('账户不存在')
    }

    const body = await request.json()
    const { name, categoryId, description, color, currencyCode } = body

    if (!name) {
      return errorResponse('账户名称不能为空', 400)
    }

    // 如果要更改分类，验证新分类是否属于当前用户
    if (categoryId && categoryId !== existingAccount.categoryId) {
      const [currentCategory, newCategory] = await Promise.all([
        prisma.category.findFirst({
          where: {
            id: existingAccount.categoryId,
            userId: user.id,
          },
        }),
        prisma.category.findFirst({
          where: {
            id: categoryId,
            userId: user.id,
          },
        }),
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

    // 处理货币更换逻辑
    if (
      currencyCode !== undefined &&
      currencyCode !== existingAccount.currency?.code
    ) {
      // 检查账户是否有交易记录
      const hasTransactions = existingAccount.transactions.length > 0

      if (hasTransactions) {
        return errorResponse('账户已有交易记录，无法更换货币', 400)
      }

      // 货币是必填的，不能设置为空
      if (!currencyCode) {
        return errorResponse('账户货币不能为空', 400)
      }

      // 验证货币是否存在且用户有权使用（优先查找用户自定义货币）
      const currency = await prisma.currency.findFirst({
        where: {
          code: currencyCode,
          OR: [
            { createdBy: user.id }, // 用户自定义货币
            { createdBy: null }, // 全局货币
          ],
        },
        orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
      })

      if (!currency) {
        return errorResponse('指定的货币不存在', 400)
      }

      // 验证用户是否有权使用此货币
      const userCurrency = await prisma.userCurrency.findFirst({
        where: {
          userId: user.id,
          currencyId: currency.id,
          isActive: true,
        },
      })

      if (!userCurrency) {
        return errorResponse('您没有权限使用此货币，请先在货币管理中添加', 400)
      }
    }

    // 检查同一用户下是否已存在同名账户（排除当前账户）
    const duplicateAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        name,
        id: { not: accountId },
      },
    })

    if (duplicateAccount) {
      return errorResponse('该账户名称已存在', 400)
    }

    // 如果需要更新货币，先获取货币ID
    let currencyId = existingAccount.currencyId
    if (
      currencyCode !== undefined &&
      currencyCode !== existingAccount.currency.code
    ) {
      const currency = await prisma.currency.findFirst({
        where: {
          code: currencyCode,
          OR: [
            { createdBy: user.id }, // 用户自定义货币
            { createdBy: null }, // 全局货币
          ],
        },
        orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
      })
      if (currency) {
        currencyId = currency.id
      }
    }

    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: {
        name,
        categoryId: categoryId || existingAccount.categoryId,
        currencyId,
        description: description || null,
        color: color || null,
      },
      include: {
        category: true,
        currency: true,
      },
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
        userId: user.id,
      },
    })

    if (!existingAccount) {
      return notFoundResponse('账户不存在')
    }

    // 检查账户是否有交易记录
    const transactionCount = await prisma.transaction.count({
      where: {
        accountId: accountId,
      },
    })

    if (transactionCount > 0) {
      // 获取账户类型以提供更详细的错误信息
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        include: { category: true },
      })

      const accountType = account?.category?.type
      const isStockAccount =
        accountType === 'ASSET' || accountType === 'LIABILITY'

      if (isStockAccount) {
        // 检查是否只有余额调整交易
        const balanceAdjustmentCount = await prisma.transaction.count({
          where: {
            accountId: accountId,
            type: 'BALANCE',
          },
        })

        const otherTransactionCount = transactionCount - balanceAdjustmentCount

        if (otherTransactionCount > 0) {
          return errorResponse(
            `该账户存在 ${otherTransactionCount} 条普通交易记录和 ${balanceAdjustmentCount} 条余额调整记录，无法删除。请先删除相关交易记录。`,
            400
          )
        } else {
          return errorResponse(
            `该账户存在 ${balanceAdjustmentCount} 条余额调整记录，无法删除。如需删除账户，请先清空余额历史记录。`,
            400
          )
        }
      } else {
        return errorResponse(
          `该账户存在 ${transactionCount} 条交易记录，无法删除。请先删除相关交易记录。`,
          400
        )
      }
    }

    // 删除账户
    await prisma.account.delete({
      where: { id: accountId },
    })

    return successResponse(null, '账户删除成功')
  } catch (error) {
    console.error('Delete account error:', error)
    return errorResponse('删除账户失败', 500)
  }
}
