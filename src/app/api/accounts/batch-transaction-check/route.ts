import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'

/**
 * 批量检查账户是否有交易记录
 * 优化API调用，减少前端重复请求
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { accountIds } = body

    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return errorResponse('账户ID列表不能为空', 400)
    }

    // 验证所有账户都属于当前用户
    const userAccounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        userId: user.id,
      },
      select: { id: true },
    })

    const validAccountIds = userAccounts.map(acc => acc.id)
    const invalidAccountIds = accountIds.filter(
      id => !validAccountIds.includes(id)
    )

    if (invalidAccountIds.length > 0) {
      return errorResponse(`无效的账户ID: ${invalidAccountIds.join(', ')}`, 400)
    }

    // 批量查询每个账户的交易记录数量
    const transactionCounts = await Promise.all(
      validAccountIds.map(async accountId => {
        const count = await prisma.transaction.count({
          where: {
            accountId: accountId,
          },
        })
        return {
          accountId,
          hasTransactions: count > 0,
          transactionCount: count,
        }
      })
    )

    // 构建结果对象
    const result = transactionCounts.reduce(
      (acc, item) => {
        acc[item.accountId] = {
          hasTransactions: item.hasTransactions,
          transactionCount: item.transactionCount,
        }
        return acc
      },
      {} as Record<
        string,
        { hasTransactions: boolean; transactionCount: number }
      >
    )

    return successResponse(result, '批量检查完成')
  } catch (error) {
    console.error('Batch transaction check error:', error)
    return errorResponse('批量检查失败', 500)
  }
}
