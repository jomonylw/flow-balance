import { prisma } from '@/lib/database/prisma'
import { AccountType } from '@/types/core/constants'
import { calculateTotalBalanceWithConversion, type ServiceAccount } from './account.service'
import { convertMultipleCurrencies } from './currency.service'

/**
 * CAGR计算结果接口
 */
export interface CAGRResult {
  cagr: number                    // CAGR百分比
  startDate: Date | null          // 开始日期（净资产首次为正）
  endDate: Date                   // 结束日期（当前）
  years: number                   // 计算年数
  initialNetWorth: number         // 初始净资产
  currentNetWorth: number         // 当前净资产
  totalNetContribution: number    // 期间净投入
  adjustedGrowth: number          // 调整后增长
  isValid: boolean               // 是否有效（至少1年数据且初始净资产>0）
  message?: string               // 说明信息
}

/**
 * 计算指定日期的净资产
 */
async function calculateNetWorthAtDate(
  userId: string,
  asOfDate: Date,
  assetAccounts: ServiceAccount[],
  liabilityAccounts: ServiceAccount[],
  baseCurrency: { code: string; symbol: string; name: string }
): Promise<number> {
  try {
    // 计算指定日期的资产和负债总额
    const [assetsResult, liabilitiesResult] = await Promise.all([
      calculateTotalBalanceWithConversion(userId, assetAccounts, baseCurrency, { asOfDate }),
      calculateTotalBalanceWithConversion(userId, liabilityAccounts, baseCurrency, { asOfDate })
    ])

    return assetsResult.totalInBaseCurrency - liabilitiesResult.totalInBaseCurrency
  } catch (error) {
    console.error('计算净资产失败:', error)
    return 0
  }
}

/**
 * 找到净资产首次为正的日期
 */
async function findFirstPositiveNetWorthDate(
  userId: string,
  assetAccounts: ServiceAccount[],
  liabilityAccounts: ServiceAccount[],
  baseCurrency: { code: string; symbol: string; name: string }
): Promise<Date | null> {
  try {
    // 获取所有交易日期，按时间排序
    const allTransactionDates = await prisma.transaction.findMany({
      where: { userId },
      select: { date: true },
      orderBy: { date: 'asc' },
      distinct: ['date']
    })

    if (allTransactionDates.length === 0) {
      return null
    }

    // 逐日检查净资产（从最早的交易日期开始）
    for (const { date } of allTransactionDates) {
      const netWorth = await calculateNetWorthAtDate(
        userId, 
        date, 
        assetAccounts, 
        liabilityAccounts, 
        baseCurrency
      )
      
      if (netWorth > 0) {
        console.log(`CAGR: 找到首次正净资产日期: ${date.toISOString()}, 净资产: ${netWorth}`)
        return date
      }
    }

    return null // 净资产从未为正
  } catch (error) {
    console.error('查找首次正净资产日期失败:', error)
    return null
  }
}

/**
 * 转换并汇总交易金额
 */
async function convertAndSumTransactions(
  transactions: Array<{
    amount: any
    currency: { code: string }
  }>,
  baseCurrencyCode: string,
  userId: string
): Promise<number> {
  if (transactions.length === 0) {
    return 0
  }

  const amounts = transactions.map(transaction => ({
    amount: typeof transaction.amount === 'number' 
      ? transaction.amount 
      : parseFloat(transaction.amount.toString()),
    currency: transaction.currency.code,
  }))

  try {
    const conversions = await convertMultipleCurrencies(
      userId,
      amounts,
      baseCurrencyCode
    )

    return conversions.reduce(
      (sum, result) =>
        sum + (result.success ? result.convertedAmount : result.originalAmount),
      0
    )
  } catch (error) {
    console.error('转换交易金额失败:', error)
    // 转换失败时使用原始金额作为近似值（仅限相同币种）
    return amounts
      .filter(amount => amount.currency === baseCurrencyCode)
      .reduce((sum, amount) => sum + amount.amount, 0)
  }
}

/**
 * 计算期间净投入（收入 - 支出）
 */
async function calculateNetContribution(
  userId: string,
  startDate: Date,
  endDate: Date,
  baseCurrency: { code: string; symbol: string; name: string }
): Promise<number> {
  try {
    // 获取期间内的收入和支出交易
    const [incomeTransactions, expenseTransactions] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
          account: { category: { type: AccountType.INCOME } }
        },
        include: { currency: true }
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
          account: { category: { type: AccountType.EXPENSE } }
        },
        include: { currency: true }
      })
    ])

    // 转换为基础货币并计算总额
    const [totalIncome, totalExpense] = await Promise.all([
      convertAndSumTransactions(incomeTransactions, baseCurrency.code, userId),
      convertAndSumTransactions(expenseTransactions, baseCurrency.code, userId)
    ])

    console.log(`CAGR: 期间净投入计算 - 收入: ${totalIncome}, 支出: ${totalExpense}, 净投入: ${totalIncome - totalExpense}`)

    return totalIncome - totalExpense
  } catch (error) {
    console.error('计算期间净投入失败:', error)
    return 0
  }
}

/**
 * 计算历史年化复合增长率（CAGR）
 * 基于净资产，排除净投入影响，从净资产首次为正开始计算
 */
export async function calculateHistoricalCAGR(
  userId: string,
  assetAccounts: ServiceAccount[],
  liabilityAccounts: ServiceAccount[],
  baseCurrency: { code: string; symbol: string; name: string }
): Promise<CAGRResult> {
  try {
    // 1. 找到净资产首次为正的日期
    const startDate = await findFirstPositiveNetWorthDate(
      userId, 
      assetAccounts, 
      liabilityAccounts, 
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
        message: '净资产从未为正，无法计算CAGR'
      }
    }

    // 计算年数
    const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

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
        message: `数据历史不足1年（${years.toFixed(1)}年），无法计算CAGR`
      }
    }

    // 2. 计算初始和当前净资产
    const [initialNetWorth, currentNetWorth] = await Promise.all([
      calculateNetWorthAtDate(userId, startDate, assetAccounts, liabilityAccounts, baseCurrency),
      calculateNetWorthAtDate(userId, endDate, assetAccounts, liabilityAccounts, baseCurrency)
    ])

    // 3. 计算期间净投入
    const totalNetContribution = await calculateNetContribution(
      userId, 
      startDate, 
      endDate, 
      baseCurrency
    )

    // 4. 计算调整后的增长
    const adjustedGrowth = currentNetWorth - initialNetWorth - totalNetContribution

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

    console.log('CAGR计算详情:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      years: years.toFixed(2),
      initialNetWorth,
      currentNetWorth,
      totalNetContribution,
      adjustedGrowth,
      rawCAGR: cagr * 100,
      finalCAGR: cagrPercentage
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
      message: `基于${years.toFixed(1)}年历史数据计算的CAGR`
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
      message: '计算CAGR时发生错误'
    }
  }
}
