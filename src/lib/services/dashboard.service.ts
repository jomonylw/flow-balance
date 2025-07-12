import { prisma } from '@/lib/database/connection-manager'
import { AccountType, TransactionType } from '@/types/core/constants'
import { calculateTotalBalanceWithConversion } from '@/lib/services/account.service'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
import { subMonths, endOfMonth, startOfMonth } from 'date-fns'
import { BUSINESS_LIMITS } from '@/lib/constants/app-config'

// Dashboard service 专用类型定义
type DashboardAccountWithTransactions = {
  id: string
  name: string
  category: {
    id: string
    name: string
    type: AccountType | undefined
  }
  transactions: Array<{
    id: string
    type: TransactionType
    amount: number
    date: string
    description: string
    notes: string | null
    currency: {
      code: string
      symbol: string
      name: string
    }
  }>
}

// Dashboard service 专用货币类型（匹配 getUserBaseCurrency 的返回值）
type DashboardCurrency = {
  code: string
  symbol: string
  name: string
  id?: string
  decimalPlaces?: number
  isCustom?: boolean
  createdBy?: string | null
}

/**
 * 月度数据计算结果类型
 */
export interface MonthlyDataPoint {
  month: string
  monthName: string
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  monthlyIncome: number
  monthlyExpense: number
  netCashFlow: number
  hasConversionErrors: boolean
  error?: string
}

/**
 * 获取用户的基础货币设置
 */
export async function getUserBaseCurrency(userId: string) {
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
    include: { baseCurrency: true },
  })

  return (
    userSettings?.baseCurrency || {
      code: 'CNY',
      symbol: '¥',
      name: '人民币',
    }
  )
}

/**
 * 获取用户的所有账户（用于计算）
 */
export async function getUserAccountsForCalculation(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    include: {
      category: true,
      transactions: {
        include: {
          currency: true,
        },
      },
    },
  })

  // 转换账户数据格式，与原来的 API 保持一致
  return accounts.map(account => ({
    id: account.id,
    name: account.name,
    category: account.category
      ? {
          id: account.category.id,
          name: account.category.name,
          type: account.category.type as AccountType | undefined,
        }
      : {
          id: 'unknown',
          name: 'Unknown',
          type: undefined,
        },
    transactions: account.transactions.map(t => ({
      id: t.id,
      type: t.type as TransactionType,
      amount: parseFloat(t.amount.toString()),
      date: t.date.toISOString(),
      description: t.description,
      notes: t.notes,
      currency: {
        code: t.currency.code,
        symbol: t.currency.symbol,
        name: t.currency.name,
      },
    })),
  }))
}

/**
 * 计算指定月份的净资产数据
 */
export async function calculateMonthlyNetWorthData(
  userId: string,
  targetDate: Date,
  accounts: DashboardAccountWithTransactions[],
  baseCurrency: DashboardCurrency
): Promise<{
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  hasConversionErrors: boolean
}> {
  const monthEnd = endOfMonth(targetDate)

  // 分离存量类账户（资产/负债）
  const stockAccounts = accounts.filter(
    account =>
      account.category.type === AccountType.ASSET ||
      account.category.type === AccountType.LIABILITY
  )

  // 使用已经过滤的存量类账户分别计算资产和负债
  const assetAccounts = stockAccounts.filter(
    account => account.category.type === AccountType.ASSET
  )
  const liabilityAccounts = stockAccounts.filter(
    account => account.category.type === AccountType.LIABILITY
  )

  const [assetResult, liabilityResult] = await Promise.all([
    calculateTotalBalanceWithConversion(userId, assetAccounts, baseCurrency, {
      asOfDate: monthEnd,
    }),
    calculateTotalBalanceWithConversion(
      userId,
      liabilityAccounts,
      baseCurrency,
      { asOfDate: monthEnd }
    ),
  ])

  const totalAssets = assetResult.totalInBaseCurrency
  const totalLiabilities = Math.abs(liabilityResult.totalInBaseCurrency) // 负债显示为正数
  const netWorth = totalAssets - totalLiabilities

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    hasConversionErrors:
      assetResult.hasConversionErrors || liabilityResult.hasConversionErrors,
  }
}

/**
 * 计算指定月份的现金流数据
 */
export async function calculateMonthlyCashFlowData(
  userId: string,
  targetDate: Date,
  accounts: DashboardAccountWithTransactions[],
  baseCurrency: DashboardCurrency
): Promise<{
  monthlyIncome: number
  monthlyExpense: number
  netCashFlow: number
  hasConversionErrors: boolean
}> {
  const monthStart = startOfMonth(targetDate)
  const monthEnd = endOfMonth(targetDate)

  // 分离流量类账户（收入/支出）
  const flowAccounts = accounts.filter(
    account =>
      account.category.type === AccountType.INCOME ||
      account.category.type === AccountType.EXPENSE
  )

  // 计算当月现金流（收入和支出）
  const monthlyIncomeAmounts: Array<{
    amount: number
    currency: string
  }> = []
  const monthlyExpenseAmounts: Array<{
    amount: number
    currency: string
  }> = []

  // 只使用流量类账户计算现金流，与原来的 API 保持一致
  flowAccounts.forEach(account => {
    const accountType = account.category.type

    if (
      accountType === AccountType.INCOME ||
      accountType === AccountType.EXPENSE
    ) {
      const monthlyTransactions = account.transactions.filter(t => {
        const transactionDate = new Date(t.date)
        return transactionDate >= monthStart && transactionDate <= monthEnd
      })

      monthlyTransactions.forEach(transaction => {
        if (transaction.amount > 0) {
          if (
            accountType === AccountType.INCOME &&
            transaction.type === TransactionType.INCOME
          ) {
            monthlyIncomeAmounts.push({
              amount: transaction.amount,
              currency: transaction.currency.code,
            })
          } else if (
            accountType === AccountType.EXPENSE &&
            transaction.type === TransactionType.EXPENSE
          ) {
            monthlyExpenseAmounts.push({
              amount: transaction.amount,
              currency: transaction.currency.code,
            })
          }
        }
      })
    }
  })

  // 转换收支到本位币
  const [incomeConversions, expenseConversions] = await Promise.all([
    convertMultipleCurrencies(
      userId,
      monthlyIncomeAmounts,
      baseCurrency.code,
      monthEnd
    ),
    convertMultipleCurrencies(
      userId,
      monthlyExpenseAmounts,
      baseCurrency.code,
      monthEnd
    ),
  ])

  const monthlyIncomeInBaseCurrency = incomeConversions.reduce(
    (sum, result) => {
      if (result.success) {
        return sum + result.convertedAmount
      } else if (result.originalCurrency === baseCurrency.code) {
        // 只有相同货币时才使用原始金额
        return sum + result.originalAmount
      } else {
        console.warn(
          `收入汇率转换失败: ${result.originalCurrency} -> ${baseCurrency.code}`
        )
        return sum // 不添加转换失败的金额
      }
    },
    0
  )

  const monthlyExpenseInBaseCurrency = expenseConversions.reduce(
    (sum, result) => {
      if (result.success) {
        return sum + result.convertedAmount
      } else if (result.originalCurrency === baseCurrency.code) {
        // 只有相同货币时才使用原始金额
        return sum + result.originalAmount
      } else {
        console.warn(
          `支出汇率转换失败: ${result.originalCurrency} -> ${baseCurrency.code}`
        )
        return sum // 不添加转换失败的金额
      }
    },
    0
  )

  const netCashFlow = monthlyIncomeInBaseCurrency - monthlyExpenseInBaseCurrency

  return {
    monthlyIncome: monthlyIncomeInBaseCurrency,
    monthlyExpense: monthlyExpenseInBaseCurrency,
    netCashFlow,
    hasConversionErrors:
      incomeConversions.some(r => !r.success) ||
      expenseConversions.some(r => !r.success),
  }
}

/**
 * 生成月份列表
 */
export function generateMonthsList(
  months: number,
  useAllData: boolean = false
): Date[] {
  if (useAllData) {
    // 对于 "all" 参数，使用传入的 months 值（通常是 1000），但限制在合理范围内
    months = Math.min(months, BUSINESS_LIMITS.MAX_CHART_MONTHS)
  } else {
    months = Math.min(months, BUSINESS_LIMITS.MAX_CHART_MONTHS)
  }

  const monthsList: Date[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    monthsList.push(subMonths(now, i))
  }

  return monthsList
}

/**
 * 获取用户最早的交易日期，用于动态确定数据范围
 */
export async function getUserEarliestTransactionDate(
  userId: string
): Promise<Date | null> {
  const earliestTransaction = await prisma.transaction.findFirst({
    where: { userId },
    orderBy: { date: 'asc' },
    select: { date: true },
  })

  return earliestTransaction?.date || null
}
