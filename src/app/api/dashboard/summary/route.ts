import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'

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

    // 计算每个账户的余额
    const accountBalances = accounts.map(account => {
      const balances: Record<string, number> = {}
      
      account.transactions.forEach(transaction => {
        const currencyCode = transaction.currency.code
        if (!balances[currencyCode]) {
          balances[currencyCode] = 0
        }
        
        if (transaction.type === 'INCOME') {
          balances[currencyCode] += parseFloat(transaction.amount.toString())
        } else if (transaction.type === 'EXPENSE') {
          balances[currencyCode] -= parseFloat(transaction.amount.toString())
        }
        // 转账交易需要特殊处理，这里简化处理
      })

      return {
        id: account.id,
        name: account.name,
        category: account.category,
        balances
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

    // 计算净资产（简化版本，实际应用中需要汇率转换）
    let totalNetWorth = 0
    accountBalances.forEach(account => {
      Object.entries(account.balances).forEach(([currencyCode, balance]) => {
        if (currencyCode === baseCurrency.code) {
          totalNetWorth += balance
        }
        // TODO: 添加汇率转换逻辑
      })
    })

    return successResponse({
      netWorth: {
        amount: totalNetWorth,
        currency: baseCurrency
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
      }
    })
  } catch (error) {
    console.error('Get dashboard summary error:', error)
    return errorResponse('获取Dashboard数据失败', 500)
  }
}
