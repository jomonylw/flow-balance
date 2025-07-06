import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { AccountType, TransactionType } from '@/types/core/constants'
import { calculateTotalBalanceWithConversion } from '@/lib/services/account.service'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
import { normalizeEndOfDay, getDaysAgoDateRange } from '@/lib/utils/date-range'
import { calculateHistoricalCAGR } from '@/lib/services/cagr.service'

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

    // 计算过去12个月的总开销
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
    twelveMonthsAgo.setHours(0, 0, 0, 0) // 设置为12个月前的开始时间

    const expenseTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: twelveMonthsAgo,
          lte: nowEndOfDay, // 确保不包含未来交易，包含今天的所有交易
        },
        type: TransactionType.EXPENSE, // 使用交易类型而不是账户类别类型，与 Dashboard API 保持一致
      },
      include: {
        currency: true,
      },
    })

    console.log('FIRE API: 过去12个月支出查询详情', {
      twelveMonthsAgo: twelveMonthsAgo.toISOString(),
      now: now.toISOString(),
      expenseTransactionsCount: expenseTransactions.length,
      totalAmount: expenseTransactions.reduce(
        (sum, t) => sum + parseFloat(t.amount.toString()),
        0
      ),
    })

    // 计算总开销（转换为本位币）
    const expenseAmounts = expenseTransactions.map(transaction => ({
      amount:
        typeof transaction.amount === 'number'
          ? transaction.amount
          : parseFloat(transaction.amount.toString()),
      currency: transaction.currency.code,
    }))

    let totalExpenses = 0
    try {
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
    } catch (error) {
      console.error('转换支出金额失败:', error)
      // 转换失败时使用原始金额作为近似值（仅限相同币种）
      totalExpenses = expenseAmounts
        .filter(expense => expense.currency === baseCurrency.code)
        .reduce((sum, expense) => sum + expense.amount, 0)
    }

    console.log('FIRE API: 过去12个月支出计算结果', {
      totalExpenses,
      baseCurrency: baseCurrency.code,
      expenseAmountsCount: expenseAmounts.length,
    })

    // 计算当前净资产（使用与 Dashboard 相同的逻辑）
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

    // 转换账户数据格式以适配服务函数
    const accountsForCalculation = accounts.map(account => ({
      id: account.id,
      name: account.name,
      category: {
        id: account.category?.id,
        name: account.category?.name || '',
        type: account.category?.type as AccountType | undefined,
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

    // 分离存量类账户（资产和负债）
    const stockAccounts = accountsForCalculation.filter(
      account =>
        account.category?.type === AccountType.ASSET ||
        account.category?.type === AccountType.LIABILITY
    )

    // 分别计算资产和负债
    const assetAccounts = stockAccounts.filter(
      account => account.category?.type === AccountType.ASSET
    )
    const liabilityAccounts = stockAccounts.filter(
      account => account.category?.type === AccountType.LIABILITY
    )

    const [totalAssetsResult, totalLiabilitiesResult] = await Promise.all([
      calculateTotalBalanceWithConversion(
        user.id,
        assetAccounts,
        baseCurrency,
        { asOfDate: now }
      ),
      calculateTotalBalanceWithConversion(
        user.id,
        liabilityAccounts,
        baseCurrency,
        { asOfDate: now }
      ),
    ])

    const currentNetWorth =
      totalAssetsResult.totalInBaseCurrency -
      totalLiabilitiesResult.totalInBaseCurrency

    // 计算历史年化回报率（基于净资产的CAGR）
    let historicalAnnualReturn = 0.0 // 默认值

    try {
      // 使用新的CAGR计算方法
      const cagrResult = await calculateHistoricalCAGR(
        user.id,
        assetAccounts,
        liabilityAccounts,
        baseCurrency
      )

      console.log('FIRE API: CAGR计算结果', cagrResult)

      if (cagrResult.isValid) {
        historicalAnnualReturn = cagrResult.cagr
      }
    } catch (error) {
      console.error('计算历史CAGR失败:', error)
      // 保持默认值
    }

    // 计算过去6个月的平均月投入
    const { startDate: sixMonthsAgo, endDate: sixMonthsEndDate } =
      getDaysAgoDateRange(180) // 约6个月

    const [recentIncomeTransactions, recentExpenseTransactions] =
      await Promise.all([
        prisma.transaction.findMany({
          where: {
            userId: user.id,
            date: {
              gte: sixMonthsAgo,
              lte: sixMonthsEndDate,
            },
            account: {
              category: {
                type: AccountType.INCOME,
              },
            },
          },
          include: {
            currency: true,
          },
        }),
        prisma.transaction.findMany({
          where: {
            userId: user.id,
            date: {
              gte: sixMonthsAgo,
              lte: sixMonthsEndDate,
            },
            account: {
              category: {
                type: AccountType.EXPENSE,
              },
            },
          },
          include: {
            currency: true,
          },
        }),
      ])

    // 转换收入和支出到本位币
    const recentIncomeAmounts = recentIncomeTransactions.map(transaction => ({
      amount:
        typeof transaction.amount === 'number'
          ? transaction.amount
          : parseFloat(transaction.amount.toString()),
      currency: transaction.currency.code,
    }))

    const recentExpenseAmounts = recentExpenseTransactions.map(transaction => ({
      amount:
        typeof transaction.amount === 'number'
          ? transaction.amount
          : parseFloat(transaction.amount.toString()),
      currency: transaction.currency.code,
    }))

    let totalIncomeRecent = 0
    let totalExpensesRecent = 0

    try {
      const [incomeConversions, expenseConversions] = await Promise.all([
        convertMultipleCurrencies(
          user.id,
          recentIncomeAmounts,
          baseCurrency.code
        ),
        convertMultipleCurrencies(
          user.id,
          recentExpenseAmounts,
          baseCurrency.code
        ),
      ])

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

    // 获取CAGR详细信息
    let cagrDetails = null
    try {
      const cagrResult = await calculateHistoricalCAGR(
        user.id,
        assetAccounts,
        liabilityAccounts,
        baseCurrency
      )
      if (cagrResult.isValid) {
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
      console.error('获取CAGR详细信息失败:', error)
    }

    // 返回 FIRE 计算基础数据
    return successResponse({
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
    })
  } catch (error) {
    console.error('Get FIRE data error:', error)
    return errorResponse('获取 FIRE 数据失败', 500)
  }
}
