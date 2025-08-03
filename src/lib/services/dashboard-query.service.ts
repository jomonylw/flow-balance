import { AccountType, TransactionType } from '@/types/core/constants'
import { getDaysAgoDateRange } from '@/lib/utils/date-range'
import {
  getDashboardAccounts as getUnifiedDashboardAccounts,
  getFlowAccountSummary as getUnifiedFlowAccountSummary,
  // getAccountCountByType,
  // getRecentActivitySummary,
  getIncomeExpenseAnalysis as getRawIncomeExpenseAnalysis,
} from '@/lib/database/queries'
import {
  convertMultipleCurrencies,
  type ConversionResult,
} from '@/lib/services/currency.service'
import { prisma } from '@/lib/database/connection-manager'
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

  // 使用统一查询服务
  const result = await getUnifiedDashboardAccounts(userId, dateFilter)

  return result.map(row => ({
    accountId: row.accountId,
    accountName: row.accountName,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categoryType: row.categoryType as AccountType,
    currencyCode: row.currencyCode,
    currencySymbol: row.currencySymbol,
    currencyName: row.currencyName,
    balance: row.balance,
  }))
}

/**
 * 获取流量类账户（收入/支出）的期间汇总
 * 使用 Prisma groupBy 聚合查询直接在数据库中按类型和币种计算近期收支
 */
export async function getFlowAccountSummary(
  userId: string,
  periodDays: number = 30
): Promise<FlowAccountSummary[]> {
  // 使用统一查询服务
  const summaryData = await getUnifiedFlowAccountSummary(userId, periodDays)

  return summaryData.map(row => ({
    accountType: row.categoryType as AccountType,
    currencyCode: row.currencyCode,
    currencySymbol: row.currencySymbol,
    currencyName: row.currencyName,
    totalAmount: row.totalAmount,
    transactionCount: row.transactionCount,
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
 * 此函数现在作为服务层包装器，调用查询函数并处理货币转换
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
  // 1. 从数据库获取原始收支数据
  const { incomeByCurrency: rawIncome, expenseByCurrency: rawExpense } =
    await getRawIncomeExpenseAnalysis(userId, periodDays)

  let totalIncomeInBaseCurrency = 0
  let totalExpenseInBaseCurrency = 0
  let hasConversionErrors = false

  // 2. 准备转换数据
  const incomeAmountsToConvert = Object.values(rawIncome).map(d => ({
    amount: d.originalAmount,
    currency: d.currency.code,
  }))
  const expenseAmountsToConvert = Object.values(rawExpense).map(d => ({
    amount: d.originalAmount,
    currency: d.currency.code,
  }))

  // 3. 批量转换货币
  const incomeConversions =
    incomeAmountsToConvert.length > 0
      ? await convertMultipleCurrencies(
          userId,
          incomeAmountsToConvert,
          baseCurrency.code
        )
      : []
  const expenseConversions =
    expenseAmountsToConvert.length > 0
      ? await convertMultipleCurrencies(
          userId,
          expenseAmountsToConvert,
          baseCurrency.code
        )
      : []

  // 4. 构建包含转换后金额的最终数据
  const incomeByCurrency = { ...rawIncome }
  incomeConversions.forEach(conv => {
    if (incomeByCurrency[conv.fromCurrency]) {
      incomeByCurrency[conv.fromCurrency].convertedAmount = conv.convertedAmount
      incomeByCurrency[conv.fromCurrency].exchangeRate = conv.exchangeRate
      incomeByCurrency[conv.fromCurrency].success = conv.success
      if (conv.success) {
        totalIncomeInBaseCurrency += conv.convertedAmount
      } else {
        hasConversionErrors = true
        if (conv.fromCurrency === baseCurrency.code) {
          totalIncomeInBaseCurrency += conv.originalAmount
        }
      }
    }
  })

  const expenseByCurrency = { ...rawExpense }
  expenseConversions.forEach(conv => {
    if (expenseByCurrency[conv.fromCurrency]) {
      expenseByCurrency[conv.fromCurrency].convertedAmount =
        conv.convertedAmount
      expenseByCurrency[conv.fromCurrency].exchangeRate = conv.exchangeRate
      expenseByCurrency[conv.fromCurrency].success = conv.success
      if (conv.success) {
        totalExpenseInBaseCurrency += conv.convertedAmount
      } else {
        hasConversionErrors = true
        if (conv.fromCurrency === baseCurrency.code) {
          totalExpenseInBaseCurrency += conv.originalAmount
        }
      }
    }
  })

  // 5. 计算净值
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
    const currency = income?.currency ||
      expense?.currency || { code: currencyCode, symbol: '', name: '' }

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
