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
import { getAccountBalanceHistory } from '@/lib/database/raw-queries'

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
 * 优化的交易统计函数
 */
async function getOptimizedTransactionStats(
  accountId: string,
  userId: string
): Promise<{
  total: number
  income: number
  expense: number
  balanceAdjustment: number
}> {
  const stats = await prisma.$queryRaw<
    Array<{
      transaction_type: string
      count: number
    }>
  >`
    SELECT
      t.type as transaction_type,
      COUNT(*) as count
    FROM transactions t
    WHERE t."accountId" = ${accountId}
      AND t."userId" = ${userId}
    GROUP BY t.type
  `

  const result = {
    total: 0,
    income: 0,
    expense: 0,
    balanceAdjustment: 0,
  }

  stats.forEach(stat => {
    const count = Number(stat.count)
    result.total += count

    switch (stat.transaction_type) {
      case 'INCOME':
        result.income = count
        break
      case 'EXPENSE':
        result.expense = count
        break
      case 'BALANCE':
        result.balanceAdjustment = count
        break
    }
  })

  return result
}

/**
 * 优化的月度统计函数
 */
async function getOptimizedMonthlyStats(
  accountId: string,
  userId: string
): Promise<
  Array<{
    month: string
    income: number
    expense: number
    count: number
    net: number
  }>
> {
  // 获取最近12个月的数据
  const now = new Date()
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const monthlyData = await prisma.$queryRaw<
    Array<{
      month: string
      transaction_type: string
      total_amount: number
      count: number
    }>
  >`
    SELECT
      to_char(t.date, 'YYYY-MM') as month,
      t.type as transaction_type,
      SUM(t.amount) as total_amount,
      COUNT(*) as count
    FROM transactions t
    WHERE t."accountId" = ${accountId}
      AND t."userId" = ${userId}
      AND t.date >= ${twelveMonthsAgo}
      AND t.type IN ('INCOME', 'EXPENSE')
    GROUP BY month, t.type
    ORDER BY month DESC
  `

  // 初始化最近12个月的数据结构
  const monthlyStats: Record<
    string,
    { income: number; expense: number; count: number }
  > = {}

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyStats[monthKey] = { income: 0, expense: 0, count: 0 }
  }

  // 填充实际数据
  monthlyData.forEach(row => {
    const month = row.month
    const amount = parseFloat(row.total_amount.toString())
    const count = Number(row.count)

    if (monthlyStats[month]) {
      monthlyStats[month].count += count

      if (row.transaction_type === 'INCOME') {
        monthlyStats[month].income = amount
      } else if (row.transaction_type === 'EXPENSE') {
        monthlyStats[month].expense = amount
      }
    }
  })

  // 转换为数组格式并计算净值
  return Object.entries(monthlyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12)
    .map(([month, stats]) => ({
      month,
      ...stats,
      net: stats.income - stats.expense,
    }))
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
