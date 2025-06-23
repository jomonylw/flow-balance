/**
 * 组件专用类型定义
 * 为特定组件场景提供优化的类型定义
 */

import type {
  SimpleUser,
  SimpleCurrency,
  SimpleCategory,
  SimpleAccount,
  SimpleTransaction,
  SimpleTag,
  AccountWithTransactions,
  ChartDataPoint,
  ValidationResult,
  DashboardSummary,
  CategoryType,
  TransactionType,
  MonthlyDataItem,
  StockCategorySummaryData,
} from '@/types/core'

// 重新导出核心类型以便组件使用
export type {
  ValidationResult,
  DashboardSummary,
  AccountWithTransactions,
  SimpleUser,
  SimpleCurrency,
  SimpleCategory,
  SimpleAccount,
  SimpleTransaction,
  ChartDataPoint,
  CategoryType,
  TransactionType,
}

// ============================================================================
// 仪表板组件类型
// ============================================================================

/** 仪表板内容组件 Props */
export interface DashboardContentProps {
  user: SimpleUser
  stats: {
    accountCount: number
    transactionCount: number
    categoryCount: number
  }
  accounts: AccountWithTransactions[]
}

// ============================================================================
// 图表组件类型
// ============================================================================

/** ECharts 配置基础类型 */
export interface BaseChartConfig {
  title?: string
  width?: number | string
  height?: number | string
  theme?: 'light' | 'dark'
}

/** 净资产图表数据 */
export interface NetWorthChartData {
  xAxis: string[]
  series: {
    name: string
    type: string
    data: number[]
    smooth?: boolean
    itemStyle: {
      color: string
    }
  }[]
}

/** 现金流图表数据 */
export interface CashFlowChartData {
  xAxis: string[]
  series: {
    name: string
    type: string
    data: number[]
    itemStyle: {
      color: string
    }
    yAxisIndex?: number
  }[]
}

/** 图表数据容器 */
export interface ChartData {
  netWorthChart: NetWorthChartData
  cashFlowChart: CashFlowChartData
  currency: SimpleCurrency
}

// ============================================================================
// 表单组件类型
// ============================================================================

/** 添加账户模态框 Props */
export interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (account: SimpleAccount) => void
  category: SimpleCategory
  currencies?: SimpleCurrency[]
}

/** 账户设置模态框 Props */
export interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  account: SimpleAccount
  currencies?: SimpleCurrency[]
  onSuccess?: () => void
  onSave: (updates: Partial<SimpleAccount>) => Promise<void>
}

/** 分类设置模态框 Props */
export interface CategorySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  category: SimpleCategory & {
    children?: SimpleCategory[]
    accounts?: SimpleAccount[]
  }
  onSave: (updates: Partial<SimpleCategory>) => Promise<void>
}

/** 标签表单模态框属性 */
export interface TagFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (tag: SimpleTag) => void
  editingTag?: SimpleTag | null
  zIndex?: number
}

// ============================================================================
// 布局组件类型
// ============================================================================

/** 应用布局 Props */
export interface AppLayoutProps {
  children: React.ReactNode
  user?: SimpleUser
}

/** 分类树项 Props */
export interface CategoryTreeItemProps {
  category: SimpleCategory & {
    children?: SimpleCategory[]
    accounts?: SimpleAccount[]
  }
  level: number
  isExpanded: boolean
  hasChildren: boolean
  onToggle: () => void
  onCategoryClick?: (category: SimpleCategory) => void
  onAccountClick?: (account: SimpleAccount) => void
  onDataChange?: (options?: {
    type?: 'account' | 'category' | 'full'
    silent?: boolean
  }) => void
  baseCurrency?: SimpleCurrency
}

/** 账户树项 Props */
export interface AccountTreeItemProps {
  account: SimpleAccount
  level: number
  isSelected?: boolean
  onClick?: () => void
  onNavigate?: () => void
  onDataChange?: (options?: {
    type?: 'account' | 'category' | 'full'
    silent?: boolean
  }) => void
  baseCurrency?: SimpleCurrency
}

// ============================================================================
// 交易组件类型
// ============================================================================

/** 交易列表项 */
export interface TransactionListItem {
  id: string
  type: TransactionType
  amount: number
  description: string
  date: string
  account: SimpleAccount
  category: SimpleCategory
  currency: SimpleCurrency
  tags?: Array<{
    id: string
    name: string
  }>
}

/** 交易筛选器 */
export interface TransactionFilters {
  accountId: string
  categoryId: string
  type: string
  dateFrom: string
  dateTo: string
  search: string
  tagIds: string[]
}

// ============================================================================
// 报表组件类型
// ============================================================================

/** 资产负债表中的账户信息 */
export interface BalanceSheetAccountInfo {
  id: string
  name: string
  category: string
  balance: number
  currency: SimpleCurrency
  balanceInBaseCurrency?: number
  conversionRate?: number
  conversionSuccess?: boolean
  conversionError?: string
}

/** 资产负债表数据 */
export interface BalanceSheetData {
  assets: {
    categories: Record<
      string,
      {
        categoryName: string
        accounts: BalanceSheetAccountInfo[]
        totalByCurrency: Record<string, number>
        totalInBaseCurrency?: number
      }
    >
    totalByCurrency: Record<string, number>
  }
  liabilities: {
    categories: Record<
      string,
      {
        categoryName: string
        accounts: BalanceSheetAccountInfo[]
        totalByCurrency: Record<string, number>
        totalInBaseCurrency?: number
      }
    >
    totalByCurrency: Record<string, number>
  }
  equity: Record<string, number>
}

/** 现金流量表数据 */
export interface CashFlowData {
  income: {
    categories: Array<{
      category: SimpleCategory
      amount: number
      transactions: TransactionListItem[]
    }>
    total: number
  }
  expense: {
    categories: Array<{
      category: SimpleCategory
      amount: number
      transactions: TransactionListItem[]
    }>
    total: number
  }
  net: number
  currency: SimpleCurrency
  period: {
    start: string
    end: string
  }
}

/** 流量类月度数据 */
export interface FlowMonthlyData {
  [monthKey: string]: {
    [currencyCode: string]: {
      income: number
      expense: number
      balance: number
      transactionCount: number
      categories: Record<
        string,
        { income: number; expense: number; balance: number }
      >
    }
  }
}

/** 存量类账户（图表用） */
export interface ChartStockAccount {
  id: string
  name: string
  color?: string | null
  type?: string
}

/** 存量类账户（余额卡片用） */
export interface BalanceStockAccount {
  id: string
  name: string
  balances: Record<string, number>
  transactionCount: number
}

/** 存量类月度数据 */
export interface StockMonthlyData {
  [monthKey: string]: {
    [currencyCode: string]: {
      accounts: Record<string, { balance: number; name: string }>
      totalBalance: number
    }
  }
}

/** 带账户的分类（资产负债表用） */
export interface BalanceSheetCategoryWithAccounts {
  id: string
  name: string
  type: CategoryType
  parentId?: string | null
  order: number
  children?: BalanceSheetCategoryWithAccounts[]
  accounts: BalanceSheetAccountInfo[]
  totalByCurrency: Record<string, number>
  totalInBaseCurrency?: number
}

/** 带账户的分类（现金流量表用） */
export interface CashFlowCategoryWithAccounts {
  id: string
  name: string
  type: CategoryType
  parentId?: string | null
  order: number
  children?: CashFlowCategoryWithAccounts[]
  accounts: CashFlowAccountSummary[]
  totalByCurrency: Record<string, number>
  totalInBaseCurrency?: number
}

/** 现金流量表账户汇总 */
export interface CashFlowAccountSummary {
  id: string
  name: string
  currency: SimpleCurrency
  totalAmount: number
  totalAmountInBaseCurrency?: number
  conversionRate?: number
  conversionSuccess?: boolean
  conversionError?: string
  transactionCount: number
  transactions: Array<{
    id: string
    amount: number
    description: string
    date: string
    type: 'INCOME' | 'EXPENSE'
  }>
}

/** 流量类汇总数据 */
export type FlowSummaryData = MonthlyDataItem[]

/** 存量类汇总数据 */
export type StockSummaryData = StockCategorySummaryData

/** 现金流量表分类汇总 */
export interface CashFlowCategorySummary {
  categoryId: string
  categoryName: string
  accounts: CashFlowAccountSummary[]
  totalByCurrency: Record<string, number>
  totalInBaseCurrency?: number
}

/** 余额上下文分类汇总 */
export interface BalanceCategorySummary {
  id: string
  totalBalance: number
  currencySymbol: string
  currencyCode: string
  childrenBalance: number
  accountsBalance: number
}

/** 服务层账户余额 */
export interface ServiceAccountBalance {
  currencyCode: string
  amount: number
  currency: {
    code: string
    symbol: string
    name: string
  }
}

/** 余额上下文账户余额 */
export interface ContextAccountBalance {
  id: string
  name: string
  categoryId: string
  accountType: string
  balances: Record<
    string,
    {
      amount: number
      currency: {
        code: string
        symbol: string
        name: string
      }
    }
  >
  balanceInBaseCurrency: number
}

// ============================================================================
// 设置组件类型
// ============================================================================

/** 货币管理组件 Props */
export interface CurrencyManagementProps {
  onCurrenciesUpdated?: () => void
}

/** 汇率表单数据 */
export interface ExchangeRateFormData {
  fromCurrency: string
  toCurrency: string
  rate: number
  date: string
}

/** 标签管理组件 Props */
export interface TagManagementProps {
  tags: Array<{
    id: string
    name: string
    color?: string
  }>
  onTagUpdate: () => void
}

// ============================================================================
// 工具类型
// ============================================================================

/** 时间范围 - 重新导出统一类型 */
export type { TimeRange } from '@/types/core'

/** 排序方向 */
export type SortDirection = 'asc' | 'desc'

/** 加载状态 - 重新导出统一类型 */
export type { LoadingState } from '@/types/ui'

/** 异步操作状态 */
export interface AsyncState<T = unknown> {
  data?: T
  loading: boolean
  error?: string
  lastUpdated?: Date
}
