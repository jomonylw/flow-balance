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
        type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT',
        amount: parseFloat(t.amount.toString()),
        date: t.date.toISOString(),
        currency: t.currency
      }))
    }))

    // 分离存量类账户和流量类账户
    const stockAccounts = accountsForCalculation.filter(account =>
      account.category?.type === 'ASSET' || account.category?.type === 'LIABILITY'
    )
    const flowAccounts = accountsForCalculation.filter(account =>
      account.category?.type === 'INCOME' || account.category?.type === 'EXPENSE'
    )

    // 计算净资产（只包含存量类账户）
    const totalBalanceResult = await calculateTotalBalanceWithConversion(
      user.id,
      stockAccounts,
      baseCurrency
    )

    // 计算各账户余额（包含转换信息）
    const accountBalances = []

    // 计算存量类账户余额（当前时点）
    for (const account of stockAccounts) {
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

    // 计算流量类账户余额（当前月份期间）
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    for (const account of flowAccounts) {
      const balances = calculateAccountBalance(account, {
        periodStart,
        periodEnd,
        usePeriodCalculation: true
      })

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

    // 计算总资产和总负债（本位币）
    const assetAccountsForTotal = stockAccounts.filter(account => account.category?.type === 'ASSET')
    const liabilityAccountsForTotal = stockAccounts.filter(account => account.category?.type === 'LIABILITY')

    const totalAssetsResult = await calculateTotalBalanceWithConversion(
      user.id,
      assetAccountsForTotal,
      baseCurrency
    )

    const totalLiabilitiesResult = await calculateTotalBalanceWithConversion(
      user.id,
      liabilityAccountsForTotal,
      baseCurrency
    )

    // 验证账户类型设置
    const validation = validateAccountTypes(accountsForCalculation)

    // 计算净资产 = 总资产 - 总负债
    const netWorthAmount = totalAssetsResult.totalInBaseCurrency - totalLiabilitiesResult.totalInBaseCurrency
    const netWorthHasErrors = totalAssetsResult.hasConversionErrors || totalLiabilitiesResult.hasConversionErrors

    // 合并资产和负债的原币种余额
    const combinedByCurrency: Record<string, any> = {}

    // 添加资产余额（正数）
    Object.entries(totalAssetsResult.totalsByOriginalCurrency).forEach(([currency, balance]) => {
      combinedByCurrency[currency] = {
        currencyCode: currency,
        amount: balance.amount,
        currency: balance.currency
      }
    })

    // 减去负债余额（从净资产角度）
    Object.entries(totalLiabilitiesResult.totalsByOriginalCurrency).forEach(([currency, balance]) => {
      if (combinedByCurrency[currency]) {
        combinedByCurrency[currency].amount -= balance.amount
      } else {
        combinedByCurrency[currency] = {
          currencyCode: currency,
          amount: -balance.amount,
          currency: balance.currency
        }
      }
    })

    return successResponse({
      netWorth: {
        amount: netWorthAmount,
        currency: baseCurrency,
        byCurrency: combinedByCurrency,
        hasConversionErrors: netWorthHasErrors
      },
      totalAssets: {
        amount: totalAssetsResult.totalInBaseCurrency,
        currency: baseCurrency,
        accountCount: assetAccountsForTotal.length,
        hasConversionErrors: totalAssetsResult.hasConversionErrors
      },
      totalLiabilities: {
        amount: totalLiabilitiesResult.totalInBaseCurrency,
        currency: baseCurrency,
        accountCount: liabilityAccountsForTotal.length,
        hasConversionErrors: totalLiabilitiesResult.hasConversionErrors
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
        conversionDetails: [...totalAssetsResult.conversionDetails, ...totalLiabilitiesResult.conversionDetails],
        hasErrors: totalAssetsResult.hasConversionErrors || totalLiabilitiesResult.hasConversionErrors
      }
    })
  } catch (error) {
    console.error('Get dashboard summary error:', error)
    return errorResponse('获取Dashboard数据失败', 500)
  }
}
