import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
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
    console.log(`[CLEAR TRANSACTIONS] 开始清空交易记录，账户ID: ${accountId}`)

    const user = await getCurrentUser()
    if (!user) {
      console.log('[CLEAR TRANSACTIONS] 用户未授权')
      return unauthorizedResponse()
    }

    console.log(`[CLEAR TRANSACTIONS] 用户ID: ${user.id}`)

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
        `[CLEAR TRANSACTIONS] 账户不存在或不属于用户，accountId: ${accountId}, userId: ${user.id}`
      )
      return notFoundResponse('账户不存在')
    }

    console.log(
      `[CLEAR TRANSACTIONS] 找到账户: ${existingAccount.name}, 类型: ${existingAccount.category.type}`
    )

    // 验证是否为流量类账户
    const accountType = existingAccount.category.type
    if (accountType !== 'INCOME' && accountType !== 'EXPENSE') {
      const errorMessage = '只有收入或支出账户可以清空交易记录'
      console.log(`[CLEAR TRANSACTIONS] 账户类型不符合要求: ${accountType}`)
      return errorResponse(errorMessage, 400)
    }

    // 检查交易记录数量
    const transactionCount = await prisma.transaction.count({
      where: {
        accountId: accountId,
        userId: user.id,
      },
    })

    console.log(`[CLEAR TRANSACTIONS] 交易记录数量: ${transactionCount}`)

    // 删除所有交易记录（流量账户不区分交易类型，删除所有记录）
    console.log('[CLEAR TRANSACTIONS] 开始删除交易记录...')
    const deletedCount = await prisma.transaction.deleteMany({
      where: {
        accountId: accountId,
        userId: user.id,
      },
    })

    console.log(
      `[CLEAR TRANSACTIONS] 交易记录清空成功: ${existingAccount.name}, 删除了 ${deletedCount.count} 条记录`
    )
    return successResponse({
      deletedCount: deletedCount.count,
      message: `已清空 ${existingAccount.name} 的所有交易记录（${deletedCount.count} 条记录）`,
    })
  } catch (error) {
    console.error('[CLEAR TRANSACTIONS] 清空交易记录时发生错误:', error)

    // 提供更详细的错误信息
    let errorMessage = getAccountError('CLEAR_FAILED')
    let statusCode = 500

    if (error instanceof Error) {
      console.error('[CLEAR TRANSACTIONS] 错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })

      // 检查是否是特定的业务错误
      if (error.message.includes('Foreign key constraint')) {
        errorMessage = getAccountError('CLEAR_TRANSACTIONS_FAILED')
        statusCode = 400
      } else {
        errorMessage = `${getAccountError('CLEAR_FAILED')}：${error.message}`
      }
    }

    return errorResponse(errorMessage, statusCode)
  }
}
