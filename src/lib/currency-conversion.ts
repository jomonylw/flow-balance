/**
 * 货币转换工具函数
 * 提供统一的汇率查询和货币转换功能
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export interface ExchangeRateData {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  effectiveDate: Date
  notes?: string
}

export interface ConversionResult {
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  targetCurrency: string
  exchangeRate: number
  rateDate: Date
  success: boolean
  error?: string
}

/**
 * 获取用户的汇率设置
 * @param userId 用户ID
 * @param fromCurrency 源货币
 * @param toCurrency 目标货币
 * @param asOfDate 查询日期（可选，默认为当前日期）
 * @returns 汇率数据或null
 */
export async function getUserExchangeRate(
  userId: string,
  fromCurrency: string,
  toCurrency: string,
  asOfDate?: Date
): Promise<ExchangeRateData | null> {
  try {
    // 如果源货币和目标货币相同，返回1:1汇率
    if (fromCurrency === toCurrency) {
      return {
        id: 'same-currency',
        fromCurrency,
        toCurrency,
        rate: 1,
        effectiveDate: asOfDate || new Date(),
        notes: '同币种转换'
      }
    }

    const targetDate = asOfDate || new Date()

    // 查找最近的有效汇率
    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: {
        userId,
        fromCurrency,
        toCurrency,
        effectiveDate: {
          lte: targetDate
        }
      },
      orderBy: {
        effectiveDate: 'desc'
      }
    })

    if (!exchangeRate) {
      return null
    }

    return {
      id: exchangeRate.id,
      fromCurrency: exchangeRate.fromCurrency,
      toCurrency: exchangeRate.toCurrency,
      rate: parseFloat(exchangeRate.rate.toString()),
      effectiveDate: exchangeRate.effectiveDate,
      notes: exchangeRate.notes || undefined
    }
  } catch (error) {
    console.error('获取汇率失败:', error)
    return null
  }
}

/**
 * 转换货币金额
 * @param userId 用户ID
 * @param amount 金额
 * @param fromCurrency 源货币
 * @param toCurrency 目标货币
 * @param asOfDate 转换日期（可选）
 * @returns 转换结果
 */
export async function convertCurrency(
  userId: string,
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  asOfDate?: Date
): Promise<ConversionResult> {
  try {
    const exchangeRateData = await getUserExchangeRate(
      userId,
      fromCurrency,
      toCurrency,
      asOfDate
    )

    if (!exchangeRateData) {
      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount: amount,
        targetCurrency: toCurrency,
        exchangeRate: 1,
        rateDate: asOfDate || new Date(),
        success: false,
        error: `未找到 ${fromCurrency} 到 ${toCurrency} 的汇率设置`
      }
    }

    const convertedAmount = amount * exchangeRateData.rate

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount,
      targetCurrency: toCurrency,
      exchangeRate: exchangeRateData.rate,
      rateDate: exchangeRateData.effectiveDate,
      success: true
    }
  } catch (error) {
    console.error('货币转换失败:', error)
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: amount,
      targetCurrency: toCurrency,
      exchangeRate: 1,
      rateDate: asOfDate || new Date(),
      success: false,
      error: '货币转换过程中发生错误'
    }
  }
}

/**
 * 批量转换多个金额到本位币
 * @param userId 用户ID
 * @param amounts 金额数组，格式：[{amount, currency}]
 * @param baseCurrency 本位币
 * @param asOfDate 转换日期（可选）
 * @returns 转换结果数组
 */
export async function convertMultipleCurrencies(
  userId: string,
  amounts: Array<{ amount: number; currency: string }>,
  baseCurrency: string,
  asOfDate?: Date
): Promise<ConversionResult[]> {
  const results: ConversionResult[] = []

  for (const { amount, currency } of amounts) {
    const result = await convertCurrency(
      userId,
      amount,
      currency,
      baseCurrency,
      asOfDate
    )
    results.push(result)
  }

  return results
}

/**
 * 获取用户使用的所有货币
 * @param userId 用户ID
 * @returns 货币代码数组
 */
export async function getUserCurrencies(userId: string): Promise<string[]> {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      select: { currencyCode: true },
      distinct: ['currencyCode']
    })

    return transactions.map(t => t.currencyCode)
  } catch (error) {
    console.error('获取用户货币失败:', error)
    return []
  }
}

/**
 * 检查用户是否需要设置汇率
 * @param userId 用户ID
 * @param baseCurrency 本位币
 * @returns 需要设置汇率的货币对数组
 */
export async function getMissingExchangeRates(
  userId: string,
  baseCurrency: string
): Promise<Array<{ fromCurrency: string; toCurrency: string }>> {
  try {
    const userCurrencies = await getUserCurrencies(userId)
    const missingRates: Array<{ fromCurrency: string; toCurrency: string }> = []

    for (const currency of userCurrencies) {
      if (currency !== baseCurrency) {
        const rate = await getUserExchangeRate(userId, currency, baseCurrency)
        if (!rate) {
          missingRates.push({
            fromCurrency: currency,
            toCurrency: baseCurrency
          })
        }
      }
    }

    return missingRates
  } catch (error) {
    console.error('检查缺失汇率失败:', error)
    return []
  }
}

/**
 * 格式化货币显示
 * @param amount 金额
 * @param currency 货币对象
 * @param showOriginal 是否显示原始金额（用于转换后的显示）
 * @param originalAmount 原始金额
 * @param originalCurrency 原始货币
 * @returns 格式化的货币字符串
 */
export function formatCurrencyDisplay(
  amount: number,
  currency: { code: string; symbol: string },
  showOriginal?: boolean,
  originalAmount?: number,
  originalCurrency?: { code: string; symbol: string }
): string {
  const formattedAmount = `${currency.symbol}${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`

  if (showOriginal && originalAmount !== undefined && originalCurrency) {
    const formattedOriginal = `${originalCurrency.symbol}${originalAmount.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
    return `${formattedAmount} (原: ${formattedOriginal})`
  }

  return formattedAmount
}
