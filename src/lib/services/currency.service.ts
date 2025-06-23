/**
 * 货币转换工具函数
 * 提供统一的汇率查询和货币转换功能
 */

import { prisma } from '@/lib/database/prisma'

// 服务层专用的汇率数据类型（effectiveDate 为 Date 类型）
export interface ServiceExchangeRateData {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  effectiveDate: Date
  notes?: string
}

// 导入统一的 ConversionResult 类型
import type { ConversionResult } from '@/types/core'
export type { ConversionResult }

/**
 * 获取用户的汇率设置
 * @param userId 用户ID
 * @param fromCurrency 源货币
 * @param toCurrency 目标货币
 * @param asOfDate 查询日期（可选，默认为当前日期）
 * @returns 汇率数据或null
 */
/**
 * 根据货币代码查找用户实际使用的货币记录
 * @param userId 用户ID
 * @param currencyCode 货币代码
 * @returns 货币记录或null
 */
async function findUserActiveCurrency(userId: string, currencyCode: string) {
  // 首先查找用户在 userCurrency 表中选择的货币
  const userCurrency = await prisma.userCurrency.findFirst({
    where: {
      userId,
      isActive: true,
      currency: {
        code: currencyCode,
      },
    },
    include: {
      currency: true,
    },
  })

  if (userCurrency) {
    return userCurrency.currency
  }

  // 如果用户没有在 userCurrency 表中选择该货币，则回退到默认查找逻辑
  return await prisma.currency.findFirst({
    where: {
      code: currencyCode,
      OR: [
        { createdBy: userId }, // 用户自定义货币
        { createdBy: null }, // 全局货币
      ],
    },
    orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
  })
}

export async function getUserExchangeRate(
  userId: string,
  fromCurrency: string,
  toCurrency: string,
  asOfDate?: Date
): Promise<ServiceExchangeRateData | null> {
  try {
    const targetDate = asOfDate || new Date()

    // 查找用户实际使用的货币记录
    const fromCurrencyRecord = await findUserActiveCurrency(userId, fromCurrency)
    const toCurrencyRecord = await findUserActiveCurrency(userId, toCurrency)

    if (!fromCurrencyRecord || !toCurrencyRecord) {
      return null
    }

    // 如果源货币和目标货币是同一个货币记录，返回1:1汇率
    if (fromCurrencyRecord.id === toCurrencyRecord.id) {
      return {
        id: 'same-currency',
        fromCurrency,
        toCurrency,
        rate: 1,
        effectiveDate: targetDate,
        notes: '同币种转换',
      }
    }

    // 查找最近的有效汇率
    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: {
        userId,
        fromCurrencyId: fromCurrencyRecord.id,
        toCurrencyId: toCurrencyRecord.id,
        effectiveDate: {
          lte: targetDate,
        },
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    })

    if (!exchangeRate) {
      return null
    }

    return {
      id: exchangeRate.id,
      fromCurrency,
      toCurrency,
      rate: parseFloat(exchangeRate.rate.toString()),
      effectiveDate: exchangeRate.effectiveDate,
      notes: exchangeRate.notes || undefined,
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
    // 首先获取用户设置的可用货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        currency: {
          select: { code: true },
        },
      },
    })

    if (userCurrencies.length > 0) {
      return userCurrencies.map(uc => uc.currency.code)
    }

    // 如果用户没有设置可用货币，则回退到从交易记录中获取
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      select: {
        currency: {
          select: { code: true },
        },
      },
      distinct: ['currencyId'],
    })

    // 获取用户的本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      include: {
        baseCurrency: {
          select: { code: true },
        },
      },
    })

    const currencyCodes = new Set<string>()

    // 添加交易中的货币
    transactions.forEach(t => currencyCodes.add(t.currency.code))

    // 添加本位币
    if (userSettings?.baseCurrency?.code) {
      currencyCodes.add(userSettings.baseCurrency.code)
    }

    return Array.from(currencyCodes)
  } catch (error) {
    console.error('获取用户货币失败:', error)
    return []
  }
}

/**
 * 获取用户使用的所有货币记录（包含ID信息）
 * @param userId 用户ID
 * @returns 货币记录数组
 */
export async function getUserCurrencyRecords(userId: string): Promise<Array<{ id: string; code: string; name: string; symbol: string }>> {
  try {
    // 首先获取用户设置的可用货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        currency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
      },
    })

    if (userCurrencies.length > 0) {
      return userCurrencies.map(uc => uc.currency)
    }

    // 如果用户没有设置可用货币，则回退到从交易记录中获取
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      select: {
        currency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
      },
      distinct: ['currencyId'],
    })

    // 获取用户的本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      include: {
        baseCurrency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
      },
    })

    const currencyMap = new Map<string, { id: string; code: string; name: string; symbol: string }>()

    // 添加交易中的货币
    transactions.forEach(t => {
      currencyMap.set(t.currency.id, t.currency)
    })

    // 添加本位币
    if (userSettings?.baseCurrency) {
      currencyMap.set(userSettings.baseCurrency.id, userSettings.baseCurrency)
    }

    return Array.from(currencyMap.values())
  } catch (error) {
    console.error('获取用户货币记录失败:', error)
    return []
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
    const userCurrencyRecords = await getUserCurrencyRecords(userId)

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
        const rate = await getUserExchangeRate(userId, currencyRecord.code, baseCurrency)
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
