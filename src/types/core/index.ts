/**
 * 核心业务类型定义
 * 统一管理项目中的核心业务实体类型
 */

// ============================================================================
// 基础类型
// ============================================================================

/** 用户信息 */
export interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
  updatedAt: Date
  settings?: UserSettings
}

/** 用户设置 */
export interface UserSettings {
  id: string
  userId: string
  baseCurrencyCode: string
  language: 'zh' | 'en'
  theme: 'light' | 'dark' | 'system'
  fireSWR: number
  createdAt: Date
  updatedAt: Date
  baseCurrency?: Currency
}

/** 货币信息 */
export interface Currency {
  code: string
  name: string
  symbol: string
  isCustom: boolean
  isActive?: boolean
  createdBy?: string | null
}

/** 用户货币设置 */
export interface UserCurrency {
  id: string
  userId: string
  currencyCode: string
  isActive: boolean
  order: number
  createdAt: Date
  updatedAt: Date
  currency: Currency
}

/** 标签信息 */
export interface Tag {
  id: string
  name: string
  color?: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// 分类和账户类型
// ============================================================================

/** 分类类型枚举 */
export type CategoryType = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'

/** 分类信息 */
export interface Category {
  id: string
  name: string
  type: CategoryType
  icon?: string | null
  color?: string | null
  description?: string | null
  order: number
  parentId?: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
  parent?: Category | null
  children?: Category[]
  accounts?: Account[]
  transactions?: Transaction[]
}

/** 账户信息 */
export interface Account {
  id: string
  name: string
  description?: string | null
  color?: string | null
  currencyCode: string
  categoryId: string
  userId: string
  createdAt: Date
  updatedAt: Date
  category: Category
  currency: Currency
  transactions?: Transaction[]
}

// ============================================================================
// 交易类型
// ============================================================================

/** 交易类型枚举 */
export type TransactionType = 'INCOME' | 'EXPENSE' | 'BALANCE'

/** 交易信息 */
export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  description: string
  notes?: string | null
  date: Date
  accountId: string
  categoryId: string
  currencyCode: string
  userId: string
  createdAt: Date
  updatedAt: Date
  account: Account
  category: Category
  currency: Currency
  tags: TransactionTag[]
}

/** 交易标签关联 */
export interface TransactionTag {
  id: string
  transactionId: string
  tagId: string
  transaction: Transaction
  tag: Tag
}

/** 交易中的标签信息（简化版，不包含颜色） */
export interface TransactionTagInfo {
  id: string
  name: string
}

// ============================================================================
// 交易模板类型
// ============================================================================

/** 交易模板信息 */
export interface TransactionTemplate {
  id: string
  userId: string
  name: string
  accountId: string
  categoryId: string
  currencyCode: string
  type: TransactionType
  description: string
  notes?: string | null
  tagIds?: string[]
  createdAt: Date
  updatedAt: Date
  account?: Account
  category?: Category
  currency?: Currency
}

/** 简化的交易模板信息（用于选择器） */
export interface SimpleTransactionTemplate {
  id: string
  name: string
  accountId: string
  categoryId: string
  currencyCode: string
  type: TransactionType
  description: string
  notes?: string | null
  tagIds?: string[]
  account?: {
    id: string
    name: string
  }
  category?: {
    id: string
    name: string
  }
  currency?: {
    code: string
    symbol: string
  }
}

/** 模板选择器选项 */
export interface TemplateOption {
  value: string
  label: string
  template: SimpleTransactionTemplate
}

// ============================================================================
// 表单数据类型
// ============================================================================

/** 交易表单数据 */
export interface TransactionFormData {
  id?: string
  accountId: string
  categoryId: string
  currencyCode: string
  type: TransactionType
  amount: number
  description: string
  notes?: string | null
  date: string
  tagIds?: string[]
}

/** 账户表单数据 */
export interface AccountFormData {
  id?: string
  name: string
  description?: string | null
  color?: string | null
  currencyCode: string
  categoryId: string
}

/** 分类表单数据 */
export interface CategoryFormData {
  id?: string
  name: string
  type: CategoryType
  icon?: string | null
  color?: string | null
  description?: string | null
  parentId?: string | null
}

/** 标签表单数据 */
export interface TagFormData {
  id?: string
  name: string
  color?: string | null
}

/** 交易模板表单数据 */
export interface TransactionTemplateFormData {
  name: string
  accountId: string
  categoryId: string
  currencyCode: string
  type: TransactionType
  description: string
  notes?: string | null
  tagIds?: string[]
}

// ============================================================================
// 统计和汇总类型
// ============================================================================

/** 余额信息 */
export interface Balance {
  currencyCode: string
  amount: number
  currency: Currency
}

/** 账户余额映射 */
export type AccountBalances = Record<string, Balance>

/** 趋势数据点 */
export interface TrendDataPoint {
  date: string
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  hasConversionError: boolean
  transactionCount: number
}

/** 月度汇总数据 */
export interface MonthlySummaryData {
  month: string
  income: number
  expense: number
  net: number
  currencyCode: string
}

/** 分类汇总统计 */
export interface CategoryStats {
  totalAccounts: number
  directAccounts: number
  totalTransactions: number
  totalChildren: number
}

/** 分类汇总基础信息 */
export interface CategorySummaryBase {
  category: {
    id: string
    name: string
    type?: CategoryType
    parent?: {
      id: string
      name: string
    } | null
    childrenCount: number
  }
  currencies: Currency[]
  stats: CategoryStats
}

// ============================================================================
// 汇率相关类型
// ============================================================================

/** 汇率信息 */
export interface ExchangeRate {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  date: Date
  userId: string
  createdAt: Date
  updatedAt: Date
}

/** 汇率数据（用于表单和API） */
export interface ExchangeRateData {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  effectiveDate: string
  notes?: string | null
  fromCurrencyRef: SimpleCurrency
  toCurrencyRef: SimpleCurrency
}

/** 货币转换结果 */
export interface CurrencyConversionResult {
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  targetCurrency: string
  rate?: number
  hasError: boolean
  errorMessage?: string
}

/** 货币转换结果（服务层） */
export interface ConversionResult {
  originalAmount: number
  originalCurrency: string
  fromCurrency: string
  convertedAmount: number
  targetCurrency: string
  exchangeRate: number
  rateDate: Date
  success: boolean
  error?: string
}

/** 缺失汇率信息 */
export interface MissingRateInfo {
  fromCurrency: string
  toCurrency: string
  fromCurrencyInfo: SimpleCurrency
  toCurrencyInfo: SimpleCurrency
  required?: boolean
}

// ============================================================================
// 扩展类型定义（用于特定场景）
// ============================================================================

/** 简化的用户信息（用于组件 props） */
export interface SimpleUser {
  id: string
  email: string
}

/** 简化的用户设置信息（用于显示） */
export interface SimpleUserSettings {
  baseCurrencyCode: string
  language: 'zh' | 'en'
  theme: 'light' | 'dark' | 'system'
  fireSWR: number
}

/** 简化的货币信息（用于显示） */
export interface SimpleCurrency {
  code: string
  name: string
  symbol: string
  isCustom?: boolean
  createdBy?: string | null
}

/** 简化的分类信息（用于选择器） */
export interface SimpleCategory {
  id: string
  name: string
  type?: CategoryType
  description?: string | null
  parentId?: string | null
  order?: number
}

/** 简化的账户信息（用于列表显示） */
export interface SimpleAccount {
  id: string
  name: string
  currencyCode: string
  categoryId: string
  category: SimpleCategory
  description?: string | null
  color?: string | null
  balanceInBaseCurrency?: number
  balances?: Record<string, { amount: number }>
}

/** 简化的标签信息（用于显示） */
export interface SimpleTag {
  id: string
  name: string
  color?: string
  _count?: {
    transactions: number
  }
}

/** 简化的交易信息（用于图表和统计） */
export interface SimpleTransaction {
  id: string
  type: TransactionType
  amount: number
  currency: SimpleCurrency
  date: string
  notes?: string | null
  description?: string
}

/** 最近交易信息（用于仪表板显示） */
export interface RecentTransaction {
  id: string
  type: TransactionType
  amount: number
  description: string
  date: Date
  account: SimpleAccount
  category: SimpleCategory
  currency: SimpleCurrency
  tags: {
    tag: {
      id: string
      name: string
      color?: string
    }
  }[]
}

/** 带有交易的账户（用于仪表板） */
export interface AccountWithTransactions extends Omit<Account, 'transactions'> {
  transactions?: SimpleTransaction[]
}

/** 图表数据点（用于 ECharts） */
/** 图表数据点 - 重新导出统一类型 */
export type { ChartDataPoint } from '@/types/ui'

/** 验证结果（用于数据验证） */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
  score?: number
  details?: {
    accountsChecked: number
    transactionsChecked: number
    categoriesWithoutType: number
    invalidTransactions: number
    businessLogicViolations: number
  }
}

/** 仪表板汇总数据 */
export interface DashboardSummary {
  totalAssets: {
    amount: number
    currency: SimpleCurrency
    accountCount: number
  }
  totalLiabilities: {
    amount: number
    currency: SimpleCurrency
    accountCount: number
  }
  netWorth: {
    amount: number
    currency: SimpleCurrency
  }
  recentActivity: {
    summaryInBaseCurrency: {
      net: number
      income: number
      expense: number
    }
    baseCurrency: SimpleCurrency
    period: string
  }
}

/** 时间范围 */
export type TimeRange =
  | '7d'
  | '30d'
  | '90d'
  | '1y'
  | 'all'
  | 'lastMonth'
  | 'lastYear'

// ============================================================================
// FIRE 相关类型
// ============================================================================

/** FIRE 计算参数 */
export interface FireParams {
  retirementExpenses: number
  safeWithdrawalRate: number
  currentInvestableAssets: number
  expectedAnnualReturn: number
  monthlyInvestment: number
}

// ============================================================================
// 月度数据相关类型
// ============================================================================

/** 月度数据项（用于分类详情页面） */
export interface MonthlyDataItem {
  month: string
  childCategories: {
    id: string
    name: string
    type: string
    order: number
    accountCount: number
    balances: {
      original: Record<string, number>
      converted: Record<string, number>
    }
  }[]
  directAccounts: {
    id: string
    name: string
    categoryId: string
    balances: {
      original: Record<string, number>
      converted: Record<string, number>
    }
    transactionCount: number
  }[]
}

/** 基础汇总数据（通用汇总统计） */
export interface BaseSummaryData {
  totalAmount: number
  transactionCount: number
  accountCount: number
}

/** 智能分类汇总数据（用于智能分类卡片） */
export interface SmartCategorySummaryData extends BaseSummaryData {
  thisMonthAmount: number
  lastMonthAmount: number
  thisYearAmount: number
  monthlyChange: number
  yearlyComparison: number
  average12Months: number
}

/** 存量分类汇总数据（用于存量分类详情） */
export interface StockCategorySummaryData {
  monthlyData: MonthlyDataItem[]
}

/** 存量分类月度数据（用于图表显示） */
export interface StockCategoryMonthlyData {
  monthlyData: Record<
    string,
    Record<
      string,
      {
        accounts: Record<string, { balance: number; name: string }>
        totalBalance: number
      }
    >
  >
  baseCurrency: string
}

// ============================================================================
// 导出所有类型
// ============================================================================

export type {
  // 重新导出以保持向后兼容
  User as CoreUserType,
  Currency as CoreCurrencyType,
  Category as CoreCategoryType,
  Account as CoreAccountType,
  Transaction as CoreTransactionType,
  Tag as CoreTagType,
}
