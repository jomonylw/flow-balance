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
import {
  getAccountBalanceHistory,
  getOptimizedMonthlyStats,
  getOptimizedTransactionStats,
} from '@/lib/database/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 获取账户基本信息（不包含交易数据）
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
      include: {
        category: true,
        currency: true,
      },
    })

    if (!account) {
      return notFoundResponse(getAccountError('NOT_FOUND'))
    }

    // 使用优化的数据库聚合查询获取账户统计和余额
    const [balances, transactionStats, monthlyStats, recentTransactions] =
      await Promise.all([
        (async () => {
          const balanceResults = await getAccountBalanceHistory(
            accountId,
            user.id
          )
          const balances: Record<string, { amount: number; currency: any }> = {}
          balanceResults.forEach(result => {
            balances[result.currencyCode] = {
              amount: result.finalBalance,
              currency: {
                code: result.currencyCode,
                symbol: result.currencySymbol,
                name: result.currencyName,
              },
            }
          })
          return balances
        })(),
        getOptimizedTransactionStats(accountId, user.id),
        getOptimizedMonthlyStats(accountId, user.id),
        getRecentTransactions(accountId, user.id, 5),
      ])

    // 如果账户没有余额记录，使用账户的默认货币创建0余额记录
    if (Object.keys(balances).length === 0 && account.currency) {
      balances[account.currency.code] = {
        amount: 0,
        currency: {
          code: account.currency.code,
          symbol: account.currency.symbol,
          name: account.currency.name,
        },
      }
    }

    return successResponse({
      account: {
        id: account.id,
        name: account.name,
        description: account.description,
        category: account.category,
        currency: account.currency,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
      balances: Object.values(balances),
      transactionStats,
      monthlyStats,
      recentTransactions,
    })
  } catch (error) {
    console.error('Get account details error:', error)
    return errorResponse(getAccountError('GET_DETAILS_FAILED'), 500)
  }
}

/**
 * 获取最近的交易记录
 */
async function getRecentTransactions(
  accountId: string,
  userId: string,
  limit: number = 5
): Promise<
  Array<{
    id: string
    type: string
    amount: any
    currency: any
    description: string
    date: Date
    createdAt: Date
  }>
> {
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      userId,
    },
    include: {
      currency: true,
    },
    orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
  })

  return transactions.map(transaction => ({
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    description: transaction.description,
    date: transaction.date,
    createdAt: transaction.createdAt,
  }))
}
