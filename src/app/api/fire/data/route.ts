import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { AccountType } from '@prisma/client'


/**
 * FIRE 数据 API
 * 提供 FIRE 计算所需的基础数据
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 获取用户设置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    if (!userSettings?.fireEnabled) {
      return errorResponse('FIRE 功能未启用', 403)
    }

    const baseCurrency = userSettings.baseCurrency || {
      code: 'CNY',
      symbol: '¥',
      name: '人民币',
    }

    // 计算过去12个月的总开销
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

    const expenseTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: twelveMonthsAgo,
        },
        category: {
          type: AccountType.EXPENSE,
        },
      },
      include: {
        currency: true,
      },
    })

    // 计算总开销（转换为本位币）
    let totalExpenses = 0
    for (const transaction of expenseTransactions) {
      const amount =
        typeof transaction.amount === 'number'
          ? transaction.amount
          : parseFloat(transaction.amount.toString())
      if (transaction.currencyCode === baseCurrency.code) {
        totalExpenses += amount
      } else {
        // 这里应该使用汇率转换，暂时使用1:1
        totalExpenses += amount
      }
    }

    // 计算当前净资产（简化版本）
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          where: {
            type:
              AccountType.ASSET || AccountType.LIABILITY
                ? 'BALANCE'
                : undefined,
          },
          orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
          take: 1,
        },
      },
    })

    let totalAssets = 0
    let totalLiabilities = 0

    for (const account of accounts) {
      // 对于存量账户，使用最新的余额调整记录
      if (
        account.category.type === AccountType.ASSET ||
        account.category.type === AccountType.LIABILITY
      ) {
        const latestTransaction = account.transactions[0]
        if (latestTransaction) {
          const amount =
            typeof latestTransaction.amount === 'number'
              ? latestTransaction.amount
              : parseFloat(latestTransaction.amount.toString())

          if (account.category.type === AccountType.ASSET) {
            totalAssets += amount
          } else if (account.category.type === AccountType.LIABILITY) {
            totalLiabilities += amount
          }
        }
      }
    }

    const currentNetWorth = totalAssets - totalLiabilities

    // 计算历史年化回报率（简化版本，基于净资产变化）
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // 获取6个月前的净资产快照（简化计算）
    const _historicalTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          lte: sixMonthsAgo,
        },
      },
      include: {
        account: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
    })

    // 简化的历史回报率计算
    const historicalAnnualReturn = 7.6 // 默认值

    // 计算过去6个月的平均月投入
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: sixMonthsAgo,
        },
        category: {
          type: {
            in: [AccountType.INCOME, AccountType.EXPENSE],
          },
        },
      },
      include: {
        category: true,
      },
    })

    let totalIncome = 0
    let totalExpensesRecent = 0

    for (const transaction of recentTransactions) {
      const amount =
        typeof transaction.amount === 'number'
          ? transaction.amount
          : parseFloat(transaction.amount.toString())
      if (transaction.category.type === AccountType.INCOME) {
        totalIncome += amount
      } else if (transaction.category.type === AccountType.EXPENSE) {
        totalExpensesRecent += amount
      }
    }

    const monthlyNetInvestment = Math.max(
      0,
      (totalIncome - totalExpensesRecent) / 6,
    )

    // 返回 FIRE 计算基础数据
    return successResponse({
      realitySnapshot: {
        past12MonthsExpenses: totalExpenses,
        currentNetWorth: currentNetWorth,
        historicalAnnualReturn: historicalAnnualReturn,
        monthlyNetInvestment: monthlyNetInvestment,
      },
      userSettings: {
        fireEnabled: userSettings.fireEnabled,
        fireSWR: userSettings.fireSWR,
      },
      baseCurrency: baseCurrency,
    })
  } catch (error) {
    console.error('Get FIRE data error:', error)
    return errorResponse('获取 FIRE 数据失败', 500)
  }
}
