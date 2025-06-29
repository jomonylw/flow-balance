import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { getCommonError } from '@/lib/constants/api-messages'
import {
  calculateTotalBalanceWithConversion,
  calculateAccountBalance,
  validateAccountTypes,
} from '@/lib/services/account.service'
import { TransactionType, AccountType } from '@/types/core/constants'
import { getDaysAgoDateRange } from '@/lib/utils/date-range'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 获取用户设置以确定本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    const baseCurrency = userSettings?.baseCurrency || {
      code: 'CNY',
      symbol: '¥',
      name: '人民币',
    }

    // 获取账户余额汇总
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          include: {
            currency: true,
          },
        },
      },
    })

    // 转换账户数据格式
    const accountsForCalculation = accounts.map(account => ({
      id: account.id,
      name: account.name,
      category: account.category
        ? {
            id: account.category.id,
            name: account.category.name,
            type: account.category.type as AccountType | undefined,
          }
        : {
            id: 'unknown',
            name: 'Unknown',
            type: undefined,
          },
      transactions: account.transactions.map(t => ({
        id: t.id,
        type: t.type as TransactionType,
        amount: parseFloat(t.amount.toString()),
        date: t.date.toISOString(),
        description: t.description,
        notes: t.notes,
        currency: {
          code: t.currency.code,
          symbol: t.currency.symbol,
          name: t.currency.name,
        },
      })),
    }))

    // 分离存量类账户和流量类账户
    const stockAccounts = accountsForCalculation.filter(
      account =>
        account.category?.type === AccountType.ASSET ||
        account.category?.type === AccountType.LIABILITY
    )
    const flowAccounts = accountsForCalculation.filter(
      account =>
        account.category?.type === AccountType.INCOME ||
        account.category?.type === AccountType.EXPENSE
    )

    // 获取当前日期，确保不包含未来的交易记录
    const now = new Date()

    // 计算净资产（只包含存量类账户）
    const _totalBalanceResult = await calculateTotalBalanceWithConversion(
      user.id,
      stockAccounts,
      baseCurrency,
      { asOfDate: now }
    )

    // 计算各账户余额（包含转换信息）
    const accountBalances = []

    // 计算存量类账户余额（当前时点，截止到当前日期）
    for (const account of stockAccounts) {
      const balances = calculateAccountBalance(account, {
        asOfDate: now,
      })

      // 只显示有余额的账户
      const hasBalance = Object.values(balances).some(
        balance => Math.abs(balance.amount) > 0.01
      )
      if (hasBalance) {
        const balancesRecord: Record<string, number> = {}
        Object.values(balances).forEach(balance => {
          balancesRecord[balance.currencyCode] = balance.amount
        })

        accountBalances.push({
          id: account.id,
          name: account.name,
          category: account.category,
          balances: balancesRecord,
        })
      }
    }

    // 计算流量类账户余额（当前月份期间，但不超过当前日期）
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(
      Math.min(
        now.getTime(),
        new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        ).getTime()
      )
    )

    for (const account of flowAccounts) {
      const balances = calculateAccountBalance(account, {
        asOfDate: now, // 添加截止日期，确保不包含未来交易
        periodStart,
        periodEnd,
        usePeriodCalculation: true,
      })

      // 只显示有余额的账户
      const hasBalance = Object.values(balances).some(
        balance => Math.abs(balance.amount) > 0.01
      )
      if (hasBalance) {
        const balancesRecord: Record<string, number> = {}
        Object.values(balances).forEach(balance => {
          balancesRecord[balance.currencyCode] = balance.amount
        })

        accountBalances.push({
          id: account.id,
          name: account.name,
          category: account.category,
          balances: balancesRecord,
        })
      }
    }

    // 获取最早的交易记录以计算记账天数
    const earliestTransaction = await prisma.transaction.findFirst({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
      select: { date: true },
    })

    // 计算记账天数
    let accountingDays = 1 // 默认显示第1天
    if (earliestTransaction) {
      const earliestDate = new Date(earliestTransaction.date)
      const today = new Date()
      // 计算天数差，包含开始日期
      const timeDiff = today.getTime() - earliestDate.getTime()
      accountingDays = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1
    }

    // 获取最近的交易
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          lte: now, // 确保不包含未来交易
        },
      },
      include: {
        account: {
          include: {
            category: true,
          },
        },
        currency: true,
      },
      orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
      take: 10,
    })

    // 计算近期收支统计（最近30天）
    const { startDate: thirtyDaysAgo, endDate: nowEndOfDay } =
      getDaysAgoDateRange(30)

    const recentActivity = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: thirtyDaysAgo,
          lte: nowEndOfDay, // 使用当天结束时间，确保包含今天的所有交易
        },
        type: {
          in: [TransactionType.INCOME, TransactionType.EXPENSE], // 只统计收入和支出交易，排除余额调整
        },
      },
      include: {
        currency: true,
        account: {
          include: {
            category: true,
          },
        },
      },
    })

    // 按币种统计收支
    const activitySummary: Record<string, { income: number; expense: number }> =
      {}
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
      // const accountType = transaction.account.category.type // 旧逻辑：根据账户类别类型

      // 根据交易类型判断是收入还是支出 (与 personal-cash-flow API 的核心统计逻辑保持一致)
      if (transaction.type === TransactionType.INCOME) {
        activitySummary[currencyCode].income += amount
        incomeAmounts.push({ amount, currency: currencyCode })
      } else if (transaction.type === TransactionType.EXPENSE) {
        activitySummary[currencyCode].expense += amount
        expenseAmounts.push({ amount, currency: currencyCode })
      }
    })

    // 转换收支到本位币
    try {
      const [incomeConversions, expenseConversions] = await Promise.all([
        import('@/lib/services/currency.service').then(module =>
          module.convertMultipleCurrencies(
            user.id,
            incomeAmounts,
            baseCurrency.code
          )
        ),
        import('@/lib/services/currency.service').then(module =>
          module.convertMultipleCurrencies(
            user.id,
            expenseAmounts,
            baseCurrency.code
          )
        ),
      ])

      totalIncomeInBaseCurrency = incomeConversions.reduce(
        (sum, result) =>
          sum +
          (result.success ? result.convertedAmount : result.originalAmount),
        0
      )

      totalExpenseInBaseCurrency = expenseConversions.reduce(
        (sum, result) =>
          sum +
          (result.success ? result.convertedAmount : result.originalAmount),
        0
      )
    } catch (error) {
      console.error('转换收支金额失败:', error)
      // 转换失败时使用原始金额作为近似值
      totalIncomeInBaseCurrency = Object.values(activitySummary).reduce(
        (sum, activity) => sum + activity.income,
        0
      )
      totalExpenseInBaseCurrency = Object.values(activitySummary).reduce(
        (sum, activity) => sum + activity.expense,
        0
      )
    }

    // 计算总资产和总负债（本位币）
    const assetAccountsForTotal = stockAccounts.filter(
      account => account.category?.type === AccountType.ASSET
    )
    const liabilityAccountsForTotal = stockAccounts.filter(
      account => account.category?.type === AccountType.LIABILITY
    )

    const totalAssetsResult = await calculateTotalBalanceWithConversion(
      user.id,
      assetAccountsForTotal,
      baseCurrency,
      { asOfDate: now }
    )

    const totalLiabilitiesResult = await calculateTotalBalanceWithConversion(
      user.id,
      liabilityAccountsForTotal,
      baseCurrency,
      { asOfDate: now }
    )

    // 验证账户类型设置
    const validation = validateAccountTypes(accountsForCalculation)

    // 计算净资产 = 总资产 - 总负债
    const netWorthAmount =
      totalAssetsResult.totalInBaseCurrency -
      totalLiabilitiesResult.totalInBaseCurrency
    const netWorthHasErrors =
      totalAssetsResult.hasConversionErrors ||
      totalLiabilitiesResult.hasConversionErrors

    // 合并资产和负债的原币种余额
    const combinedByCurrency: Record<
      string,
      {
        currencyCode: string
        amount: number
        currency: { code: string; symbol: string; name: string }
      }
    > = {}

    // 添加资产余额（正数）
    Object.entries(totalAssetsResult.totalsByOriginalCurrency).forEach(
      ([currency, balance]) => {
        combinedByCurrency[currency] = {
          currencyCode: currency,
          amount: balance.amount,
          currency: balance.currency,
        }
      }
    )

    // 减去负债余额（从净资产角度）
    Object.entries(totalLiabilitiesResult.totalsByOriginalCurrency).forEach(
      ([currency, balance]) => {
        if (combinedByCurrency[currency]) {
          combinedByCurrency[currency].amount -= balance.amount
        } else {
          combinedByCurrency[currency] = {
            currencyCode: currency,
            amount: -balance.amount,
            currency: balance.currency,
          }
        }
      }
    )

    // 构建资产的 byCurrency 信息
    const assetsByCurrency: Record<
      string,
      {
        originalAmount: number
        convertedAmount: number
        currency: { code: string; symbol: string; name: string }
        exchangeRate: number
        accountCount: number
        success: boolean
      }
    > = {}

    // 统计每个币种的资产账户数量
    const assetAccountCountByCurrency: Record<string, number> = {}
    assetAccountsForTotal.forEach(account => {
      const accountBalances = calculateAccountBalance(account, {
        asOfDate: now,
      })
      Object.keys(accountBalances).forEach(currencyCode => {
        assetAccountCountByCurrency[currencyCode] =
          (assetAccountCountByCurrency[currencyCode] || 0) + 1
      })
    })

    // 填充资产的 byCurrency 数据
    Object.entries(totalAssetsResult.totalsByOriginalCurrency).forEach(
      ([currencyCode, balance]) => {
        // 查找对应的转换详情
        const conversionDetail = totalAssetsResult.conversionDetails.find(
          detail => detail.fromCurrency === currencyCode
        )

        assetsByCurrency[currencyCode] = {
          originalAmount: balance.amount,
          convertedAmount: conversionDetail?.convertedAmount || balance.amount,
          currency: balance.currency,
          exchangeRate: conversionDetail?.exchangeRate || 1,
          accountCount: assetAccountCountByCurrency[currencyCode] || 0,
          success: conversionDetail?.success ?? true,
        }
      }
    )

    // 构建负债的 byCurrency 信息
    const liabilitiesByCurrency: Record<
      string,
      {
        originalAmount: number
        convertedAmount: number
        currency: { code: string; symbol: string; name: string }
        exchangeRate: number
        accountCount: number
        success: boolean
      }
    > = {}

    // 统计每个币种的负债账户数量
    const liabilityAccountCountByCurrency: Record<string, number> = {}
    liabilityAccountsForTotal.forEach(account => {
      const accountBalances = calculateAccountBalance(account, {
        asOfDate: now,
      })
      Object.keys(accountBalances).forEach(currencyCode => {
        liabilityAccountCountByCurrency[currencyCode] =
          (liabilityAccountCountByCurrency[currencyCode] || 0) + 1
      })
    })

    // 填充负债的 byCurrency 数据
    Object.entries(totalLiabilitiesResult.totalsByOriginalCurrency).forEach(
      ([currencyCode, balance]) => {
        // 查找对应的转换详情
        const conversionDetail = totalLiabilitiesResult.conversionDetails.find(
          detail => detail.fromCurrency === currencyCode
        )

        liabilitiesByCurrency[currencyCode] = {
          originalAmount: balance.amount,
          convertedAmount: conversionDetail?.convertedAmount || balance.amount,
          currency: balance.currency,
          exchangeRate: conversionDetail?.exchangeRate || 1,
          accountCount: liabilityAccountCountByCurrency[currencyCode] || 0,
          success: conversionDetail?.success ?? true,
        }
      }
    )

    return successResponse({
      netWorth: {
        amount: netWorthAmount,
        currency: baseCurrency,
        byCurrency: combinedByCurrency,
        hasConversionErrors: netWorthHasErrors,
      },
      totalAssets: {
        amount: totalAssetsResult.totalInBaseCurrency,
        currency: baseCurrency,
        accountCount: assetAccountsForTotal.length,
        hasConversionErrors: totalAssetsResult.hasConversionErrors,
        byCurrency: assetsByCurrency,
      },
      totalLiabilities: {
        amount: totalLiabilitiesResult.totalInBaseCurrency,
        currency: baseCurrency,
        accountCount: liabilityAccountsForTotal.length,
        hasConversionErrors: totalLiabilitiesResult.hasConversionErrors,
        byCurrency: liabilitiesByCurrency,
      },
      accountBalances,
      recentActivity: {
        summary: activitySummary,
        summaryInBaseCurrency: {
          income: totalIncomeInBaseCurrency,
          expense: totalExpenseInBaseCurrency,
          net: totalIncomeInBaseCurrency - totalExpenseInBaseCurrency,
        },
        period: 30,
        baseCurrency,
      },
      recentTransactions: recentTransactions.slice(0, 5),
      stats: {
        totalAccounts: accounts.length,
        totalTransactions: await prisma.transaction.count({
          where: { userId: user.id },
        }),
        totalCategories: await prisma.category.count({
          where: { userId: user.id },
        }),
        accountingDays,
      },
      validation,
    })
  } catch (error) {
    console.error('Get dashboard summary error:', error)
    return errorResponse(getCommonError('INTERNAL_ERROR'), 500)
  }
}
