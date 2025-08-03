/**
 * 账户和余额查询模块
 * 包含账户余额计算和历史查询相关功能
 */

import { format } from 'date-fns'
import { prisma } from '../connection-manager'
import { isPostgreSQL } from './system.queries'
import type {
  AccountBalanceResult,
  BalanceHistoryResult,
  NetWorthHistoryResult,
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
// 余额计算查询模块
// ============================================================================

/**
 * 获取账户最新余额（优化版本）
 * 统一处理资产负债表和账户详情中的余额计算逻辑
 *
 * @param userId 用户 ID
 * @param asOfDate 截止日期
 * @returns 账户余额结果数组
 */
export async function getLatestAccountBalances(
  userId: string,
  asOfDate: Date
): Promise<AccountBalanceResult[]> {
  try {
    let balanceQuery: Array<{
      account_id: string
      currency_code: string
      currency_symbol: string
      currency_name: string
      final_balance: any // 允许任何类型，稍后转换
    }>

    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用复杂的 CTE 查询
      balanceQuery = await prisma.$queryRaw`
        WITH latest_balances AS (
          SELECT DISTINCT ON (t."accountId", t."currencyId")
            t."accountId",
            t."currencyId",
            t.amount as balance_amount,
            t.date as balance_date,
            c.code as currency_code,
            c.symbol as currency_symbol,
            c.name as currency_name
          FROM "transactions" t
          JOIN "currencies" c ON t."currencyId" = c.id
          WHERE t."userId" = ${userId}
            AND t.type = 'BALANCE'
            AND t.date <= ${asOfDate}
          ORDER BY t."accountId", t."currencyId", t.date DESC
        ),
        subsequent_transactions AS (
          SELECT
            t."accountId",
            t."currencyId",
            SUM(
              CASE
                WHEN t.type = 'INCOME' THEN t.amount
                WHEN t.type = 'EXPENSE' THEN -t.amount
                ELSE 0
              END
            ) as transaction_sum
          FROM "transactions" t
          JOIN latest_balances lb ON t."accountId" = lb."accountId" AND t."currencyId" = lb."currencyId"
          WHERE t."userId" = ${userId}
            AND t.type != 'BALANCE'
            AND t.date > lb.balance_date
            AND t.date <= ${asOfDate}
          GROUP BY t."accountId", t."currencyId"
        )
        SELECT
          lb."accountId" as account_id,
          lb.currency_code,
          lb.currency_symbol,
          lb.currency_name,
          COALESCE(lb.balance_amount, 0) + COALESCE(st.transaction_sum, 0) as final_balance
        FROM latest_balances lb
        LEFT JOIN subsequent_transactions st ON lb."accountId" = st."accountId" AND lb."currencyId" = st."currencyId"

        UNION ALL

        -- 处理没有BALANCE记录的账户
        SELECT DISTINCT
          t."accountId" as account_id,
          c.code as currency_code,
          c.symbol as currency_symbol,
          c.name as currency_name,
          SUM(
            CASE
              WHEN t.type = 'INCOME' THEN t.amount
              WHEN t.type = 'EXPENSE' THEN -t.amount
              ELSE 0
            END
          ) as final_balance
        FROM "transactions" t
        JOIN "currencies" c ON t."currencyId" = c.id
        WHERE t."userId" = ${userId}
          AND t.date <= ${asOfDate}
          AND t."accountId" NOT IN (
            SELECT DISTINCT "accountId" FROM "transactions"
            WHERE "userId" = ${userId} AND type = 'BALANCE'
          )
        GROUP BY t."accountId", t."currencyId", c.code, c.symbol, c.name
      `
    } else {
      // SQLite 版本：使用窗口函数模拟 `DISTINCT ON`
      balanceQuery = await prisma.$queryRaw`
        WITH latest_balance_records AS (
          -- 步骤 1: 使用 ROW_NUMBER() 找到每个账户和币种的最新 BALANCE 记录
          SELECT
            "accountId",
            "currencyId",
            amount as balance_amount,
            date as balance_date
          FROM (
            SELECT
              t."accountId",
              t."currencyId",
              t.amount,
              t.date,
              ROW_NUMBER() OVER(PARTITION BY t."accountId", t."currencyId" ORDER BY t.date DESC, t."createdAt" DESC) as rn
            FROM "transactions" t
            WHERE t."userId" = ${userId}
              AND t.type = 'BALANCE'
              AND t.date <= ${asOfDate}
          )
          WHERE rn = 1
        ),
        subsequent_transactions AS (
          -- 步骤 2: 计算最新 BALANCE 记录之后的交易流水总和
          SELECT
            t."accountId",
            t."currencyId",
            SUM(
              CASE
                WHEN t.type = 'INCOME' THEN t.amount
                WHEN t.type = 'EXPENSE' THEN -t.amount
                ELSE 0
              END
            ) as transaction_sum
          FROM "transactions" t
          LEFT JOIN latest_balance_records lb ON t."accountId" = lb."accountId" AND t."currencyId" = lb."currencyId"
          WHERE t."userId" = ${userId}
            AND t.type != 'BALANCE'
            AND t.date <= ${asOfDate}
            -- 如果有 balance 记录，则只计算其后的交易；否则计算所有交易
            AND t.date > COALESCE(lb.balance_date, 0)
          GROUP BY t."accountId", t."currencyId"
        ),
        accounts_with_any_transaction AS (
            -- 确保所有有交易的账户都被包含，即使它们没有 subsequent_transactions
            SELECT DISTINCT "accountId", "currencyId" FROM "transactions" WHERE "userId" = ${userId}
        )
        -- 步骤 3: 合并结果
        SELECT
          awt."accountId" as account_id,
          c.code as currency_code,
          c.symbol as currency_symbol,
          c.name as currency_name,
          -- 最终余额 = 最新余额 + 后续流水，使用 CAST 确保返回字符串避免 BigInt 转换问题
          CAST(COALESCE(lb.balance_amount, 0) + COALESCE(st.transaction_sum, 0) AS TEXT) as final_balance
        FROM accounts_with_any_transaction awt
        JOIN "currencies" c ON awt."currencyId" = c.id
        LEFT JOIN latest_balance_records lb ON awt."accountId" = lb."accountId" AND awt."currencyId" = lb."currencyId"
        LEFT JOIN subsequent_transactions st ON awt."accountId" = st."accountId" AND awt."currencyId" = st."currencyId"
      `
    }

    return balanceQuery.map(row => ({
      accountId: row.account_id,
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      currencyName: row.currency_name,
      finalBalance: convertToNumber(row.final_balance),
    }))
  } catch (error) {
    console.error('获取账户最新余额失败:', error)
    throw new Error('获取账户余额失败')
  }
}

/**
 * 获取单个账户的余额历史
 * 用于账户详情页面显示
 *
 * @param accountId 账户 ID
 * @param userId 用户 ID
 * @returns 余额历史结果数组
 */
export async function getAccountBalanceHistory(
  accountId: string,
  userId: string
): Promise<BalanceHistoryResult[]> {
  try {
    let balanceQuery: Array<{
      currency_code: string
      currency_symbol: string
      currency_name: string
      final_balance: any // 允许任何类型，稍后转换
    }>

    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用复杂的 CTE 查询
      balanceQuery = await prisma.$queryRaw`
        WITH latest_balances AS (
          SELECT DISTINCT ON (t."currencyId")
            t."currencyId",
            t.amount as balance_amount,
            t.date as balance_date,
            c.code as currency_code,
            c.symbol as currency_symbol,
            c.name as currency_name
          FROM "transactions" t
          JOIN "currencies" c ON t."currencyId" = c.id
          WHERE t."accountId" = ${accountId}
            AND t."userId" = ${userId}
            AND t.type = 'BALANCE'
          ORDER BY t."currencyId", t.date DESC, t."createdAt" DESC
        ),
        subsequent_transactions AS (
          SELECT
            t."currencyId",
            SUM(
              CASE
                WHEN t.type = 'INCOME' THEN t.amount
                WHEN t.type = 'EXPENSE' THEN -t.amount
                ELSE 0
              END
            ) as transaction_sum
          FROM "transactions" t
          JOIN latest_balances lb ON t."currencyId" = lb."currencyId"
          WHERE t."accountId" = ${accountId}
            AND t."userId" = ${userId}
            AND t.type != 'BALANCE'
            AND t.date > lb.balance_date
          GROUP BY t."currencyId"
        )
        SELECT
          lb.currency_code,
          lb.currency_symbol,
          lb.currency_name,
          COALESCE(lb.balance_amount, 0) + COALESCE(st.transaction_sum, 0) as final_balance
        FROM latest_balances lb
        LEFT JOIN subsequent_transactions st ON lb."currencyId" = st."currencyId"
      `
    } else {
      // SQLite 版本：使用窗口函数模拟 `DISTINCT ON`
      balanceQuery = await prisma.$queryRaw`
        WITH latest_balance_records AS (
          -- 步骤 1: 找到每个币种的最新 BALANCE 记录
          SELECT
            "currencyId",
            amount as balance_amount,
            date as balance_date
          FROM (
            SELECT
              t."currencyId",
              t.amount,
              t.date,
              ROW_NUMBER() OVER(PARTITION BY t."currencyId" ORDER BY t.date DESC, t."createdAt" DESC) as rn
            FROM "transactions" t
            WHERE t."accountId" = ${accountId}
              AND t."userId" = ${userId}
              AND t.type = 'BALANCE'
          )
          WHERE rn = 1
        ),
        subsequent_transactions AS (
          -- 步骤 2: 计算最新 BALANCE 记录之后的所有交易流水
          SELECT
            t."currencyId",
            SUM(
              CASE
                WHEN t.type = 'INCOME' THEN t.amount
                WHEN t.type = 'EXPENSE' THEN -t.amount
                ELSE 0
              END
            ) as transaction_sum
          FROM "transactions" t
          LEFT JOIN latest_balance_records lb ON t."currencyId" = lb."currencyId"
          WHERE t."accountId" = ${accountId}
            AND t."userId" = ${userId}
            AND t.type != 'BALANCE'
            AND t.date > COALESCE(lb.balance_date, 0)
          GROUP BY t."currencyId"
        ),
        currencies_in_account AS (
            -- 确保账户中所有涉及的币种都被包含
            SELECT DISTINCT "currencyId" FROM "transactions" WHERE "accountId" = ${accountId} AND "userId" = ${userId}
        )
        -- 步骤 3: 合并结果
        SELECT
          c.code as currency_code,
          c.symbol as currency_symbol,
          c.name as currency_name,
          CAST(COALESCE(lb.balance_amount, 0) + COALESCE(st.transaction_sum, 0) AS TEXT) as final_balance
        FROM currencies_in_account cia
        JOIN "currencies" c ON cia."currencyId" = c.id
        LEFT JOIN latest_balance_records lb ON cia."currencyId" = lb."currencyId"
        LEFT JOIN subsequent_transactions st ON cia."currencyId" = st."currencyId"
      `
    }

    return balanceQuery.map(row => ({
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      currencyName: row.currency_name,
      finalBalance: convertToNumber(row.final_balance),
    }))
  } catch (error) {
    console.error('获取账户余额历史失败:', error)
    throw new Error('获取账户余额历史失败')
  }
}

/**
 * 批量获取净资产历史数据（优化版本）
 * 融合 getMonthlyStockSummary 和 getLatestAccountBalances 的逻辑
 * 支持批量计算多个月份的净资产数据，消除 N+1 查询问题
 *
 * @param userId 用户 ID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 净资产历史结果数组
 */
export async function getNetWorthHistory(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<NetWorthHistoryResult[]> {
  try {
    let result: Array<{
      month: string
      category_type: string
      currency_code: string
      total_balance: any // 允许任何类型，稍后转换
    }>

    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用复杂的 CTE 查询计算月末余额
      result = await prisma.$queryRaw`
        WITH RECURSIVE months AS (
          SELECT date_trunc('month', ${startDate}::date) as month_start
          UNION ALL
          SELECT month_start + interval '1 month'
          FROM months
          WHERE month_start < date_trunc('month', ${endDate}::date)
        ),
        month_ends AS (
          SELECT
            to_char(month_start, 'YYYY-MM') as month,
            (month_start + interval '1 month' - interval '1 day')::date as month_end_date
          FROM months
        ),
        account_month_ends AS (
          SELECT
            a.id as account_id,
            cat.type as category_type,
            c.code as currency_code,
            me.month,
            me.month_end_date
          FROM accounts a
          JOIN categories cat ON a."categoryId" = cat.id
          JOIN currencies c ON a."currencyId" = c.id
          CROSS JOIN month_ends me
          WHERE a."userId" = ${userId}
            AND cat.type IN ('ASSET', 'LIABILITY')
        ),
        latest_balances AS (
          SELECT DISTINCT ON (ame.account_id, ame.currency_code, ame.month)
            ame.account_id,
            ame.category_type,
            ame.currency_code,
            ame.month,
            ame.month_end_date,
            COALESCE(t.amount, 0) as balance_amount,
            COALESCE(t.date, '1900-01-01'::date) as balance_date
          FROM account_month_ends ame
          LEFT JOIN transactions t ON t."accountId" = ame.account_id
            AND t."currencyId" = (SELECT id FROM currencies WHERE code = ame.currency_code)
            AND t.type = 'BALANCE'
            AND t.date <= ame.month_end_date
          ORDER BY ame.account_id, ame.currency_code, ame.month, t.date DESC NULLS LAST, t."createdAt" DESC NULLS LAST
        ),
        subsequent_transactions AS (
          SELECT
            lb.account_id,
            lb.category_type,
            lb.currency_code,
            lb.month,
            SUM(
              CASE
                WHEN t.type = 'INCOME' THEN t.amount
                WHEN t.type = 'EXPENSE' THEN -t.amount
                ELSE 0
              END
            ) as transaction_sum
          FROM latest_balances lb
          LEFT JOIN transactions t ON t."accountId" = lb.account_id
            AND t."currencyId" = (SELECT id FROM currencies WHERE code = lb.currency_code)
            AND t.type != 'BALANCE'
            AND t.date > lb.balance_date
            AND t.date <= lb.month_end_date
          GROUP BY lb.account_id, lb.category_type, lb.currency_code, lb.month
        )
        SELECT
          st.month,
          st.category_type,
          st.currency_code,
          SUM(COALESCE(lb.balance_amount, 0) + COALESCE(st.transaction_sum, 0)) as total_balance
        FROM latest_balances lb
        JOIN subsequent_transactions st ON lb.account_id = st.account_id
          AND lb.category_type = st.category_type
          AND lb.currency_code = st.currency_code
          AND lb.month = st.month
        GROUP BY st.month, st.category_type, st.currency_code
        ORDER BY st.month ASC, st.category_type, total_balance DESC
      `
    } else {
      // SQLite 版本：重构以消除相关子查询并与 PostgreSQL 逻辑对齐
      const formattedStartDate = format(startDate, 'yyyy-MM-dd')
      const formattedEndDate = format(endDate, 'yyyy-MM-dd')
      result = await prisma.$queryRaw`
        WITH RECURSIVE months(month_start) AS (
          SELECT date(${formattedStartDate}, 'start of month')
          UNION ALL
          SELECT date(month_start, '+1 month')
          FROM months
          WHERE month_start < date(${formattedEndDate}, 'start of month')
        ),
        month_ends AS (
          SELECT
            strftime('%Y-%m', month_start) as month,
            date(month_start, '+1 month', '-1 day') as month_end_date
          FROM months
        ),
        account_month_ends AS (
          -- 步骤 1: 创建所有账户和所有月份的组合
          SELECT
            a.id as account_id,
            cat.type as category_type,
            c.id as currency_id,
            c.code as currency_code,
            me.month,
            me.month_end_date
          FROM accounts a
          JOIN categories cat ON a.categoryId = cat.id
          JOIN currencies c ON a.currencyId = c.id
          CROSS JOIN month_ends me
          WHERE a.userId = ${userId}
            AND cat.type IN ('ASSET', 'LIABILITY')
        ),
        latest_balances AS (
          -- 步骤 2: 找到每个账户在每个月末之前的最新余额记录
          SELECT
            account_id,
            currency_id,
            month,
            balance_amount,
            balance_date
          FROM (
            SELECT
              ame.account_id,
              ame.currency_id,
              ame.month,
              t.amount as balance_amount,
              t.date as balance_date,
              ROW_NUMBER() OVER(PARTITION BY ame.account_id, ame.currency_id, ame.month ORDER BY t.date DESC, t.createdAt DESC) as rn
            FROM account_month_ends ame
            LEFT JOIN transactions t ON t.accountId = ame.account_id AND t.currencyId = ame.currency_id
            WHERE t.userId = ${userId}
              AND t.type = 'BALANCE'
              AND t.date <= strftime('%s', ame.month_end_date || ' 23:59:59') * 1000
          )
          WHERE rn = 1
        ),
        subsequent_transactions AS (
          -- 步骤 3: 计算从最新余额日期到月末的交易流水
          SELECT
            ame.account_id,
            ame.currency_id,
            ame.month,
            SUM(
              CASE
                WHEN t.type = 'INCOME' THEN t.amount
                WHEN t.type = 'EXPENSE' THEN -t.amount
                ELSE 0
              END
            ) as transaction_sum
          FROM account_month_ends ame
          LEFT JOIN latest_balances lb ON ame.account_id = lb.account_id AND ame.currency_id = lb.currency_id AND ame.month = lb.month
          LEFT JOIN transactions t ON t.accountId = ame.account_id AND t.currencyId = ame.currency_id
          WHERE t.userId = ${userId}
            AND t.type != 'BALANCE'
            AND t.date <= strftime('%s', ame.month_end_date || ' 23:59:59') * 1000
            AND t.date > COALESCE(lb.balance_date, 0)
          GROUP BY ame.account_id, ame.currency_id, ame.month
        )
        -- 步骤 4: 计算最终余额并聚合
        SELECT
          ame.month,
          ame.category_type,
          ame.currency_code,
          CAST(SUM(COALESCE(lb.balance_amount, 0) + COALESCE(st.transaction_sum, 0)) AS TEXT) as total_balance
        FROM account_month_ends ame
        LEFT JOIN latest_balances lb ON ame.account_id = lb.account_id AND ame.currency_id = lb.currency_id AND ame.month = lb.month
        LEFT JOIN subsequent_transactions st ON ame.account_id = st.account_id AND ame.currency_id = st.currency_id AND ame.month = st.month
        GROUP BY ame.month, ame.category_type, ame.currency_code
        ORDER BY ame.month ASC, ame.category_type, total_balance DESC
      `
    }

    return result.map(row => ({
      month: row.month,
      categoryType: row.category_type,
      currencyCode: row.currency_code,
      totalBalance: convertToNumber(row.total_balance),
    }))
  } catch (error) {
    console.error('获取净资产历史数据失败:', error)
    throw new Error('获取净资产历史数据失败')
  }
}

/**
 * 获取单个账户的趋势数据（优化版本）
 * 基于 getNetWorthHistory 的逻辑，专门为单个账户计算历史余额趋势
 * 支持日粒度和月粒度的数据聚合
 *
 * @param userId 用户 ID
 * @param accountId 账户 ID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param granularity 时间粒度：'daily' | 'monthly'
 * @returns 账户趋势数据结果数组
 */
export async function getAccountTrendData(
  userId: string,
  accountId: string,
  startDate: Date,
  endDate: Date,
  granularity: 'daily' | 'monthly'
): Promise<
  Array<{
    period: string
    currencyCode: string
    balance: number
    transactionCount: number
  }>
> {
  try {
    let result: Array<{
      period: string
      currency_code: string
      balance: any // 允许任何类型，稍后转换
      transaction_count: any // 允许任何类型，稍后转换
    }>

    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用复杂的 CTE 查询计算单个账户的历史余额
      if (granularity === 'daily') {
        result = await prisma.$queryRaw`
          WITH RECURSIVE periods AS (
            SELECT date_trunc('day', ${startDate}::date) as period_start
            UNION ALL
            SELECT period_start + interval '1 day'
            FROM periods
            WHERE period_start < date_trunc('day', ${endDate}::date)
          ),
          period_ends AS (
            SELECT
              to_char(period_start, 'YYYY-MM-DD') as period,
              period_start::date + interval '1 day' - interval '1 second' as period_end_date
            FROM periods
          ),
          account_info AS (
            SELECT
              a.id as account_id,
              c.code as currency_code
            FROM accounts a
            JOIN currencies c ON a."currencyId" = c.id
            WHERE a.id = ${accountId} AND a."userId" = ${userId}
          ),
          latest_balances AS (
            SELECT DISTINCT ON (pe.period)
              pe.period,
              ai.currency_code,
              pe.period_end_date,
              COALESCE(t.amount, 0) as balance_amount,
              COALESCE(t.date, '1900-01-01'::date) as balance_date
            FROM period_ends pe
            CROSS JOIN account_info ai
            LEFT JOIN transactions t ON t."accountId" = ai.account_id
              AND t."currencyId" = (SELECT id FROM currencies WHERE code = ai.currency_code)
              AND t.type = 'BALANCE'
              AND t.date <= pe.period_end_date
            ORDER BY pe.period, t.date DESC NULLS LAST, t."createdAt" DESC NULLS LAST
          ),
          subsequent_transactions AS (
            SELECT
              lb.period,
              lb.currency_code,
              SUM(
                CASE
                  WHEN t.type = 'INCOME' THEN t.amount
                  WHEN t.type = 'EXPENSE' THEN -t.amount
                  ELSE 0
                END
              ) as transaction_sum,
              COUNT(t.id) as transaction_count
            FROM latest_balances lb
            CROSS JOIN account_info ai
            LEFT JOIN transactions t ON t."accountId" = ai.account_id
              AND t."currencyId" = (SELECT id FROM currencies WHERE code = lb.currency_code)
              AND t.type != 'BALANCE'
              AND t.date > lb.balance_date
              AND t.date <= lb.period_end_date
            GROUP BY lb.period, lb.currency_code
          )
          SELECT
            st.period,
            st.currency_code,
            COALESCE(lb.balance_amount, 0) + COALESCE(st.transaction_sum, 0) as balance,
            COALESCE(st.transaction_count, 0) as transaction_count
          FROM latest_balances lb
          JOIN subsequent_transactions st ON lb.period = st.period
            AND lb.currency_code = st.currency_code
          ORDER BY st.period ASC
        `
      } else {
        result = await prisma.$queryRaw`
          WITH RECURSIVE periods AS (
            SELECT date_trunc('month', ${startDate}::date) as period_start
            UNION ALL
            SELECT period_start + interval '1 month'
            FROM periods
            WHERE period_start < date_trunc('month', ${endDate}::date)
          ),
          period_ends AS (
            SELECT
              to_char(period_start, 'YYYY-MM') as period,
              (period_start + interval '1 month' - interval '1 day')::date + interval '23 hours 59 minutes 59 seconds' as period_end_date
            FROM periods
          ),
          account_info AS (
            SELECT
              a.id as account_id,
              c.code as currency_code
            FROM accounts a
            JOIN currencies c ON a."currencyId" = c.id
            WHERE a.id = ${accountId} AND a."userId" = ${userId}
          ),
          latest_balances AS (
            SELECT DISTINCT ON (pe.period)
              pe.period,
              ai.currency_code,
              pe.period_end_date,
              COALESCE(t.amount, 0) as balance_amount,
              COALESCE(t.date, '1900-01-01'::date) as balance_date
            FROM period_ends pe
            CROSS JOIN account_info ai
            LEFT JOIN transactions t ON t."accountId" = ai.account_id
              AND t."currencyId" = (SELECT id FROM currencies WHERE code = ai.currency_code)
              AND t.type = 'BALANCE'
              AND t.date <= pe.period_end_date
            ORDER BY pe.period, t.date DESC NULLS LAST, t."createdAt" DESC NULLS LAST
          ),
          subsequent_transactions AS (
            SELECT
              lb.period,
              lb.currency_code,
              SUM(
                CASE
                  WHEN t.type = 'INCOME' THEN t.amount
                  WHEN t.type = 'EXPENSE' THEN -t.amount
                  ELSE 0
                END
              ) as transaction_sum,
              COUNT(t.id) as transaction_count
            FROM latest_balances lb
            CROSS JOIN account_info ai
            LEFT JOIN transactions t ON t."accountId" = ai.account_id
              AND t."currencyId" = (SELECT id FROM currencies WHERE code = lb.currency_code)
              AND t.type != 'BALANCE'
              AND t.date > lb.balance_date
              AND t.date <= lb.period_end_date
            GROUP BY lb.period, lb.currency_code
          )
          SELECT
            st.period,
            st.currency_code,
            COALESCE(lb.balance_amount, 0) + COALESCE(st.transaction_sum, 0) as balance,
            COALESCE(st.transaction_count, 0) as transaction_count
          FROM latest_balances lb
          JOIN subsequent_transactions st ON lb.period = st.period
            AND lb.currency_code = st.currency_code
          ORDER BY st.period ASC
        `
      }
    } else {
      // SQLite 版本：遵循数据库兼容性指南进行重构
      const startDateMs = startDate.getTime()
      const endDateMs = endDate.getTime()
      const dateIncrement = granularity === 'daily' ? '+1 day' : '+1 month'
      const dateFormat = granularity === 'daily' ? '%Y-%m-%d' : '%Y-%m'
      const startOfPeriod =
        granularity === 'daily' ? 'start of day' : 'start of month'

      result = await prisma.$queryRaw`
        WITH RECURSIVE
          periods(period_start) AS (
            SELECT date(${startDateMs} / 1000, 'unixepoch', ${startOfPeriod})
            UNION ALL
            SELECT date(period_start, ${dateIncrement})
            FROM periods
            WHERE period_start < date(${endDateMs} / 1000, 'unixepoch', ${startOfPeriod})
          ),
          period_ends AS (
            SELECT
              strftime(${dateFormat}, period_start) as period,
              datetime(period_start, ${dateIncrement}, '-1 second') as period_end_date
            FROM periods
          ),
          account_info AS (
            SELECT c.id as currency_id, c.code as currency_code
            FROM accounts a
            JOIN currencies c ON a.currencyId = c.id
            WHERE a.id = ${accountId} AND a.userId = ${userId}
          ),
          latest_balances_per_period AS (
              SELECT
                  pe.period,
                  pe.period_end_date,
                  (
                      SELECT t.amount
                      FROM transactions t
                      WHERE t.accountId = ${accountId}
                        AND t.userId = ${userId}
                        AND t.type = 'BALANCE'
                        AND t.date <= strftime('%s', pe.period_end_date) * 1000
                      ORDER BY t.date DESC, t.createdAt DESC
                      LIMIT 1
                  ) as balance_amount,
                  (
                      SELECT t.date
                      FROM transactions t
                      WHERE t.accountId = ${accountId}
                        AND t.userId = ${userId}
                        AND t.type = 'BALANCE'
                        AND t.date <= strftime('%s', pe.period_end_date) * 1000
                      ORDER BY t.date DESC, t.createdAt DESC
                      LIMIT 1
                  ) as balance_date
              FROM period_ends pe
          ),
          transactions_per_period AS (
              SELECT
                  lb.period,
                  SUM(
                    CASE
                      WHEN t.type = 'INCOME' THEN t.amount
                      WHEN t.type = 'EXPENSE' THEN -t.amount
                      ELSE 0
                    END
                  ) as transaction_sum,
                  COUNT(t.id) as transaction_count
              FROM latest_balances_per_period lb
              LEFT JOIN transactions t ON t.accountId = ${accountId}
                  AND t.userId = ${userId}
                  AND t.type != 'BALANCE'
                  AND t.date > COALESCE(lb.balance_date, 0)
                  AND t.date <= strftime('%s', lb.period_end_date) * 1000
              GROUP BY lb.period
          )
        SELECT
            lb.period,
            ai.currency_code,
            CAST(COALESCE(lb.balance_amount, 0) + COALESCE(tp.transaction_sum, 0) AS TEXT) as balance,
            COALESCE(tp.transaction_count, 0) as transaction_count
        FROM latest_balances_per_period lb
        JOIN account_info ai
        LEFT JOIN transactions_per_period tp ON lb.period = tp.period
        ORDER BY lb.period ASC
      `
    }

    return result.map(row => ({
      period: row.period,
      currencyCode: row.currency_code,
      balance: convertToNumber(row.balance),
      transactionCount: convertToNumber(row.transaction_count),
    }))
  } catch (error) {
    console.error('获取账户趋势数据失败:', error)
    throw new Error('获取账户趋势数据失败')
  }
}

/**
 * 获取流量账户的聚合趋势数据（优化版本）
 * 使用 Prisma groupBy 在数据库层面进行聚合，避免在应用层处理大量原始数据
 *
 * @param userId 用户 ID
 * @param accountId 账户 ID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param granularity 时间粒度：'daily' | 'monthly'
 * @returns 流量账户趋势数据结果数组
 */
export async function getFlowAccountTrendData(
  userId: string,
  accountId: string,
  startDate: Date,
  endDate: Date,
  granularity: 'daily' | 'monthly'
): Promise<
  Array<{
    period: string
    currencyCode: string
    totalAmount: number
    transactionCount: number
  }>
> {
  try {
    // 验证账户是否属于当前用户
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: userId,
      },
      include: {
        currency: true,
      },
    })

    if (!account) {
      throw new Error('账户不存在或无权限访问')
    }

    // 使用原生SQL进行高效的时间段聚合
    let result: Array<{
      period: string
      currency_code: string
      total_amount: any // 允许任何类型，稍后转换
      transaction_count: any // 允许任何类型，稍后转换
    }>

    if (isPostgreSQL()) {
      // PostgreSQL 版本
      if (granularity === 'daily') {
        result = await prisma.$queryRaw`
          WITH RECURSIVE periods AS (
            SELECT date_trunc('day', ${startDate}::date) as period_start
            UNION ALL
            SELECT period_start + interval '1 day'
            FROM periods
            WHERE period_start < date_trunc('day', ${endDate}::date)
          ),
          period_ends AS (
            SELECT
              to_char(period_start, 'YYYY-MM-DD') as period,
              period_start as period_start_date,
              period_start::date + interval '1 day' - interval '1 second' as period_end_date
            FROM periods
          ),
          transaction_aggregates AS (
            SELECT
              pe.period,
              c.code as currency_code,
              COALESCE(SUM(t.amount), 0) as total_amount,
              COALESCE(COUNT(t.id), 0) as transaction_count
            FROM period_ends pe
            CROSS JOIN currencies c
            LEFT JOIN transactions t ON t."accountId" = ${accountId}
              AND t."currencyId" = c.id
              AND t.type IN ('INCOME', 'EXPENSE')
              AND t.date >= pe.period_start_date
              AND t.date <= pe.period_end_date
            WHERE c.id = (SELECT "currencyId" FROM accounts WHERE id = ${accountId})
            GROUP BY pe.period, c.code
          )
          SELECT
            period,
            currency_code,
            total_amount,
            transaction_count
          FROM transaction_aggregates
          ORDER BY period ASC
        `
      } else {
        result = await prisma.$queryRaw`
          WITH RECURSIVE periods AS (
            SELECT date_trunc('month', ${startDate}::date) as period_start
            UNION ALL
            SELECT period_start + interval '1 month'
            FROM periods
            WHERE period_start < date_trunc('month', ${endDate}::date)
          ),
          period_ends AS (
            SELECT
              to_char(period_start, 'YYYY-MM') as period,
              period_start as period_start_date,
              (period_start + interval '1 month' - interval '1 day')::date + interval '23 hours 59 minutes 59 seconds' as period_end_date
            FROM periods
          ),
          transaction_aggregates AS (
            SELECT
              pe.period,
              c.code as currency_code,
              COALESCE(SUM(t.amount), 0) as total_amount,
              COALESCE(COUNT(t.id), 0) as transaction_count
            FROM period_ends pe
            CROSS JOIN currencies c
            LEFT JOIN transactions t ON t."accountId" = ${accountId}
              AND t."currencyId" = c.id
              AND t.type IN ('INCOME', 'EXPENSE')
              AND t.date >= pe.period_start_date
              AND t.date <= pe.period_end_date
            WHERE c.id = (SELECT "currencyId" FROM accounts WHERE id = ${accountId})
            GROUP BY pe.period, c.code
          )
          SELECT
            period,
            currency_code,
            total_amount,
            transaction_count
          FROM transaction_aggregates
          ORDER BY period ASC
        `
      }
    } else {
      // SQLite 版本：遵循数据库兼容性指南进行重构
      const startDateMs = startDate.getTime()
      const endDateMs = endDate.getTime()
      const dateIncrement = granularity === 'daily' ? '+1 day' : '+1 month'
      const dateFormat = granularity === 'daily' ? '%Y-%m-%d' : '%Y-%m'
      const startOfPeriod =
        granularity === 'daily' ? 'start of day' : 'start of month'

      result = await prisma.$queryRaw`
        WITH RECURSIVE periods(period_start) AS (
          SELECT date(${startDateMs} / 1000, 'unixepoch', ${startOfPeriod})
          UNION ALL
          SELECT date(period_start, ${dateIncrement})
          FROM periods
          WHERE period_start < date(${endDateMs} / 1000, 'unixepoch', ${startOfPeriod})
        ),
        period_ends AS (
          SELECT
            strftime(${dateFormat}, period_start) as period,
            strftime('%s', period_start) * 1000 as period_start_date_ms,
            strftime('%s', datetime(period_start, ${dateIncrement}, '-1 second')) * 1000 as period_end_date_ms
          FROM periods
        ),
        account_info AS (
          SELECT
            c.id as currency_id,
            c.code as currency_code
          FROM accounts a
          JOIN currencies c ON a.currencyId = c.id
          WHERE a.id = ${accountId}
        ),
        transaction_aggregates AS (
          SELECT
            pe.period,
            COALESCE(SUM(t.amount), 0) as total_amount,
            COALESCE(COUNT(t.id), 0) as transaction_count
          FROM period_ends pe
          LEFT JOIN transactions t ON t.accountId = ${accountId}
            AND t.currencyId = (SELECT currency_id FROM account_info)
            AND t.type IN ('INCOME', 'EXPENSE')
            AND t.date >= pe.period_start_date_ms
            AND t.date <= pe.period_end_date_ms
          GROUP BY pe.period
        )
        SELECT
          ta.period,
          ai.currency_code,
          CAST(ta.total_amount AS TEXT) as total_amount,
          CAST(ta.transaction_count AS TEXT) as transaction_count
        FROM transaction_aggregates ta
        CROSS JOIN account_info ai
        ORDER BY ta.period ASC
      `
    }

    return result.map(row => ({
      period: row.period,
      currencyCode: row.currency_code,
      totalAmount: convertToNumber(row.total_amount),
      transactionCount: convertToNumber(row.transaction_count),
    }))
  } catch (error) {
    console.error('获取流量账户趋势数据失败:', error)
    throw new Error('获取流量账户趋势数据失败')
  }
}

/**
 * 优化的交易统计函数
 */
export async function getOptimizedTransactionStats(
  accountId: string,
  userId: string
): Promise<{
  total: number
  income: number
  expense: number
  balanceAdjustment: number
}> {
  const stats = await prisma.$queryRaw<
    Array<{
      transaction_type: string
      count: number
    }>
  >`
    SELECT
      t.type as transaction_type,
      COUNT(*) as count
    FROM transactions t
    WHERE t."accountId" = ${accountId}
      AND t."userId" = ${userId}
    GROUP BY t.type
  `

  const result = {
    total: 0,
    income: 0,
    expense: 0,
    balanceAdjustment: 0,
  }

  stats.forEach(stat => {
    const count = Number(stat.count)
    result.total += count

    switch (stat.transaction_type) {
      case 'INCOME':
        result.income = count
        break
      case 'EXPENSE':
        result.expense = count
        break
      case 'BALANCE':
        result.balanceAdjustment = count
        break
    }
  })

  return result
}

/**
 * 优化的月度统计函数
 */
export async function getOptimizedMonthlyStats(
  accountId: string,
  userId: string
): Promise<
  Array<{
    month: string
    income: number
    expense: number
    count: number
    net: number
  }>
> {
  // 获取最近12个月的数据
  const now = new Date()
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const monthlyData = await prisma.$queryRaw<
    Array<{
      month: string
      transaction_type: string
      total_amount: number
      count: number
    }>
  >`
    SELECT
      to_char(t.date, 'YYYY-MM') as month,
      t.type as transaction_type,
      SUM(t.amount) as total_amount,
      COUNT(*) as count
    FROM transactions t
    WHERE t."accountId" = ${accountId}
      AND t."userId" = ${userId}
      AND t.date >= ${twelveMonthsAgo}
      AND t.type IN ('INCOME', 'EXPENSE')
    GROUP BY month, t.type
    ORDER BY month DESC
  `

  // 初始化最近12个月的数据结构
  const monthlyStats: Record<
    string,
    { income: number; expense: number; count: number }
  > = {}

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyStats[monthKey] = { income: 0, expense: 0, count: 0 }
  }

  // 填充实际数据
  monthlyData.forEach(row => {
    const month = row.month
    const amount = parseFloat(row.total_amount.toString())
    const count = Number(row.count)

    if (monthlyStats[month]) {
      monthlyStats[month].count += count

      if (row.transaction_type === 'INCOME') {
        monthlyStats[month].income = amount
      } else if (row.transaction_type === 'EXPENSE') {
        monthlyStats[month].expense = amount
      }
    }
  })

  // 转换为数组格式并计算净值
  return Object.entries(monthlyStats)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12)
    .map(([month, stats]) => ({
      month,
      ...stats,
      net: stats.income - stats.expense,
    }))
}
