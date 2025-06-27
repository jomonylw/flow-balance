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
    const { name, categoryId, description, color, currencyId } = body

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
    if (currencyId !== undefined && currencyId !== existingAccount.currencyId) {
      // 检查账户是否有交易记录
      const hasTransactions = existingAccount.transactions.length > 0

      if (hasTransactions) {
        return errorResponse('账户已有交易记录，无法更换货币', 400)
      }

      // 货币是必填的，不能设置为空
      if (!currencyId) {
        return errorResponse('账户货币不能为空', 400)
      }

      // 验证货币是否存在且用户有权使用
      const currency = await prisma.currency.findFirst({
        where: {
          id: currencyId,
          OR: [
            { createdBy: user.id }, // 用户自定义货币
            { createdBy: null }, // 全局货币
          ],
        },
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

    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: {
        name,
        categoryId: categoryId || existingAccount.categoryId,
        currencyId: currencyId || existingAccount.currencyId,
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
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    console.log(`[DELETE ACCOUNT] 开始删除账户，ID: ${accountId}`)

    const user = await getCurrentUser()
    if (!user) {
      console.log('[DELETE ACCOUNT] 用户未授权')
      return unauthorizedResponse()
    }

    console.log(`[DELETE ACCOUNT] 用户ID: ${user.id}`)

    // 验证账户是否存在且属于当前用户
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
      include: {
        category: true,
        currency: true,
      },
    })

    if (!existingAccount) {
      console.log(
        `[DELETE ACCOUNT] 账户不存在或不属于用户，accountId: ${accountId}, userId: ${user.id}`
      )
      return notFoundResponse('账户不存在')
    }

    console.log(
      `[DELETE ACCOUNT] 找到账户: ${existingAccount.name}, 类型: ${existingAccount.category.type}`
    )

    // 检查所有可能阻止删除的关联记录
    console.log('[DELETE ACCOUNT] 开始检查关联记录...')

    const [
      transactionCount,
      transactionTemplateCount,
      recurringTransactionCount,
      loanContractCount,
      paymentLoanContractCount,
    ] = await Promise.all([
      // 检查交易记录
      prisma.transaction.count({
        where: { accountId: accountId },
      }),
      // 检查交易模板
      prisma.transactionTemplate.count({
        where: { accountId: accountId },
      }),
      // 检查定期交易
      prisma.recurringTransaction.count({
        where: { accountId: accountId },
      }),
      // 检查贷款合约（作为贷款账户）
      prisma.loanContract.count({
        where: { accountId: accountId },
      }),
      // 检查贷款合约（作为还款账户）
      prisma.loanContract.count({
        where: { paymentAccountId: accountId },
      }),
    ])

    console.log('[DELETE ACCOUNT] 关联记录统计:')
    console.log(`  - 交易记录: ${transactionCount}`)
    console.log(`  - 交易模板: ${transactionTemplateCount}`)
    console.log(`  - 定期交易: ${recurringTransactionCount}`)
    console.log(`  - 贷款合约(作为贷款账户): ${loanContractCount}`)
    console.log(`  - 贷款合约(作为还款账户): ${paymentLoanContractCount}`)

    // 收集所有阻止删除的原因
    const blockingReasons: string[] = []

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
          blockingReasons.push(
            `存在 ${otherTransactionCount} 条普通交易记录和 ${balanceAdjustmentCount} 条余额调整记录`
          )
        } else {
          blockingReasons.push(`存在 ${balanceAdjustmentCount} 条余额调整记录`)
        }
      } else {
        blockingReasons.push(`存在 ${transactionCount} 条交易记录`)
      }
    }

    if (transactionTemplateCount > 0) {
      blockingReasons.push(`存在 ${transactionTemplateCount} 个交易模板`)
    }

    if (recurringTransactionCount > 0) {
      blockingReasons.push(`存在 ${recurringTransactionCount} 个定期交易设置`)
    }

    if (loanContractCount > 0) {
      blockingReasons.push(`存在 ${loanContractCount} 个贷款合约`)
    }

    if (paymentLoanContractCount > 0) {
      blockingReasons.push(
        `被 ${paymentLoanContractCount} 个贷款合约用作还款账户`
      )
    }

    // 如果有任何阻止删除的原因，返回错误
    if (blockingReasons.length > 0) {
      const reasonText = blockingReasons.join('，')
      const errorMessage = `该账户${reasonText}，无法删除。请先删除或转移相关记录。`
      console.log(`[DELETE ACCOUNT] 删除被阻止: ${errorMessage}`)
      return errorResponse(errorMessage, 400)
    }

    // 使用事务删除账户，确保数据一致性
    console.log('[DELETE ACCOUNT] 开始删除账户...')
    await prisma.$transaction(async tx => {
      // 删除账户（由于设置了级联删除，相关的定期交易和贷款合约会自动删除）
      await tx.account.delete({
        where: { id: accountId },
      })
    })

    console.log(`[DELETE ACCOUNT] 账户删除成功: ${existingAccount.name}`)
    return successResponse(null, '账户删除成功')
  } catch (error) {
    console.error('[DELETE ACCOUNT] 删除账户时发生错误:', error)

    // 提供更详细的错误信息
    let errorMessage = '删除账户失败'
    let statusCode = 500

    if (error instanceof Error) {
      console.error('[DELETE ACCOUNT] 错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })

      // 检查是否是Prisma错误
      if (error.message.includes('Foreign key constraint')) {
        errorMessage = '删除失败：账户存在关联数据，请先删除相关记录'
        statusCode = 400
      } else if (error.message.includes('Record to delete does not exist')) {
        errorMessage = '删除失败：账户不存在'
        statusCode = 404
      } else {
        errorMessage = `删除失败：${error.message}`
      }
    }

    return errorResponse(errorMessage, statusCode)
  }
}
