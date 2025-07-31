/**
 * 仪表板查询模块
 * 包含仪表板相关的账户数据和汇总查询
 */

import { prisma } from '../connection-manager'
import { isPostgreSQL } from './system.queries'
import type {
  DashboardAccountResult,
  DashboardSummaryResult,
} from '@/types/database/raw-queries'

// ============================================================================
// 仪表板查询模块
// ============================================================================

/**
 * 获取仪表板账户数据（优化版本）
 * 统一处理仪表板中的账户余额显示
 *
 * @param userId 用户 ID
 * @param dateFilter 日期过滤条件
 * @returns 仪表板账户结果数组
 */
export async function getDashboardAccounts(
  userId: string,
  dateFilter: Date
): Promise<DashboardAccountResult[]> {
  try {
    let result: Array<{
      account_id: string
      account_name: string
      category_id: string
      category_name: string
      category_type: string
      currency_code: string
      currency_symbol: string
      currency_name: string
      balance: number
    }>

    if (isPostgreSQL()) {
      // PostgreSQL 版本：使用 DISTINCT ON
      result = await prisma.$queryRaw`
        SELECT DISTINCT ON (a.id, t."currencyId")
          a.id as account_id,
          a.name as account_name,
          c.id as category_id,
          c.name as category_name,
          c.type as category_type,
          cur.code as currency_code,
          cur.symbol as currency_symbol,
          cur.name as currency_name,
          COALESCE(t.amount, 0) as balance
        FROM accounts a
        INNER JOIN categories c ON a."categoryId" = c.id
        INNER JOIN currencies cur ON a."currencyId" = cur.id
        LEFT JOIN LATERAL (
          SELECT amount, "currencyId"
          FROM transactions t2
          WHERE t2."accountId" = a.id
            AND t2.type = 'BALANCE'
            AND t2.date <= ${dateFilter}
          ORDER BY t2.date DESC, t2."createdAt" DESC
          LIMIT 1
        ) t ON t."currencyId" = cur.id
        WHERE a."userId" = ${userId}
          AND c.type IN ('ASSET', 'LIABILITY')
        ORDER BY a.id, t."currencyId", a."createdAt"
      `
    } else {
      // SQLite 版本：使用子查询
      result = await prisma.$queryRaw`
        SELECT
          a.id as account_id,
          a.name as account_name,
          c.id as category_id,
          c.name as category_name,
          c.type as category_type,
          cur.code as currency_code,
          cur.symbol as currency_symbol,
          cur.name as currency_name,
          COALESCE(
            (SELECT amount
             FROM transactions t
             WHERE t."accountId" = a.id
               AND t.type = 'BALANCE'
               AND t.date <= ${dateFilter}
             ORDER BY t.date DESC, t."createdAt" DESC
             LIMIT 1),
            0
          ) as balance
        FROM accounts a
        INNER JOIN categories c ON a."categoryId" = c.id
        INNER JOIN currencies cur ON a."currencyId" = cur.id
        WHERE a."userId" = ${userId}
          AND c.type IN ('ASSET', 'LIABILITY')
        ORDER BY a."createdAt"
      `
    }

    return result.map(row => ({
      accountId: row.account_id,
      accountName: row.account_name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryType: row.category_type,
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      currencyName: row.currency_name,
      balance: Number(row.balance) || 0,
    }))
  } catch (error) {
    console.error('获取仪表板账户数据失败:', error)
    throw new Error('获取仪表板账户数据失败')
  }
}

/**
 * 获取流量账户汇总数据
 * 统一处理收入和支出账户的汇总显示
 *
 * @param userId 用户 ID
 * @param periodDays 统计周期天数
 * @returns 流量账户汇总结果数组
 */
export async function getFlowAccountSummary(
  userId: string,
  periodDays: number
): Promise<DashboardSummaryResult[]> {
  try {
    // 计算日期范围
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - periodDays)
    periodStart.setHours(0, 0, 0, 0)

    const periodEnd = new Date()
    periodEnd.setHours(23, 59, 59, 999)

    const result = await prisma.$queryRaw<
      Array<{
        category_type: string
        currency_code: string
        currency_symbol: string
        currency_name: string
        total_amount: number
        transaction_count: number
      }>
    >`
      SELECT
        c.type as category_type,
        cur.code as currency_code,
        cur.symbol as currency_symbol,
        cur.name as currency_name,
        SUM(t.amount) as total_amount,
        COUNT(t.id) as transaction_count
      FROM transactions t
      INNER JOIN accounts a ON t."accountId" = a.id
      INNER JOIN categories c ON a."categoryId" = c.id
      INNER JOIN currencies cur ON t."currencyId" = cur.id
      WHERE t."userId" = ${userId}
        AND t.date >= ${periodStart}
        AND t.date <= ${periodEnd}
        AND c.type IN ('INCOME', 'EXPENSE')
      GROUP BY c.type, cur.code, cur.symbol, cur.name
      ORDER BY c.type, total_amount DESC
    `

    return result.map(row => ({
      categoryType: row.category_type,
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      currencyName: row.currency_name,
      totalAmount: Number(row.total_amount) || 0,
      transactionCount: Number(row.transaction_count) || 0,
    }))
  } catch (error) {
    console.error('获取流量账户汇总数据失败:', error)
    throw new Error('获取流量账户汇总数据失败')
  }
}
