/**
 * 分类汇总相关的类型定义
 */

export type Balance = Record<string, number>

export interface BaseCurrency {
 code: string
 symbol: string
 name: string
}

export interface CategorySummaryBase {
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
    parent?: {
      id: string
      name: string
    } | null
    childrenCount: number
  }
  currencies: Array<{
    code: string
    symbol: string
    name: string
  }>
  stats: {
    totalAccounts: number
    directAccounts: number
    totalTransactions: number
    totalChildren: number
  }
}

export interface AccountSummary {
  id: string
  name: string
  description?: string
  categoryId: string
  balances: Record<string, number> | {
    original: Record<string, number>
    converted: Record<string, number>
  }
  transactionCount: number
  // 新增：多时间点余额数据
  historicalBalances?: {
    currentMonth: Record<string, number>  // 当月原币余额
    lastMonth: Record<string, number>     // 上月原币余额
    yearStart: Record<string, number>     // 年初原币余额
    currentMonthInBaseCurrency: Record<string, number>  // 当月本币余额
    lastMonthInBaseCurrency: Record<string, number>     // 上月本币余额
    yearStartInBaseCurrency: Record<string, number>     // 年初本币余额
  }
}

export interface ChildCategorySummary {
  id: string
  name: string
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  balances: Record<string, number> | {
    original: Record<string, number>
    converted: Record<string, number>
  }
  accountCount: number
  order: number
  // 新增：多时间点余额数据
  historicalBalances?: {
    currentMonth: Record<string, number>  // 当月原币余额
    lastMonth: Record<string, number>     // 上月原币余额
    yearStart: Record<string, number>     // 年初原币余额
    currentMonthInBaseCurrency: Record<string, number>  // 当月本币余额
    lastMonthInBaseCurrency: Record<string, number>     // 上月本币余额
    yearStartInBaseCurrency: Record<string, number>     // 年初本币余额
  }
}

export interface RecentTransaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT'
  amount: number
  description: string
  notes?: string
  date: string
  currency: {
    code: string
    symbol: string
    name: string
  }
  account: {
    id: string
    name: string
  }
}

// 存量类分类汇总响应
export interface StockCategorySummary extends CategorySummaryBase {
  children: ChildCategorySummary[]
  accounts: AccountSummary[]
  allAccounts: AccountSummary[]
  categoryBalances: Record<string, number>
  balanceChangeSummary: Record<string, {
    currentBalance: number
    balanceAdjustments: number
    netChanges: number
    count: number
  }>
  recentTransactions: RecentTransaction[]
}

// 流量类分类汇总响应
export interface FlowCategorySummary extends CategorySummaryBase {
  children: ChildCategorySummary[]
  accounts: AccountSummary[]
  allAccounts: AccountSummary[]
  categoryTotals: Record<string, number>
  transactionSummary: Record<string, {
    income: number
    expense: number
    count: number
    net: number
  }>
  recentTransactions: RecentTransaction[]
}

// 统一的分类汇总响应类型
export type CategorySummaryResponse = StockCategorySummary | FlowCategorySummary

// 内部计算用的账户数据结构
export interface AccountWithTransactions {
  id: string
  name: string
  description?: string
  categoryId: string
  category: {
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
  transactions: Array<{
    id: string
    type: 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT'
    amount: number
    description: string
    notes?: string
    date: string
    currency: {
      code: string
      symbol: string
      name: string
    }
  }>
}

// 分类数据结构
export interface CategoryWithChildren {
  id: string
  name: string
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  order: number
  parent?: {
    id: string
    name: string
  } | null
  children: Array<{
    id: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
    order: number
  }>
}
