/**
 * 缓存失效服务
 * 仅在服务器端使用，处理缓存标签的失效操作
 */

// 动态导入 revalidateTag 以避免客户端导入问题
let revalidateTag: ((tag: string) => void) | null = null

// 在服务器端环境中导入 revalidateTag
if (typeof window === 'undefined') {
  import('next/cache')
    .then(cacheModule => {
      revalidateTag = cacheModule.revalidateTag
    })
    .catch(error => {
      console.warn('Failed to dynamically import revalidateTag:', error)
    })
}

import { CACHE_TAGS } from './cache.service'

// ==================== 辅助函数 ====================

/**
 * 安全的缓存标签失效函数
 */
function safeRevalidateTag(tag: string, operation: string) {
  try {
    if (revalidateTag) {
      revalidateTag(tag)
      return true
    } else if (process.env.NODE_ENV === 'development') {
      console.warn(
        `revalidateTag not available for ${operation} (client-side or import failed)`
      )
      return false
    }
  } catch (error) {
    console.error(`缓存失效失败 (${operation}):`, error)
    return false
  }
  return false
}

// ==================== 缓存失效函数 ====================

/**
 * 清除用户认证相关的缓存
 * @param userId 用户ID（可选）
 */
export function revalidateUserAuthCache(userId?: string) {
  const operation = `用户认证缓存${userId ? ` (用户: ${userId})` : ''}`
  if (
    safeRevalidateTag(CACHE_TAGS.USER_AUTH, operation) &&
    process.env.NODE_ENV === 'development'
  ) {
    console.warn(`已清除${operation}`)
  }
}

/**
 * 清除用户货币相关的缓存
 * @param userId 用户ID（可选）
 */
export function revalidateUserCurrencyCache(userId?: string) {
  const operation = `用户货币缓存${userId ? ` (用户: ${userId})` : ' (所有用户)'}`
  const success1 = safeRevalidateTag(CACHE_TAGS.USER_CURRENCIES, operation)
  const success2 = safeRevalidateTag(CACHE_TAGS.CURRENCY_RECORDS, operation)

  if (process.env.NODE_ENV === 'development') {
    console.warn(`清除${operation} ${success1 && success2 ? '成功' : '失败'}`)
  }
}

/**
 * 清除汇率相关的缓存
 * @param userId 用户ID（可选）
 */
export function revalidateExchangeRateCache(userId?: string) {
  const operation = `汇率缓存${userId ? ` (用户: ${userId})` : ' (所有用户)'}`
  if (
    safeRevalidateTag(CACHE_TAGS.EXCHANGE_RATES, operation) &&
    process.env.NODE_ENV === 'development'
  ) {
    console.warn(`已清除${operation}`)
  }
}

/**
 * 清除用户设置相关的缓存
 * @param userId 用户ID（可选）
 */
export function revalidateUserSettingsCache(userId?: string) {
  const operation = `用户设置缓存${userId ? ` (用户: ${userId})` : ' (所有用户)'}`
  if (
    safeRevalidateTag(CACHE_TAGS.USER_SETTINGS, operation) &&
    process.env.NODE_ENV === 'development'
  ) {
    console.warn(`已清除${operation}`)
  }
}

/**
 * 清除基础数据相关的缓存
 * @param userId 用户ID（可选）
 */
export function revalidateBasicDataCache(userId?: string) {
  const operation = `基础数据缓存${userId ? ` (用户: ${userId})` : ' (所有用户)'}`
  const results = [
    safeRevalidateTag(CACHE_TAGS.USER_ACCOUNTS, operation),
    safeRevalidateTag(CACHE_TAGS.USER_CATEGORIES, operation),
    safeRevalidateTag(CACHE_TAGS.USER_TAGS, operation),
    safeRevalidateTag(CACHE_TAGS.TREE_STRUCTURE, operation),
  ]

  if (results.some(Boolean) && process.env.NODE_ENV === 'development') {
    console.warn(`已清除${operation}`)
  }
}

/**
 * 清除业务数据相关的缓存
 * @param userId 用户ID（可选）
 */
export function revalidateBusinessDataCache(userId?: string) {
  const operation = `业务数据缓存${userId ? ` (用户: ${userId})` : ' (所有用户)'}`
  const results = [
    safeRevalidateTag(CACHE_TAGS.ACCOUNT_BALANCES, operation),
    safeRevalidateTag(CACHE_TAGS.DASHBOARD_DATA, operation),
    safeRevalidateTag(CACHE_TAGS.TRANSACTION_STATS, operation),
  ]

  if (results.some(Boolean) && process.env.NODE_ENV === 'development') {
    console.warn(`已清除${operation}`)
  }
}

/**
 * 清除图表数据相关的缓存
 * @param userId 用户ID（可选）
 */
export function revalidateChartDataCache(userId?: string) {
  const operation = `图表数据缓存${userId ? ` (用户: ${userId})` : ' (所有用户)'}`
  const results = [
    safeRevalidateTag(CACHE_TAGS.CHART_NET_WORTH, operation),
    safeRevalidateTag(CACHE_TAGS.CHART_CASH_FLOW, operation),
  ]

  if (results.some(Boolean) && process.env.NODE_ENV === 'development') {
    console.warn(`已清除${operation}`)
  }
}

/**
 * 清除所有用户相关的缓存
 * @param userId 用户ID
 */
export function revalidateAllUserCache(userId: string) {
  try {
    revalidateUserAuthCache(userId)
    revalidateUserCurrencyCache(userId)
    revalidateExchangeRateCache(userId)
    revalidateUserSettingsCache(userId)
    revalidateBasicDataCache(userId)
    revalidateBusinessDataCache(userId)
    revalidateChartDataCache(userId)
    if (process.env.NODE_ENV === 'development') {
      console.warn(`已清除用户 ${userId} 的所有缓存`)
    }
  } catch (error) {
    console.error('清除所有用户缓存失败:', error)
  }
}

/**
 * 清除所有货币相关的缓存（不包括汇率缓存）
 */
export function revalidateAllCurrencyCache() {
  const operation = '所有货币相关缓存'
  const results = [
    safeRevalidateTag(CACHE_TAGS.USER_CURRENCIES, operation),
    safeRevalidateTag(CACHE_TAGS.USER_SETTINGS, operation),
    safeRevalidateTag(CACHE_TAGS.CURRENCY_RECORDS, operation),
  ]

  if (results.some(Boolean) && process.env.NODE_ENV === 'development') {
    console.warn('已清除所有货币相关缓存（不包括汇率缓存）')
  }
}

/**
 * 清除所有货币和汇率相关的缓存（用于数据导入等批量操作）
 * @param userId 用户ID（可选）
 */
export function revalidateAllCurrencyAndExchangeRateCache(userId?: string) {
  const operation = `所有货币和汇率缓存${userId ? ` (用户: ${userId})` : ' (所有用户)'}`
  const results = [
    safeRevalidateTag(CACHE_TAGS.USER_CURRENCIES, operation),
    safeRevalidateTag(CACHE_TAGS.CURRENCY_RECORDS, operation),
    safeRevalidateTag(CACHE_TAGS.EXCHANGE_RATES, operation),
    safeRevalidateTag(CACHE_TAGS.USER_SETTINGS, operation),
  ]

  if (results.some(Boolean) && process.env.NODE_ENV === 'development') {
    console.warn(`已清除${operation}`)
  }
}

/**
 * 清除所有缓存（谨慎使用）
 */
export function revalidateAllCache() {
  const operation = '所有缓存'
  const results = Object.values(CACHE_TAGS).map(tag =>
    safeRevalidateTag(tag, operation)
  )

  if (results.some(Boolean) && process.env.NODE_ENV === 'development') {
    console.warn('已清除所有缓存')
  }
}
