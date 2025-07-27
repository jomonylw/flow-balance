/**
 * 统一缓存服务
 * 为项目中的高频查询提供 Next.js 缓存优化
 */

import { unstable_cache as nextCache } from 'next/cache'
import { prisma } from '@/lib/database/connection-manager'
import { CACHE } from '@/lib/constants/app-config'
import type { ConversionResult } from '@/types/core'

// 货币服务相关类型定义
export interface ServiceExchangeRateData {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  effectiveDate: Date
  notes?: string
}

// 导出 ConversionResult 类型
export type { ConversionResult }

// 统一的缓存标签系统
export const CACHE_TAGS = {
  // 用户相关
  USER_AUTH: 'user-auth',
  USER_SETTINGS: 'user-settings',
  USER_CURRENCIES: 'user-currencies',

  // 基础数据
  USER_ACCOUNTS: 'user-accounts',
  USER_CATEGORIES: 'user-categories',
  USER_TAGS: 'user-tags',
  CURRENCY_RECORDS: 'currency-records',
  EXCHANGE_RATES: 'exchange-rates',

  // 业务数据
  ACCOUNT_BALANCES: 'account-balances',
  TREE_STRUCTURE: 'tree-structure',
  DASHBOARD_DATA: 'dashboard-data',
  TRANSACTION_STATS: 'transaction-stats',

  // 图表数据
  CHART_NET_WORTH: 'chart-net-worth',
  CHART_CASH_FLOW: 'chart-cash-flow',
} as const

// 缓存配置
const CACHE_CONFIG = {
  // 基础数据缓存时间（变更频率低）
  BASIC_DATA_TTL: CACHE.USER_DATA_TTL / 1000, // 10分钟

  // 业务数据缓存时间（变更频率中等）
  BUSINESS_DATA_TTL: 5 * 60, // 5分钟

  // 图表数据缓存时间（计算复杂，可以缓存更久）
  CHART_DATA_TTL: CACHE.EXCHANGE_RATE_TTL / 1000, // 1小时

  // 认证数据缓存时间（会话期间基本不变）
  AUTH_DATA_TTL: 15 * 60, // 15分钟
} as const

// ==================== 用户认证相关缓存 ====================

/**
 * 缓存用户基本信息（不包含敏感数据）
 */
const _getCachedUserInfoCore = nextCache(
  async (userId: string) => {
    const functionName = 'getCachedUserInfo'
    const cacheKey = `get-cached-user-info-${userId}`
    try {
      // 记录真实的缓存未命中（数据库查询开始）
      cacheLogger.logCacheMiss(functionName, cacheKey, 0)

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return user
    } catch (error) {
      cacheLogger.logCacheError(functionName, cacheKey, error)
      throw error
    }
  },
  ['get-cached-user-info'],
  {
    revalidate: CACHE_CONFIG.AUTH_DATA_TTL,
    tags: [CACHE_TAGS.USER_AUTH],
  }
)

/**
 * 带监控的用户信息缓存包装器（确定性判断模式）
 */
export async function getCachedUserInfo(userId: string) {
  const functionName = 'getCachedUserInfo'
  const cacheKey = `get-cached-user-info-${userId}`

  // 1. 获取初始未命中计数
  const initialMisses = cacheStats.byFunction.get(functionName)?.misses || 0
  const startTime = performance.now()

  try {
    const result = await _getCachedUserInfoCore(userId)
    const endTime = performance.now()
    const executionTime = endTime - startTime

    // 2. 获取最终未命中计数
    const finalMisses = cacheStats.byFunction.get(functionName)?.misses || 0

    // 3. 确定性判断：如果未命中数没有增加，则一定是缓存命中
    if (finalMisses === initialMisses) {
      cacheLogger.logCacheHit(functionName, cacheKey, executionTime)
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

/**
 * 缓存用户设置信息
 */
const _getCachedUserSettingsCore = nextCache(
  async (userId: string) => {
    const functionName = 'getCachedUserSettings'
    const cacheKey = `get-cached-user-settings-${userId}`

    try {
      // 记录真实的缓存未命中（数据库查询开始）
      cacheLogger.logCacheMiss(functionName, cacheKey, 0)

      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
        include: {
          baseCurrency: true,
        },
      })

      return userSettings
    } catch (error) {
      cacheLogger.logCacheError(functionName, cacheKey, error)
      throw error
    }
  },
  ['get-cached-user-settings'],
  {
    revalidate: CACHE_CONFIG.BASIC_DATA_TTL,
    tags: [CACHE_TAGS.USER_SETTINGS],
  }
)

/**
 * 带监控的用户设置缓存包装器
 */
export async function getCachedUserSettings(userId: string) {
  const functionName = 'getCachedUserSettings'
  const cacheKey = `get-cached-user-settings-${userId}`

  // 1. 获取初始未命中计数
  const initialMisses = cacheStats.byFunction.get(functionName)?.misses || 0
  const startTime = performance.now()

  try {
    const result = await _getCachedUserSettingsCore(userId)
    const endTime = performance.now()
    const executionTime = endTime - startTime

    // 2. 获取最终未命中计数
    const finalMisses = cacheStats.byFunction.get(functionName)?.misses || 0

    // 3. 确定性判断：如果未命中数没有增加，则一定是缓存命中
    if (finalMisses === initialMisses) {
      cacheLogger.logCacheHit(functionName, cacheKey, executionTime)
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

// ==================== 基础数据缓存 ====================

/**
 * 缓存用户的所有分类
 */
const _getCachedUserCategoriesCore = nextCache(
  async (userId: string) => {
    const functionName = 'getCachedUserCategories'
    const cacheKey = `get-cached-user-categories-${userId}`

    try {
      // 记录真实的缓存未命中（数据库查询开始）
      cacheLogger.logCacheMiss(functionName, cacheKey, 0)

      const categories = await prisma.category.findMany({
        where: { userId },
        orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
        include: {
          children: {
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
          },
        },
      })

      return categories
    } catch (error) {
      cacheLogger.logCacheError(functionName, cacheKey, error)
      throw error
    }
  },
  ['get-cached-user-categories'],
  {
    revalidate: CACHE_CONFIG.BASIC_DATA_TTL,
    tags: [CACHE_TAGS.USER_CATEGORIES],
  }
)

/**
 * 带监控的用户分类缓存包装器
 */
export async function getCachedUserCategories(userId: string) {
  const functionName = 'getCachedUserCategories'
  const cacheKey = `get-cached-user-categories-${userId}`

  const initialMisses = cacheStats.byFunction.get(functionName)?.misses || 0
  const startTime = performance.now()

  try {
    const result = await _getCachedUserCategoriesCore(userId)
    const endTime = performance.now()
    const executionTime = endTime - startTime

    const finalMisses = cacheStats.byFunction.get(functionName)?.misses || 0

    if (finalMisses === initialMisses) {
      cacheLogger.logCacheHit(functionName, cacheKey, executionTime)
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

/**
 * 缓存用户的所有标签
 */
const _getCachedUserTagsCore = nextCache(
  async (userId: string) => {
    const functionName = 'getCachedUserTags'
    const cacheKey = `get-cached-user-tags-${userId}`

    try {
      // 记录真实的缓存未命中（数据库查询开始）
      cacheLogger.logCacheMiss(functionName, cacheKey, 0)

      const tags = await prisma.tag.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              transactions: true,
            },
          },
        },
      })

      return tags
    } catch (error) {
      cacheLogger.logCacheError(functionName, cacheKey, error)
      throw error
    }
  },
  ['get-cached-user-tags'],
  {
    revalidate: CACHE_CONFIG.BASIC_DATA_TTL,
    tags: [CACHE_TAGS.USER_TAGS],
  }
)

/**
 * 带监控的用户标签缓存包装器
 */
export async function getCachedUserTags(userId: string) {
  const functionName = 'getCachedUserTags'
  const cacheKey = `get-cached-user-tags-${userId}`

  const initialMisses = cacheStats.byFunction.get(functionName)?.misses || 0
  const startTime = performance.now()

  try {
    const result = await _getCachedUserTagsCore(userId)
    const endTime = performance.now()
    const executionTime = endTime - startTime

    const finalMisses = cacheStats.byFunction.get(functionName)?.misses || 0

    if (finalMisses === initialMisses) {
      cacheLogger.logCacheHit(functionName, cacheKey, executionTime)
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

/**
 * 缓存用户的所有账户（基础信息）
 */
const _getCachedUserAccountsCore = nextCache(
  async (userId: string) => {
    const functionName = 'getCachedUserAccounts'
    const cacheKey = `get-cached-user-accounts-${userId}`

    try {
      // 记录真实的缓存未命中（数据库查询开始）
      cacheLogger.logCacheMiss(functionName, cacheKey, 0)

      const accounts = await prisma.account.findMany({
        where: { userId },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          currency: {
            select: {
              id: true,
              code: true,
              symbol: true,
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      })

      return accounts
    } catch (error) {
      cacheLogger.logCacheError(functionName, cacheKey, error)
      throw error
    }
  },
  ['get-cached-user-accounts'],
  {
    revalidate: CACHE_CONFIG.BASIC_DATA_TTL,
    tags: [CACHE_TAGS.USER_ACCOUNTS],
  }
)

/**
 * 带监控的用户账户缓存包装器
 */
export async function getCachedUserAccounts(userId: string) {
  const functionName = 'getCachedUserAccounts'
  const cacheKey = `get-cached-user-accounts-${userId}`

  const initialMisses = cacheStats.byFunction.get(functionName)?.misses || 0
  const startTime = performance.now()

  try {
    const result = await _getCachedUserAccountsCore(userId)
    const endTime = performance.now()
    const executionTime = endTime - startTime

    const finalMisses = cacheStats.byFunction.get(functionName)?.misses || 0

    if (finalMisses === initialMisses) {
      cacheLogger.logCacheHit(functionName, cacheKey, executionTime)
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

// ==================== 货币服务缓存 ====================

/**
 * 核心实现：批量获取用户的所有活跃货币
 * @param userId 用户ID
 */
async function fetchUserAllActiveCurrencies(userId: string) {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `🔍 [CORE CACHE] Starting database query for user: ${userId}`
      )
    }

    // 注意：不在这里记录缓存未命中，因为外层包装器会通过确定性判断来检测

    // 获取用户在 userCurrency 表中选择的所有货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        currency: true,
      },
    })

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `🔍 [CORE CACHE] User currencies query completed: ${userCurrencies.length} records`
      )
    }

    // 获取所有全局货币作为备选
    const globalCurrencies = await prisma.currency.findMany({
      where: {
        OR: [
          { createdBy: userId }, // 用户自定义货币
          { createdBy: null }, // 全局货币
        ],
      },
      orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
    })

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `🔍 [CORE CACHE] Global currencies query completed: ${globalCurrencies.length} records`
      )
    }

    // 创建简化的货币映射（避免复杂对象序列化问题）
    const currencyMap: Record<string, any> = {}

    // 优先使用用户选择的货币
    userCurrencies.forEach(uc => {
      const simplifiedCurrency = {
        id: uc.currency.id,
        code: uc.currency.code,
        name: uc.currency.name,
        symbol: uc.currency.symbol,
        decimalPlaces: uc.currency.decimalPlaces,
        isCustom: uc.currency.isCustom,
        createdBy: uc.currency.createdBy,
      }
      currencyMap[uc.currency.code] = simplifiedCurrency

      if (process.env.NODE_ENV === 'development') {
        console.warn(`🔍 [CORE CACHE] Added user currency: ${uc.currency.code}`)
      }
    })

    // 添加全局货币作为备选
    globalCurrencies.forEach(currency => {
      if (!currencyMap[currency.code]) {
        const simplifiedCurrency = {
          id: currency.id,
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          decimalPlaces: currency.decimalPlaces,
          isCustom: currency.isCustom,
          createdBy: currency.createdBy,
        }
        currencyMap[currency.code] = simplifiedCurrency

        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `🔍 [CORE CACHE] Added global currency: ${currency.code}`
          )
        }
      }
    })

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `🔍 [CORE CACHE] Database query completed. Total mapped: ${Object.keys(currencyMap).length}`
      )
      console.warn(
        `🔍 [CORE CACHE] Currency codes: ${Object.keys(currencyMap).join(', ')}`
      )
    }

    return currencyMap
  } catch (error) {
    console.error('🚨 [CORE CACHE] Database query failed:', error)

    // 返回空对象而不是抛出错误，避免缓存失效
    return {}
  }
}

/**
 * 缓存函数：批量获取用户的所有活跃货币
 * 这个函数一次性获取用户的所有货币，减少缓存分散问题
 */
const _getCachedUserAllActiveCurrenciesCore = nextCache(
  fetchUserAllActiveCurrencies,
  ['user-currencies-v2'], // 缓存键会自动包含函数参数（userId）
  {
    revalidate: 300, // 5分钟，更短的TTL便于调试
    tags: [CACHE_TAGS.USER_CURRENCIES], // 使用统一的货币缓存标签
  }
)

/**
 * 带监控的批量货币缓存包装器（确定性判断模式）
 */
async function _getCachedUserAllActiveCurrencies(userId: string) {
  const functionName = '_getCachedUserAllActiveCurrencies'
  const cacheKey = `get-user-all-active-currencies-${userId}`

  // 1. 获取初始未命中计数
  const initialMisses = cacheStats.byFunction.get(functionName)?.misses || 0
  const startTime = performance.now()

  try {
    const result = await _getCachedUserAllActiveCurrenciesCore(userId)
    const endTime = performance.now()
    const executionTime = endTime - startTime

    // 2. 获取最终未命中计数
    const finalMisses = cacheStats.byFunction.get(functionName)?.misses || 0

    // 3. 确定性判断：如果未命中数没有增加，则一定是缓存命中
    if (finalMisses === initialMisses) {
      cacheLogger.logCacheHit(functionName, cacheKey, executionTime)
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `🔍 [WRAPPER] _getCachedUserAllActiveCurrencies: keys=${Object.keys(result).length}, time=${executionTime.toFixed(2)}ms`
      )
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

/**
 * 根据货币代码查找用户实际使用的货币记录（优化版本）
 */
const _getCachedUserActiveCurrency = async (
  userId: string,
  currencyCode: string
) => {
  const startTime = performance.now()
  const currencyMap = await _getCachedUserAllActiveCurrencies(userId)
  const mapLookupTime = performance.now()
  const result = (currencyMap as any)[currencyCode] || null
  const endTime = performance.now()

  // 分析缓存性能
  const totalTime = endTime - startTime
  const cacheTime = mapLookupTime - startTime
  const lookupTime = endTime - mapLookupTime

  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `🔍 [BATCH CACHE] getCachedUserActiveCurrency: total=${totalTime.toFixed(2)}ms, cache=${cacheTime.toFixed(2)}ms, lookup=${lookupTime.toFixed(2)}ms`
    )
    console.warn(
      `🔍 [BATCH CACHE] currencyMap keys: ${Object.keys(currencyMap).join(', ')}`
    )
    console.warn(
      `🔍 [BATCH CACHE] looking for: ${currencyCode}, found: ${result ? 'YES' : 'NO'}`
    )
  }

  return { result, cacheTime, totalTime }
}

// 带监控的包装器
export async function getCachedUserActiveCurrency(
  userId: string,
  currencyCode: string
) {
  const functionName = 'getCachedUserActiveCurrency'
  const cacheKey = `get-user-active-currency-${userId}-${currencyCode}`

  // 添加详细的调用日志来分析参数模式
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `🔍 [CACHE CALL] ${functionName}: userId=${userId}, currencyCode=${currencyCode}`
    )
  }

  try {
    const { result, cacheTime, totalTime } = await _getCachedUserActiveCurrency(
      userId,
      currencyCode
    )

    // 不再记录缓存统计，因为真实的统计已在 _getCachedUserAllActiveCurrencies 中处理
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `🔍 [WRAPPER] ${functionName}: total=${totalTime.toFixed(2)}ms, cache=${cacheTime.toFixed(2)}ms`
      )
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

/**
 * 批量获取用户的所有汇率数据（带缓存）
 * 一次性获取用户所有汇率，避免缓存分散问题
 */
const _getCachedUserExchangeRateMapCore = nextCache(
  async (userId: string) => {
    try {
      // 注意：不在这里记录缓存未命中，因为外层包装器会通过确定性判断来检测

      // 获取用户的货币映射
      const currencyMap = await _getCachedUserAllActiveCurrencies(userId)

      // 获取用户的所有汇率数据
      const exchangeRates = await prisma.exchangeRate.findMany({
        where: { userId },
        orderBy: { effectiveDate: 'desc' },
      })

      // 创建汇率映射：key = "fromCurrencyId-toCurrencyId", value = 最新汇率
      // 优化：确保汇率获取的一致性，优先使用同一时间点的汇率
      const rateMap: Record<string, (typeof exchangeRates)[0]> = {}

      // 按日期分组汇率，优先使用最新日期的完整汇率集合
      const ratesByDate = new Map<string, typeof exchangeRates>()
      exchangeRates.forEach(rate => {
        const dateKey = new Date(rate.effectiveDate).toDateString()
        if (!ratesByDate.has(dateKey)) {
          ratesByDate.set(dateKey, [])
        }
        const ratesForDate = ratesByDate.get(dateKey)
        if (ratesForDate) {
          ratesForDate.push(rate)
        }
      })

      // 按日期降序处理，优先填充最新日期的汇率
      const sortedDates = Array.from(ratesByDate.keys()).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      )

      for (const dateKey of sortedDates) {
        const ratesForDate = ratesByDate.get(dateKey)
        if (ratesForDate) {
          for (const rate of ratesForDate) {
            const key = `${rate.fromCurrencyId}-${rate.toCurrencyId}`
            if (!rateMap[key]) {
              rateMap[key] = rate
            }
          }
        }
      }

      return { currencyMap, rateMap }
    } catch (error) {
      console.error('获取汇率映射失败:', error)
      return { currencyMap: {}, rateMap: {} }
    }
  },
  ['get-user-exchange-rate-map'], // 缓存键会自动包含函数参数（userId）
  {
    revalidate: CACHE_CONFIG.CHART_DATA_TTL * 2, // 2 小时
    tags: [CACHE_TAGS.EXCHANGE_RATES], // 只使用汇率缓存标签
  }
)

/**
 * 带监控的汇率映射包装器（确定性判断模式）
 */
async function _getCachedUserExchangeRateMap(userId: string) {
  const functionName = '_getCachedUserExchangeRateMap'
  const cacheKey = `get-user-exchange-rate-map-${userId}`

  // 1. 获取初始未命中计数
  const initialMisses = cacheStats.byFunction.get(functionName)?.misses || 0
  const startTime = performance.now()

  try {
    const result = await _getCachedUserExchangeRateMapCore(userId)
    const endTime = performance.now()
    const executionTime = endTime - startTime

    // 2. 获取最终未命中计数
    const finalMisses = cacheStats.byFunction.get(functionName)?.misses || 0

    // 3. 确定性判断：如果未命中数没有增加，则一定是缓存命中
    if (finalMisses === initialMisses) {
      cacheLogger.logCacheHit(functionName, cacheKey, executionTime)
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `🔍 [WRAPPER] _getCachedUserExchangeRateMap: loaded, time=${executionTime.toFixed(2)}ms`
      )
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

/**
 * 获取用户的汇率设置（优化版本）
 */
const _getCachedUserExchangeRate = async (
  userId: string,
  fromCurrency: string,
  toCurrency: string,
  asOfDate?: Date
): Promise<{
  result: ServiceExchangeRateData | null
  cacheTime: number
  totalTime: number
}> => {
  const startTime = performance.now()

  try {
    const targetDate = asOfDate || new Date()
    const { currencyMap, rateMap } = await _getCachedUserExchangeRateMap(userId)
    const mapLookupTime = performance.now()

    // 查找货币记录
    const fromCurrencyRecord = currencyMap[fromCurrency]
    const toCurrencyRecord = currencyMap[toCurrency]

    if (!fromCurrencyRecord || !toCurrencyRecord) {
      const endTime = performance.now()
      return {
        result: null,
        cacheTime: mapLookupTime - startTime,
        totalTime: endTime - startTime,
      }
    }

    // 如果是同一货币，返回1:1汇率
    if (fromCurrencyRecord.id === toCurrencyRecord.id) {
      const endTime = performance.now()
      return {
        result: {
          id: 'same-currency',
          fromCurrency,
          toCurrency,
          rate: 1,
          effectiveDate: targetDate,
          notes: '同币种转换',
        },
        cacheTime: mapLookupTime - startTime,
        totalTime: endTime - startTime,
      }
    }

    // 从缓存的汇率映射中查找
    const rateKey = `${fromCurrencyRecord.id}-${toCurrencyRecord.id}`
    const exchangeRate = rateMap[rateKey]

    if (!exchangeRate || exchangeRate.effectiveDate > targetDate) {
      const endTime = performance.now()
      return {
        result: null,
        cacheTime: mapLookupTime - startTime,
        totalTime: endTime - startTime,
      }
    }

    const endTime = performance.now()
    const cacheTime = mapLookupTime - startTime
    const totalTime = endTime - startTime

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `🔍 [BATCH CACHE] getCachedUserExchangeRate: total=${totalTime.toFixed(2)}ms, cache=${cacheTime.toFixed(2)}ms`
      )
    }

    return {
      result: {
        id: exchangeRate.id,
        fromCurrency,
        toCurrency,
        rate: parseFloat(exchangeRate.rate.toString()),
        effectiveDate: exchangeRate.effectiveDate,
        notes: exchangeRate.notes || undefined,
      },
      cacheTime,
      totalTime,
    }
  } catch (error) {
    console.error('获取汇率失败:', error)
    const endTime = performance.now()
    return {
      result: null,
      cacheTime: 0,
      totalTime: endTime - startTime,
    }
  }
}

// 带监控的包装器
export async function getCachedUserExchangeRate(
  userId: string,
  fromCurrency: string,
  toCurrency: string,
  asOfDate?: Date
): Promise<ServiceExchangeRateData | null> {
  const functionName = 'getCachedUserExchangeRate'
  const cacheKey = `get-user-exchange-rate-${userId}-${fromCurrency}-${toCurrency}`

  // 添加详细的调用日志来分析参数模式
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `🔍 [CACHE CALL] ${functionName}: userId=${userId}, from=${fromCurrency}, to=${toCurrency}, date=${asOfDate?.toISOString() || 'current'}`
    )
  }

  try {
    const { result, cacheTime, totalTime } = await _getCachedUserExchangeRate(
      userId,
      fromCurrency,
      toCurrency,
      asOfDate
    )

    // 不再记录缓存统计，因为真实的统计已在 _getCachedUserExchangeRateMap 中处理
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `🔍 [WRAPPER] ${functionName}: total=${totalTime.toFixed(2)}ms, cache=${cacheTime.toFixed(2)}ms`
      )
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

/**
 * 获取用户使用的所有货币（带缓存）
 */
const _getCachedUserCurrenciesCore = nextCache(
  async (userId: string): Promise<string[]> => {
    const functionName = 'getCachedUserCurrencies'
    const cacheKey = `get-user-currencies-${userId}`

    try {
      // 记录真实的缓存未命中（数据库查询开始）
      cacheLogger.logCacheMiss(functionName, cacheKey, 0)

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
      const userSettings = await getCachedUserSettings(userId)

      const currencyCodes = new Set<string>()

      // 添加交易中的货币
      transactions.forEach(t => currencyCodes.add(t.currency.code))

      // 添加本位币
      if (userSettings?.baseCurrency?.code) {
        currencyCodes.add(userSettings.baseCurrency.code)
      }

      return Array.from(currencyCodes)
    } catch (error) {
      cacheLogger.logCacheError(functionName, cacheKey, error)
      console.error('获取用户货币失败:', error)
      return []
    }
  },
  ['get-user-currencies'],
  {
    revalidate: CACHE_CONFIG.BASIC_DATA_TTL,
    tags: [CACHE_TAGS.USER_CURRENCIES, CACHE_TAGS.USER_SETTINGS],
  }
)

/**
 * 带监控的用户货币缓存包装器
 */
export async function getCachedUserCurrencies(
  userId: string
): Promise<string[]> {
  const functionName = 'getCachedUserCurrencies'
  const cacheKey = `get-user-currencies-${userId}`

  const initialMisses = cacheStats.byFunction.get(functionName)?.misses || 0
  const startTime = performance.now()

  try {
    const result = await _getCachedUserCurrenciesCore(userId)
    const endTime = performance.now()
    const executionTime = endTime - startTime

    const finalMisses = cacheStats.byFunction.get(functionName)?.misses || 0

    if (finalMisses === initialMisses) {
      cacheLogger.logCacheHit(functionName, cacheKey, executionTime)
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

/**
 * 获取用户使用的所有货币记录（包含ID信息，带缓存）
 */
const _getCachedUserCurrencyRecordsCore = nextCache(
  async (
    userId: string
  ): Promise<
    Array<{ id: string; code: string; name: string; symbol: string }>
  > => {
    const functionName = 'getCachedUserCurrencyRecords'
    const cacheKey = `get-user-currency-records-${userId}`

    try {
      // 记录真实的缓存未命中（数据库查询开始）
      cacheLogger.logCacheMiss(functionName, cacheKey, 0)

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
      const userSettings = await getCachedUserSettings(userId)

      const currencyMap = new Map<
        string,
        { id: string; code: string; name: string; symbol: string }
      >()

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
  },
  ['get-user-currency-records'],
  {
    revalidate: CACHE_CONFIG.BASIC_DATA_TTL,
    tags: [
      CACHE_TAGS.USER_CURRENCIES,
      CACHE_TAGS.CURRENCY_RECORDS,
      CACHE_TAGS.USER_SETTINGS,
    ],
  }
)

/**
 * 带监控的用户货币记录包装器（确定性判断模式）
 */
export async function getCachedUserCurrencyRecords(
  userId: string
): Promise<Array<{ id: string; code: string; name: string; symbol: string }>> {
  const functionName = 'getCachedUserCurrencyRecords'
  const cacheKey = `get-user-currency-records-${userId}`

  // 1. 获取初始未命中计数
  const initialMisses = cacheStats.byFunction.get(functionName)?.misses || 0
  const startTime = performance.now()

  try {
    const result = await _getCachedUserCurrencyRecordsCore(userId)
    const endTime = performance.now()
    const executionTime = endTime - startTime

    // 2. 获取最终未命中计数
    const finalMisses = cacheStats.byFunction.get(functionName)?.misses || 0

    // 3. 确定性判断：如果未命中数没有增加，则一定是缓存命中
    if (finalMisses === initialMisses) {
      cacheLogger.logCacheHit(functionName, cacheKey, executionTime)
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `🔍 [WRAPPER] getCachedUserCurrencyRecords: ${executionTime.toFixed(2)}ms, records=${result.length}`
      )
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

/**
 * 批量转换多个金额到本位币（优化版本，使用预加载汇率缓存）
 * 这个函数被 nextCache 包装，只有在缓存未命中时才会执行
 */
const _unusedGetCachedMultipleCurrencyConversionsCore = async (
  userId: string,
  amounts: Array<{ amount: number; currency: string }>,
  baseCurrency: string,
  asOfDate?: Date
): Promise<ConversionResult[]> => {
  try {
    const functionName = 'getCachedMultipleCurrencyConversions'

    // 生成与外层包装器一致的缓存键格式（极简版本）
    const uniqueCurrencies = Array.from(
      new Set(amounts.map(a => a.currency))
    ).sort()
    const currencySignature = uniqueCurrencies.join('-')
    const cacheKey = `convert-currencies-${userId}-${currencySignature}`

    // 记录缓存未命中（因为这个函数只有在缓存未命中时才会执行）
    cacheLogger.logCacheMiss(functionName, cacheKey, 0)

    const targetDate = asOfDate || new Date()
    const results: ConversionResult[] = []

    // 🚀 使用预加载的汇率缓存，一次性获取所有货币和汇率数据
    const { currencyMap, rateMap } = await _getCachedUserExchangeRateMap(userId)

    // 获取本位币记录
    const baseCurrencyRecord = currencyMap[baseCurrency]
    if (!baseCurrencyRecord) {
      // 如果本位币不存在，返回所有失败的结果
      return amounts.map(({ amount, currency }) => ({
        originalAmount: amount,
        originalCurrency: currency,
        fromCurrency: currency,
        convertedAmount: amount,
        targetCurrency: baseCurrency,
        exchangeRate: 1,
        rateDate: targetDate,
        success: false,
        error: `本位币 ${baseCurrency} 不存在`,
      }))
    }

    // 处理每个金额转换
    for (const { amount, currency } of amounts) {
      if (currency === baseCurrency) {
        // 同币种，直接返回
        results.push({
          originalAmount: amount,
          originalCurrency: currency,
          fromCurrency: currency,
          convertedAmount: amount,
          targetCurrency: baseCurrency,
          exchangeRate: 1,
          rateDate: targetDate,
          success: true,
        })
      } else {
        // 查找源货币记录
        const fromCurrencyRecord = currencyMap[currency]
        if (!fromCurrencyRecord) {
          results.push({
            originalAmount: amount,
            originalCurrency: currency,
            fromCurrency: currency,
            convertedAmount: amount,
            targetCurrency: baseCurrency,
            exchangeRate: 1,
            rateDate: targetDate,
            success: false,
            error: `货币 ${currency} 不存在`,
          })
          continue
        }

        // 如果是同一货币ID，返回1:1汇率
        if (fromCurrencyRecord.id === baseCurrencyRecord.id) {
          results.push({
            originalAmount: amount,
            originalCurrency: currency,
            fromCurrency: currency,
            convertedAmount: amount,
            targetCurrency: baseCurrency,
            exchangeRate: 1,
            rateDate: targetDate,
            success: true,
          })
          continue
        }

        // 从预加载的汇率映射中查找汇率
        const rateKey = `${fromCurrencyRecord.id}-${baseCurrencyRecord.id}`
        const exchangeRateData = rateMap[rateKey]

        if (exchangeRateData && exchangeRateData.effectiveDate <= targetDate) {
          // 汇率存在且有效
          const exchangeRate = parseFloat(exchangeRateData.rate.toString())
          const convertedAmount = amount * exchangeRate
          results.push({
            originalAmount: amount,
            originalCurrency: currency,
            fromCurrency: currency,
            convertedAmount,
            targetCurrency: baseCurrency,
            exchangeRate,
            rateDate: exchangeRateData.effectiveDate,
            success: true,
          })
        } else {
          // 汇率不存在或已过期
          results.push({
            originalAmount: amount,
            originalCurrency: currency,
            fromCurrency: currency,
            convertedAmount: amount,
            targetCurrency: baseCurrency,
            exchangeRate: 1,
            rateDate: targetDate,
            success: false,
            error: `未找到 ${currency} 到 ${baseCurrency} 的汇率设置`,
          })
        }
      }
    }

    return results
  } catch (error) {
    console.error('批量货币转换失败:', error)
    // 返回失败结果
    return amounts.map(({ amount, currency }) => ({
      originalAmount: amount,
      originalCurrency: currency,
      fromCurrency: currency,
      convertedAmount: amount,
      targetCurrency: baseCurrency,
      exchangeRate: 1,
      rateDate: asOfDate || new Date(),
      success: false,
      error: '批量货币转换过程中发生错误',
    }))
  }
}

/**
 * 专门缓存汇率数据的函数（与金额无关）
 * 缓存键只依赖于货币对，不包含具体金额
 */
const _getCachedExchangeRatesForCurrencies = nextCache(
  async (
    userId: string,
    currencyCodes: string[],
    baseCurrency: string
  ): Promise<Record<string, number>> => {
    const functionName = 'getCachedExchangeRatesForCurrencies'
    const cacheKey = `exchange-rates-${userId}-${currencyCodes.sort().join('-')}-to-${baseCurrency}`

    try {
      // 记录缓存未命中
      cacheLogger.logCacheMiss(functionName, cacheKey, 0)

      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `🔍 [CORE CACHE] Loading exchange rates for currencies: ${currencyCodes.join(', ')} → ${baseCurrency}`
        )
      }

      // 获取汇率映射数据
      const { currencyMap, rateMap } =
        await _getCachedUserExchangeRateMap(userId)
      const rates: Record<string, number> = {}

      for (const currencyCode of currencyCodes) {
        if (currencyCode === baseCurrency) {
          rates[currencyCode] = 1 // 本位币汇率为1
          continue
        }

        const fromCurrency = currencyMap[currencyCode]
        const toCurrency = currencyMap[baseCurrency]

        if (!fromCurrency || !toCurrency) {
          rates[currencyCode] = 1 // 找不到货币时默认为1
          continue
        }

        const rateKey = `${fromCurrency.id}-${toCurrency.id}`
        const exchangeRate = rateMap[rateKey]

        if (exchangeRate) {
          rates[currencyCode] = Number(exchangeRate.rate) // 转换 Decimal 为 number
        } else {
          rates[currencyCode] = 1 // 找不到汇率时默认为1
        }
      }

      // 调试日志：显示获取到的汇率
      if (process.env.NODE_ENV === 'development') {
        console.warn(`🔍 [DEBUG] 获取汇率结果: ${JSON.stringify(rates)}`)
      }

      return rates
    } catch (error) {
      console.error('获取汇率数据失败:', error)
      // 返回默认汇率（全部为1）
      const defaultRates: Record<string, number> = {}
      currencyCodes.forEach(code => {
        defaultRates[code] = 1
      })
      return defaultRates
    }
  },
  ['exchange-rates-for-currencies'],
  {
    revalidate: CACHE_CONFIG.CHART_DATA_TTL,
    tags: [CACHE_TAGS.EXCHANGE_RATES],
  }
)

/**
 * 重构后的货币转换函数：汇率获取与金额计算分离
 * 1. 首先获取缓存的汇率数据（只依赖货币对，与金额无关）
 * 2. 然后在内存中完成金额计算
 */
export async function getCachedMultipleCurrencyConversions(
  userId: string,
  amounts: Array<{ amount: number; currency: string }>,
  baseCurrency: string,
  asOfDate?: Date
): Promise<ConversionResult[]> {
  const functionName = 'getCachedMultipleCurrencyConversions'
  const startTime = performance.now()

  try {
    // 1. 提取唯一货币代码（用于汇率缓存）
    const uniqueCurrencies = Array.from(
      new Set(amounts.map(a => a.currency))
    ).sort()

    // 2. 获取缓存的汇率数据（这里才是真正的缓存优化点）
    const exchangeRatesStartTime = performance.now()
    const exchangeRates = await _getCachedExchangeRatesForCurrencies(
      userId,
      uniqueCurrencies,
      baseCurrency
    )
    const exchangeRatesEndTime = performance.now()

    // 3. 在内存中完成金额计算（无需缓存，计算很快）
    const results: ConversionResult[] = amounts.map(({ amount, currency }) => {
      const exchangeRate = exchangeRates[currency] || 1
      const convertedAmount = amount * exchangeRate
      const targetDate = asOfDate || new Date()

      // 调试日志：检查汇率是否正确
      if (
        process.env.NODE_ENV === 'development' &&
        currency !== baseCurrency &&
        exchangeRate === 1
      ) {
        console.warn(
          `⚠️ [DEBUG] 汇率异常: ${currency} → ${baseCurrency}, rate=${exchangeRate}, amount=${amount}`
        )
      }

      return {
        originalAmount: amount,
        originalCurrency: currency,
        fromCurrency: currency,
        convertedAmount,
        targetCurrency: baseCurrency,
        exchangeRate,
        rateDate: targetDate,
        success: true,
        error: undefined,
      }
    })

    const endTime = performance.now()
    const totalTime = endTime - startTime
    const exchangeRateTime = exchangeRatesEndTime - exchangeRatesStartTime

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `🔍 [WRAPPER] getCachedMultipleCurrencyConversions: ${totalTime.toFixed(2)}ms (rates: ${exchangeRateTime.toFixed(2)}ms), conversions=${results.length}`
      )
    }

    return results
  } catch (error) {
    cacheLogger.logCacheError(
      functionName,
      `convert-currencies-${userId}`,
      error
    )

    // 返回失败结果
    return amounts.map(({ amount, currency }) => ({
      originalAmount: amount,
      originalCurrency: currency,
      fromCurrency: currency,
      convertedAmount: amount,
      targetCurrency: baseCurrency,
      exchangeRate: 1,
      rateDate: asOfDate || new Date(),
      success: false,
      error: '货币转换过程中发生错误',
    }))
  }
}

// ==================== 业务数据缓存 ====================

/**
 * 缓存树状结构数据（分类+账户）
 */
const _getCachedTreeStructureCore = nextCache(
  async (userId: string) => {
    const functionName = 'getCachedTreeStructure'
    const cacheKey = `get-cached-tree-structure-${userId}`

    try {
      // 记录真实的缓存未命中（数据库查询开始）
      cacheLogger.logCacheMiss(functionName, cacheKey, 0)

      const [categories, accounts] = await Promise.all([
        getCachedUserCategories(userId),
        getCachedUserAccounts(userId),
      ])

      return {
        categories,
        accounts,
      }
    } catch (error) {
      cacheLogger.logCacheError(functionName, cacheKey, error)
      throw error
    }
  },
  ['get-cached-tree-structure'],
  {
    revalidate: CACHE_CONFIG.BASIC_DATA_TTL,
    tags: [
      CACHE_TAGS.TREE_STRUCTURE,
      CACHE_TAGS.USER_CATEGORIES,
      CACHE_TAGS.USER_ACCOUNTS,
    ],
  }
)

/**
 * 带监控的树状结构缓存包装器
 */
export async function getCachedTreeStructure(userId: string) {
  const functionName = 'getCachedTreeStructure'
  const cacheKey = `get-cached-tree-structure-${userId}`

  const initialMisses = cacheStats.byFunction.get(functionName)?.misses || 0
  const startTime = performance.now()

  try {
    const result = await _getCachedTreeStructureCore(userId)
    const endTime = performance.now()
    const executionTime = endTime - startTime

    const finalMisses = cacheStats.byFunction.get(functionName)?.misses || 0

    if (finalMisses === initialMisses) {
      cacheLogger.logCacheHit(functionName, cacheKey, executionTime)
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

/**
 * 缓存用户统计数据
 */
const _getCachedUserStatsCore = nextCache(
  async (userId: string) => {
    const functionName = 'getCachedUserStats'
    const cacheKey = `get-cached-user-stats-${userId}`

    try {
      // 记录真实的缓存未命中（数据库查询开始）
      cacheLogger.logCacheMiss(functionName, cacheKey, 0)

      const [totalAccounts, totalTransactions, totalCategories] =
        await Promise.all([
          prisma.account.count({ where: { userId } }),
          prisma.transaction.count({ where: { userId } }),
          prisma.category.count({ where: { userId } }),
        ])

      return {
        totalAccounts,
        totalTransactions,
        totalCategories,
      }
    } catch (error) {
      cacheLogger.logCacheError(functionName, cacheKey, error)
      throw error
    }
  },
  ['get-cached-user-stats'],
  {
    revalidate: CACHE_CONFIG.BUSINESS_DATA_TTL,
    tags: [CACHE_TAGS.TRANSACTION_STATS],
  }
)

/**
 * 带监控的用户统计缓存包装器
 */
export async function getCachedUserStats(userId: string) {
  const functionName = 'getCachedUserStats'
  const cacheKey = `get-cached-user-stats-${userId}`

  const initialMisses = cacheStats.byFunction.get(functionName)?.misses || 0
  const startTime = performance.now()

  try {
    const result = await _getCachedUserStatsCore(userId)
    const endTime = performance.now()
    const executionTime = endTime - startTime

    const finalMisses = cacheStats.byFunction.get(functionName)?.misses || 0

    if (finalMisses === initialMisses) {
      cacheLogger.logCacheHit(functionName, cacheKey, executionTime)
    }

    return result
  } catch (error) {
    cacheLogger.logCacheError(functionName, cacheKey, error)
    throw error
  }
}

// ==================== 缓存失效管理 ====================
// 注意：缓存失效函数已移动到 cache-revalidation.ts 文件中
// 这是因为 revalidateTag 只能在服务器端使用

// ==================== 缓存监控和日志 ====================

/**
 * 缓存性能统计（按函数分类）
 */
export const cacheStats = {
  // 全局统计
  global: {
    hits: 0,
    misses: 0,
    errors: 0,
  },

  // 按函数分类的统计
  byFunction: new Map<
    string,
    { hits: number; misses: number; errors: number; lastAccess: Date }
  >(),

  recordHit(functionName: string) {
    this.global.hits++
    this._updateFunctionStats(functionName, 'hits')
  },

  recordMiss(functionName: string) {
    this.global.misses++
    this._updateFunctionStats(functionName, 'misses')
  },

  recordError(functionName: string) {
    this.global.errors++
    this._updateFunctionStats(functionName, 'errors')
  },

  _updateFunctionStats(
    functionName: string,
    type: 'hits' | 'misses' | 'errors'
  ) {
    if (!this.byFunction.has(functionName)) {
      this.byFunction.set(functionName, {
        hits: 0,
        misses: 0,
        errors: 0,
        lastAccess: new Date(),
      })
    }
    const stats = this.byFunction.get(functionName)
    if (stats) {
      stats[type]++
      stats.lastAccess = new Date()
    }
  },

  getGlobalHitRate() {
    const total = this.global.hits + this.global.misses
    return total > 0 ? ((this.global.hits / total) * 100).toFixed(1) : '0.0'
  },

  getFunctionHitRate(functionName: string) {
    const stats = this.byFunction.get(functionName)
    if (!stats) return '0.0'
    const total = stats.hits + stats.misses
    return total > 0 ? ((stats.hits / total) * 100).toFixed(1) : '0.0'
  },

  reset() {
    this.global = { hits: 0, misses: 0, errors: 0 }
    this.byFunction.clear()
  },

  getGlobalStats() {
    return {
      hits: this.global.hits,
      misses: this.global.misses,
      errors: this.global.errors,
      hitRate: this.getGlobalHitRate() + '%',
      total: this.global.hits + this.global.misses,
    }
  },

  getFunctionStats() {
    const result: Record<
      string,
      {
        hits: number
        misses: number
        errors: number
        total: number
        hitRate: string
        lastAccess: string
      }
    > = {}
    for (const [functionName, stats] of this.byFunction.entries()) {
      const total = stats.hits + stats.misses
      result[functionName] = {
        hits: stats.hits,
        misses: stats.misses,
        errors: stats.errors,
        total,
        hitRate: this.getFunctionHitRate(functionName) + '%',
        lastAccess: stats.lastAccess.toISOString(),
      }
    }
    return result
  },
}

/**
 * 开发环境缓存日志记录器
 */
export const cacheLogger = {
  logCacheHit(functionName: string, cacheKey: string, executionTime: number) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(
        `🎯 [CACHE HIT] ${functionName}`,
        `\n  📋 Key: ${cacheKey}`,
        `\n  ⚡ Time: ${executionTime.toFixed(2)}ms`,
        `\n  📊 Hit Rate: ${cacheStats.getFunctionHitRate(functionName)}%`
      )
    }
    cacheStats.recordHit(functionName)
  },

  logCacheMiss(functionName: string, cacheKey: string, executionTime: number) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `❌ [CACHE MISS] ${functionName}`,
        `\n  📋 Key: ${cacheKey}`,
        `\n  🐌 Time: ${executionTime.toFixed(2)}ms`,
        `\n  📊 Hit Rate: ${cacheStats.getFunctionHitRate(functionName)}%`
      )
    }
    cacheStats.recordMiss(functionName)
  },

  logCacheError(functionName: string, cacheKey: string, error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `💥 [CACHE ERROR] ${functionName}`,
        `\n  📋 Key: ${cacheKey}`,
        '\n  ❌ Error:',
        error
      )
    }
    cacheStats.recordError(functionName)
  },

  logCacheStats() {
    if (process.env.NODE_ENV === 'development') {
      const globalStats = cacheStats.getGlobalStats()
      const functionStats = cacheStats.getFunctionStats()

      // eslint-disable-next-line no-console
      console.group('📊 Cache Performance Summary')
      // eslint-disable-next-line no-console
      console.log('🌍 Global Stats:', globalStats)
      // eslint-disable-next-line no-console
      console.log('🔧 Function Stats:', functionStats)
      // eslint-disable-next-line no-console
      console.groupEnd()
    }
  },
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats() {
  return {
    global: cacheStats.getGlobalStats(),
    byFunction: cacheStats.getFunctionStats(),
  }
}

/**
 * 缓存性能分析和优化建议
 */
export function analyzeCachePerformance() {
  const stats = getCacheStats()
  const analysis = {
    overall: {
      hitRate: parseFloat(stats.global.hitRate),
      performance: 'unknown',
      recommendation: '',
    },
    functions: [] as Array<{
      name: string
      hitRate: number
      calls: number
      performance: 'excellent' | 'good' | 'poor'
      recommendation: string
    }>,
    summary: {
      excellent: 0,
      good: 0,
      poor: 0,
      totalFunctions: 0,
    },
  }

  // 分析整体性能
  const overallHitRate = analysis.overall.hitRate
  if (overallHitRate >= 85) {
    analysis.overall.performance = 'excellent'
    analysis.overall.recommendation = '整体缓存性能优秀，继续保持'
  } else if (overallHitRate >= 70) {
    analysis.overall.performance = 'good'
    analysis.overall.recommendation = '整体缓存性能良好，可进一步优化低性能函数'
  } else {
    analysis.overall.performance = 'poor'
    analysis.overall.recommendation = '整体缓存性能需要改进，建议检查缓存策略'
  }

  // 分析各函数性能
  Object.entries(stats.byFunction).forEach(([functionName, functionStats]) => {
    const hitRate = parseFloat(functionStats.hitRate)
    const calls = functionStats.total

    let performance: 'excellent' | 'good' | 'poor'
    let recommendation: string

    if (hitRate >= 80) {
      performance = 'excellent'
      recommendation = '性能优秀，保持当前策略'
      analysis.summary.excellent++
    } else if (hitRate >= 60) {
      performance = 'good'
      recommendation = '性能良好，可考虑增加TTL或优化缓存键'
      analysis.summary.good++
    } else {
      performance = 'poor'
      if (calls > 10) {
        recommendation = '高频低命中率，建议增加TTL、优化查询或添加预热'
      } else if (calls > 2) {
        recommendation = '命中率偏低，建议检查缓存失效逻辑'
      } else {
        recommendation = '调用次数较少，继续观察'
      }
      analysis.summary.poor++
    }

    analysis.functions.push({
      name: functionName,
      hitRate,
      calls,
      performance,
      recommendation,
    })
  })

  analysis.summary.totalFunctions = analysis.functions.length

  return analysis
}

/**
 * 智能缓存预热函数 - 基于用户使用模式预加载数据
 * 在用户登录或首次访问时调用，提前加载常用数据到缓存
 */
export async function preloadUserCache(userId: string) {
  if (!userId) return

  try {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🔥 智能预热用户 ${userId} 的缓存数据...`)
    }

    // 1. 预加载用户设置
    await getCachedUserSettings(userId)

    // 2. 预加载用户货币列表
    await getCachedUserCurrencies(userId)

    // 3. 预加载用户标签
    await getCachedUserTags(userId)

    // 4. 批量预加载用户的所有货币数据（这会缓存所有货币）
    await _getCachedUserAllActiveCurrencies(userId)

    // 5. 批量预加载用户的所有汇率数据（这会缓存所有汇率）
    await _getCachedUserExchangeRateMap(userId)

    if (process.env.NODE_ENV === 'development') {
      console.warn('   📊 批量预热了用户的所有货币和汇率数据')
    }

    // 6. 预热常用的货币转换组合
    await preloadCommonCurrencyConversions(userId)

    // 7. 基于用户历史数据的智能预热
    await preloadUserHistoricalData(userId)

    if (process.env.NODE_ENV === 'development') {
      console.warn(`✅ 用户 ${userId} 的智能缓存预热完成`)
    }
  } catch (error) {
    console.error('缓存预热失败:', error)
  }
}

/**
 * 预热常用的货币转换组合
 * 基于用户的活跃货币，预热最可能使用的转换组合
 */
async function preloadCommonCurrencyConversions(userId: string) {
  try {
    // 获取用户设置和活跃货币
    const [userSettings, currencyMap] = await Promise.all([
      getCachedUserSettings(userId),
      _getCachedUserAllActiveCurrencies(userId),
    ])

    const baseCurrency = userSettings?.baseCurrency?.code || 'CNY'
    const activeCurrencies = Object.keys(currencyMap)

    if (activeCurrencies.length === 0) return

    // 1. 预热单一货币转换（最常用）
    const singleCurrencyConversions = activeCurrencies
      .slice(0, 5)
      .map(currency => ({
        amount: 100, // 使用固定金额，只是为了触发缓存
        currency,
      }))

    for (const conversion of singleCurrencyConversions) {
      try {
        await getCachedMultipleCurrencyConversions(
          userId,
          [conversion],
          baseCurrency
        )
      } catch {
        // 忽略单个转换的错误，继续预热其他组合
      }
    }

    // 2. 预热常见的双货币组合
    const commonPairs = [
      ['CNY', 'USD'],
      ['CNY', 'HKD'],
      ['CNY', 'EUR'],
      ['USD', 'EUR'],
      ['USD', 'HKD'],
    ]

    for (const [currency1, currency2] of commonPairs) {
      if (
        activeCurrencies.includes(currency1) &&
        activeCurrencies.includes(currency2)
      ) {
        try {
          const dualConversion = [
            { amount: 100, currency: currency1 },
            { amount: 100, currency: currency2 },
          ]
          await getCachedMultipleCurrencyConversions(
            userId,
            dualConversion,
            baseCurrency
          )
        } catch {
          // 忽略错误，继续预热
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `   🔥 预热了 ${singleCurrencyConversions.length} 个单货币转换和常见货币组合`
      )
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('   ⚠️ 货币转换预热部分失败:', error)
    }
  }
}

/**
 * 基于用户历史数据的智能预热
 * 分析用户最近使用的货币和账户，预加载相关数据
 */
async function preloadUserHistoricalData(userId: string) {
  try {
    // 获取用户最近30天使用的货币
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 最近30天
        },
      },
      select: {
        currency: {
          select: { code: true },
        },
      },
      distinct: ['currencyId'],
      take: 10, // 最多10种货币
    })

    const recentCurrencies = recentTransactions.map(t => t.currency.code)

    if (recentCurrencies.length > 0) {
      // 预加载最近使用的货币
      await Promise.all(
        recentCurrencies.map(code => getCachedUserActiveCurrency(userId, code))
      )

      // 预加载这些货币的汇率
      const userSettings = await getCachedUserSettings(userId)
      const baseCurrency = userSettings?.baseCurrency?.code || 'USD'

      await Promise.all(
        recentCurrencies.map(code => {
          if (code !== baseCurrency) {
            return getCachedUserExchangeRate(userId, code, baseCurrency)
          }
          return Promise.resolve() // 返回一个已解决的Promise
        })
      )

      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `   📊 预热了 ${recentCurrencies.length} 种历史货币: ${recentCurrencies.join(', ')}`
        )
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('智能预热失败:', error)
    }
  }
}
