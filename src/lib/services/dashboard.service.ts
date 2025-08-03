import { prisma } from '@/lib/database/connection-manager'
import { AccountType } from '@/types/core/constants'
import { calculateTotalBalanceWithConversion } from '@/lib/services/account.service'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
import { subMonths, endOfMonth, startOfMonth, format } from 'date-fns'
import { BUSINESS_LIMITS } from '@/lib/constants/app-config'
import {
  getDashboardCashFlow,
  getNetWorthHistory,
} from '@/lib/database/queries'
import { getIncomeExpenseAnalysis } from './dashboard-query.service'

// Dashboard service 专用货币类型（匹配 getUserBaseCurrency 的返回值）
type DashboardCurrency = {
  code: string
  symbol: string
  name: string
  id?: string
  decimalPlaces?: number
  isCustom?: boolean
  createdBy?: string | null
}

/**
 * 月度数据计算结果类型
 */
export interface MonthlyDataPoint {
  month: string
  monthName: string
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  monthlyIncome: number
  monthlyExpense: number
  netCashFlow: number
  hasConversionErrors: boolean
  error?: string
}

/**
 * 获取用户的基础货币设置
 */
export async function getUserBaseCurrency(userId: string) {
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
    include: { baseCurrency: true },
  })

  return (
    userSettings?.baseCurrency || {
      code: 'CNY',
      symbol: '¥',
      name: '人民币',
    }
  )
}

/**
 * 优化版本：批量获取多个月份的净资产数据
 * 使用数据库聚合查询替代内存计算
 */
export async function getOptimizedMonthlyNetWorthData(
  userId: string,
  monthsList: Date[],
  baseCurrency: DashboardCurrency
): Promise<
  Array<{
    month: string
    monthName: string
    netWorth: number
    totalAssets: number
    totalLiabilities: number
    hasConversionErrors: boolean
  }>
> {
  if (monthsList.length === 0) {
    return []
  }

  const results: Array<{
    month: string
    monthName: string
    netWorth: number
    totalAssets: number
    totalLiabilities: number
    hasConversionErrors: boolean
  }> = []

  try {
    // 计算日期范围
    const startDate = monthsList[0]
    const endDate = endOfMonth(monthsList[monthsList.length - 1])

    // 使用新的批量查询函数，一次性获取所有月份的净资产数据
    const netWorthData = await getNetWorthHistory(userId, startDate, endDate)

    // 按月份分组数据
    const monthlyDataMap = new Map<
      string,
      {
        assets: Array<{ amount: number; currency: string }>
        liabilities: Array<{ amount: number; currency: string }>
      }
    >()

    // 初始化所有月份的数据结构
    monthsList.forEach(date => {
      const monthKey = format(date, 'yyyy-MM')
      monthlyDataMap.set(monthKey, { assets: [], liabilities: [] })
    })

    // 填充数据
    netWorthData.forEach(row => {
      const monthData = monthlyDataMap.get(row.month)
      if (monthData) {
        if (row.categoryType === 'ASSET') {
          monthData.assets.push({
            amount: row.totalBalance,
            currency: row.currencyCode,
          })
        } else if (row.categoryType === 'LIABILITY') {
          monthData.liabilities.push({
            amount: Math.abs(row.totalBalance), // 负债显示为正数
            currency: row.currencyCode,
          })
        }
      }
    })

    // 批量处理货币转换
    for (const targetDate of monthsList) {
      const monthEnd = endOfMonth(targetDate)
      const monthLabel = format(targetDate, 'yyyy-MM')
      const monthName = format(targetDate, 'yyyy年MM月')
      const monthData = monthlyDataMap.get(monthLabel)

      if (!monthData) {
        results.push({
          month: monthLabel,
          monthName,
          netWorth: 0,
          totalAssets: 0,
          totalLiabilities: 0,
          hasConversionErrors: false,
        })
        continue
      }

      try {
        // 批量货币转换
        const [assetConversions, liabilityConversions] = await Promise.all([
          convertMultipleCurrencies(
            userId,
            monthData.assets,
            baseCurrency.code,
            monthEnd
          ),
          convertMultipleCurrencies(
            userId,
            monthData.liabilities,
            baseCurrency.code,
            monthEnd
          ),
        ])

        // 计算总资产
        const totalAssets = assetConversions.reduce((sum, result) => {
          if (result.success) {
            return sum + result.convertedAmount
          } else if (result.originalCurrency === baseCurrency.code) {
            return sum + result.originalAmount
          }
          return sum
        }, 0)

        // 计算总负债
        const totalLiabilities = liabilityConversions.reduce((sum, result) => {
          if (result.success) {
            return sum + result.convertedAmount
          } else if (result.originalCurrency === baseCurrency.code) {
            return sum + result.originalAmount
          }
          return sum
        }, 0)

        const netWorth = totalAssets - totalLiabilities
        const hasConversionErrors =
          assetConversions.some(r => !r.success) ||
          liabilityConversions.some(r => !r.success)

        results.push({
          month: monthLabel,
          monthName,
          netWorth,
          totalAssets,
          totalLiabilities,
          hasConversionErrors,
        })
      } catch (error) {
        console.error(`计算月份 ${monthLabel} 净资产时出错:`, error)
        results.push({
          month: monthLabel,
          monthName,
          netWorth: 0,
          totalAssets: 0,
          totalLiabilities: 0,
          hasConversionErrors: true,
        })
      }
    }
  } catch (error) {
    console.error('批量获取净资产数据失败:', error)
    // 如果批量查询失败，返回空数据而不是抛出错误
    return monthsList.map(date => ({
      month: format(date, 'yyyy-MM'),
      monthName: format(date, 'yyyy年MM月'),
      netWorth: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      hasConversionErrors: true,
    }))
  }

  return results
}

/**
 * 计算指定月份的净资产数据
 */
export async function calculateMonthlyNetWorthData(
  userId: string,
  targetDate: Date,
  baseCurrency: DashboardCurrency
): Promise<{
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  hasConversionErrors: boolean
}> {
  const monthEnd = endOfMonth(targetDate)

  const [assetResult, liabilityResult] = await Promise.all([
    calculateTotalBalanceWithConversion(
      userId,
      AccountType.ASSET,
      baseCurrency,
      {
        asOfDate: monthEnd,
      }
    ),
    calculateTotalBalanceWithConversion(
      userId,
      AccountType.LIABILITY,
      baseCurrency,
      { asOfDate: monthEnd }
    ),
  ])

  const totalAssets = assetResult.totalInBaseCurrency
  const totalLiabilities = Math.abs(liabilityResult.totalInBaseCurrency) // 负债显示为正数
  const netWorth = totalAssets - totalLiabilities

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    hasConversionErrors:
      assetResult.hasConversionErrors || liabilityResult.hasConversionErrors,
  }
}

/**
 * 计算指定月份的现金流数据
 */
export async function calculateMonthlyCashFlowData(
  userId: string,
  targetDate: Date,
  baseCurrency: DashboardCurrency
): Promise<{
  monthlyIncome: number
  monthlyExpense: number
  netCashFlow: number
  hasConversionErrors: boolean
}> {
  const monthStart = startOfMonth(targetDate)
  const monthEnd = endOfMonth(targetDate)
  const periodDays =
    (monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24) + 1

  // 使用重构后的服务获取收支数据
  const {
    totalIncomeInBaseCurrency,
    totalExpenseInBaseCurrency,
    hasConversionErrors,
  } = await getIncomeExpenseAnalysis(userId, baseCurrency, periodDays)

  const netCashFlow = totalIncomeInBaseCurrency - totalExpenseInBaseCurrency

  return {
    monthlyIncome: totalIncomeInBaseCurrency,
    monthlyExpense: totalExpenseInBaseCurrency,
    netCashFlow,
    hasConversionErrors,
  }
}

/**
 * 优化版本：批量获取多个月份的现金流数据
 * 使用数据库聚合查询替代内存计算
 */
export async function getOptimizedMonthlyCashFlowData(
  userId: string,
  monthsList: Date[],
  baseCurrency: DashboardCurrency
): Promise<
  Array<{
    month: string
    monthName: string
    monthlyIncome: number
    monthlyExpense: number
    netCashFlow: number
    hasConversionErrors: boolean
  }>
> {
  if (monthsList.length === 0) {
    return []
  }

  const results: Array<{
    month: string
    monthName: string
    monthlyIncome: number
    monthlyExpense: number
    netCashFlow: number
    hasConversionErrors: boolean
  }> = []

  try {
    // 计算日期范围
    const startDate = monthsList[0]
    const endDate = endOfMonth(monthsList[monthsList.length - 1])

    // 使用新的批量查询函数，一次性获取所有月份的现金流数据
    const cashFlowData = await getDashboardCashFlow(userId, startDate, endDate)

    // 按月份分组数据
    const monthlyDataMap = new Map<
      string,
      {
        income: Array<{ amount: number; currency: string }>
        expense: Array<{ amount: number; currency: string }>
      }
    >()

    // 初始化所有月份的数据结构
    monthsList.forEach(date => {
      const monthKey = format(date, 'yyyy-MM')
      monthlyDataMap.set(monthKey, { income: [], expense: [] })
    })

    // 填充数据
    cashFlowData.forEach(row => {
      const monthData = monthlyDataMap.get(row.month)
      if (monthData) {
        if (row.categoryType === 'INCOME') {
          monthData.income.push({
            amount: row.totalAmount,
            currency: row.currencyCode,
          })
        } else if (row.categoryType === 'EXPENSE') {
          monthData.expense.push({
            amount: row.totalAmount,
            currency: row.currencyCode,
          })
        }
      }
    })

    // 批量处理货币转换
    for (const targetDate of monthsList) {
      const monthEnd = endOfMonth(targetDate)
      const monthLabel = format(targetDate, 'yyyy-MM')
      const monthName = format(targetDate, 'yyyy年MM月')
      const monthData = monthlyDataMap.get(monthLabel)

      if (!monthData) {
        results.push({
          month: monthLabel,
          monthName,
          monthlyIncome: 0,
          monthlyExpense: 0,
          netCashFlow: 0,
          hasConversionErrors: false,
        })
        continue
      }

      try {
        // 批量货币转换
        const [incomeConversions, expenseConversions] = await Promise.all([
          convertMultipleCurrencies(
            userId,
            monthData.income,
            baseCurrency.code,
            monthEnd
          ),
          convertMultipleCurrencies(
            userId,
            monthData.expense,
            baseCurrency.code,
            monthEnd
          ),
        ])

        // 计算本位币金额
        const monthlyIncome = incomeConversions.reduce((sum, result) => {
          if (result.success) {
            return sum + result.convertedAmount
          } else if (result.originalCurrency === baseCurrency.code) {
            return sum + result.originalAmount
          }
          return sum
        }, 0)

        const monthlyExpense = expenseConversions.reduce((sum, result) => {
          if (result.success) {
            return sum + result.convertedAmount
          } else if (result.originalCurrency === baseCurrency.code) {
            return sum + result.originalAmount
          }
          return sum
        }, 0)

        const netCashFlow = monthlyIncome - monthlyExpense
        const hasConversionErrors =
          incomeConversions.some(r => !r.success) ||
          expenseConversions.some(r => !r.success)

        results.push({
          month: monthLabel,
          monthName,
          monthlyIncome,
          monthlyExpense,
          netCashFlow,
          hasConversionErrors,
        })
      } catch (error) {
        console.error(`计算月份 ${monthLabel} 现金流时出错:`, error)
        results.push({
          month: monthLabel,
          monthName,
          monthlyIncome: 0,
          monthlyExpense: 0,
          netCashFlow: 0,
          hasConversionErrors: true,
        })
      }
    }
  } catch (error) {
    console.error('批量获取现金流数据失败:', error)
    // 如果批量查询失败，返回空数据而不是抛出错误
    return monthsList.map(date => ({
      month: format(date, 'yyyy-MM'),
      monthName: format(date, 'yyyy年MM月'),
      monthlyIncome: 0,
      monthlyExpense: 0,
      netCashFlow: 0,
      hasConversionErrors: true,
    }))
  }

  return results
}

/**
 * 生成月份列表
 */
export function generateMonthsList(
  monthsOrStartDate: number | Date,
  endDate: Date = new Date()
): Date[] {
  const monthsList: Date[] = []
  let startDate: Date

  if (typeof monthsOrStartDate === 'number') {
    // 基于月份数生成
    const months = Math.min(monthsOrStartDate, BUSINESS_LIMITS.MAX_CHART_MONTHS)
    startDate = subMonths(endDate, months - 1)
  } else {
    // 基于开始日期生成
    startDate = monthsOrStartDate
  }

  let currentMonth = startOfMonth(startDate)
  const finalMonth = startOfMonth(endDate)

  while (currentMonth <= finalMonth) {
    monthsList.push(currentMonth)
    const nextMonthDate = new Date(currentMonth)
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1)
    currentMonth = startOfMonth(nextMonthDate)
  }

  // 确保不超过最大月份限制
  if (monthsList.length > BUSINESS_LIMITS.MAX_CHART_MONTHS) {
    return monthsList.slice(-BUSINESS_LIMITS.MAX_CHART_MONTHS)
  }

  return monthsList
}

/**
 * 获取用户最早的交易日期，用于动态确定数据范围
 */
export async function getUserEarliestTransactionDate(
  userId: string
): Promise<Date | null> {
  const earliestTransaction = await prisma.transaction.findFirst({
    where: { userId },
    orderBy: { date: 'asc' },
    select: { date: true },
  })

  return earliestTransaction?.date || null
}
