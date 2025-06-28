/**
 * 统一的日期范围处理工具函数
 * 确保所有API使用一致的日期时间边界设置
 */

/**
 * 标准化日期范围，确保时间边界正确
 * @param startDate 开始日期（字符串或Date对象）
 * @param endDate 结束日期（字符串或Date对象）
 * @returns 标准化后的日期范围对象
 */
export function normalizeDateRange(
  startDate?: string | Date | null,
  endDate?: string | Date | null
): {
  startDateTime?: Date
  endDateTime?: Date
  dateCondition: Record<string, Date>
} {
  const dateCondition: Record<string, Date> = {}
  let startDateTime: Date | undefined
  let endDateTime: Date | undefined

  if (startDate) {
    startDateTime = new Date(startDate)
    startDateTime.setHours(0, 0, 0, 0) // 设置为开始日期的00:00:00.000
    dateCondition.gte = startDateTime
  }

  if (endDate) {
    endDateTime = new Date(endDate)
    endDateTime.setHours(23, 59, 59, 999) // 设置为结束日期的23:59:59.999
    dateCondition.lte = endDateTime
  }

  return {
    startDateTime,
    endDateTime,
    dateCondition,
  }
}

/**
 * 标准化单个日期为当天的结束时间
 * @param date 日期（字符串或Date对象）
 * @returns 设置为当天23:59:59.999的Date对象
 */
export function normalizeEndOfDay(date: string | Date): Date {
  const targetDate = new Date(date)
  targetDate.setHours(23, 59, 59, 999)
  return targetDate
}

/**
 * 标准化单个日期为当天的开始时间
 * @param date 日期（字符串或Date对象）
 * @returns 设置为当天00:00:00.000的Date对象
 */
export function normalizeStartOfDay(date: string | Date): Date {
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  return targetDate
}

/**
 * 获取指定月份数之前的日期范围
 * @param months 月份数
 * @returns 标准化的日期范围
 */
export function getMonthsAgoDateRange(months: number): {
  startDate: Date
  endDate: Date
} {
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999) // 设置为今天的结束时间

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months + 1)
  startDate.setDate(1)
  startDate.setHours(0, 0, 0, 0) // 设置为月初的开始时间

  return { startDate, endDate }
}

/**
 * 获取指定天数之前的日期范围
 * @param days 天数
 * @returns 标准化的日期范围
 */
export function getDaysAgoDateRange(days: number): {
  startDate: Date
  endDate: Date
} {
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999) // 设置为今天的结束时间

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0) // 设置为开始日期的开始时间

  return { startDate, endDate }
}

/**
 * 标准化日期为YYYY-MM-DD格式，避免时区转换问题
 * 使用本地时间确保日期一致性
 * @param date 日期对象
 * @returns YYYY-MM-DD格式的日期字符串
 */
export function normalizeDateString(date: Date): string {
  // 使用本地时间的年月日，避免UTC转换导致的日期偏移
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return (
    year +
    '-' +
    String(month).padStart(2, '0') +
    '-' +
    String(day).padStart(2, '0')
  )
}

/**
 * 检查日期是否为今天
 * @param date 要检查的日期
 * @returns 是否为今天
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return normalizeDateString(date) === normalizeDateString(today)
}

/**
 * 检查日期是否为未来日期
 * @param date 要检查的日期
 * @returns 是否为未来日期
 */
export function isFutureDate(date: Date): boolean {
  const today = new Date()
  today.setHours(23, 59, 59, 999) // 设置为今天的最后一刻
  return date > today
}

/**
 * 获取月末日期
 * @param year 年份
 * @param month 月份（1-12）
 * @returns 月末的最后一刻
 */
export function getEndOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999)
}

/**
 * 获取月初日期
 * @param year 年份
 * @param month 月份（1-12）
 * @returns 月初的第一刻
 */
export function getStartOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1, 0, 0, 0, 0)
}
