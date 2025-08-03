/**
 * 仪表板查询模块
 * 包含仪表板相关的账户数据和汇总查询
 */

import { prisma } from '../connection-manager'
import type {
  DashboardAccountResult,
  DashboardSummaryResult,
} from '@/types/database/raw-queries'
import { AccountType } from '@/types/core/constants'
import { getDaysAgoDateRange } from '@/lib/utils/date-range'
import type { ByCurrencyInfo } from '@/types/core'

// ============================================================================
// 辅助函数
// ============================================================================

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
    // 使用 Prisma ORM 查询避免 raw SQL 的类型转换问题
    const accounts = await prisma.account.findMany({
      where: {
        userId,
        category: {
          type: {
            in: ['ASSET', 'LIABILITY'],
          },
        },
      },
      include: {
        category: true,
        currency: true,
        transactions: {
          where: {
            type: 'BALANCE',
            date: {
              lte: dateFilter,
            },
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return accounts.map(account => ({
      accountId: account.id,
      accountName: account.name,
      categoryId: account.category.id,
      categoryName: account.category.name,
      categoryType: account.category.type,
      currencyCode: account.currency.code,
      currencySymbol: account.currency.symbol,
      currencyName: account.currency.name,
      balance:
        account.transactions.length > 0
          ? Number(account.transactions[0].amount)
          : 0,
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

    // 1. 获取所有相关交易，并包含其货币和分类信息
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
        account: {
          category: {
            type: {
              in: ['INCOME', 'EXPENSE'],
            },
          },
        },
      },
      include: {
        currency: true, // 包含货币信息
        account: {
          include: {
            category: true, // 包含分类信息
          },
        },
      },
    })

    // 2. 在内存中进行分组和聚合
    const summaryMap = new Map<string, DashboardSummaryResult>()

    for (const t of transactions) {
      // 防御性检查，确保关联数据存在
      if (!t.account?.category || !t.currency) {
        continue
      }

      const categoryType = t.account.category.type
      const currencyCode = t.currency.code
      const key = `${categoryType}-${currencyCode}`

      let entry = summaryMap.get(key)

      if (!entry) {
        entry = {
          categoryType,
          currencyCode,
          currencySymbol: t.currency.symbol,
          currencyName: t.currency.name,
          totalAmount: 0,
          transactionCount: 0,
        }
        summaryMap.set(key, entry)
      }

      entry.totalAmount += Number(t.amount)
      entry.transactionCount += 1
    }

    const result = Array.from(summaryMap.values())

    // 3. 对最终结果进行排序
    return result.sort((a, b) => {
      if (a.categoryType !== b.categoryType) {
        return a.categoryType.localeCompare(b.categoryType)
      }
      return b.totalAmount - a.totalAmount
    })
  } catch (error) {
    console.error('获取流量账户汇总数据失败:', error)
    throw new Error('获取流量账户汇总数据失败')
  }
}

/**
 * 获取账户数量按类型分组
 */
export async function getAccountCountByType(
  userId: string
): Promise<Record<AccountType, number>> {
  // 直接使用原生 SQL 查询，避免 Prisma groupBy 的限制
  const countByType = await prisma.$queryRaw<
    Array<{
      category_type: string
      account_count: number
    }>
  >`
    SELECT
      c.type as category_type,
      COUNT(a.id) as account_count
    FROM accounts a
    INNER JOIN categories c ON a."categoryId" = c.id
    WHERE a."userId" = ${userId}
    GROUP BY c.type
  `

  const counts: Record<AccountType, number> = {
    [AccountType.ASSET]: 0,
    [AccountType.LIABILITY]: 0,
    [AccountType.INCOME]: 0,
    [AccountType.EXPENSE]: 0,
  }

  countByType.forEach(row => {
    const type = row.category_type as AccountType
    counts[type] = convertToNumber(row.account_count)
  })

  return counts
}

/**
 * 获取近期活动汇总（替代原有的 recentActivity 计算）
 */
export async function getRecentActivitySummary(
  userId: string,
  periodDays: number = 30
): Promise<{
  summary: Record<string, { income: number; expense: number; net: number }>
  totalIncome: number
  totalExpense: number
  totalNet: number
}> {
  const { startDate: periodStart, endDate: periodEnd } =
    getDaysAgoDateRange(periodDays)

  const activityData = await prisma.$queryRaw<
    Array<{
      currency_code: string
      transaction_type: string
      total_amount: number
    }>
  >`
    SELECT
      cur.code as currency_code,
      t.type as transaction_type,
      SUM(t.amount) as total_amount
    FROM transactions t
    INNER JOIN currencies cur ON t.currency_id = cur.id
    WHERE t.user_id = ${userId}
      AND t.date >= ${periodStart}
      AND t.date <= ${periodEnd}
      AND t.type IN ('INCOME', 'EXPENSE')
    GROUP BY cur.code, t.type
    ORDER BY cur.code, t.type
  `

  const summary: Record<
    string,
    { income: number; expense: number; net: number }
  > = {}
  let totalIncome = 0
  let totalExpense = 0

  activityData.forEach(row => {
    const currencyCode = row.currency_code
    const amount = convertToNumber(row.total_amount)

    if (!summary[currencyCode]) {
      summary[currencyCode] = { income: 0, expense: 0, net: 0 }
    }

    if (row.transaction_type === 'INCOME') {
      summary[currencyCode].income = amount
      totalIncome += amount
    } else if (row.transaction_type === 'EXPENSE') {
      summary[currencyCode].expense = amount
      totalExpense += amount
    }
  })

  // 计算净值
  Object.keys(summary).forEach(currencyCode => {
    summary[currencyCode].net =
      summary[currencyCode].income - summary[currencyCode].expense
  })

  return {
    summary,
    totalIncome,
    totalExpense,
    totalNet: totalIncome - totalExpense,
  }
}

/**
 * 获取收支分析数据（按币种分组，用于替代原有的收支计算）
 */
export async function getIncomeExpenseAnalysis(
  userId: string,
  periodDays: number = 30
): Promise<{
  incomeByCurrency: Record<string, ByCurrencyInfo>
  expenseByCurrency: Record<string, ByCurrencyInfo>
}> {
  const { startDate: periodStart, endDate: periodEnd } =
    getDaysAgoDateRange(periodDays)

  // 获取收入和支出数据
  const incomeExpenseData = await prisma.$queryRaw<
    Array<{
      transaction_type: string
      currency_code: string
      currency_symbol: string
      currency_name: string
      total_amount: number
    }>
  >`
    SELECT
      t.type as transaction_type,
      cur.code as currency_code,
      cur.symbol as currency_symbol,
      cur.name as currency_name,
      SUM(t.amount) as total_amount
    FROM transactions t
    INNER JOIN currencies cur ON t."currencyId" = cur.id
    WHERE t."userId" = ${userId}
      AND t.date >= ${periodStart}
      AND t.date <= ${periodEnd}
      AND t.type IN ('INCOME', 'EXPENSE')
    GROUP BY t.type, cur.code, cur.symbol, cur.name
    ORDER BY t.type, total_amount DESC
  `

  // 分离收入和支出数据
  const incomeData = incomeExpenseData.filter(
    row => row.transaction_type === 'INCOME'
  )
  const expenseData = incomeExpenseData.filter(
    row => row.transaction_type === 'EXPENSE'
  )

  // 构建收入数据
  const incomeByCurrency: Record<string, ByCurrencyInfo> = {}
  incomeData.forEach(row => {
    const originalAmount = convertToNumber(row.total_amount)
    incomeByCurrency[row.currency_code] = {
      originalAmount,
      convertedAmount: originalAmount, // 在 service 层进行转换
      currency: {
        code: row.currency_code,
        symbol: row.currency_symbol,
        name: row.currency_name,
      },
      exchangeRate: 1,
      accountCount: 0, // 交易级别统计，不适用
      success: true,
    }
  })

  // 构建支出数据
  const expenseByCurrency: Record<string, ByCurrencyInfo> = {}
  expenseData.forEach(row => {
    const originalAmount = convertToNumber(row.total_amount)
    expenseByCurrency[row.currency_code] = {
      originalAmount,
      convertedAmount: originalAmount, // 在 service 层进行转换
      currency: {
        code: row.currency_code,
        symbol: row.currency_symbol,
        name: row.currency_name,
      },
      exchangeRate: 1,
      accountCount: 0,
      success: true,
    }
  })

  return {
    incomeByCurrency,
    expenseByCurrency,
  }
}
