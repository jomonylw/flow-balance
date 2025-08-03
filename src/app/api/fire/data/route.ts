import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { AccountType } from '@/types/core/constants'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
import { normalizeEndOfDay, getDaysAgoDateRange } from '@/lib/utils/date-range'
import { calculateHistoricalCAGR } from '@/lib/services/cagr.service'
import {
  getPast12MonthsExpense,
  getPast6MonthsIncomeExpense,
} from '@/lib/database/queries'
import { calculateTotalBalanceWithConversion as calculateTotalBalanceByAccountType } from '@/lib/services/dashboard-query.service'

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
  // 使用与 dashboard 一致的计算方式，确保结果一致性
  const [totalAssetsResult, totalLiabilitiesResult] = await Promise.all([
    calculateTotalBalanceByAccountType(
      userId,
      AccountType.ASSET,
      baseCurrency,
      { asOfDate, includeAllUserCurrencies: false }
    ),
    calculateTotalBalanceByAccountType(
      userId,
      AccountType.LIABILITY,
      baseCurrency,
      { asOfDate, includeAllUserCurrencies: false }
    ),
  ])

  // 计算净资产 = 总资产 - 总负债
  const currentNetWorth =
    totalAssetsResult.totalInBaseCurrency -
    totalLiabilitiesResult.totalInBaseCurrency

  const conversionErrors =
    totalAssetsResult.hasConversionErrors ||
    totalLiabilitiesResult.hasConversionErrors

  // 净资产计算完成，使用与dashboard一致的计算方式

  return {
    currentNetWorth,
    totalAssets: totalAssetsResult.totalInBaseCurrency,
    totalLiabilities: Math.abs(totalLiabilitiesResult.totalInBaseCurrency), // 显示为正数
    conversionErrors,
  }
}

/**
 * FIRE 数据 API
 * 提供 FIRE 计算所需的基础数据
 */
export async function GET(_request: NextRequest) {
  // 定义查询返回的行类型
  interface IncomeExpenseRow {
    transaction_type: string
    currency_code: string
    currency_symbol: string
    currency_name: string
    total_amount: number
  }

  interface ExpenseRow {
    currency_code: string
    currency_symbol: string
    currency_name: string
    total_amount: number
  }

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

    // 🚀 核心优化：三路并行处理 - 净资产、CAGR、近期收支

    const [netWorthResult, cagrResult, recentTransactionsData] =
      await Promise.all([
        // 并行任务1：计算净资产（使用数据库聚合）
        calculateOptimizedNetWorth(user.id, baseCurrency, now),

        // 并行任务2：计算CAGR（使用优化版本，不需要传递大量账户数据）
        calculateHistoricalCAGR(user.id, baseCurrency).catch(error => {
          console.error('CAGR计算失败:', error)
          return {
            cagr: 0,
            startDate: null,
            endDate: new Date(),
            years: 0,
            initialNetWorth: 0,
            currentNetWorth: 0,
            totalNetContribution: 0,
            adjustedGrowth: 0,
            isValid: false,
            message: 'CAGR计算失败',
          }
        }),

        // 并行任务3：使用数据库聚合计算收支数据（优化版）
        (async () => {
          // 使用重构后的查询函数
          const past12MonthsExpenseData = await getPast12MonthsExpense(
            user.id,
            twelveMonthsAgo,
            nowEndOfDay
          )
          const past6MonthsIncomeExpenseData =
            await getPast6MonthsIncomeExpense(
              user.id,
              sixMonthsAgo,
              nowEndOfDay
            )

          // 分离收入和支出数据
          const past6MonthsIncomeData = past6MonthsIncomeExpenseData.filter(
            (row: IncomeExpenseRow) => row.transaction_type === 'INCOME'
          )
          const past6MonthsExpenseData = past6MonthsIncomeExpenseData.filter(
            (row: IncomeExpenseRow) => row.transaction_type === 'EXPENSE'
          )

          // 数据库聚合查询完成，大幅减少数据传输量

          return {
            past12MonthsExpenseData,
            past6MonthsIncomeData,
            past6MonthsExpenseData,
          }
        })(),
      ])

    // 提取净资产计算结果
    const { currentNetWorth } = netWorthResult

    // 提取CAGR计算结果
    let historicalAnnualReturn = 0.0
    let cagrDetails = null

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

    // 提取数据库聚合后的收支数据
    const {
      past12MonthsExpenseData,
      past6MonthsIncomeData,
      past6MonthsExpenseData,
    } = recentTransactionsData

    // 准备过去12个月支出的货币转换数据
    const expenseAmounts = past12MonthsExpenseData.map((row: ExpenseRow) => ({
      amount: Number(row.total_amount),
      currency: row.currency_code,
    }))

    // 准备过去6个月收入的货币转换数据
    const recentIncomeAmounts = past6MonthsIncomeData.map(
      (row: IncomeExpenseRow) => ({
        amount: Number(row.total_amount),
        currency: row.currency_code,
      })
    )

    // 准备过去6个月支出的货币转换数据
    const recentExpenseAmounts = past6MonthsExpenseData.map(
      (row: IncomeExpenseRow) => ({
        amount: Number(row.total_amount),
        currency: row.currency_code,
      })
    )

    // 并行计算所有货币转换
    let totalExpenses = 0
    let totalIncomeRecent = 0
    let totalExpensesRecent = 0

    try {
      const conversionPromises = []

      // 过去12个月总开销转换
      if (expenseAmounts.length > 0) {
        conversionPromises.push(
          convertMultipleCurrencies(user.id, expenseAmounts, baseCurrency.code)
        )
      } else {
        conversionPromises.push(Promise.resolve([]))
      }

      // 过去6个月收入转换
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

      // 过去6个月支出转换
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

      const [expenseConversions, incomeConversions, recentExpenseConversions] =
        await Promise.all(conversionPromises)

      // 计算过去12个月总开销
      totalExpenses = expenseConversions.reduce(
        (sum, result) =>
          sum +
          (result.success ? result.convertedAmount : result.originalAmount),
        0
      )

      // 计算过去6个月收入
      totalIncomeRecent = incomeConversions.reduce(
        (sum, result) =>
          sum +
          (result.success ? result.convertedAmount : result.originalAmount),
        0
      )

      // 计算过去6个月支出
      totalExpensesRecent = recentExpenseConversions.reduce(
        (sum, result) =>
          sum +
          (result.success ? result.convertedAmount : result.originalAmount),
        0
      )
    } catch (error) {
      console.error('转换收支金额失败:', error)
      // 转换失败时使用原始金额作为近似值（仅限相同币种）
      totalExpenses = expenseAmounts
        .filter(
          (expense: { currency: string }) =>
            expense.currency === baseCurrency.code
        )
        .reduce(
          (sum: number, expense: { amount: number }) => sum + expense.amount,
          0
        )
      totalIncomeRecent = recentIncomeAmounts
        .filter(
          (income: { currency: string }) =>
            income.currency === baseCurrency.code
        )
        .reduce(
          (sum: number, income: { amount: number }) => sum + income.amount,
          0
        )
      totalExpensesRecent = recentExpenseAmounts
        .filter(
          (expense: { currency: string }) =>
            expense.currency === baseCurrency.code
        )
        .reduce(
          (sum: number, expense: { amount: number }) => sum + expense.amount,
          0
        )
    }

    const monthlyNetInvestment = Math.max(
      0,
      (totalIncomeRecent - totalExpensesRecent) / 6
    )

    // 过去6个月收支计算完成

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

    // 所有计算完成，准备返回结果

    return successResponse(result)
  } catch (error) {
    console.error('Get FIRE data error:', error)
    return errorResponse('获取 FIRE 数据失败', 500)
  }
}
