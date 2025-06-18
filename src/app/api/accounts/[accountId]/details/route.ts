import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const { accountId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 获取账户详情
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
      include: {
        category: true,
        transactions: {
          include: {
            currency: true,
          },
          orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
        },
      },
    })

    if (!account) {
      return notFoundResponse('账户不存在')
    }

    // 计算账户余额（按币种分组）
    const balances: Record<
      string,
      {
        amount: number
        currency: {
          code: string
          symbol: string
          name: string
        }
      }
    > = {}

    account.transactions.forEach(transaction => {
      const currencyCode = transaction.currency.code
      if (!balances[currencyCode]) {
        balances[currencyCode] = {
          amount: 0,
          currency: {
            code: transaction.currency.code,
            symbol: transaction.currency.symbol,
            name: transaction.currency.name,
          },
        }
      }

      const amount = parseFloat(transaction.amount.toString())
      if (transaction.type === 'INCOME') {
        balances[currencyCode].amount += amount
      } else if (transaction.type === 'EXPENSE') {
        balances[currencyCode].amount -= amount
      }
      // 转账交易需要特殊处理，这里简化处理
    })

    // 统计交易信息
    const transactionStats = {
      total: account.transactions.length,
      income: account.transactions.filter(t => t.type === 'INCOME').length,
      expense: account.transactions.filter(t => t.type === 'EXPENSE').length,
      balanceAdjustment: account.transactions.filter(t => t.type === 'BALANCE')
        .length,
    }

    // 按月统计交易（最近12个月）
    const monthlyStats: Record<
      string,
      { income: number; expense: number; count: number }
    > = {}
    const now = new Date()

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyStats[monthKey] = { income: 0, expense: 0, count: 0 }
    }

    account.transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`

      if (monthlyStats[monthKey]) {
        const amount = parseFloat(transaction.amount.toString())
        monthlyStats[monthKey].count++

        if (transaction.type === 'INCOME') {
          monthlyStats[monthKey].income += amount
        } else if (transaction.type === 'EXPENSE') {
          monthlyStats[monthKey].expense += amount
        }
      }
    })

    // 获取最近的交易（不包含在主要交易列表中，用于快速预览）
    const recentTransactions = account.transactions
      .slice(0, 5)
      .map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        date: transaction.date,
        createdAt: transaction.createdAt,
      }))

    return successResponse({
      account: {
        id: account.id,
        name: account.name,
        description: account.description,
        category: account.category,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
      balances: Object.values(balances),
      transactionStats,
      monthlyStats: Object.entries(monthlyStats)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 12)
        .map(([month, stats]) => ({
          month,
          ...stats,
          net: stats.income - stats.expense,
        })),
      recentTransactions,
    })
  } catch (error) {
    console.error('Get account details error:', error)
    return errorResponse('获取账户详情失败', 500)
  }
}
