import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { calculateAccountBalance, calculateNetWorth, validateAccountTypes } from '@/lib/account-balance'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 获取用户设置以确定本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true }
    })

    const baseCurrency = userSettings?.baseCurrency || { code: 'CNY', symbol: '¥' }

    // 获取账户余额汇总
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          include: {
            currency: true
          }
        }
      }
    })

    // 使用新的余额计算逻辑
    const accountBalances = accounts.map(account => {
      const accountData = {
        id: account.id,
        name: account.name,
        category: account.category,
        transactions: account.transactions.map(t => ({
          type: t.type as 'INCOME' | 'EXPENSE' | 'TRANSFER',
          amount: parseFloat(t.amount.toString()),
          currency: t.currency
        }))
      }

      const balances = calculateAccountBalance(accountData)

      // 转换为原有格式以保持兼容性
      const balancesRecord: Record<string, number> = {}
      Object.values(balances).forEach(balance => {
        balancesRecord[balance.currencyCode] = balance.amount
      })

      return {
        id: account.id,
        name: account.name,
        category: account.category,
        balances: balancesRecord
      }
    })

    // 获取最近的交易
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      include: {
        account: true,
        category: true,
        currency: true
      },
      orderBy: { date: 'desc' },
      take: 10
    })

    // 计算近期收支统计（最近30天）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentActivity = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        currency: true
      }
    })

    // 按币种统计收支
    const activitySummary: Record<string, { income: number; expense: number }> = {}
    
    recentActivity.forEach(transaction => {
      const currencyCode = transaction.currency.code
      if (!activitySummary[currencyCode]) {
        activitySummary[currencyCode] = { income: 0, expense: 0 }
      }
      
      const amount = parseFloat(transaction.amount.toString())
      if (transaction.type === 'INCOME') {
        activitySummary[currencyCode].income += amount
      } else if (transaction.type === 'EXPENSE') {
        activitySummary[currencyCode].expense += amount
      }
    })

    // 使用新的净资产计算逻辑
    const accountsForNetWorth = accounts.map(account => ({
      id: account.id,
      name: account.name,
      category: account.category,
      transactions: account.transactions.map(t => ({
        type: t.type as 'INCOME' | 'EXPENSE' | 'TRANSFER',
        amount: parseFloat(t.amount.toString()),
        currency: t.currency
      }))
    }))

    const netWorthByCurrency = calculateNetWorth(accountsForNetWorth)
    const totalNetWorth = netWorthByCurrency[baseCurrency.code]?.amount || 0

    // 验证账户类型设置
    const validation = validateAccountTypes(accountsForNetWorth)

    return successResponse({
      netWorth: {
        amount: totalNetWorth,
        currency: baseCurrency,
        byCurrency: netWorthByCurrency
      },
      accountBalances: accountBalances.filter(account =>
        Object.values(account.balances).some(balance => Math.abs(balance) > 0.01)
      ),
      recentActivity: {
        summary: activitySummary,
        period: '最近30天'
      },
      recentTransactions: recentTransactions.slice(0, 5),
      stats: {
        totalAccounts: accounts.length,
        totalTransactions: await prisma.transaction.count({
          where: { userId: user.id }
        }),
        totalCategories: await prisma.category.count({
          where: { userId: user.id }
        })
      },
      validation: validation
    })
  } catch (error) {
    console.error('Get dashboard summary error:', error)
    return errorResponse('获取Dashboard数据失败', 500)
  }
}
