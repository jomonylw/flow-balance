import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import { getAccountError } from '@/lib/constants/api-messages'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    console.log(
      `[CLEAR BALANCE HISTORY] 开始清空余额历史，账户ID: ${accountId}`
    )

    const user = await getCurrentUser()
    if (!user) {
      console.log('[CLEAR BALANCE HISTORY] 用户未授权')
      return unauthorizedResponse()
    }

    console.log(`[CLEAR BALANCE HISTORY] 用户ID: ${user.id}`)

    // 验证账户是否存在且属于当前用户
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
      include: {
        category: true,
      },
    })

    if (!existingAccount) {
      console.log(
        `[CLEAR BALANCE HISTORY] 账户不存在或不属于用户，accountId: ${accountId}, userId: ${user.id}`
      )
      return notFoundResponse('账户不存在')
    }

    console.log(
      `[CLEAR BALANCE HISTORY] 找到账户: ${existingAccount.name}, 类型: ${existingAccount.category.type}`
    )

    // 验证是否为存量类账户
    const accountType = existingAccount.category.type
    if (accountType !== 'ASSET' && accountType !== 'LIABILITY') {
      const errorMessage = '只有资产或负债账户可以清空余额历史'
      console.log(`[CLEAR BALANCE HISTORY] 账户类型不符合要求: ${accountType}`)
      return errorResponse(errorMessage, 400)
    }

    // 检查是否有非余额调整的交易记录
    const otherTransactionCount = await prisma.transaction.count({
      where: {
        accountId: accountId,
        type: {
          not: 'BALANCE',
        },
      },
    })

    console.log(
      `[CLEAR BALANCE HISTORY] 普通交易记录数量: ${otherTransactionCount}`
    )

    if (otherTransactionCount > 0) {
      const errorMessage = `该账户存在 ${otherTransactionCount} 条普通交易记录，请先删除这些交易记录后再清空余额历史`
      console.log(`[CLEAR BALANCE HISTORY] 清空被阻止: ${errorMessage}`)
      return errorResponse(errorMessage, 400)
    }

    // 检查余额调整记录数量
    const balanceTransactionCount = await prisma.transaction.count({
      where: {
        accountId: accountId,
        type: 'BALANCE',
      },
    })

    console.log(
      `[CLEAR BALANCE HISTORY] 余额调整记录数量: ${balanceTransactionCount}`
    )

    // 删除所有余额调整交易记录
    console.log('[CLEAR BALANCE HISTORY] 开始删除余额调整记录...')
    const deletedCount = await prisma.transaction.deleteMany({
      where: {
        accountId: accountId,
        type: 'BALANCE',
      },
    })

    console.log(
      `[CLEAR BALANCE HISTORY] 余额历史清空成功: ${existingAccount.name}, 删除了 ${deletedCount.count} 条记录`
    )
    return successResponse({
      deletedCount: deletedCount.count,
      message: `已清空 ${existingAccount.name} 的余额历史记录（${deletedCount.count} 条记录）`,
    })
  } catch (error) {
    console.error('[CLEAR BALANCE HISTORY] 清空余额历史时发生错误:', error)

    // 提供更详细的错误信息
    let errorMessage = '清空余额历史失败'
    let statusCode = 500

    if (error instanceof Error) {
      console.error('[CLEAR BALANCE HISTORY] 错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })

      // 检查是否是特定的业务错误
      if (error.message.includes('Foreign key constraint')) {
        errorMessage = getAccountError('CLEAR_BALANCE_FAILED')
        statusCode = 400
      } else {
        errorMessage = `${getAccountError('CLEAR_FAILED')}：${error.message}`
      }
    }

    return errorResponse(errorMessage, statusCode)
  }
}
