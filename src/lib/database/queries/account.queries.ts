/**
 * 账户和余额查询模块
 * 包含账户余额计算和历史查询相关功能
 */

import { prisma } from '../connection-manager'
import { isPostgreSQL } from './system.queries'
import type {
  AccountBalanceResult,
  BalanceHistoryResult,
  NetWorthHistoryResult,
} from '@/types/database/raw-queries'

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
      final_balance: number
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
      // SQLite 版本：简化版本
      balanceQuery = await prisma.$queryRaw`
        SELECT
          t.accountId as account_id,
          c.code as currency_code,
          c.symbol as currency_symbol,
          c.name as currency_name,
          SUM(
            CASE
              WHEN t.type = 'INCOME' THEN t.amount
              WHEN t.type = 'EXPENSE' THEN -t.amount
              WHEN t.type = 'BALANCE' THEN t.amount
              ELSE 0
            END
          ) as final_balance
        FROM transactions t
        JOIN currencies c ON t.currencyId = c.id
        WHERE t.userId = ${userId}
          AND t.date <= ${asOfDate}
        GROUP BY t.accountId, t.currencyId, c.code, c.symbol, c.name
      `
    }

    return balanceQuery.map(row => ({
      accountId: row.account_id,
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      currencyName: row.currency_name,
      finalBalance: Number(row.final_balance) || 0,
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
      final_balance: number
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
      // SQLite 版本：简化版本
      balanceQuery = await prisma.$queryRaw`
        SELECT
          c.code as currency_code,
          c.symbol as currency_symbol,
          c.name as currency_name,
          SUM(
            CASE
              WHEN t.type = 'INCOME' THEN t.amount
              WHEN t.type = 'EXPENSE' THEN -t.amount
              WHEN t.type = 'BALANCE' THEN t.amount
              ELSE 0
            END
          ) as final_balance
        FROM transactions t
        JOIN currencies c ON t.currencyId = c.id
        WHERE t.accountId = ${accountId}
          AND t.userId = ${userId}
        GROUP BY t.currencyId, c.code, c.symbol, c.name
      `
    }

    return balanceQuery.map(row => ({
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      currencyName: row.currency_name,
      finalBalance: Number(row.final_balance) || 0,
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
      total_balance: number
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
      // SQLite 版本：简化版本，使用递归 CTE 生成月份
      result = await prisma.$queryRaw`
        WITH RECURSIVE months(month_start) AS (
          SELECT date(${startDate}, 'start of month')
          UNION ALL
          SELECT date(month_start, '+1 month')
          FROM months
          WHERE month_start < date(${endDate}, 'start of month')
        ),
        month_ends AS (
          SELECT
            strftime('%Y-%m', month_start) as month,
            date(month_start, '+1 month', '-1 day') as month_end_date
          FROM months
        ),
        account_balances AS (
          SELECT
            me.month,
            cat.type as category_type,
            c.code as currency_code,
            SUM(
              COALESCE(
                (SELECT amount
                 FROM transactions t
                 WHERE t.accountId = a.id
                   AND t.currencyId = c.id
                   AND t.type = 'BALANCE'
                   AND t.date <= me.month_end_date
                 ORDER BY t.date DESC, t.createdAt DESC
                 LIMIT 1
                ), 0
              ) +
              COALESCE(
                (SELECT SUM(
                   CASE
                     WHEN t.type = 'INCOME' THEN t.amount
                     WHEN t.type = 'EXPENSE' THEN -t.amount
                     ELSE 0
                   END
                 )
                 FROM transactions t
                 WHERE t.accountId = a.id
                   AND t.currencyId = c.id
                   AND t.type != 'BALANCE'
                   AND t.date > COALESCE(
                     (SELECT date
                      FROM transactions t2
                      WHERE t2.accountId = a.id
                        AND t2.currencyId = c.id
                        AND t2.type = 'BALANCE'
                        AND t2.date <= me.month_end_date
                      ORDER BY t2.date DESC, t2.createdAt DESC
                      LIMIT 1
                     ), '1900-01-01'
                   )
                   AND t.date <= me.month_end_date
                ), 0
              )
            ) as total_balance
          FROM month_ends me
          CROSS JOIN accounts a
          JOIN categories cat ON a.categoryId = cat.id
          JOIN currencies c ON a.currencyId = c.id
          WHERE a.userId = ${userId}
            AND cat.type IN ('ASSET', 'LIABILITY')
          GROUP BY me.month, cat.type, c.code
        )
        SELECT
          month,
          category_type,
          currency_code,
          total_balance
        FROM account_balances
        WHERE total_balance != 0
        ORDER BY month ASC, category_type, total_balance DESC
      `
    }

    return result.map(row => ({
      month: row.month,
      categoryType: row.category_type,
      currencyCode: row.currency_code,
      totalBalance: Number(row.total_balance) || 0,
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
      balance: number
      transaction_count: number
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
      // SQLite 版本：简化版本，使用递归 CTE 生成时间段
      const dateIncrement = granularity === 'daily' ? '+1 day' : '+1 month'
      const dateFormat = granularity === 'daily' ? '%Y-%m-%d' : '%Y-%m'
      const startOfPeriod =
        granularity === 'daily' ? 'start of day' : 'start of month'

      result = await prisma.$queryRaw`
        WITH RECURSIVE periods(period_start) AS (
          SELECT date(${startDate}, ${startOfPeriod})
          UNION ALL
          SELECT date(period_start, ${dateIncrement})
          FROM periods
          WHERE period_start < date(${endDate}, ${startOfPeriod})
        ),
        period_ends AS (
          SELECT
            strftime(${dateFormat}, period_start) as period,
            CASE
              WHEN ${granularity} = 'daily' THEN datetime(period_start, '+1 day', '-1 second')
              ELSE datetime(period_start, '+1 month', '-1 day', '+23 hours', '+59 minutes', '+59 seconds')
            END as period_end_date
          FROM periods
        ),
        account_balances AS (
          SELECT
            pe.period,
            c.code as currency_code,
            COALESCE(
              (SELECT amount
               FROM transactions t
               WHERE t.accountId = ${accountId}
                 AND t.currencyId = c.id
                 AND t.type = 'BALANCE'
                 AND t.date <= pe.period_end_date
               ORDER BY t.date DESC, t.createdAt DESC
               LIMIT 1
              ), 0
            ) +
            COALESCE(
              (SELECT SUM(
                 CASE
                   WHEN t.type = 'INCOME' THEN t.amount
                   WHEN t.type = 'EXPENSE' THEN -t.amount
                   ELSE 0
                 END
               )
               FROM transactions t
               WHERE t.accountId = ${accountId}
                 AND t.currencyId = c.id
                 AND t.type != 'BALANCE'
                 AND t.date > COALESCE(
                   (SELECT date
                    FROM transactions t2
                    WHERE t2.accountId = ${accountId}
                      AND t2.currencyId = c.id
                      AND t2.type = 'BALANCE'
                      AND t2.date <= pe.period_end_date
                    ORDER BY t2.date DESC, t2.createdAt DESC
                    LIMIT 1
                   ), '1900-01-01'
                 )
                 AND t.date <= pe.period_end_date
              ), 0
            ) as balance,
            COALESCE(
              (SELECT COUNT(*)
               FROM transactions t
               WHERE t.accountId = ${accountId}
                 AND t.currencyId = c.id
                 AND t.date >= CASE
                   WHEN ${granularity} = 'daily' THEN date(pe.period_end_date, 'start of day')
                   ELSE date(pe.period_end_date, 'start of month')
                 END
                 AND t.date <= pe.period_end_date
              ), 0
            ) as transaction_count
          FROM period_ends pe
          CROSS JOIN accounts a
          JOIN currencies c ON a.currencyId = c.id
          WHERE a.id = ${accountId} AND a.userId = ${userId}
        )
        SELECT
          period,
          currency_code,
          balance,
          transaction_count
        FROM account_balances
        ORDER BY period ASC
      `
    }

    return result.map(row => ({
      period: row.period,
      currencyCode: row.currency_code,
      balance: Number(row.balance) || 0,
      transactionCount: Number(row.transaction_count) || 0,
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
      total_amount: number
      transaction_count: number
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
      // SQLite 版本
      const dateIncrement = granularity === 'daily' ? '+1 day' : '+1 month'
      const dateFormat = granularity === 'daily' ? '%Y-%m-%d' : '%Y-%m'
      const startOfPeriod =
        granularity === 'daily' ? 'start of day' : 'start of month'

      result = await prisma.$queryRaw`
        WITH RECURSIVE periods(period_start) AS (
          SELECT date(${startDate}, ${startOfPeriod})
          UNION ALL
          SELECT date(period_start, ${dateIncrement})
          FROM periods
          WHERE period_start < date(${endDate}, ${startOfPeriod})
        ),
        period_ends AS (
          SELECT
            strftime(${dateFormat}, period_start) as period,
            period_start as period_start_date,
            CASE
              WHEN ${granularity} = 'daily' THEN datetime(period_start, '+1 day', '-1 second')
              ELSE datetime(period_start, '+1 month', '-1 day', '+23 hours', '+59 minutes', '+59 seconds')
            END as period_end_date
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
          LEFT JOIN transactions t ON t.accountId = ${accountId}
            AND t.currencyId = c.id
            AND t.type IN ('INCOME', 'EXPENSE')
            AND t.date >= pe.period_start_date
            AND t.date <= pe.period_end_date
          WHERE c.id = (SELECT currencyId FROM accounts WHERE id = ${accountId})
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

    return result.map(row => ({
      period: row.period,
      currencyCode: row.currency_code,
      totalAmount: Number(row.total_amount) || 0,
      transactionCount: Number(row.transaction_count) || 0,
    }))
  } catch (error) {
    console.error('获取流量账户趋势数据失败:', error)
    throw new Error('获取流量账户趋势数据失败')
  }
}
