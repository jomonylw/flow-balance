/**
 * 通用工具函数
 */

/**
 * 格式化货币显示
 * @param amount 金额
 * @param currencyCode 货币代码
 * @param symbol 货币符号（可选）
 * @returns 格式化的货币字符串
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  symbol?: string
): string {
  // 常见货币符号映射
  const currencySymbols: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    HKD: 'HK$',
    TWD: 'NT$',
    SGD: 'S$',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    RUB: '₽',
    INR: '₹',
    KRW: '₩',
    THB: '฿',
    MYR: 'RM',
    IDR: 'Rp',
    PHP: '₱',
    VND: '₫',
  }

  const currencySymbol = symbol || currencySymbols[currencyCode] || currencyCode

  // 注意：这个函数已被弃用，请使用 useUserCurrencyFormatter Hook
  // 这里保留硬编码的 'zh-CN' 是为了向后兼容，但建议迁移到新的Hook
  return `${currencySymbol}${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * 格式化数字（添加千位分隔符）
 * @param value 数值
 * @param decimals 小数位数（默认2位）
 * @returns 格式化的数字字符串
 */
export function formatNumber(value: number, decimals: number = 2): string {
  // 注意：这个函数已被弃用，请使用 useUserCurrencyFormatter Hook
  // 这里保留硬编码的 'zh-CN' 是为了向后兼容，但建议迁移到新的Hook
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * 格式化百分比
 * @param value 数值（0-1之间）
 * @param decimals 小数位数（默认1位）
 * @returns 格式化的百分比字符串
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * 计算两个日期之间的月数差
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 月数差
 */
export function getMonthsDifference(startDate: Date, endDate: Date): number {
  const yearDiff = endDate.getFullYear() - startDate.getFullYear()
  const monthDiff = endDate.getMonth() - startDate.getMonth()
  return yearDiff * 12 + monthDiff
}

/**
 * 将月数转换为年月表示
 * @param months 总月数
 * @returns {years: number, months: number}
 */
export function monthsToYearsAndMonths(months: number): {
  years: number
  months: number
} {
  const years = Math.floor(months / 12)
  const remainingMonths = Math.floor(months % 12)
  return { years, months: remainingMonths }
}

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

/**
 * 获取指定月份的天数
 * @param date 日期对象
 * @returns 该月的天数
 */
export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * 计算贷款还款日期，处理月末日期边界情况
 * @param baseDate 基准日期
 * @param targetDay 目标还款日（1-31）
 * @param monthsToAdd 要添加的月数
 * @returns 调整后的还款日期
 */
export function calculateLoanPaymentDate(
  baseDate: Date,
  targetDay: number,
  monthsToAdd: number = 0
): Date {
  // 从基准日期的年月开始，避免日期跳跃问题
  const baseYear = baseDate.getFullYear()
  const baseMonth = baseDate.getMonth()

  // 计算目标年月
  const targetYear = baseYear + Math.floor((baseMonth + monthsToAdd) / 12)
  const targetMonth = (baseMonth + monthsToAdd) % 12

  // 创建目标月份的第一天
  const result = new Date(targetYear, targetMonth, 1)

  // 获取目标月份的最大天数
  const maxDayInMonth = getDaysInMonth(result)

  // 如果目标日期超过该月最大天数，选择该月最后一天
  // 如果目标日期在该月范围内，使用目标日期
  const adjustedDay = Math.min(targetDay, maxDayInMonth)

  // 设置为调整后的日期
  result.setDate(adjustedDay)

  return result
}

/**
 * 为贷款合约计算指定期数的还款日期
 * @param contractStartDate 合约开始日期
 * @param paymentDay 每月还款日（1-31）
 * @param period 期数（从1开始）
 * @returns 该期的还款日期
 */
export function calculateLoanPaymentDateForPeriod(
  contractStartDate: Date,
  paymentDay: number,
  period: number
): Date {
  // 第一期使用合约开始日期
  if (period === 1) {
    return new Date(contractStartDate)
  }

  // 第二期开始使用每月还款日
  // period - 1 是因为第一期已经是开始日期，第二期是开始日期的下个月
  return calculateLoanPaymentDate(contractStartDate, paymentDay, period - 1)
}

/**
 * 深度克隆对象
 * @param obj 要克隆的对象
 * @returns 克隆后的对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T
  }

  const cloned = {} as T
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key])
    }
  }

  return cloned
}

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param limit 限制时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * 检查值是否为空
 * @param value 要检查的值
 * @returns 是否为空
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim().length === 0
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0
  }

  return false
}

/**
 * 安全地解析JSON
 * @param jsonString JSON字符串
 * @param defaultValue 默认值
 * @returns 解析后的对象或默认值
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString)
  } catch {
    return defaultValue
  }
}

/**
 * 将对象转换为查询字符串
 * @param params 参数对象
 * @returns 查询字符串
 */
export function objectToQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value))
    }
  }

  return searchParams.toString()
}

/**
 * 类名合并工具（类似clsx）
 * @param classes 类名数组
 * @returns 合并后的类名字符串
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
