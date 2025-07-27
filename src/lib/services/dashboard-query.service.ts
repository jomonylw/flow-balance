import { prisma } from '@/lib/database/connection-manager'
import { AccountType, TransactionType } from '@/types/core/constants'
import { getDaysAgoDateRange } from '@/lib/utils/date-range'
import {
  convertMultipleCurrencies,
  type ConversionResult,
} from '@/lib/services/currency.service'
import type { ByCurrencyInfo } from '@/types/core'

/**
 * Dashboard 专用数据库查询服务
 * 核心思想：将计算从"应用服务"下推到"数据库"，变"全量拉取后计算"为"数据库聚合后拉取"
 */

export interface StockAccountBalance {
  accountId: string
  accountName: string
  categoryId: string
  categoryName: string
  categoryType: AccountType
  currencyCode: string
  currencySymbol: string
  currencyName: string
  balance: number
}

export interface FlowAccountSummary {
  accountType: AccountType
  currencyCode: string
  currencySymbol: string
  currencyName: string
  totalAmount: number
  transactionCount: number
}

export interface DashboardStats {
  totalAccounts: number
  totalTransactions: number
  totalCategories: number
  accountingDays: number
}

/**
 * 获取存量类账户（资产/负债）的当前余额
 * 使用数据库聚合查询直接获取每个账户的最新BALANCE记录作为当前余额
 */
export async function getStockAccountBalances(
  userId: string,
  asOfDate?: Date
): Promise<StockAccountBalance[]> {
  const dateFilter = asOfDate ? asOfDate : new Date()

  // 检测数据库类型以使用兼容的SQL语法
  const isPostgreSQL =
    process.env.DATABASE_URL?.includes('postgresql') ||
    process.env.DATABASE_URL?.includes('postgres')

  if (isPostgreSQL) {
    // PostgreSQL 版本：使用 DISTINCT ON
    const result = await prisma.$queryRaw<
      Array<{
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
    >`
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
      ) t ON true
      WHERE a."userId" = ${userId}
        AND c.type IN ('ASSET', 'LIABILITY')
      ORDER BY a.id, t."currencyId", a."createdAt"
    `

    return result.map(row => ({
      accountId: row.account_id,
      accountName: row.account_name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryType: row.category_type as AccountType,
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      currencyName: row.currency_name,
      balance: Number(row.balance),
    }))
  } else {
    // SQLite 版本：使用子查询
    const result = await prisma.$queryRaw<
      Array<{
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
    >`
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

    return result.map(row => ({
      accountId: row.account_id,
      accountName: row.account_name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryType: row.category_type as AccountType,
      currencyCode: row.currency_code,
      currencySymbol: row.currency_symbol,
      currencyName: row.currency_name,
      balance: Number(row.balance),
    }))
  }
}

/**
 * 获取流量类账户（收入/支出）的期间汇总
 * 使用 Prisma groupBy 聚合查询直接在数据库中按类型和币种计算近期收支
 */
export async function getFlowAccountSummary(
  userId: string,
  periodDays: number = 30
): Promise<FlowAccountSummary[]> {
  const { startDate: periodStart, endDate: periodEnd } =
    getDaysAgoDateRange(periodDays)

  // 直接使用原生 SQL 查询，避免 Prisma groupBy 的限制
  const summaryData = await prisma.$queryRaw<
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

  return summaryData.map(row => ({
    accountType: row.category_type as AccountType,
    currencyCode: row.currency_code,
    currencySymbol: row.currency_symbol,
    currencyName: row.currency_name,
    totalAmount: Number(row.total_amount),
    transactionCount: Number(row.transaction_count),
  }))
}

/**
 * 获取仪表板统计数据
 * 使用数据库聚合查询直接获取统计信息
 */
export async function getDashboardStats(
  userId: string
): Promise<DashboardStats> {
  const [accountCount, transactionCount, categoryCount, firstTransaction] =
    await Promise.all([
      prisma.account.count({
        where: { userId },
      }),
      prisma.transaction.count({
        where: { userId },
      }),
      prisma.category.count({
        where: { userId },
      }),
      prisma.transaction.findFirst({
        where: { userId },
        orderBy: { date: 'asc' },
        select: { date: true },
      }),
    ])

  const accountingDays = firstTransaction
    ? Math.ceil(
        (Date.now() - new Date(firstTransaction.date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0

  return {
    totalAccounts: accountCount,
    totalTransactions: transactionCount,
    totalCategories: categoryCount,
    accountingDays,
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
    counts[type] = Number(row.account_count)
  })

  return counts
}

/**
 * 获取账户余额详情（用于替代原有的 accountBalances 逻辑）
 * 结合存量类和流量类账户的处理
 */
export async function getAccountBalanceDetails(
  userId: string,
  asOfDate?: Date,
  periodDays: number = 30
): Promise<
  Array<{
    id: string
    name: string
    category: {
      id: string
      name: string
      type: AccountType
    }
    balances: Record<string, number>
  }>
> {
  const dateFilter = asOfDate ? asOfDate : new Date()
  const { startDate: periodStart, endDate: periodEnd } =
    getDaysAgoDateRange(periodDays)

  // 获取存量类账户余额
  const stockBalances = await getStockAccountBalances(userId, dateFilter)

  // 获取流量类账户期间汇总
  const _flowSummary = await getFlowAccountSummary(userId, periodDays)

  // 转换存量类账户数据格式
  const stockAccountDetails = stockBalances
    .filter(balance => Math.abs(balance.balance) > 0.01) // 只显示有余额的账户
    .reduce(
      (acc, balance) => {
        const existingAccount = acc.find(a => a.id === balance.accountId)
        if (existingAccount) {
          existingAccount.balances[balance.currencyCode] = balance.balance
        } else {
          acc.push({
            id: balance.accountId,
            name: balance.accountName,
            category: {
              id: balance.categoryId,
              name: balance.categoryName,
              type: balance.categoryType,
            },
            balances: {
              [balance.currencyCode]: balance.balance,
            },
          })
        }
        return acc
      },
      [] as Array<{
        id: string
        name: string
        category: { id: string; name: string; type: AccountType }
        balances: Record<string, number>
      }>
    )

  // 获取流量类账户详情
  const flowAccountsQuery = await prisma.account.findMany({
    where: {
      userId,
      category: {
        type: {
          in: [AccountType.INCOME, AccountType.EXPENSE],
        },
      },
    },
    include: {
      category: true,
      transactions: {
        where: {
          date: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        include: {
          currency: true,
        },
      },
    },
  })

  // 处理流量类账户数据
  const flowAccountDetails = flowAccountsQuery
    .map(account => {
      const balances: Record<string, number> = {}

      // 按币种汇总交易金额
      account.transactions.forEach(transaction => {
        const currencyCode = transaction.currency.code
        if (!balances[currencyCode]) {
          balances[currencyCode] = 0
        }

        // 根据账户类型和交易类型计算金额
        if (account.category.type === AccountType.INCOME) {
          if (transaction.type === TransactionType.INCOME) {
            balances[currencyCode] += Number(transaction.amount)
          } else if (transaction.type === TransactionType.EXPENSE) {
            balances[currencyCode] -= Number(transaction.amount)
          }
        } else if (account.category.type === AccountType.EXPENSE) {
          if (transaction.type === TransactionType.EXPENSE) {
            balances[currencyCode] += Number(transaction.amount)
          } else if (transaction.type === TransactionType.INCOME) {
            balances[currencyCode] -= Number(transaction.amount)
          }
        }
      })

      return {
        id: account.id,
        name: account.name,
        category: {
          id: account.category.id,
          name: account.category.name,
          type: account.category.type as AccountType,
        },
        balances,
      }
    })
    .filter(account =>
      Object.values(account.balances).some(balance => Math.abs(balance) > 0.01)
    )

  return [...stockAccountDetails, ...flowAccountDetails]
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
    const amount = Number(row.total_amount)

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
 * 计算总资产/负债并转换为本位币（优化版本）
 * 使用数据库聚合查询替代内存计算
 */
export async function calculateTotalBalanceWithConversion(
  userId: string,
  accountType: AccountType.ASSET | AccountType.LIABILITY,
  baseCurrency: { code: string; symbol: string; name: string },
  options: {
    asOfDate?: Date
    includeAllUserCurrencies?: boolean
  } = {}
): Promise<{
  totalInBaseCurrency: number
  totalsByOriginalCurrency: Record<
    string,
    {
      currencyCode: string
      amount: number
      currency: { code: string; symbol: string; name: string }
    }
  >
  conversionDetails: ConversionResult[]
  hasConversionErrors: boolean
  byCurrency: Record<string, ByCurrencyInfo>
}> {
  const { asOfDate, includeAllUserCurrencies = false } = options

  // 获取指定类型的账户余额
  const balances = await getStockAccountBalances(userId, asOfDate)
  const filteredBalances = balances.filter(
    balance => balance.categoryType === accountType
  )

  // 按币种汇总余额
  const totalsByOriginalCurrency: Record<
    string,
    {
      currencyCode: string
      amount: number
      currency: { code: string; symbol: string; name: string }
    }
  > = {}

  // 统计每种币种的账户数量
  const accountCountByCurrency: Record<string, number> = {}

  filteredBalances.forEach(balance => {
    const currencyCode = balance.currencyCode

    if (!totalsByOriginalCurrency[currencyCode]) {
      totalsByOriginalCurrency[currencyCode] = {
        currencyCode,
        amount: 0,
        currency: {
          code: balance.currencyCode,
          symbol: balance.currencySymbol,
          name: balance.currencyName,
        },
      }
      accountCountByCurrency[currencyCode] = 0
    }

    totalsByOriginalCurrency[currencyCode].amount += balance.balance
    accountCountByCurrency[currencyCode]++
  })

  // 如果需要包含所有用户币种，初始化为0余额
  if (includeAllUserCurrencies) {
    const allUserCurrencies = await prisma.currency.findMany({
      where: {
        userCurrencies: {
          some: { userId },
        },
      },
      select: {
        code: true,
        symbol: true,
        name: true,
      },
    })

    allUserCurrencies.forEach(currency => {
      if (!totalsByOriginalCurrency[currency.code]) {
        totalsByOriginalCurrency[currency.code] = {
          currencyCode: currency.code,
          amount: 0,
          currency: {
            code: currency.code,
            symbol: currency.symbol,
            name: currency.name,
          },
        }
        accountCountByCurrency[currency.code] = 0
      }
    })
  }

  // 准备转换数据
  const amountsToConvert = Object.values(totalsByOriginalCurrency).map(
    balance => ({
      amount: balance.amount,
      currency: balance.currencyCode,
    })
  )

  let totalInBaseCurrency = 0
  let conversionDetails: ConversionResult[] = []
  let hasConversionErrors = false

  try {
    // 批量转换货币
    conversionDetails = await convertMultipleCurrencies(
      userId,
      amountsToConvert,
      baseCurrency.code,
      asOfDate
    )

    // 计算本位币总额
    conversionDetails.forEach(result => {
      if (result.success) {
        totalInBaseCurrency += result.convertedAmount
      } else {
        hasConversionErrors = true
        // 转换失败时，如果是相同货币则使用原始金额
        if (result.fromCurrency === baseCurrency.code) {
          totalInBaseCurrency += result.originalAmount
        }
      }
    })
  } catch (error) {
    console.error('批量货币转换失败:', error)
    hasConversionErrors = true

    // 转换失败时，只使用本位币的金额
    Object.values(totalsByOriginalCurrency).forEach(balance => {
      if (balance.currencyCode === baseCurrency.code) {
        totalInBaseCurrency += balance.amount
      }
    })
  }

  // 构建 byCurrency 数据
  const byCurrency: Record<string, ByCurrencyInfo> = {}

  // 按转换后金额排序
  const sortedEntries = Object.entries(totalsByOriginalCurrency)
    .map(([currencyCode, balance]) => {
      const conversionDetail = conversionDetails.find(
        detail => detail.fromCurrency === currencyCode
      )

      return {
        currencyCode,
        data: {
          originalAmount: balance.amount,
          convertedAmount: conversionDetail?.convertedAmount || balance.amount,
          currency: balance.currency,
          exchangeRate: conversionDetail?.exchangeRate || 1,
          accountCount: accountCountByCurrency[currencyCode] || 0,
          success: conversionDetail?.success ?? true,
        },
      }
    })
    .sort(
      (a, b) =>
        Math.abs(b.data.convertedAmount) - Math.abs(a.data.convertedAmount)
    )

  // 填充 byCurrency 数据
  sortedEntries.forEach(({ currencyCode, data }) => {
    byCurrency[currencyCode] = data
  })

  return {
    totalInBaseCurrency,
    totalsByOriginalCurrency,
    conversionDetails,
    hasConversionErrors,
    byCurrency,
  }
}

/**
 * 获取收支分析数据（按币种分组，用于替代原有的收支计算）
 */
export async function getIncomeExpenseAnalysis(
  userId: string,
  baseCurrency: { code: string; symbol: string; name: string },
  periodDays: number = 30
): Promise<{
  incomeByCurrency: Record<string, ByCurrencyInfo>
  expenseByCurrency: Record<string, ByCurrencyInfo>
  netByCurrency: Record<string, ByCurrencyInfo>
  totalIncomeInBaseCurrency: number
  totalExpenseInBaseCurrency: number
  hasConversionErrors: boolean
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

  // 准备转换数据
  const incomeAmountsToConvert = incomeData.map(row => ({
    amount: Number(row.total_amount),
    currency: row.currency_code,
  }))

  const expenseAmountsToConvert = expenseData.map(row => ({
    amount: Number(row.total_amount),
    currency: row.currency_code,
  }))

  let totalIncomeInBaseCurrency = 0
  let totalExpenseInBaseCurrency = 0
  let hasConversionErrors = false

  // 转换收入金额
  const incomeConversions =
    incomeAmountsToConvert.length > 0
      ? await convertMultipleCurrencies(
          userId,
          incomeAmountsToConvert,
          baseCurrency.code
        )
      : []

  // 转换支出金额
  const expenseConversions =
    expenseAmountsToConvert.length > 0
      ? await convertMultipleCurrencies(
          userId,
          expenseAmountsToConvert,
          baseCurrency.code
        )
      : []

  // 构建收入数据
  const incomeByCurrency: Record<string, ByCurrencyInfo> = {}
  incomeData.forEach((row, index) => {
    const conversion = incomeConversions[index]
    const originalAmount = Number(row.total_amount)

    incomeByCurrency[row.currency_code] = {
      originalAmount,
      convertedAmount: conversion?.convertedAmount || originalAmount,
      currency: {
        code: row.currency_code,
        symbol: row.currency_symbol,
        name: row.currency_name,
      },
      exchangeRate: conversion?.exchangeRate || 1,
      accountCount: 0, // 这里不统计账户数量，因为是交易级别的统计
      success: conversion?.success ?? true,
    }

    if (conversion?.success) {
      totalIncomeInBaseCurrency += conversion.convertedAmount
    } else {
      hasConversionErrors = true
      if (row.currency_code === baseCurrency.code) {
        totalIncomeInBaseCurrency += originalAmount
      }
    }
  })

  // 构建支出数据
  const expenseByCurrency: Record<string, ByCurrencyInfo> = {}
  expenseData.forEach((row, index) => {
    const conversion = expenseConversions[index]
    const originalAmount = Number(row.total_amount)

    expenseByCurrency[row.currency_code] = {
      originalAmount,
      convertedAmount: conversion?.convertedAmount || originalAmount,
      currency: {
        code: row.currency_code,
        symbol: row.currency_symbol,
        name: row.currency_name,
      },
      exchangeRate: conversion?.exchangeRate || 1,
      accountCount: 0,
      success: conversion?.success ?? true,
    }

    if (conversion?.success) {
      totalExpenseInBaseCurrency += conversion.convertedAmount
    } else {
      hasConversionErrors = true
      if (row.currency_code === baseCurrency.code) {
        totalExpenseInBaseCurrency += originalAmount
      }
    }
  })

  // 计算净值（收入 - 支出）
  const netByCurrency: Record<string, ByCurrencyInfo> = {}
  const allCurrencies = new Set([
    ...Object.keys(incomeByCurrency),
    ...Object.keys(expenseByCurrency),
  ])

  allCurrencies.forEach(currencyCode => {
    const income = incomeByCurrency[currencyCode]
    const expense = expenseByCurrency[currencyCode]

    const incomeAmount = income?.originalAmount || 0
    const expenseAmount = expense?.originalAmount || 0
    const incomeConverted = income?.convertedAmount || 0
    const expenseConverted = expense?.convertedAmount || 0

    // 使用收入或支出的货币信息（优先收入）
    const currency = income?.currency ||
      expense?.currency || {
        code: currencyCode,
        symbol: currencyCode,
        name: currencyCode,
      }

    netByCurrency[currencyCode] = {
      originalAmount: incomeAmount - expenseAmount,
      convertedAmount: incomeConverted - expenseConverted,
      currency,
      exchangeRate: income?.exchangeRate || expense?.exchangeRate || 1,
      accountCount: 0,
      success: (income?.success ?? true) && (expense?.success ?? true),
    }
  })

  return {
    incomeByCurrency,
    expenseByCurrency,
    netByCurrency,
    totalIncomeInBaseCurrency,
    totalExpenseInBaseCurrency,
    hasConversionErrors,
  }
}
