import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { getPrismaClient } from '@/lib/database/connection-manager'
import { getAccountError } from '@/lib/constants/api-messages'
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
    const existingAccount = await (
      await getPrismaClient()
    ).account.findFirst({
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
        recurringTransactions: {
          select: { id: true, description: true },
          take: 5, // 获取前几个定期交易用于错误提示
        },
        loanContracts: {
          select: { id: true, contractName: true },
          take: 5, // 获取前几个贷款合约用于错误提示
        },
        paymentLoanContracts: {
          select: { id: true, contractName: true },
          take: 5, // 获取前几个还款合约用于错误提示
        },
      },
    })

    if (!existingAccount) {
      return notFoundResponse('账户不存在')
    }

    const body = await request.json()
    const { name, categoryId, description, color, currencyId } = body

    // 只有当明确传递了 name 时才验证
    if (name !== undefined && !name) {
      return errorResponse('账户名称不能为空', 400)
    }

    // 如果要更改分类，验证新分类是否属于当前用户
    if (categoryId && categoryId !== existingAccount.categoryId) {
      const [currentCategory, newCategory] = await Promise.all([
        (await getPrismaClient()).category.findFirst({
          where: {
            id: existingAccount.categoryId,
            userId: user.id,
          },
        }),
        (await getPrismaClient()).category.findFirst({
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

      // 检查账户是否有定期交易设置
      const hasRecurringTransactions =
        existingAccount.recurringTransactions.length > 0

      if (hasRecurringTransactions) {
        const recurringNames = existingAccount.recurringTransactions
          .map(rt => rt.description)
          .slice(0, 3)
          .join('、')
        const moreCount = existingAccount.recurringTransactions.length - 3
        const nameText =
          moreCount > 0
            ? `${recurringNames}等${existingAccount.recurringTransactions.length}个`
            : recurringNames

        return errorResponse(
          `账户存在定期交易设置（${nameText}），无法更换货币。请先删除或转移相关定期交易设置。`,
          400
        )
      }

      // 检查账户是否有贷款合约（作为贷款账户）
      const hasLoanContracts = existingAccount.loanContracts.length > 0

      if (hasLoanContracts) {
        const contractNames = existingAccount.loanContracts
          .map(lc => lc.contractName)
          .slice(0, 3)
          .join('、')
        const moreCount = existingAccount.loanContracts.length - 3
        const nameText =
          moreCount > 0
            ? `${contractNames}等${existingAccount.loanContracts.length}个`
            : contractNames

        return errorResponse(
          `账户存在贷款合约（${nameText}），无法更换货币。请先删除或转移相关贷款合约。`,
          400
        )
      }

      // 检查账户是否有贷款合约（作为还款账户）
      const hasPaymentLoanContracts =
        existingAccount.paymentLoanContracts.length > 0

      if (hasPaymentLoanContracts) {
        const contractNames = existingAccount.paymentLoanContracts
          .map(lc => lc.contractName)
          .slice(0, 3)
          .join('、')
        const moreCount = existingAccount.paymentLoanContracts.length - 3
        const nameText =
          moreCount > 0
            ? `${contractNames}等${existingAccount.paymentLoanContracts.length}个`
            : contractNames

        return errorResponse(
          `账户被贷款合约用作还款账户（${nameText}），无法更换货币。请先删除或转移相关贷款合约。`,
          400
        )
      }

      // 货币是必填的，不能设置为空
      if (!currencyId) {
        return errorResponse('账户货币不能为空', 400)
      }

      // 验证货币是否存在且用户有权使用
      const currency = await (
        await getPrismaClient()
      ).currency.findFirst({
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
      const userCurrency = await (
        await getPrismaClient()
      ).userCurrency.findFirst({
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

    // 只有当传递了 name 时才检查重复名称
    if (name !== undefined) {
      const duplicateAccount = await (
        await getPrismaClient()
      ).account.findFirst({
        where: {
          userId: user.id,
          name,
          id: { not: accountId },
        },
      })

      if (duplicateAccount) {
        return errorResponse('该账户名称已存在', 400)
      }
    }

    // 构建更新数据，只有明确传递的字段才会被更新
    const updateData: any = {}

    // 只有当明确传递了 name 时才更新
    if (name !== undefined) {
      updateData.name = name
    }

    // 只有当明确传递了 categoryId 时才更新
    if (categoryId !== undefined) {
      updateData.categoryId = categoryId
    }

    // 只有当明确传递了 currencyId 时才更新
    if (currencyId !== undefined) {
      updateData.currencyId = currencyId
    }

    // 只有当明确传递了 description 时才更新
    if (description !== undefined) {
      updateData.description = description || null
    }

    // 只有当明确传递了 color 时才更新
    if (color !== undefined) {
      updateData.color = color || null
    }

    const updatedAccount = await (
      await getPrismaClient()
    ).account.update({
      where: { id: accountId },
      data: updateData,
      include: {
        category: true,
        currency: true,
      },
    })

    return successResponse(updatedAccount, '账户更新成功')
  } catch (error) {
    console.error('Update account error:', error)
    return errorResponse(getAccountError('UPDATE_FAILED'), 500)
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
    const existingAccount = await (
      await getPrismaClient()
    ).account.findFirst({
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
      (await getPrismaClient()).transaction.count({
        where: { accountId: accountId },
      }),
      // 检查交易模板
      (await getPrismaClient()).transactionTemplate.count({
        where: { accountId: accountId },
      }),
      // 检查定期交易
      (await getPrismaClient()).recurringTransaction.count({
        where: { accountId: accountId },
      }),
      // 检查贷款合约（作为贷款账户）
      (await getPrismaClient()).loanContract.count({
        where: { accountId: accountId },
      }),
      // 检查贷款合约（作为还款账户）
      (await getPrismaClient()).loanContract.count({
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
      const account = await (
        await getPrismaClient()
      ).account.findUnique({
        where: { id: accountId },
        include: { category: true },
      })

      const accountType = account?.category?.type
      const isStockAccount =
        accountType === 'ASSET' || accountType === 'LIABILITY'

      if (isStockAccount) {
        // 检查是否只有余额调整交易
        const balanceAdjustmentCount = await (
          await getPrismaClient()
        ).transaction.count({
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
    await (
      await getPrismaClient()
    ).$transaction(async tx => {
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
    let errorMessage = getAccountError('DELETE_FAILED')
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
        errorMessage = getAccountError('NOT_FOUND')
        statusCode = 404
      } else {
        errorMessage = `${getAccountError('DELETE_FAILED')}：${error.message}`
      }
    }

    return errorResponse(errorMessage, statusCode)
  }
}
