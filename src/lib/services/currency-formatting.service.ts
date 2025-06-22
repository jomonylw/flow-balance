/**
 * 货币格式化服务
 * 基于货币的小数位数配置进行精确格式化
 */

import { prisma } from '@/lib/database/prisma'

export interface CurrencyFormatConfig {
  code: string
  symbol: string
  decimalPlaces: number
}

// 缓存货币配置以提高性能
interface CacheEntry {
  config: CurrencyFormatConfig
  timestamp: number
}

const currencyConfigCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

/**
 * 获取货币格式化配置
 * @param currencyCode 货币代码
 * @returns 货币格式化配置
 */
export async function getCurrencyFormatConfig(
  currencyCode: string
): Promise<CurrencyFormatConfig | null> {
  try {
    // 检查缓存
    const cacheKey = currencyCode
    const cached = currencyConfigCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.config
    }

    // 从数据库获取（优先查找全局货币，因为格式化通常使用标准货币）
    const currency = await prisma.currency.findFirst({
      where: {
        code: currencyCode,
        // 格式化服务优先使用全局货币的配置
      },
      select: {
        code: true,
        symbol: true,
        decimalPlaces: true,
      },
      orderBy: { createdBy: 'asc' }, // null 值（全局货币）排在前面
    })

    if (!currency) {
      return null
    }

    const config: CurrencyFormatConfig = {
      code: currency.code,
      symbol: currency.symbol,
      decimalPlaces: currency.decimalPlaces,
    }

    // 更新缓存
    currencyConfigCache.set(cacheKey, {
      config,
      timestamp: Date.now(),
    })

    return config
  } catch (error) {
    console.error('获取货币格式化配置失败:', error)
    return null
  }
}

/**
 * 格式化货币金额
 * @param amount 金额
 * @param currencyCode 货币代码
 * @param locale 本地化设置，默认为 'zh-CN'
 * @returns 格式化后的货币字符串
 */
export async function formatCurrencyAmount(
  amount: number,
  currencyCode: string,
  locale: string = 'zh-CN'
): Promise<string> {
  try {
    const config = await getCurrencyFormatConfig(currencyCode)

    if (!config) {
      // 如果找不到配置，使用默认格式
      return `${amount.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${currencyCode}`
    }

    // 使用货币配置的小数位数
    const formattedAmount = amount.toLocaleString(locale, {
      minimumFractionDigits: config.decimalPlaces,
      maximumFractionDigits: config.decimalPlaces,
    })

    return `${config.symbol}${formattedAmount}`
  } catch (error) {
    console.error('格式化货币金额失败:', error)
    // 降级处理
    return `${amount.toLocaleString(locale)} ${currencyCode}`
  }
}

/**
 * 批量格式化货币金额
 * @param amounts 金额和货币代码的数组
 * @param locale 本地化设置
 * @returns 格式化后的货币字符串数组
 */
export async function formatMultipleCurrencyAmounts(
  amounts: Array<{ amount: number; currencyCode: string }>,
  locale: string = 'zh-CN'
): Promise<string[]> {
  try {
    // 获取所有涉及的货币配置
    const currencyCodes = [...new Set(amounts.map(item => item.currencyCode))]
    const configPromises = currencyCodes.map(code =>
      getCurrencyFormatConfig(code).then(config => ({ code, config }))
    )

    const configResults = await Promise.all(configPromises)
    const configMap = new Map<string, CurrencyFormatConfig | null>()

    configResults.forEach(({ code, config }) => {
      configMap.set(code, config)
    })

    // 格式化每个金额
    return amounts.map(({ amount, currencyCode }) => {
      const config = configMap.get(currencyCode)

      if (!config) {
        return `${amount.toLocaleString(locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} ${currencyCode}`
      }

      const formattedAmount = amount.toLocaleString(locale, {
        minimumFractionDigits: config.decimalPlaces,
        maximumFractionDigits: config.decimalPlaces,
      })

      return `${config.symbol}${formattedAmount}`
    })
  } catch (error) {
    console.error('批量格式化货币金额失败:', error)
    // 降级处理
    return amounts.map(
      ({ amount, currencyCode }) =>
        `${amount.toLocaleString(locale)} ${currencyCode}`
    )
  }
}

/**
 * 清除货币配置缓存
 * @param currencyCode 可选，指定清除特定货币的缓存，不指定则清除所有
 */
export function clearCurrencyConfigCache(currencyCode?: string): void {
  if (currencyCode) {
    currencyConfigCache.delete(currencyCode)
  } else {
    currencyConfigCache.clear()
  }
}

/**
 * 验证金额精度是否符合货币要求
 * @param amount 金额
 * @param currencyCode 货币代码
 * @returns 验证结果
 */
export async function validateAmountPrecision(
  amount: number,
  currencyCode: string
): Promise<{ valid: boolean; message?: string; correctedAmount?: number }> {
  try {
    const config = await getCurrencyFormatConfig(currencyCode)

    if (!config) {
      return { valid: true } // 如果找不到配置，认为有效
    }

    // 检查小数位数
    const decimalPart = amount.toString().split('.')[1]
    const actualDecimalPlaces = decimalPart ? decimalPart.length : 0

    if (actualDecimalPlaces > config.decimalPlaces) {
      // 自动修正到正确的小数位数
      const correctedAmount = parseFloat(amount.toFixed(config.decimalPlaces))

      return {
        valid: false,
        message: `${currencyCode} 最多支持 ${config.decimalPlaces} 位小数`,
        correctedAmount,
      }
    }

    return { valid: true }
  } catch (error) {
    console.error('验证金额精度失败:', error)
    return { valid: true } // 出错时认为有效，避免阻塞用户操作
  }
}

/**
 * 获取货币的默认金额（用于表单初始化等）
 * @param currencyCode 货币代码
 * @returns 默认金额（0，但格式化为正确的小数位数）
 */
export async function getDefaultAmountForCurrency(
  currencyCode: string
): Promise<number> {
  try {
    const config = await getCurrencyFormatConfig(currencyCode)

    if (!config) {
      return 0
    }

    // 返回格式化为正确小数位数的0
    return parseFloat((0).toFixed(config.decimalPlaces))
  } catch (error) {
    console.error('获取货币默认金额失败:', error)
    return 0
  }
}
