/**
 * 报表查询模块
 * 包含现金流报表和月度汇总相关查询
 */

import { prisma } from '../connection-manager'
import { Prisma } from '@prisma/client'
import { isPostgreSQL } from './system.queries'
import type {
  CashFlowResult,
  IncomeExpenseResult,
  MonthlyFlowResult,
  MonthlyStockResult,
  DashboardCashFlowResult,
} from '@/types/database/raw-queries'

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

// ============================================================================
// 现金流查询模块
// ============================================================================

/**
 * 获取现金流数据（优化版本）
 * 统一处理现金流报表的数据查询逻辑
 *
 * @param userId 用户 ID
 * @param dateCondition 日期条件对象，包含 startDate 和 endDate
 * @returns 现金流结果数组
 */
export async function getCashFlowData(
  userId: string,
  dateCondition: { startDate: Date; endDate: Date }
): Promise<CashFlowResult[]> {
  try {
    const { startDate, endDate } = dateCondition

    let result: Array<{
      category_id: string
      category_name: string
      category_type: string
      account_id: string
      account_name: string
      currency_code: string
      currency_symbol: string
      currency_name: string
      transaction_type: string
      total_amount: any // 允许任何类型，稍后转换
      transaction_count: any // 允许任何类型，稍后转换
    }>

    if (isPostgreSQL()) {
      result = await prisma.$queryRaw`
        SELECT
          cat.id as category_id,
          cat.name as category_name,
          cat.type as category_type,
          a.id as account_id,
          a.name as account_name,
          c.code as currency_code,
          c.symbol as currency_symbol,
          c.name as currency_name,
          t.type as transaction_type,
          SUM(t.amount) as total_amount,
          COUNT(*) as transaction_count
        FROM transactions t
        JOIN accounts a ON t."accountId" = a.id
        JOIN categories cat ON a."categoryId" = cat.id
        JOIN currencies c ON t."currencyId" = c.id
        WHERE t."userId" = ${userId}
          AND t.date >= ${startDate}
          AND t.date <= ${endDate}
          AND cat.type IN ('INCOME', 'EXPENSE')
          AND t.type IN ('INCOME', 'EXPENSE')
        GROUP BY cat.id, cat.name, cat.type, a.id, a.name, c.code, c.symbol, c.name, t.type
        ORDER BY cat.type, total_amount DESC
      `
    } else {
      result = await prisma.$queryRaw`
        SELECT
          cat.id as category_id,
          cat.name as category_name,
          cat.type as category_type,
          a.id as account_id,
          a.name as account_name,
          c.code as currency_code,
          c.symbol as currency_symbol,
          c.name as currency_name,
          t.type as transaction_type,
          SUM(t.amount) as total_amount,
          COUNT(*) as transaction_count
        FROM transactions t
        JOIN accounts a ON t.accountId = a.id
        JOIN categories cat ON a.categoryId = cat.id
        JOIN currencies c ON t.currencyId = c.id
        WHERE t.userId = ${userId}
          AND t.date >= ${startDate}
          AND t.date <= ${endDate}
          AND cat.type IN ('INCOME', 'EXPENSE')
          AND t.type IN ('INCOME', 'EXPENSE')
        GROUP BY cat.id, cat.name, cat.type, a.id, a.name, c.code, c.symbol, c.name, t.type
        ORDER BY cat.type, total_amount DESC
      `
    }

    return result.map(row => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryType: row.category_type,
      accountId: row.account_id,
      accountName: row.account_name,
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      currencyName: row.currency_name,
      transactionType: row.transaction_type,
      totalAmount: convertToNumber(row.total_amount),
      transactionCount: convertToNumber(row.transaction_count),
    }))
  } catch (error) {
    console.error('获取现金流数据失败:', error)
    throw new Error('获取现金流数据失败')
  }
}

/**
 * 获取月度收支数据
 * 用于仪表板显示当月收入和支出汇总
 *
 * @param userId 用户 ID
 * @param targetDate 目标月份日期
 * @returns 收支结果数组
 */
export async function getMonthlyIncomeExpense(
  userId: string,
  targetDate: Date
): Promise<IncomeExpenseResult[]> {
  try {
    // 计算月份的开始和结束日期
    const monthStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      1
    )
    const monthEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    )

    const result = await prisma.$queryRaw<
      Array<{
        account_type: string
        currency_code: string
        total_amount: any // 允许任何类型，稍后转换
      }>
    >`
      SELECT
        cat.type as account_type,
        c.code as currency_code,
        SUM(t.amount) as total_amount
      FROM transactions t
      JOIN accounts a ON t."accountId" = a.id
      JOIN categories cat ON a."categoryId" = cat.id
      JOIN currencies c ON t."currencyId" = c.id
      WHERE t."userId" = ${userId}
        AND t.date >= ${monthStart}
        AND t.date <= ${monthEnd}
        AND cat.type IN ('INCOME', 'EXPENSE')
        AND t.type IN ('INCOME', 'EXPENSE')
      GROUP BY cat.type, c.code
      ORDER BY cat.type, total_amount DESC
    `

    return result.map(row => ({
      accountType: row.account_type,
      currencyCode: row.currency_code,
      totalAmount: convertToNumber(row.total_amount),
    }))
  } catch (error) {
    console.error('获取月度收支数据失败:', error)
    throw new Error('获取月度收支数据失败')
  }
}

/**
 * 批量获取仪表板现金流数据（优化版本）
 * 基于 getMonthlyIncomeExpense 扩展，支持批量获取多个月份的现金流数据
 * 消除 N+1 查询问题，大幅提升仪表板图表性能
 *
 * @param userId 用户 ID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 现金流结果数组
 */
export async function getDashboardCashFlow(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<DashboardCashFlowResult[]> {
  try {
    let result: Array<{
      month: string
      category_type: string
      currency_code: string
      total_amount: any // 允许任何类型，稍后转换
    }>

    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用 to_char 格式化月份
      result = await prisma.$queryRaw`
        SELECT
          to_char(t.date, 'YYYY-MM') as month,
          cat.type as category_type,
          c.code as currency_code,
          SUM(t.amount) as total_amount
        FROM transactions t
        JOIN accounts a ON t."accountId" = a.id
        JOIN categories cat ON a."categoryId" = cat.id
        JOIN currencies c ON t."currencyId" = c.id
        WHERE t."userId" = ${userId}
          AND t.date >= ${startDate}
          AND t.date <= ${endDate}
          AND cat.type IN ('INCOME', 'EXPENSE')
          AND t.type IN ('INCOME', 'EXPENSE')
        GROUP BY month, cat.type, c.code
        ORDER BY month ASC, cat.type, total_amount DESC
      `
    } else {
      // SQLite 版本：使用 strftime 格式化月份
      // 将 JavaScript Date 转换为毫秒时间戳
      const startTimestamp = startDate.getTime()
      const endTimestamp = endDate.getTime()

      result = await prisma.$queryRaw`
        SELECT
          strftime('%Y-%m', t.date/1000, 'unixepoch') as month,
          cat.type as category_type,
          c.code as currency_code,
          SUM(t.amount) as total_amount
        FROM transactions t
        JOIN accounts a ON t.accountId = a.id
        JOIN categories cat ON a.categoryId = cat.id
        JOIN currencies c ON t.currencyId = c.id
        WHERE t.userId = ${userId}
          AND t.date >= ${startTimestamp}
          AND t.date <= ${endTimestamp}
          AND cat.type IN ('INCOME', 'EXPENSE')
          AND t.type IN ('INCOME', 'EXPENSE')
        GROUP BY month, cat.type, c.code
        ORDER BY month ASC, cat.type, total_amount DESC
      `
    }

    return result.map(row => ({
      month: row.month,
      categoryType: row.category_type,
      currencyCode: row.currency_code,
      totalAmount: convertToNumber(row.total_amount),
    }))
  } catch (error) {
    console.error('获取仪表板现金流数据失败:', error)
    throw new Error('获取仪表板现金流数据失败')
  }
}

// ============================================================================
// 月度汇总查询模块
// ============================================================================

/**
 * 获取流量类分类的月度汇总数据
 * 统一处理流量类分类（收入/支出）的月度数据聚合
 *
 * @param categoryId 分类 ID
 * @param userId 用户 ID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param allCategoryIds 包含子分类的所有分类 ID 数组
 * @returns 月度流量汇总结果数组
 */
export async function getMonthlyFlowSummary(
  _categoryId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
  allCategoryIds: string[]
): Promise<MonthlyFlowResult[]> {
  try {
    let aggregatedData: Array<{
      month: string
      account_id: string
      account_name: string
      account_description: string | null
      category_id: string
      category_name: string
      currency_code: string
      transaction_type: string
      total_amount: any // 允许任何类型，稍后转换
      transaction_count: any // 允许任何类型，稍后转换
    }>

    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用 to_char 函数
      aggregatedData = await prisma.$queryRaw`
        SELECT
          to_char(t.date, 'YYYY-MM') as month,
          a.id as account_id,
          a.name as account_name,
          a.description as account_description,
          a."categoryId" as category_id,
          cat.name as category_name,
          c.code as currency_code,
          t.type as transaction_type,
          SUM(t.amount) as total_amount,
          COUNT(*) as transaction_count
        FROM transactions t
        JOIN accounts a ON t."accountId" = a.id
        JOIN categories cat ON a."categoryId" = cat.id
        JOIN currencies c ON t."currencyId" = c.id
        WHERE t."userId" = ${userId}
          AND a."categoryId" IN (${Prisma.join(allCategoryIds)})
          AND t.type IN ('INCOME', 'EXPENSE')
          AND t.date >= ${startDate}
          AND t.date <= ${endDate}
        GROUP BY month, a.id, a.name, a.description, a."categoryId", cat.name, c.code, t.type
        ORDER BY month DESC, a.name ASC
      `
    } else {
      // SQLite 版本：使用 strftime 和 WITH RECURSIVE 确保所有账户都出现
      const startMonth = startDate.toISOString().slice(0, 10)
      const endMonth = endDate.toISOString().slice(0, 10)

      aggregatedData = await prisma.$queryRaw`
        WITH RECURSIVE months(month_start) AS (
          SELECT ${startMonth}
          UNION ALL
          SELECT date(month_start, '+1 month')
          FROM months
          WHERE date(month_start, '+1 month') <= ${endMonth}
        )
        SELECT
          strftime('%Y-%m', m.month_start) as month,
          a.id as account_id,
          a.name as account_name,
          a.description as account_description,
          a.categoryId as category_id,
          cat.name as category_name,
          cur.code as currency_code,
          'FLOW' as transaction_type, -- 虚拟值以满足类型
          CAST(COALESCE(SUM(t.amount), 0) AS TEXT) as total_amount,
          CAST(COUNT(t.id) AS TEXT) as transaction_count
        FROM months m
        CROSS JOIN accounts a
        JOIN categories cat ON a.categoryId = cat.id
        JOIN currencies cur ON a.currencyId = cur.id
        LEFT JOIN transactions t ON t.accountId = a.id
          AND t.type IN ('INCOME', 'EXPENSE')
          AND strftime('%Y-%m', t.date/1000, 'unixepoch') = strftime('%Y-%m', m.month_start)
          AND t.date <= ${endDate}
        WHERE a.userId = ${userId}
          AND a.categoryId IN (${Prisma.join(allCategoryIds)})
        GROUP BY month, a.id, a.name, a.description, a.categoryId, cat.name, cur.code
        ORDER BY month DESC, a.name ASC
      `
    }

    return aggregatedData.map(row => ({
      month: row.month,
      accountId: row.account_id,
      accountName: row.account_name,
      accountDescription: row.account_description,
      categoryId: row.category_id,
      categoryName: row.category_name,
      currencyCode: row.currency_code,
      transactionType: row.transaction_type,
      totalAmount: convertToNumber(row.total_amount),
      transactionCount: convertToNumber(row.transaction_count),
    }))
  } catch (error) {
    console.error('获取月度流量汇总数据失败:', error)
    throw new Error('获取月度流量汇总数据失败')
  }
}

/**
 * 获取存量类分类的月度汇总数据
 * 统一处理存量类分类（资产/负债）的月度余额数据
 *
 * @param _categoryId 分类 ID（保留兼容性）
 * @param userId 用户 ID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param allCategoryIds 包含子分类的所有分类 ID 数组
 * @returns 月度存量汇总结果数组
 */
export async function getMonthlyStockSummary(
  _categoryId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
  allCategoryIds: string[]
): Promise<MonthlyStockResult[]> {
  try {
    let monthlyBalanceData: Array<{
      month: string
      account_id: string
      account_name: string
      account_description: string | null
      category_id: string
      category_name: string
      currency_code: string
      balance_amount: any // 允许任何类型，稍后转换
    }>

    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用复杂的 CTE 查询计算月末余额
      monthlyBalanceData = await prisma.$queryRaw`
        WITH RECURSIVE months AS (
          SELECT date_trunc('month', ${startDate}::date) as month_start
          UNION ALL
          SELECT month_start + interval '1 month'
          FROM months
          WHERE month_start <= date_trunc('month', ${endDate}::date)
        ),
        account_months AS (
          SELECT
            a.id as account_id,
            a.name as account_name,
            a.description as account_description,
            a."categoryId" as category_id,
            cat.name as category_name,
            c.code as currency_code,
            m.month_start
          FROM accounts a
          JOIN categories cat ON a."categoryId" = cat.id
          JOIN currencies c ON a."currencyId" = c.id
          CROSS JOIN months m
          WHERE a."userId" = ${userId}
            AND a."categoryId" IN (${Prisma.join(allCategoryIds)})
        ),
        latest_balances AS (
          SELECT
            am.month_start,
            am.account_id,
            am.account_name,
            am.account_description,
            am.category_id,
            am.category_name,
            am.currency_code,
            to_char(am.month_start, 'YYYY-MM') as month,
            COALESCE(
              (SELECT amount
               FROM transactions t
               WHERE t."accountId" = am.account_id
                 AND t."currencyId" = (SELECT id FROM currencies WHERE code = am.currency_code)
                 AND t.type = 'BALANCE'
                 AND t.date < (am.month_start + interval '1 month')
               ORDER BY t.date DESC, t."createdAt" DESC
               LIMIT 1
              ), 0
            ) as balance_amount
          FROM account_months am
        )
        SELECT
          month,
          account_id,
          account_name,
          account_description,
          category_id,
          category_name,
          currency_code,
          balance_amount
        FROM latest_balances
        ORDER BY month DESC, account_name ASC
      `
    } else {
      // SQLite 版本：遵循兼容性指南
      const startMonth = startDate.toISOString().slice(0, 7) + '-01'
      const endMonth = endDate.toISOString().slice(0, 7) + '-01'

      monthlyBalanceData = await prisma.$queryRaw`
        WITH RECURSIVE months(month_start) AS (
          SELECT ${startMonth}
          UNION ALL
          SELECT date(month_start, '+1 month')
          FROM months
          WHERE month_start <= ${endMonth}
        )
        SELECT
          strftime('%Y-%m', m.month_start) as month,
          a.id as account_id,
          a.name as account_name,
          a.description as account_description,
          a.categoryId as category_id,
          cat.name as category_name,
          c.code as currency_code,
          CAST(COALESCE(
            (SELECT amount
             FROM transactions t
             WHERE t.accountId = a.id
               AND t.currencyId = c.id
               AND t.type = 'BALANCE'
               AND t.date < strftime('%s', date(m.month_start, '+1 month')) * 1000
             ORDER BY t.date DESC, t.createdAt DESC
             LIMIT 1
            ), 0
          ) AS TEXT) as balance_amount
        FROM months m
        CROSS JOIN accounts a
        JOIN categories cat ON a.categoryId = cat.id
        JOIN currencies c ON a.currencyId = c.id
        WHERE a.userId = ${userId}
          AND a.categoryId IN (${Prisma.join(allCategoryIds)})
        ORDER BY month DESC, a.name ASC
      `
    }

    return monthlyBalanceData.map(row => ({
      month: row.month,
      accountId: row.account_id,
      accountName: row.account_name,
      accountDescription: row.account_description,
      categoryId: row.category_id,
      categoryName: row.category_name,
      currencyCode: row.currency_code,
      balanceAmount: convertToNumber(row.balance_amount),
    }))
  } catch (error) {
    console.error('获取月度存量汇总数据失败:', error)
    throw new Error('获取月度存量汇总数据失败')
  }
}
