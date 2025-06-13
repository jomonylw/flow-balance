import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { AccountType } from '@prisma/client'

/**
 * 个人现金流量表 API
 * 基于收入类（INCOME）和支出类（EXPENSE）账户进行统计
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return errorResponse('开始日期和结束日期是必需的')
    }

    // 获取用户设置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true }
    })

    const baseCurrency = userSettings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }

    // 获取时间范围内的所有收入和支出交易
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        type: {
          in: ['INCOME', 'EXPENSE']
        }
      },
      include: {
        account: {
          include: {
            category: true
          }
        },
        currency: true,
        category: true
      },
      orderBy: { date: 'desc' }
    })

    // 按账户分组统计
    const accountStats: Record<string, {
      id: string
      name: string
      type: 'INCOME' | 'EXPENSE'
      categoryName: string
      currency: {
        code: string
        symbol: string
        name: string
      }
      totalAmount: number
      transactionCount: number
      transactions: Array<{
        id: string
        amount: number
        description: string
        date: string
        type: 'INCOME' | 'EXPENSE'
      }>
    }> = {}

    // 按货币分组的总计
    const currencyTotals: Record<string, {
      currency: {
        code: string
        symbol: string
        name: string
      }
      totalIncome: number
      totalExpense: number
      netCashFlow: number
    }> = {}

    // 处理交易数据
    for (const transaction of transactions) {
      const accountId = transaction.account.id
      const currencyCode = transaction.currencyCode
      const amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(transaction.amount.toString())

      // 初始化账户统计
      if (!accountStats[accountId]) {
        accountStats[accountId] = {
          id: transaction.account.id,
          name: transaction.account.name,
          type: transaction.account.category.type as 'INCOME' | 'EXPENSE',
          categoryName: transaction.account.category.name,
          currency: transaction.currency,
          totalAmount: 0,
          transactionCount: 0,
          transactions: []
        }
      }

      // 初始化货币总计
      if (!currencyTotals[currencyCode]) {
        currencyTotals[currencyCode] = {
          currency: transaction.currency,
          totalIncome: 0,
          totalExpense: 0,
          netCashFlow: 0
        }
      }

      // 累加金额
      accountStats[accountId].totalAmount += amount
      accountStats[accountId].transactionCount += 1
      accountStats[accountId].transactions.push({
        id: transaction.id,
        amount: amount,
        description: transaction.description,
        date: transaction.date.toISOString(),
        type: transaction.type as 'INCOME' | 'EXPENSE'
      })

      // 累加货币总计
      if (transaction.type === 'INCOME') {
        currencyTotals[currencyCode].totalIncome += amount
      } else if (transaction.type === 'EXPENSE') {
        currencyTotals[currencyCode].totalExpense += amount
      }
    }

    // 计算净现金流
    for (const currencyCode in currencyTotals) {
      currencyTotals[currencyCode].netCashFlow = 
        currencyTotals[currencyCode].totalIncome - currencyTotals[currencyCode].totalExpense
    }

    // 按类型分组账户
    const incomeAccounts = Object.values(accountStats).filter(account => account.type === 'INCOME')
    const expenseAccounts = Object.values(accountStats).filter(account => account.type === 'EXPENSE')

    // 排序：按总金额降序
    incomeAccounts.sort((a, b) => b.totalAmount - a.totalAmount)
    expenseAccounts.sort((a, b) => b.totalAmount - a.totalAmount)

    const response = {
      period: {
        start: startDate,
        end: endDate
      },
      baseCurrency,
      cashFlow: {
        incomeAccounts,
        expenseAccounts
      },
      summary: {
        currencyTotals,
        totalTransactions: transactions.length
      }
    }

    return successResponse(response)
  } catch (error) {
    console.error('获取个人现金流量表失败:', error)
    return errorResponse('获取个人现金流量表失败')
  }
}
