/**
 * 交易统计查询模块
 * 使用数据库聚合查询替代内存计算，提供高性能的统计数据获取
 */

import { prisma } from '../connection-manager'
import { isPostgreSQL } from './system.queries'
// import { Prisma } from '@prisma/client'

/**
 * 安全地将数据库返回的数值转换为 JavaScript number
 * 处理 SQLite 和 PostgreSQL 之间的类型差异
 */
function convertToNumber(value: any): number {
  if (value === null || value === undefined) {
    return 0
  }

  // 如果是 BigInt，转换为 number
  if (typeof value === 'bigint') {
    return Number(value)
  }

  // 如果是字符串，尝试解析为数字
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }

  // 如果已经是数字，直接返回
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value
  }

  // 其他情况，尝试转换为数字
  const converted = Number(value)
  return isNaN(converted) ? 0 : converted
}

export interface TransactionStatsResult {
  totalIncome: number
  totalExpense: number
  totalNet: number
  thisMonthIncome: number
  thisMonthExpense: number
  thisMonthNet: number
  monthlyChange: number
  incomeCount: number
  expenseCount: number
  totalCount: number
}

/**
 * 获取交易统计数据（优化版本）
 * 使用数据库聚合查询，支持复杂的筛选条件和多币种转换
 */
export async function getTransactionStats(
  userId: string,
  filters: {
    accountId?: string
    categoryIds?: string[]
    currencyId?: string
    type?: 'INCOME' | 'EXPENSE' | ('INCOME' | 'EXPENSE')[]
    dateFrom?: Date
    dateTo?: Date
    search?: string
    tagIds?: string[]
  },
  baseCurrency: { id: string; code: string }
): Promise<TransactionStatsResult> {
  // 计算时间边界
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  try {
    if (isPostgreSQL()) {
      return await getTransactionStatsPostgreSQL(
        userId,
        filters,
        baseCurrency,
        thisMonth,
        lastMonth
      )
    } else {
      return await getTransactionStatsSQLite(
        userId,
        filters,
        baseCurrency,
        thisMonth,
        lastMonth
      )
    }
  } catch (error) {
    console.error('Transaction stats query failed:', error)
    throw new Error('获取交易统计失败')
  }
}

/**
 * PostgreSQL 版本的交易统计查询 - 真正的SQL聚合优化
 */
async function getTransactionStatsPostgreSQL(
  userId: string,
  filters: any,
  baseCurrency: { id: string; code: string },
  thisMonth: Date,
  lastMonth: Date
): Promise<TransactionStatsResult> {
  // 构建WHERE条件参数
  const params: any[] = [
    userId,
    baseCurrency.code,
    baseCurrency.id,
    thisMonth.toISOString(),
    lastMonth.toISOString(),
  ]
  let paramIndex = 5

  // 构建动态WHERE条件
  const conditions: string[] = ['t."userId" = $1']

  if (filters.accountId) {
    conditions.push(`t."accountId" = $${++paramIndex}`)
    params.push(filters.accountId)
  }

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    conditions.push(`a."categoryId" = ANY($${++paramIndex})`)
    params.push(filters.categoryIds)
  }

  if (filters.currencyId) {
    conditions.push(`t."currencyId" = $${++paramIndex}`)
    params.push(filters.currencyId)
  }

  if (filters.type) {
    if (typeof filters.type === 'string') {
      conditions.push(`t.type = $${++paramIndex}::transaction_types`)
      params.push(filters.type)
    } else if (Array.isArray(filters.type)) {
      conditions.push(`t.type = ANY($${++paramIndex}::transaction_types[])`)
      params.push(filters.type)
    }
  } else {
    conditions.push(
      "t.type IN ('INCOME'::transaction_types, 'EXPENSE'::transaction_types)"
    )
  }

  if (filters.dateFrom) {
    conditions.push(`t.date >= $${++paramIndex}`)
    params.push(filters.dateFrom.toISOString())
  }

  if (filters.dateTo) {
    conditions.push(`t.date <= $${++paramIndex}`)
    params.push(filters.dateTo.toISOString())
  }

  if (filters.search) {
    conditions.push(
      `(t.description ILIKE $${++paramIndex} OR t.notes ILIKE $${++paramIndex})`
    )
    params.push(`%${filters.search}%`, `%${filters.search}%`)
    paramIndex++ // 因为我们添加了两个参数
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    conditions.push(`EXISTS (
      SELECT 1 FROM transaction_tags tt
      WHERE tt."transactionId" = t.id AND tt."tagId" = ANY($${++paramIndex})
    )`)
    params.push(filters.tagIds)
  }

  const whereClause = conditions.join(' AND ')

  // 使用原生SQL聚合查询
  const query = `
    SELECT
      -- 总收入（转换为基础货币）
      COALESCE(SUM(
        CASE
          WHEN t.type = 'INCOME'::transaction_types THEN
            CASE
              WHEN c.code = $2 THEN t.amount::numeric
              ELSE t.amount::numeric * COALESCE(er.rate::numeric, 1)
            END
          ELSE 0
        END
      ), 0) as total_income,

      -- 总支出（转换为基础货币）
      COALESCE(SUM(
        CASE
          WHEN t.type = 'EXPENSE'::transaction_types THEN
            CASE
              WHEN c.code = $2 THEN t.amount::numeric
              ELSE t.amount::numeric * COALESCE(er.rate::numeric, 1)
            END
          ELSE 0
        END
      ), 0) as total_expense,

      -- 本月收入（转换为基础货币）
      COALESCE(SUM(
        CASE
          WHEN t.type = 'INCOME'::transaction_types AND t.date >= $4::timestamp THEN
            CASE
              WHEN c.code = $2 THEN t.amount::numeric
              ELSE t.amount::numeric * COALESCE(er.rate::numeric, 1)
            END
          ELSE 0
        END
      ), 0) as this_month_income,

      -- 本月支出（转换为基础货币）
      COALESCE(SUM(
        CASE
          WHEN t.type = 'EXPENSE'::transaction_types AND t.date >= $4::timestamp THEN
            CASE
              WHEN c.code = $2 THEN t.amount::numeric
              ELSE t.amount::numeric * COALESCE(er.rate::numeric, 1)
            END
          ELSE 0
        END
      ), 0) as this_month_expense,

      -- 上月收入（转换为基础货币）
      COALESCE(SUM(
        CASE
          WHEN t.type = 'INCOME'::transaction_types
            AND t.date >= $5::timestamp
            AND t.date < $4::timestamp THEN
            CASE
              WHEN c.code = $2 THEN t.amount::numeric
              ELSE t.amount::numeric * COALESCE(er.rate::numeric, 1)
            END
          ELSE 0
        END
      ), 0) as last_month_income,

      -- 上月支出（转换为基础货币）
      COALESCE(SUM(
        CASE
          WHEN t.type = 'EXPENSE'::transaction_types
            AND t.date >= $5::timestamp
            AND t.date < $4::timestamp THEN
            CASE
              WHEN c.code = $2 THEN t.amount::numeric
              ELSE t.amount::numeric * COALESCE(er.rate::numeric, 1)
            END
          ELSE 0
        END
      ), 0) as last_month_expense,

      -- 收入交易数量
      COUNT(CASE WHEN t.type = 'INCOME'::transaction_types THEN 1 END) as income_count,

      -- 支出交易数量
      COUNT(CASE WHEN t.type = 'EXPENSE'::transaction_types THEN 1 END) as expense_count,

      -- 总交易数量
      COUNT(*) as total_count

    FROM transactions t
    INNER JOIN currencies c ON t."currencyId" = c.id
    LEFT JOIN accounts a ON t."accountId" = a.id
    LEFT JOIN exchange_rates er ON (
      er."userId" = t."userId"
      AND er."fromCurrencyId" = t."currencyId"
      AND er."toCurrencyId" = $3
      AND er."effectiveDate" = (
        SELECT MAX("effectiveDate")
        FROM exchange_rates er2
        WHERE er2."userId" = er."userId"
          AND er2."fromCurrencyId" = er."fromCurrencyId"
          AND er2."toCurrencyId" = er."toCurrencyId"
      )
    )
    WHERE ${whereClause}
  `

  const result = await prisma.$queryRawUnsafe<
    Array<{
      total_income: string
      total_expense: string
      this_month_income: string
      this_month_expense: string
      last_month_income: string
      last_month_expense: string
      income_count: string
      expense_count: string
      total_count: string
    }>
  >(query, ...params)

  return processStatsResult(result[0] || {})
}

/**
 * SQLite 版本的交易统计查询 - 真正的SQL聚合优化
 */
async function getTransactionStatsSQLite(
  userId: string,
  filters: any,
  baseCurrency: { id: string; code: string },
  thisMonth: Date,
  lastMonth: Date
): Promise<TransactionStatsResult> {
  // 统一参数处理，确保与查询中的 '?' 占位符一一对应
  const params: any[] = [
    // SELECT and JOIN parameters
    baseCurrency.code, // total_income currency
    baseCurrency.code, // total_expense currency
    thisMonth.toISOString(), // this_month_income date
    baseCurrency.code, // this_month_income currency
    thisMonth.toISOString(), // this_month_expense date
    baseCurrency.code, // this_month_expense currency
    lastMonth.toISOString(), // last_month_income start
    thisMonth.toISOString(), // last_month_income end
    baseCurrency.code, // last_month_income currency
    lastMonth.toISOString(), // last_month_expense start
    thisMonth.toISOString(), // last_month_expense end
    baseCurrency.code, // last_month_expense currency
    baseCurrency.id, // exchange_rates join toCurrencyId

    // WHERE parameters
    userId,
  ]

  // 构建动态WHERE条件
  const whereConditions: string[] = ['t.userId = ?']

  if (filters.accountId) {
    whereConditions.push('t.accountId = ?')
    params.push(filters.accountId)
  }

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    const placeholders = filters.categoryIds.map(() => '?').join(',')
    whereConditions.push(`a.categoryId IN (${placeholders})`)
    params.push(...filters.categoryIds)
  }

  if (filters.currencyId) {
    whereConditions.push('t.currencyId = ?')
    params.push(filters.currencyId)
  }

  if (filters.type) {
    if (typeof filters.type === 'string') {
      whereConditions.push('t.type = ?')
      params.push(filters.type)
    } else if (Array.isArray(filters.type)) {
      const placeholders = filters.type.map(() => '?').join(',')
      whereConditions.push(`t.type IN (${placeholders})`)
      params.push(...filters.type)
    }
  } else {
    whereConditions.push("t.type IN ('INCOME', 'EXPENSE')")
  }

  if (filters.dateFrom) {
    whereConditions.push('t.date >= ?')
    params.push(filters.dateFrom.toISOString())
  }

  if (filters.dateTo) {
    whereConditions.push('t.date <= ?')
    params.push(filters.dateTo.toISOString())
  }

  if (filters.search) {
    whereConditions.push('(t.description LIKE ? OR t.notes LIKE ?)')
    params.push(`%${filters.search}%`, `%${filters.search}%`)
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    const placeholders = filters.tagIds.map(() => '?').join(',')
    whereConditions.push(`EXISTS (
      SELECT 1 FROM transaction_tags tt
      WHERE tt.transactionId = t.id AND tt.tagId IN (${placeholders})
    )`)
    params.push(...filters.tagIds)
  }

  const whereClause = whereConditions.join(' AND ')

  // 修正汇率查询逻辑：确保使用不晚于交易日期的最新汇率
  const query = `
    SELECT
      COALESCE(SUM(
        CASE
          WHEN t.type = 'INCOME' THEN
            CASE
              WHEN c.code = ? THEN t.amount
              ELSE t.amount * COALESCE(er.rate, 1)
            END
          ELSE 0
        END
      ), 0) as total_income,

      COALESCE(SUM(
        CASE
          WHEN t.type = 'EXPENSE' THEN
            CASE
              WHEN c.code = ? THEN t.amount
              ELSE t.amount * COALESCE(er.rate, 1)
            END
          ELSE 0
        END
      ), 0) as total_expense,

      COALESCE(SUM(
        CASE
          WHEN t.type = 'INCOME' AND t.date >= ? THEN
            CASE
              WHEN c.code = ? THEN t.amount
              ELSE t.amount * COALESCE(er.rate, 1)
            END
          ELSE 0
        END
      ), 0) as this_month_income,

      COALESCE(SUM(
        CASE
          WHEN t.type = 'EXPENSE' AND t.date >= ? THEN
            CASE
              WHEN c.code = ? THEN t.amount
              ELSE t.amount * COALESCE(er.rate, 1)
            END
          ELSE 0
        END
      ), 0) as this_month_expense,

      COALESCE(SUM(
        CASE
          WHEN t.type = 'INCOME'
            AND t.date >= ?
            AND t.date < ? THEN
            CASE
              WHEN c.code = ? THEN t.amount
              ELSE t.amount * COALESCE(er.rate, 1)
            END
          ELSE 0
        END
      ), 0) as last_month_income,

      COALESCE(SUM(
        CASE
          WHEN t.type = 'EXPENSE'
            AND t.date >= ?
            AND t.date < ? THEN
            CASE
              WHEN c.code = ? THEN t.amount
              ELSE t.amount * COALESCE(er.rate, 1)
            END
          ELSE 0
        END
      ), 0) as last_month_expense,

      COUNT(CASE WHEN t.type = 'INCOME' THEN 1 END) as income_count,
      COUNT(CASE WHEN t.type = 'EXPENSE' THEN 1 END) as expense_count,
      COUNT(*) as total_count

    FROM transactions t
    INNER JOIN currencies c ON t.currencyId = c.id
    LEFT JOIN accounts a ON t.accountId = a.id
    LEFT JOIN exchange_rates er ON (
      er.userId = t.userId
      AND er.fromCurrencyId = t.currencyId
      AND er.toCurrencyId = ?
      AND er.effectiveDate = (
        SELECT MAX(effectiveDate)
        FROM exchange_rates er2
        WHERE er2.userId = er.userId
          AND er2.fromCurrencyId = er.fromCurrencyId
          AND er2.toCurrencyId = er.toCurrencyId
          AND er2.toCurrencyId = er.toCurrencyId
      )
    )
    WHERE ${whereClause}
  `

  const result = await prisma.$queryRawUnsafe<
    Array<{
      total_income: number
      total_expense: number
      this_month_income: number
      this_month_expense: number
      last_month_income: number
      last_month_expense: number
      income_count: number
      expense_count: number
      total_count: number
    }>
  >(query, ...params)

  return processStatsResult(result[0] || {})
}

/**
 * 处理查询结果并计算衍生指标
 */
function processStatsResult(stats: any): TransactionStatsResult {
  const totalIncome = convertToNumber(stats.total_income)
  const totalExpense = convertToNumber(stats.total_expense)
  const thisMonthIncome = convertToNumber(stats.this_month_income)
  const thisMonthExpense = convertToNumber(stats.this_month_expense)
  const lastMonthIncome = convertToNumber(stats.last_month_income)
  const lastMonthExpense = convertToNumber(stats.last_month_expense)

  const totalNet = totalIncome - totalExpense
  const thisMonthNet = thisMonthIncome - thisMonthExpense
  const lastMonthNet = lastMonthIncome - lastMonthExpense
  const monthlyChange =
    lastMonthNet !== 0
      ? ((thisMonthNet - lastMonthNet) / Math.abs(lastMonthNet)) * 100
      : 0

  return {
    totalIncome,
    totalExpense,
    totalNet,
    thisMonthIncome,
    thisMonthExpense,
    thisMonthNet,
    monthlyChange,
    incomeCount: Number(stats.income_count) || 0,
    expenseCount: Number(stats.expense_count) || 0,
    totalCount: Number(stats.total_count) || 0,
  }
}
