/**
 * 分类汇总相关的类型定义
 */

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
  balances: Record<string, number>
  transactionCount: number
}

export interface ChildCategorySummary {
  id: string
  name: string
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  balances: Record<string, number>
  accountCount: number
  order: number
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
