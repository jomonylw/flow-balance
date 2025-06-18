/**
 * 分类汇总相关的类型定义
 */

export type ServiceBalance = Record<string, number>

/** 月度余额数据结构 */
export interface MonthlyBalance {
  original: ServiceBalance // 原币余额
  converted: ServiceBalance // 折合本位币后的余额
}

/** 按月汇总的子分类信息 */
export interface MonthlyChildCategorySummary {
  id: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  balances: MonthlyBalance
  accountCount: number
  order: number
}

/** 按月汇总的账户信息 */
export interface MonthlyAccountSummary {
  id: string
  name: string
  description?: string
  categoryId: string
  balances: MonthlyBalance
  transactionCount: number
}

/** 单个月份的完整报告 */
export interface MonthlyReport {
  month: string // 格式: YYYY-MM
  childCategories: MonthlyChildCategorySummary[]
  directAccounts: MonthlyAccountSummary[]
}

export interface BaseCurrency {
  code: string
  symbol: string
  name: string
}

export interface ServiceCategorySummaryBase {
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
  balances:
    | Record<string, number>
    | {
        original: Record<string, number>
        converted: Record<string, number>
      }
  transactionCount: number
  // 新增：多时间点余额数据
  historicalBalances?: {
    currentMonth: Record<string, number> // 当月原币余额
    lastMonth: Record<string, number> // 上月原币余额
    yearStart: Record<string, number> // 年初原币余额
    currentMonthInBaseCurrency: Record<string, number> // 当月本币余额
    lastMonthInBaseCurrency: Record<string, number> // 上月本币余额
    yearStartInBaseCurrency: Record<string, number> // 年初本币余额
  }
}

export interface ChildCategorySummary {
  id: string
  name: string
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  balances:
    | Record<string, number>
    | {
        original: Record<string, number>
        converted: Record<string, number>
      }
  accountCount: number
  order: number
  // 新增：多时间点余额数据
  historicalBalances?: {
    currentMonth: Record<string, number> // 当月原币余额
    lastMonth: Record<string, number> // 上月原币余额
    yearStart: Record<string, number> // 年初原币余额
    currentMonthInBaseCurrency: Record<string, number> // 当月本币余额
    lastMonthInBaseCurrency: Record<string, number> // 上月本币余额
    yearStartInBaseCurrency: Record<string, number> // 年初本币余额
  }
}

// 服务层专用的最近交易类型（date 为 string 类型）
export interface ServiceRecentTransaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'BALANCE'
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
export interface StockCategorySummary extends ServiceCategorySummaryBase {
  children: ChildCategorySummary[]
  accounts: AccountSummary[]
  allAccounts: AccountSummary[]
  categoryBalances: Record<string, number>
  balanceChangeSummary: Record<
    string,
    {
      currentBalance: number
      balanceAdjustments: number
      netChanges: number
      count: number
    }
  >
  recentTransactions: ServiceRecentTransaction[]
}

// 流量类分类汇总响应
export interface FlowCategorySummary extends ServiceCategorySummaryBase {
  children: ChildCategorySummary[]
  accounts: AccountSummary[]
  allAccounts: AccountSummary[]
  categoryTotals: Record<string, number>
  transactionSummary: Record<
    string,
    {
      income: number
      expense: number
      count: number
      net: number
    }
  >
  recentTransactions: ServiceRecentTransaction[]
}

// 统一的分类汇总响应类型
export type _CategorySummaryResponse = StockCategorySummary | FlowCategorySummary

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
    type: 'INCOME' | 'EXPENSE' | 'BALANCE'
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

// 分类数据结构（服务层专用）
export interface ServiceCategoryWithChildren {
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
