/**
 * 货币转换工具函数
 * 提供统一的汇率查询和货币转换功能
 * 使用统一的缓存服务进行优化
 */

import { prisma } from '@/lib/database/connection-manager'
import {
  ServiceExchangeRateData,
  ConversionResult,
  getCachedUserActiveCurrency,
  getCachedUserExchangeRate,
  getCachedUserCurrencies,
  getCachedUserCurrencyRecords,
  getCachedMultipleCurrencyConversions,
} from '@/lib/services/cache.service'

// 导出类型
export type { ServiceExchangeRateData, ConversionResult }

// ==================== 公共 API 函数 ====================
// 这些函数使用缓存服务，为向后兼容性保留原有的函数名

/**
 * 根据货币代码查找用户实际使用的货币记录
 * @param userId 用户ID
 * @param currencyCode 货币代码
 * @returns 货币记录或null
 */
export async function findUserActiveCurrency(
  userId: string,
  currencyCode: string
) {
  return await getCachedUserActiveCurrency(userId, currencyCode)
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
): Promise<ServiceExchangeRateData | null> {
  return await getCachedUserExchangeRate(
    userId,
    fromCurrency,
    toCurrency,
    asOfDate
  )
}

/**
 * 获取用户使用的所有货币
 * @param userId 用户ID
 * @returns 货币代码数组
 */
export async function getUserCurrencies(userId: string): Promise<string[]> {
  return await getCachedUserCurrencies(userId)
}

/**
 * 获取用户使用的所有货币记录（包含ID信息）
 * @param userId 用户ID
 * @returns 货币记录数组
 */
export async function getUserCurrencyRecords(
  userId: string
): Promise<Array<{ id: string; code: string; name: string; symbol: string }>> {
  return await getCachedUserCurrencyRecords(userId)
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
  return await getCachedMultipleCurrencyConversions(
    userId,
    amounts,
    baseCurrency,
    asOfDate
  )
}

// ==================== 非缓存辅助函数 ====================

/**
 * 转换货币金额（单个转换，使用缓存服务）
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
    const exchangeRateData = await getCachedUserExchangeRate(
      userId,
      fromCurrency,
      toCurrency,
      asOfDate
    )

    if (!exchangeRateData) {
      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        fromCurrency,
        convertedAmount: amount,
        targetCurrency: toCurrency,
        exchangeRate: 1,
        rateDate: asOfDate || new Date(),
        success: false,
        error: `未找到 ${fromCurrency} 到 ${toCurrency} 的汇率设置`,
      }
    }

    const convertedAmount = amount * exchangeRateData.rate

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      fromCurrency,
      convertedAmount,
      targetCurrency: toCurrency,
      exchangeRate: exchangeRateData.rate,
      rateDate: exchangeRateData.effectiveDate,
      success: true,
    }
  } catch (error) {
    console.error('货币转换失败:', error)
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      fromCurrency,
      convertedAmount: amount,
      targetCurrency: toCurrency,
      exchangeRate: 1,
      rateDate: asOfDate || new Date(),
      success: false,
      error: '货币转换过程中发生错误',
    }
  }
}

/**
 * 检查用户是否需要设置汇率
 * @param userId 用户ID
 * @param baseCurrency 本位币代码
 * @returns 需要设置汇率的货币对数组
 */
export async function getMissingExchangeRates(
  userId: string,
  baseCurrency: string
): Promise<Array<{ fromCurrency: string; toCurrency: string }>> {
  try {
    // 获取用户的所有货币记录（包含ID）
    const userCurrencyRecords = await getCachedUserCurrencyRecords(userId)

    // 获取用户设置以确定实际使用的本位币记录
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      include: { baseCurrency: true },
    })

    let baseCurrencyRecord = userSettings?.baseCurrency

    // 如果用户设置中没有本位币，则查找匹配的货币记录
    if (!baseCurrencyRecord) {
      baseCurrencyRecord = await prisma.currency.findFirst({
        where: {
          code: baseCurrency,
          OR: [
            { createdBy: userId }, // 用户自定义货币
            { createdBy: null }, // 全局货币
          ],
        },
        orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
      })
    }

    if (!baseCurrencyRecord) {
      console.error(`本位币 ${baseCurrency} 不存在`)
      return []
    }

    const missingRates: Array<{ fromCurrency: string; toCurrency: string }> = []

    for (const currencyRecord of userCurrencyRecords) {
      // 使用货币ID进行比较，避免相同代码不同ID的问题
      if (currencyRecord.id !== baseCurrencyRecord.id) {
        const rate = await getCachedUserExchangeRate(
          userId,
          currencyRecord.code,
          baseCurrency
        )
        if (!rate) {
          missingRates.push({
            fromCurrency: currencyRecord.code,
            toCurrency: baseCurrency,
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
  // 注意：这个函数已被弃用，请使用 useUserCurrencyFormatter Hook
  // 这里保留硬编码的 'zh-CN' 是为了向后兼容，但建议迁移到新的Hook
  const formattedAmount = `${currency.symbol}${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

  if (showOriginal && originalAmount !== undefined && originalCurrency) {
    const formattedOriginal = `${originalCurrency.symbol}${originalAmount.toLocaleString(
      'zh-CN',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`
    return `${formattedAmount} (原: ${formattedOriginal})`
  }

  return formattedAmount
}

// ==================== 缓存失效函数导出 ====================
// 为向后兼容性重新导出缓存失效函数
export {
  revalidateUserCurrencyCache,
  revalidateExchangeRateCache,
  revalidateUserSettingsCache,
  revalidateAllCurrencyCache,
  revalidateAllCurrencyAndExchangeRateCache,
} from '@/lib/services/cache-revalidation'
