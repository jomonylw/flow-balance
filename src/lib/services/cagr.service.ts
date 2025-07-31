import { prisma } from '@/lib/database/connection-manager'
import { AccountType } from '@/types/core/constants'
import { convertMultipleCurrencies } from './currency.service'
import { calculateTotalBalanceWithConversion } from './dashboard-query.service'

/**
 * CAGR计算结果接口
 */
export interface CAGRResult {
  cagr: number // CAGR百分比
  startDate: Date | null // 开始日期（净资产首次为正）
  endDate: Date // 结束日期（当前）
  years: number // 计算年数
  initialNetWorth: number // 初始净资产
  currentNetWorth: number // 当前净资产
  totalNetContribution: number // 期间净投入
  adjustedGrowth: number // 调整后增长
  isValid: boolean // 是否有效（至少1年数据且初始净资产>0）
  message?: string // 说明信息
}

/**
 * 统一版：使用与当前净资产相同的计算逻辑
 * 基于 BALANCE 交易记录，而非累加所有交易
 */
async function calculateNetWorthAtDateOptimized(
  userId: string,
  asOfDate: Date,
  baseCurrency: { code: string; symbol: string; name: string }
): Promise<number> {
  try {
    const [totalAssetsResult, totalLiabilitiesResult] = await Promise.all([
      calculateTotalBalanceWithConversion(
        userId,
        AccountType.ASSET,
        baseCurrency,
        { asOfDate, includeAllUserCurrencies: false }
      ),
      calculateTotalBalanceWithConversion(
        userId,
        AccountType.LIABILITY,
        baseCurrency,
        { asOfDate, includeAllUserCurrencies: false }
      ),
    ])

    const netWorth =
      totalAssetsResult.totalInBaseCurrency -
      totalLiabilitiesResult.totalInBaseCurrency

    console.log(
      `统一逻辑净资产计算 - 日期: ${asOfDate.toISOString().split('T')[0]}, 资产: ${totalAssetsResult.totalInBaseCurrency}, 负债: ${totalLiabilitiesResult.totalInBaseCurrency}, 净资产: ${netWorth}`
    )

    return netWorth
  } catch (error) {
    console.error(`计算日期 ${asOfDate.toISOString()} 的净资产失败:`, error)
    return 0 // 发生错误时返回0
  }
}

/**
 * 优化版：使用二分查找找到净资产首次为正的日期
 * 避免逐日循环，大幅提升性能
 */
async function findFirstPositiveNetWorthDateOptimized(
  userId: string,
  baseCurrency: { code: string; symbol: string; name: string }
): Promise<Date | null> {
  try {
    // 获取所有交易日期，按时间排序
    const allTransactionDates = await prisma.transaction.findMany({
      where: { userId },
      select: { date: true },
      orderBy: { date: 'asc' },
      distinct: ['date'],
    })

    if (allTransactionDates.length === 0) {
      return null
    }

    const dates = allTransactionDates.map(t => t.date)

    // 先检查最后一天的净资产，如果仍为负则直接返回null
    const lastDate = dates[dates.length - 1]
    const lastNetWorth = await calculateNetWorthAtDateOptimized(
      userId,
      lastDate,
      baseCurrency
    )

    if (lastNetWorth <= 0) {
      console.log('CAGR: 净资产从未为正')
      return null
    }

    // 使用二分查找找到首次为正的日期
    let left = 0
    let right = dates.length - 1
    let firstPositiveDate: Date | null = null

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const midDate = dates[mid]
      const netWorth = await calculateNetWorthAtDateOptimized(
        userId,
        midDate,
        baseCurrency
      )

      if (netWorth > 0) {
        firstPositiveDate = midDate
        right = mid - 1 // 继续向左查找更早的正值日期
      } else {
        left = mid + 1 // 向右查找
      }
    }

    if (firstPositiveDate) {
      console.log(
        `CAGR: 找到首次正净资产日期: ${firstPositiveDate.toISOString()}, 使用二分查找优化`
      )
    }

    return firstPositiveDate
  } catch (error) {
    console.error('优化版查找首次正净资产日期失败:', error)
    return null
  }
}

/**
 * 优化版：使用数据库聚合计算期间净投入（收入 - 支出）
 */
async function calculateNetContributionOptimized(
  userId: string,
  startDate: Date,
  endDate: Date,
  baseCurrency: { code: string; symbol: string; name: string }
): Promise<number> {
  try {
    // 使用数据库聚合直接计算收入和支出
    const [incomeBalances, expenseBalances] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['currencyId'],
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
          account: { category: { type: AccountType.INCOME } },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['currencyId'],
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
          account: { category: { type: AccountType.EXPENSE } },
        },
        _sum: { amount: true },
      }),
    ])

    // 处理收入转换
    let totalIncome = 0
    if (incomeBalances.length > 0) {
      const incomeAmounts = incomeBalances
        .filter(balance => balance._sum.amount !== null)
        .map(balance => ({
          amount: Number(balance._sum.amount),
          currencyId: balance.currencyId,
        }))

      if (incomeAmounts.length > 0) {
        const incomeCurrencies = await prisma.currency.findMany({
          where: { id: { in: incomeAmounts.map(a => a.currencyId) } },
          select: { id: true, code: true },
        })

        const incomeConversionData = incomeAmounts.map(income => {
          const currency = incomeCurrencies.find(
            c => c.id === income.currencyId
          )
          return {
            amount: income.amount,
            currency: currency?.code || baseCurrency.code,
          }
        })

        const incomeConversions = await convertMultipleCurrencies(
          userId,
          incomeConversionData,
          baseCurrency.code
        )

        totalIncome = incomeConversions.reduce(
          (sum, result) =>
            sum +
            (result.success ? result.convertedAmount : result.originalAmount),
          0
        )
      }
    }

    // 处理支出转换
    let totalExpense = 0
    if (expenseBalances.length > 0) {
      const expenseAmounts = expenseBalances
        .filter(balance => balance._sum.amount !== null)
        .map(balance => ({
          amount: Number(balance._sum.amount),
          currencyId: balance.currencyId,
        }))

      if (expenseAmounts.length > 0) {
        const expenseCurrencies = await prisma.currency.findMany({
          where: { id: { in: expenseAmounts.map(a => a.currencyId) } },
          select: { id: true, code: true },
        })

        const expenseConversionData = expenseAmounts.map(expense => {
          const currency = expenseCurrencies.find(
            c => c.id === expense.currencyId
          )
          return {
            amount: expense.amount,
            currency: currency?.code || baseCurrency.code,
          }
        })

        const expenseConversions = await convertMultipleCurrencies(
          userId,
          expenseConversionData,
          baseCurrency.code
        )

        totalExpense = expenseConversions.reduce(
          (sum, result) =>
            sum +
            (result.success ? result.convertedAmount : result.originalAmount),
          0
        )
      }
    }

    const netContribution = totalIncome - totalExpense
    console.log(
      `CAGR: 优化版期间净投入计算 - 收入: ${totalIncome}, 支出: ${totalExpense}, 净投入: ${netContribution}`
    )

    return netContribution
  } catch (error) {
    console.error('优化版计算期间净投入失败:', error)
    return 0
  }
}

/**
 * 优化版：计算历史年化复合增长率（CAGR）
 * 基于净资产，排除净投入影响，从净资产首次为正开始计算
 * 使用数据库聚合查询，大幅提升性能
 */
export async function calculateHistoricalCAGR(
  userId: string,
  baseCurrency: { code: string; symbol: string; name: string }
): Promise<CAGRResult> {
  try {
    console.log('开始优化版CAGR计算...')
    const startTime = Date.now()

    // 1. 找到净资产首次为正的日期
    const startDate = await findFirstPositiveNetWorthDateOptimized(
      userId,
      baseCurrency
    )

    const endDate = new Date()

    if (!startDate) {
      return {
        cagr: 0,
        startDate: null,
        endDate,
        years: 0,
        initialNetWorth: 0,
        currentNetWorth: 0,
        totalNetContribution: 0,
        adjustedGrowth: 0,
        isValid: false,
        message: '净资产从未为正，无法计算CAGR',
      }
    }

    // 计算年数
    const years =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

    // 需要至少1年的数据
    if (years < 1) {
      return {
        cagr: 0,
        startDate,
        endDate,
        years,
        initialNetWorth: 0,
        currentNetWorth: 0,
        totalNetContribution: 0,
        adjustedGrowth: 0,
        isValid: false,
        message: `数据历史不足1年（${years.toFixed(1)}年），无法计算CAGR`,
      }
    }

    // 2. 并行计算初始净资产、当前净资产和期间净投入
    const [initialNetWorth, currentNetWorth, totalNetContribution] =
      await Promise.all([
        calculateNetWorthAtDateOptimized(userId, startDate, baseCurrency),
        calculateNetWorthAtDateOptimized(userId, endDate, baseCurrency),
        calculateNetContributionOptimized(
          userId,
          startDate,
          endDate,
          baseCurrency
        ),
      ])

    // 4. 计算调整后的增长
    const adjustedGrowth =
      currentNetWorth - initialNetWorth - totalNetContribution

    // 5. 计算CAGR
    let cagr = 0
    if (initialNetWorth > 0) {
      const finalAdjustedNetWorth = initialNetWorth + adjustedGrowth
      if (finalAdjustedNetWorth > 0) {
        cagr = Math.pow(finalAdjustedNetWorth / initialNetWorth, 1 / years) - 1
      }
    }

    // 限制在合理范围内
    const cagrPercentage = Math.max(-50, Math.min(100, cagr * 100))

    const endTime = Date.now()
    const executionTime = endTime - startTime

    console.log('优化版CAGR计算详情:', {
      executionTime: `${executionTime}ms`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      years: years.toFixed(2),
      initialNetWorth,
      currentNetWorth,
      totalNetContribution,
      adjustedGrowth,
      rawCAGR: cagr * 100,
      finalCAGR: cagrPercentage,
    })

    return {
      cagr: cagrPercentage,
      startDate,
      endDate,
      years,
      initialNetWorth,
      currentNetWorth,
      totalNetContribution,
      adjustedGrowth,
      isValid: true,
      message: `基于${years.toFixed(1)}年历史数据计算的优化版CAGR（${executionTime}ms）`,
    }
  } catch (error) {
    console.error('计算历史CAGR失败:', error)
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
      message: '计算CAGR时发生错误',
    }
  }
}
