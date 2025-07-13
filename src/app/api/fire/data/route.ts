import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { AccountType, TransactionType } from '@/types/core/constants'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
import { normalizeEndOfDay, getDaysAgoDateRange } from '@/lib/utils/date-range'
import { calculateHistoricalCAGR } from '@/lib/services/cagr.service'

/**
 * 优化的净资产计算函数
 * 使用数据库聚合而不是加载全部交易数据
 */
async function calculateOptimizedNetWorth(
  userId: string,
  baseCurrency: { code: string; symbol: string; name: string },
  asOfDate: Date = new Date()
): Promise<{
  currentNetWorth: number
  totalAssets: number
  totalLiabilities: number
  conversionErrors: boolean
}> {
  // 获取资产账户的余额聚合
  const assetBalances = await prisma.transaction.groupBy({
    by: ['currencyId'],
    where: {
      userId,
      date: { lte: asOfDate },
      account: {
        category: { type: AccountType.ASSET },
      },
    },
    _sum: { amount: true },
  })

  // 获取负债账户的余额聚合
  const liabilityBalances = await prisma.transaction.groupBy({
    by: ['currencyId'],
    where: {
      userId,
      date: { lte: asOfDate },
      account: {
        category: { type: AccountType.LIABILITY },
      },
    },
    _sum: { amount: true },
  })

  // 获取货币信息以便转换
  const currencyIds = [
    ...new Set([
      ...assetBalances.map(b => b.currencyId),
      ...liabilityBalances.map(b => b.currencyId),
    ]),
  ]

  const currencies = await prisma.currency.findMany({
    where: { id: { in: currencyIds } },
  })

  const currencyMap = new Map(currencies.map(c => [c.id, c.code]))

  // 准备转换数据
  const assetAmounts = assetBalances
    .filter(balance => balance._sum && balance._sum.amount !== null)
    .map(balance => ({
      amount: parseFloat(balance._sum!.amount!.toString()),
      currency: currencyMap.get(balance.currencyId) || 'UNKNOWN',
    }))
    .filter(item => item.currency !== 'UNKNOWN')

  const liabilityAmounts = liabilityBalances
    .filter(balance => balance._sum && balance._sum.amount !== null)
    .map(balance => ({
      amount: parseFloat(balance._sum!.amount!.toString()),
      currency: currencyMap.get(balance.currencyId) || 'UNKNOWN',
    }))
    .filter(item => item.currency !== 'UNKNOWN')

  let totalAssets = 0
  let totalLiabilities = 0
  let conversionErrors = false

  try {
    // 并行转换资产和负债
    const [assetConversions, liabilityConversions] = await Promise.all([
      assetAmounts.length > 0
        ? convertMultipleCurrencies(
            userId,
            assetAmounts,
            baseCurrency.code,
            asOfDate
          )
        : Promise.resolve([]),
      liabilityAmounts.length > 0
        ? convertMultipleCurrencies(
            userId,
            liabilityAmounts,
            baseCurrency.code,
            asOfDate
          )
        : Promise.resolve([]),
    ])

    // 计算总资产
    totalAssets = assetConversions.reduce((sum, result) => {
      if (result.success) {
        return sum + result.convertedAmount
      } else {
        conversionErrors = true
        return (
          sum +
          (result.fromCurrency === baseCurrency.code
            ? result.originalAmount
            : 0)
        )
      }
    }, 0)

    // 计算总负债
    totalLiabilities = liabilityConversions.reduce((sum, result) => {
      if (result.success) {
        return sum + result.convertedAmount
      } else {
        conversionErrors = true
        return (
          sum +
          (result.fromCurrency === baseCurrency.code
            ? result.originalAmount
            : 0)
        )
      }
    }, 0)
  } catch (error) {
    console.error('净资产计算中的货币转换失败:', error)
    conversionErrors = true

    // 降级处理：只使用本位币的金额
    totalAssets = assetAmounts
      .filter(a => a.currency === baseCurrency.code)
      .reduce((sum, a) => sum + a.amount, 0)
    totalLiabilities = liabilityAmounts
      .filter(l => l.currency === baseCurrency.code)
      .reduce((sum, l) => sum + l.amount, 0)
  }

  return {
    currentNetWorth: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    conversionErrors,
  }
}

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

    // 获取当前日期，确保不包含未来的交易记录
    const now = new Date()
    const nowEndOfDay = normalizeEndOfDay(now)

    // 计算过去12个月和过去6个月的日期范围
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
    twelveMonthsAgo.setHours(0, 0, 0, 0)

    const { startDate: sixMonthsAgo } = getDaysAgoDateRange(180)

    // 优化：合并所有交易查询为一个查询
    // 获取过去12个月的所有收入和支出交易
    const allTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: twelveMonthsAgo,
          lte: nowEndOfDay,
        },
        OR: [
          { type: TransactionType.EXPENSE },
          { type: TransactionType.INCOME },
          {
            account: {
              category: {
                type: { in: [AccountType.INCOME, AccountType.EXPENSE] },
              },
            },
          },
        ],
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

    // 分离不同类型的交易
    const past12MonthsExpenses = allTransactions.filter(
      t =>
        t.type === TransactionType.EXPENSE ||
        t.account?.category?.type === AccountType.EXPENSE
    )

    const past6MonthsTransactions = allTransactions.filter(
      t => new Date(t.date) >= sixMonthsAgo
    )

    const past6MonthsIncome = past6MonthsTransactions.filter(
      t =>
        t.type === TransactionType.INCOME ||
        t.account?.category?.type === AccountType.INCOME
    )

    const past6MonthsExpenses = past6MonthsTransactions.filter(
      t =>
        t.type === TransactionType.EXPENSE ||
        t.account?.category?.type === AccountType.EXPENSE
    )

    console.log('FIRE API: 优化后的交易查询详情', {
      twelveMonthsAgo: twelveMonthsAgo.toISOString(),
      sixMonthsAgo: sixMonthsAgo.toISOString(),
      now: now.toISOString(),
      totalTransactionsCount: allTransactions.length,
      past12MonthsExpensesCount: past12MonthsExpenses.length,
      past6MonthsIncomeCount: past6MonthsIncome.length,
      past6MonthsExpensesCount: past6MonthsExpenses.length,
    })

    // 计算过去12个月总开销
    const expenseAmounts = past12MonthsExpenses.map(transaction => ({
      amount:
        typeof transaction.amount === 'number'
          ? transaction.amount
          : parseFloat(transaction.amount.toString()),
      currency: transaction.currency.code,
    }))

    let totalExpenses = 0
    try {
      if (expenseAmounts.length > 0) {
        const expenseConversions = await convertMultipleCurrencies(
          user.id,
          expenseAmounts,
          baseCurrency.code
        )

        totalExpenses = expenseConversions.reduce(
          (sum, result) =>
            sum +
            (result.success ? result.convertedAmount : result.originalAmount),
          0
        )
      }
    } catch (error) {
      console.error('转换支出金额失败:', error)
      totalExpenses = expenseAmounts
        .filter(expense => expense.currency === baseCurrency.code)
        .reduce((sum, expense) => sum + expense.amount, 0)
    }

    // 优化：使用数据库聚合计算净资产，避免加载全部交易数据
    const netWorthResult = await calculateOptimizedNetWorth(
      user.id,
      baseCurrency,
      now
    )

    const { currentNetWorth, totalAssets, totalLiabilities, conversionErrors } =
      netWorthResult

    console.log('FIRE API: 优化后的净资产计算结果', {
      currentNetWorth,
      totalAssets,
      totalLiabilities,
      conversionErrors,
      baseCurrency: baseCurrency.code,
    })

    // 计算历史年化回报率（基于净资产的CAGR）
    // 优化：只计算一次CAGR，避免重复计算
    let historicalAnnualReturn = 0.0
    let cagrDetails = null

    try {
      // 为CAGR计算准备账户数据（仅在需要时获取）
      const accountsForCAGR = await prisma.account.findMany({
        where: {
          userId: user.id,
          category: {
            type: { in: [AccountType.ASSET, AccountType.LIABILITY] },
          },
        },
        include: {
          category: true,
          transactions: {
            include: {
              currency: true,
            },
          },
        },
      })

      // 转换为CAGR服务所需的格式
      const assetAccounts = accountsForCAGR
        .filter(account => account.category?.type === AccountType.ASSET)
        .map(account => ({
          id: account.id,
          name: account.name,
          category: {
            id: account.category?.id,
            name: account.category?.name || '',
            type: account.category?.type as AccountType,
          },
          transactions: account.transactions.map(t => ({
            type: t.type as TransactionType,
            amount:
              typeof t.amount === 'number'
                ? t.amount
                : parseFloat(t.amount.toString()),
            date: t.date,
            currency: t.currency,
            notes: t.notes,
          })),
        }))

      const liabilityAccounts = accountsForCAGR
        .filter(account => account.category?.type === AccountType.LIABILITY)
        .map(account => ({
          id: account.id,
          name: account.name,
          category: {
            id: account.category?.id,
            name: account.category?.name || '',
            type: account.category?.type as AccountType,
          },
          transactions: account.transactions.map(t => ({
            type: t.type as TransactionType,
            amount:
              typeof t.amount === 'number'
                ? t.amount
                : parseFloat(t.amount.toString()),
            date: t.date,
            currency: t.currency,
            notes: t.notes,
          })),
        }))

      // 一次性计算CAGR和详细信息
      const cagrResult = await calculateHistoricalCAGR(
        user.id,
        assetAccounts,
        liabilityAccounts,
        baseCurrency
      )

      console.log('FIRE API: CAGR计算结果', cagrResult)

      if (cagrResult.isValid) {
        historicalAnnualReturn = cagrResult.cagr
        cagrDetails = {
          startDate: cagrResult.startDate?.toISOString(),
          endDate: cagrResult.endDate.toISOString(),
          years: cagrResult.years,
          initialNetWorth: cagrResult.initialNetWorth,
          currentNetWorth: cagrResult.currentNetWorth,
          totalNetContribution: cagrResult.totalNetContribution,
          adjustedGrowth: cagrResult.adjustedGrowth,
          message: cagrResult.message,
        }
      }
    } catch (error) {
      console.error('计算历史CAGR失败:', error)
      // 保持默认值
    }

    // 优化：使用已获取的交易数据计算过去6个月的平均月投入
    const recentIncomeAmounts = past6MonthsIncome.map(transaction => ({
      amount:
        typeof transaction.amount === 'number'
          ? transaction.amount
          : parseFloat(transaction.amount.toString()),
      currency: transaction.currency.code,
    }))

    const recentExpenseAmounts = past6MonthsExpenses.map(transaction => ({
      amount:
        typeof transaction.amount === 'number'
          ? transaction.amount
          : parseFloat(transaction.amount.toString()),
      currency: transaction.currency.code,
    }))

    let totalIncomeRecent = 0
    let totalExpensesRecent = 0

    try {
      const conversionPromises = []

      if (recentIncomeAmounts.length > 0) {
        conversionPromises.push(
          convertMultipleCurrencies(
            user.id,
            recentIncomeAmounts,
            baseCurrency.code
          )
        )
      } else {
        conversionPromises.push(Promise.resolve([]))
      }

      if (recentExpenseAmounts.length > 0) {
        conversionPromises.push(
          convertMultipleCurrencies(
            user.id,
            recentExpenseAmounts,
            baseCurrency.code
          )
        )
      } else {
        conversionPromises.push(Promise.resolve([]))
      }

      const [incomeConversions, expenseConversions] =
        await Promise.all(conversionPromises)

      totalIncomeRecent = incomeConversions.reduce(
        (sum, result) =>
          sum +
          (result.success ? result.convertedAmount : result.originalAmount),
        0
      )

      totalExpensesRecent = expenseConversions.reduce(
        (sum, result) =>
          sum +
          (result.success ? result.convertedAmount : result.originalAmount),
        0
      )
    } catch (error) {
      console.error('转换近期收支金额失败:', error)
      // 转换失败时使用原始金额作为近似值（仅限相同币种）
      totalIncomeRecent = recentIncomeAmounts
        .filter(income => income.currency === baseCurrency.code)
        .reduce((sum, income) => sum + income.amount, 0)
      totalExpensesRecent = recentExpenseAmounts
        .filter(expense => expense.currency === baseCurrency.code)
        .reduce((sum, expense) => sum + expense.amount, 0)
    }

    const monthlyNetInvestment = Math.max(
      0,
      (totalIncomeRecent - totalExpensesRecent) / 6
    )

    console.log('FIRE API: 过去6个月收支计算结果', {
      totalIncomeRecent,
      totalExpensesRecent,
      monthlyNetInvestment,
      recentIncomeCount: recentIncomeAmounts.length,
      recentExpenseCount: recentExpenseAmounts.length,
    })

    // 返回 FIRE 计算基础数据
    const result = {
      realitySnapshot: {
        past12MonthsExpenses: totalExpenses,
        currentNetWorth: currentNetWorth,
        historicalAnnualReturn: historicalAnnualReturn,
        monthlyNetInvestment: monthlyNetInvestment,
        cagrDetails: cagrDetails,
      },
      userSettings: {
        fireEnabled: userSettings.fireEnabled,
        fireSWR: userSettings.fireSWR,
      },
      baseCurrency: baseCurrency,
    }

    console.log('FIRE API: 最终返回结果摘要', {
      past12MonthsExpenses: totalExpenses,
      currentNetWorth: currentNetWorth,
      historicalAnnualReturn: historicalAnnualReturn,
      monthlyNetInvestment: monthlyNetInvestment,
      hasCAGRDetails: !!cagrDetails,
      conversionErrors: conversionErrors,
    })

    return successResponse(result)
  } catch (error) {
    console.error('Get FIRE data error:', error)
    return errorResponse('获取 FIRE 数据失败', 500)
  }
}
