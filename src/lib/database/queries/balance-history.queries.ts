/**
 * 余额历史查询模块
 * 使用SQL窗口函数替代应用层的排序和循环累加计算
 */

import { prisma } from '../connection-manager'
import { isPostgreSQL } from './system.queries'
import { Prisma } from '@prisma/client'

export interface BalanceHistoryItem {
  date: string
  balance: number
  change: number
  transaction: {
    id: string
    type: string
    amount: number
    description: string
    notes: string | null
  }
}

export interface BalanceHistoryResult {
  account: {
    id: string
    name: string
    type: string
  }
  currentBalance: number
  currency: any
  history: BalanceHistoryItem[]
}

/**
 * 获取账户余额历史（优化版本）
 * 使用SQL窗口函数计算累计余额，避免应用层循环计算
 */
export async function getAccountTransactionHistory(
  userId: string,
  accountId: string,
  currencyCode?: string,
  limit: number = 10
): Promise<BalanceHistoryResult> {
  // 验证账户是否属于当前用户
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
    include: {
      category: true,
    },
  })

  if (!account) {
    throw new Error('账户不存在')
  }

  // 构建查询条件
  const whereClause: Prisma.TransactionWhereInput = {
    userId,
    accountId,
  }

  if (currencyCode) {
    whereClause.currency = {
      code: currencyCode,
      OR: [{ createdBy: userId }, { createdBy: null }],
    }
  }

  // 根据账户类型选择不同的查询策略
  const isStockAccount =
    account.category.type === 'ASSET' || account.category.type === 'LIABILITY'

  let balanceHistory: BalanceHistoryItem[]
  let currentBalance: number

  if (isStockAccount) {
    const result = await getStockAccountBalanceHistory(
      userId,
      accountId,
      account.category.type,
      limit,
      currencyCode
    )
    balanceHistory = result.history
    currentBalance = result.currentBalance
  } else {
    const result = await getFlowAccountBalanceHistory(
      userId,
      accountId,
      account.category.type,
      limit,
      currencyCode
    )
    balanceHistory = result.history
    currentBalance = result.currentBalance
  }

  // 获取货币信息
  const currency = currencyCode
    ? await prisma.currency.findFirst({
        where: {
          code: currencyCode,
          OR: [{ createdBy: userId }, { createdBy: null }],
        },
      })
    : null

  return {
    account: {
      id: account.id,
      name: account.name,
      type: account.category.type,
    },
    currentBalance,
    currency,
    history: balanceHistory,
  }
}

/**
 * 获取存量类账户的余额历史
 * 使用窗口函数计算累计余额，特殊处理BALANCE类型交易
 */
async function getStockAccountBalanceHistory(
  userId: string,
  accountId: string,
  accountType: string,
  limit: number,
  currencyCode?: string
): Promise<{ history: BalanceHistoryItem[]; currentBalance: number }> {
  const currencyFilter = currencyCode ? `AND c.code = '${currencyCode}'` : ''

  if (isPostgreSQL()) {
    // PostgreSQL 版本
    const result = await prisma.$queryRaw<
      Array<{
        id: string
        type: string
        amount: string
        date: string
        description: string
        notes: string | null
        running_balance: string
        balance_change: string
      }>
    >`
      WITH balance_calculations AS (
        SELECT 
          t.id,
          t.type,
          t.amount,
          t.date,
          t.description,
          t.notes,
          -- 计算余额变化
          CASE 
            WHEN t.type = 'BALANCE' THEN t.amount::numeric
            WHEN t.type = 'INCOME' AND ${accountType === 'ASSET' ? 'true' : 'false'} THEN t.amount::numeric
            WHEN t.type = 'EXPENSE' AND ${accountType === 'ASSET' ? 'true' : 'false'} THEN -t.amount::numeric
            WHEN t.type = 'INCOME' AND ${accountType === 'LIABILITY' ? 'true' : 'false'} THEN t.amount::numeric
            WHEN t.type = 'EXPENSE' AND ${accountType === 'LIABILITY' ? 'true' : 'false'} THEN -t.amount::numeric
            ELSE 0
          END as balance_change,
          -- 找到最新的BALANCE记录作为基准点
          CASE 
            WHEN t.type = 'BALANCE' THEN 
              ROW_NUMBER() OVER (PARTITION BY t.type ORDER BY t.date DESC, t."updatedAt" DESC)
            ELSE NULL
          END as balance_rank
        FROM transactions t
        INNER JOIN currencies c ON t."currencyId" = c.id
        WHERE t."userId" = ${userId}
          AND t."accountId" = ${accountId}
          ${Prisma.raw(currencyFilter)}
        ORDER BY t.date ASC, t."updatedAt" ASC
      ),
      latest_balance AS (
        SELECT date as balance_date, amount::numeric as balance_amount
        FROM balance_calculations 
        WHERE balance_rank = 1
      ),
      running_totals AS (
        SELECT 
          bc.*,
          lb.balance_date,
          lb.balance_amount,
          -- 使用窗口函数计算累计余额
          CASE 
            WHEN bc.type = 'BALANCE' AND bc.balance_rank = 1 THEN bc.amount::numeric
            WHEN lb.balance_date IS NOT NULL AND bc.date > lb.balance_date THEN 
              lb.balance_amount + SUM(
                CASE WHEN bc2.type != 'BALANCE' AND bc2.date > lb.balance_date THEN bc2.balance_change ELSE 0 END
              ) OVER (ORDER BY bc.date, bc.id ROWS UNBOUNDED PRECEDING)
            ELSE 
              SUM(bc.balance_change) OVER (ORDER BY bc.date, bc.id ROWS UNBOUNDED PRECEDING)
          END as running_balance
        FROM balance_calculations bc
        LEFT JOIN latest_balance lb ON true
        LEFT JOIN balance_calculations bc2 ON bc2.date <= bc.date
      )
      SELECT 
        id,
        type,
        amount,
        date,
        description,
        notes,
        running_balance,
        balance_change
      FROM running_totals
      ORDER BY date DESC, id DESC
      LIMIT ${limit}
    `

    const history: BalanceHistoryItem[] = result.map(row => ({
      date: new Date(
        typeof row.date === 'string' ? parseInt(row.date) : row.date
      ).toISOString(),
      balance: Number(row.running_balance) || 0,
      change: Number(row.balance_change) || 0,
      transaction: {
        id: row.id,
        type: row.type,
        amount: Number(row.amount) || 0,
        description: row.description,
        notes: row.notes,
      },
    }))

    const currentBalance = history.length > 0 ? history[0].balance : 0

    return { history, currentBalance }
  } else {
    // SQLite 版本 - 使用窗口函数优化
    const result = await prisma.$queryRaw<
      Array<{
        id: string
        type: string
        amount: number
        date: string
        description: string
        notes: string | null
        running_balance: number
        balance_change: number
      }>
    >`
      WITH BalanceCalculations AS (
        SELECT
          t.id,
          t.type,
          t.amount,
          t.date,
          t.description,
          t.notes,
          t.updatedAt,
          CASE
            WHEN t.type = 'BALANCE' THEN t.amount
            WHEN t.type = 'INCOME' AND ${accountType === 'ASSET' ? 1 : 0} = 1 THEN t.amount
            WHEN t.type = 'EXPENSE' AND ${accountType === 'ASSET' ? 1 : 0} = 1 THEN -t.amount
            WHEN t.type = 'INCOME' AND ${accountType === 'LIABILITY' ? 1 : 0} = 1 THEN t.amount
            WHEN t.type = 'EXPENSE' AND ${accountType === 'LIABILITY' ? 1 : 0} = 1 THEN -t.amount
            ELSE 0
          END AS balance_change
        FROM transactions t
        INNER JOIN currencies c ON t.currencyId = c.id
        WHERE t.userId = ${userId}
          AND t.accountId = ${accountId}
          ${Prisma.raw(currencyFilter.replace(/"/g, ''))}
      ),
      RunningTotals AS (
        SELECT
          bc.*,
          SUM(
            CASE
              WHEN bc.type = 'BALANCE' THEN 0 -- Exclude BALANCE from raw running total
              ELSE bc.balance_change
            END
          ) OVER (ORDER BY bc.date ASC, bc.updatedAt ASC) as raw_running_total
        FROM BalanceCalculations bc
      ),
      LatestBalanceInfo AS (
        SELECT
          rt.amount as latest_balance_amount,
          rt.raw_running_total as running_total_at_balance
        FROM RunningTotals rt
        WHERE rt.type = 'BALANCE'
        ORDER BY rt.date DESC, rt.updatedAt DESC
        LIMIT 1
      ),
      Correction AS (
        SELECT
          IFNULL(lbi.latest_balance_amount - lbi.running_total_at_balance, 0) as offset
        FROM (SELECT 1) dummy
        LEFT JOIN LatestBalanceInfo lbi ON 1=1
      )
      SELECT
        rt.id,
        rt.type,
        rt.amount,
        rt.date,
        rt.description,
        rt.notes,
        rt.balance_change,
        (rt.raw_running_total + (SELECT offset FROM Correction)) as running_balance
      FROM RunningTotals rt
      ORDER BY rt.date DESC, rt.updatedAt DESC
      LIMIT ${limit}
    `

    const history: BalanceHistoryItem[] = result.map(row => ({
      date: new Date(
        typeof row.date === 'string' ? parseInt(row.date) : row.date
      ).toISOString(),
      balance: Number(row.running_balance) || 0,
      change: Number(row.balance_change) || 0,
      transaction: {
        id: row.id,
        type: row.type,
        amount: Number(row.amount) || 0,
        description: row.description,
        notes: row.notes,
      },
    }))

    const currentBalance = history.length > 0 ? history[0].balance : 0

    return { history, currentBalance }
  }
}

/**
 * 获取流量类账户的余额历史
 * 流量类账户只累加相应类型的交易
 */
async function getFlowAccountBalanceHistory(
  userId: string,
  accountId: string,
  accountType: string,
  limit: number,
  currencyCode?: string
): Promise<{ history: BalanceHistoryItem[]; currentBalance: number }> {
  const currencyFilter = currencyCode ? `AND c.code = '${currencyCode}'` : ''

  const transactionTypeFilter =
    accountType === 'INCOME'
      ? "AND t.type = 'INCOME'"
      : accountType === 'EXPENSE'
        ? "AND t.type = 'EXPENSE'"
        : ''

  if (isPostgreSQL()) {
    const result = await prisma.$queryRaw<
      Array<{
        id: string
        type: string
        amount: string
        date: string
        description: string
        notes: string | null
        running_balance: string
      }>
    >`
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.date,
        t.description,
        t.notes,
        -- 使用窗口函数计算累计余额
        SUM(t.amount::numeric) OVER (
          ORDER BY t.date ASC, t."updatedAt" ASC 
          ROWS UNBOUNDED PRECEDING
        ) as running_balance
      FROM transactions t
      INNER JOIN currencies c ON t."currencyId" = c.id
      WHERE t."userId" = ${userId}
        AND t."accountId" = ${accountId}
        ${Prisma.raw(transactionTypeFilter)}
        ${Prisma.raw(currencyFilter)}
      ORDER BY t.date DESC, t."updatedAt" DESC
      LIMIT ${limit}
    `

    const history: BalanceHistoryItem[] = result.map(row => ({
      date: new Date(
        typeof row.date === 'string' ? parseInt(row.date) : row.date
      ).toISOString(),
      balance: Number(row.running_balance) || 0,
      change: Number(row.amount) || 0,
      transaction: {
        id: row.id,
        type: row.type,
        amount: Number(row.amount) || 0,
        description: row.description,
        notes: row.notes,
      },
    }))

    const currentBalance = history.length > 0 ? history[0].balance : 0

    return { history, currentBalance }
  } else {
    // SQLite 版本 - 使用窗口函数优化
    const result = await prisma.$queryRaw<
      Array<{
        id: string
        type: string
        amount: number
        date: string
        description: string
        notes: string | null
        running_balance: number
      }>
    >`
      WITH OrderedTransactions AS (
        SELECT
          t.id,
          t.type,
          t.amount,
          t.date,
          t.description,
          t.notes,
          t.updatedAt
        FROM transactions t
        INNER JOIN currencies c ON t.currencyId = c.id
        WHERE t.userId = ${userId}
          AND t.accountId = ${accountId}
          ${Prisma.raw(transactionTypeFilter)}
          ${Prisma.raw(currencyFilter.replace(/"/g, ''))}
      )
      SELECT
        id,
        type,
        amount,
        date,
        description,
        notes,
        SUM(amount) OVER (
          ORDER BY date ASC, updatedAt ASC
          ROWS UNBOUNDED PRECEDING
        ) as running_balance
      FROM OrderedTransactions
      ORDER BY date DESC, updatedAt DESC
      LIMIT ${limit}
    `

    const history: BalanceHistoryItem[] = result.map(row => ({
      date: new Date(
        typeof row.date === 'string' ? parseInt(row.date) : row.date
      ).toISOString(),
      balance: Number(row.running_balance) || 0,
      change: Number(row.amount) || 0,
      transaction: {
        id: row.id,
        type: row.type,
        amount: Number(row.amount) || 0,
        description: row.description,
        notes: row.notes,
      },
    }))

    const currentBalance = history.length > 0 ? history[0].balance : 0

    return { history, currentBalance }
  }
}
