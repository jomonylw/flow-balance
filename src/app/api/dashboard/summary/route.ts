import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { calculateTotalBalanceWithConversion } from '@/lib/account-balance'
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

    const baseCurrency = userSettings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }

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

    // 转换账户数据格式
    const accountsForCalculation = accounts.map(account => ({
      id: account.id,
      name: account.name,
      category: account.category,
      transactions: account.transactions.map(t => ({
        type: t.type as 'INCOME' | 'EXPENSE' | 'TRANSFER',
        amount: parseFloat(t.amount.toString()),
        currency: t.currency
      }))
    }))

    // 使用新的支持货币转换的余额计算逻辑
    const totalBalanceResult = await calculateTotalBalanceWithConversion(
      user.id,
      accountsForCalculation,
      baseCurrency
    )

    // 计算各账户余额（包含转换信息）
    const accountBalances = []
    for (const account of accountsForCalculation) {
      const balances = calculateAccountBalance(account)

      // 只显示有余额的账户
      const hasBalance = Object.values(balances).some(balance => Math.abs(balance.amount) > 0.01)
      if (hasBalance) {
        const balancesRecord: Record<string, number> = {}
        Object.values(balances).forEach(balance => {
          balancesRecord[balance.currencyCode] = balance.amount
        })

        accountBalances.push({
          id: account.id,
          name: account.name,
          category: account.category,
          balances: balancesRecord
        })
      }
    }

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
    let totalIncomeInBaseCurrency = 0
    let totalExpenseInBaseCurrency = 0

    // 准备转换数据
    const incomeAmounts: Array<{ amount: number; currency: string }> = []
    const expenseAmounts: Array<{ amount: number; currency: string }> = []

    recentActivity.forEach(transaction => {
      const currencyCode = transaction.currency.code
      if (!activitySummary[currencyCode]) {
        activitySummary[currencyCode] = { income: 0, expense: 0 }
      }

      const amount = parseFloat(transaction.amount.toString())
      if (transaction.type === 'INCOME') {
        activitySummary[currencyCode].income += amount
        incomeAmounts.push({ amount, currency: currencyCode })
      } else if (transaction.type === 'EXPENSE') {
        activitySummary[currencyCode].expense += amount
        expenseAmounts.push({ amount, currency: currencyCode })
      }
    })

    // 转换收支到本位币
    try {
      const [incomeConversions, expenseConversions] = await Promise.all([
        import('@/lib/currency-conversion').then(module =>
          module.convertMultipleCurrencies(user.id, incomeAmounts, baseCurrency.code)
        ),
        import('@/lib/currency-conversion').then(module =>
          module.convertMultipleCurrencies(user.id, expenseAmounts, baseCurrency.code)
        )
      ])

      totalIncomeInBaseCurrency = incomeConversions.reduce((sum, result) =>
        sum + (result.success ? result.convertedAmount : result.originalAmount), 0
      )

      totalExpenseInBaseCurrency = expenseConversions.reduce((sum, result) =>
        sum + (result.success ? result.convertedAmount : result.originalAmount), 0
      )
    } catch (error) {
      console.error('转换收支金额失败:', error)
      // 转换失败时使用原始金额作为近似值
      totalIncomeInBaseCurrency = Object.values(activitySummary).reduce((sum, activity) => sum + activity.income, 0)
      totalExpenseInBaseCurrency = Object.values(activitySummary).reduce((sum, activity) => sum + activity.expense, 0)
    }

    // 验证账户类型设置
    const validation = validateAccountTypes(accountsForCalculation)

    return successResponse({
      netWorth: {
        amount: totalBalanceResult.totalInBaseCurrency,
        currency: baseCurrency,
        byCurrency: totalBalanceResult.totalsByOriginalCurrency,
        hasConversionErrors: totalBalanceResult.hasConversionErrors
      },
      accountBalances,
      recentActivity: {
        summary: activitySummary,
        summaryInBaseCurrency: {
          income: totalIncomeInBaseCurrency,
          expense: totalExpenseInBaseCurrency,
          net: totalIncomeInBaseCurrency - totalExpenseInBaseCurrency
        },
        period: '最近30天',
        baseCurrency
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
      validation,
      currencyConversion: {
        baseCurrency,
        conversionDetails: totalBalanceResult.conversionDetails,
        hasErrors: totalBalanceResult.hasConversionErrors
      }
    })
  } catch (error) {
    console.error('Get dashboard summary error:', error)
    return errorResponse('获取Dashboard数据失败', 500)
  }
}
