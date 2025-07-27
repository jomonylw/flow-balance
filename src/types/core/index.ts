/**
 * 核心业务类型定义
 * 统一管理项目中的核心业务实体类型
 */

// 导入常量和枚举
import {
  AccountType,
  TransactionType,
  RepaymentType,
  Theme,
  Language,
  LoadingState as _LoadingState,
  Size as _Size,
  ColorVariant as _ColorVariant,
  SortOrder as _SortOrder,
  ExportFormat as _ExportFormat,
} from './constants'

// 重新导出常量和枚举
export {
  AccountType,
  TransactionType,
  RepaymentType,
  Theme,
  Language,
  LoadingState,
  Size,
  ColorVariant,
  SortOrder,
  ExportFormat,
} from './constants'

// ============================================================================
// 基础类型
// ============================================================================

/** 用户信息 */
export interface User {
  id: string
  email: string
  name: string // 用户昵称/显示名称，必需字段
  recoveryKey?: string | null // 恢复密钥
  recoveryKeyCreatedAt?: Date | null // 恢复密钥创建时间
  createdAt: Date
  updatedAt: Date
  settings?: UserSettings
}

/** 用户设置 */
export interface UserSettings {
  id: string
  userId: string
  baseCurrencyId: string | null
  language: Language
  theme: Theme
  fireSWR: number
  futureDataDays: number
  autoUpdateExchangeRates: boolean
  lastExchangeRateUpdate: Date | null
  createdAt: Date
  updatedAt: Date
  baseCurrency?: Currency
}

/** 货币信息 */
export interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  decimalPlaces: number
  isCustom: boolean
  createdBy?: string | null
  isActive?: boolean
}

/** 用户货币设置 */
export interface UserCurrency {
  id: string
  userId: string
  currencyId: string
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

/** 分类类型枚举 - 使用从 constants 导入的 AccountType */
export type CategoryType = AccountType

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
  currencyId: string
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

/** 交易类型枚举 - 使用从 constants 导入的 TransactionType */

/** 交易信息 */
export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  description: string
  notes?: string | null
  date: Date
  accountId: string
  currencyId: string
  userId: string
  createdAt: Date
  updatedAt: Date
  account: Account
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
  currencyId: string
  type: TransactionType
  description: string
  notes?: string | null
  tagIds?: string[]
  createdAt: Date
  updatedAt: Date
  account?: Account
  currency?: Currency
}

/** 简化的交易模板信息（用于选择器） */
export interface SimpleTransactionTemplate {
  id: string
  name: string
  accountId: string
  currencyCode: string
  type: TransactionType
  description: string
  notes?: string | null
  tagIds?: string[]
  account?: {
    id: string
    name: string
    category?: {
      id: string
      name: string
      type: AccountType
    }
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
  currencyCode: string // 保留 currencyCode 用于表单，内部转换为 currencyId
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
  currencyCode: string // 保留 currencyCode 用于表单，内部转换为 currencyId
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
  fromCurrencyId: string
  toCurrencyId: string
  rate: number
  effectiveDate: Date
  type: string
  userId: string
  createdAt: Date
  updatedAt: Date
  fromCurrencyRef?: Currency
  toCurrencyRef?: Currency
}

/** 汇率数据（用于表单和API） */
export interface ExchangeRateData {
  id: string
  fromCurrencyId: string
  toCurrencyId: string
  fromCurrency: string // 源货币代码（用于表单）
  toCurrency: string // 目标货币代码（用于表单）
  rate: number
  effectiveDate: string
  type?: string // 汇率类型：USER（用户输入）, AUTO（自动生成）
  sourceRateId?: string | null // 源汇率ID（用于自动生成的汇率）
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
// Prisma 相关类型
// ============================================================================

/** Prisma 事务类型 - 统一定义，避免重复 */
export type PrismaTransaction = Parameters<
  Parameters<import('@prisma/client').PrismaClient['$transaction']>[0]
>[0]

/** 认证状态类型 - 统一定义，避免重复 */
export interface AuthState {
  user?: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error?: string | null
}

/** 分类交易数据类型 - 统一定义，避免重复 */
export interface CategoryTransaction {
  id: string
  type: TransactionType
  date: string
  amount: number
  notes?: string | null
  currency: {
    code: string
    symbol: string
    name: string
  }
  tags: Array<{
    tag: {
      id: string
      name: string
    }
  }>
}

/** 流量类分类（收入/支出） - 统一定义，避免重复 */
export interface FlowCategory {
  id: string
  name: string
  type: AccountType.INCOME | AccountType.EXPENSE
  transactions?: SimpleTransaction[]
}

/** 存量类分类（资产/负债） - 统一定义，避免重复 */
export interface StockCategory {
  id: string
  name: string
  type: AccountType.ASSET | AccountType.LIABILITY
  transactions?: SimpleTransaction[]
}

/** 流量类账户（收入/支出） - 统一定义，避免重复 */
export interface FlowAccount {
  id: string
  name: string
  color?: string | null
  type?: string
}

// ============================================================================
// 扩展类型定义（用于特定场景）
// ============================================================================

/** 简化的用户信息（用于组件 props） */
export interface SimpleUser {
  id: string
  email: string
  name: string
}

/** 简化的用户设置信息（用于显示） */
export interface SimpleUserSettings {
  baseCurrencyId: string | null
  language: Language
  theme: Theme
  fireSWR: number
  futureDataDays: number
  baseCurrency?: SimpleCurrency
}

/** 简化的货币信息（用于显示） */
export interface SimpleCurrency {
  id: string
  code: string
  name: string
  symbol: string
  decimalPlaces: number
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
  currencyId: string
  categoryId: string
  category: SimpleCategory
  currency: SimpleCurrency
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

/** 分货币信息 */
export interface ByCurrencyInfo {
  originalAmount: number
  convertedAmount: number
  currency: { code: string; symbol: string; name: string }
  exchangeRate: number
  accountCount: number
  success: boolean
}

/** 仪表板汇总数据 */
export interface DashboardSummary {
  totalAssets: {
    amount: number
    currency: SimpleCurrency
    accountCount: number
    hasConversionErrors?: boolean
    byCurrency?: Record<string, ByCurrencyInfo>
  }
  totalLiabilities: {
    amount: number
    currency: SimpleCurrency
    accountCount: number
    hasConversionErrors?: boolean
    byCurrency?: Record<string, ByCurrencyInfo>
  }
  netWorth: {
    amount: number
    currency: SimpleCurrency
    hasConversionErrors?: boolean
    byCurrency?: Record<string, ByCurrencyInfo>
  }
  recentActivity: {
    summaryInBaseCurrency: {
      net: number
      income: number
      expense: number
    }
    incomeByCurrency?: Record<string, ByCurrencyInfo>
    expenseByCurrency?: Record<string, ByCurrencyInfo>
    netByCurrency?: Record<string, ByCurrencyInfo>
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
  | 'last12months'

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

/** FIRE 计算结果 */
export interface FireCalculationResult {
  fireNumber: number // 财务自由所需金额
  currentProgress: number // 当前进度百分比
  yearsToFire: number // 距离财务自由的年数
  monthsToFire: number // 距离财务自由的月数
  fireDate: Date // 预计财务自由日期
  totalInvestmentNeeded: number // 总投资需求
  monthlyShortfall: number // 月度缺口（如果有）
  isAchievable: boolean // 是否可达成
}

/** FIRE 投影数据点 */
export interface FireProjection {
  year: number
  month: number
  date: Date
  totalAssets: number // 总资产
  monthlyInvestment: number // 月度投资
  cumulativeInvestment: number // 累计投资
  investmentGrowth: number // 投资增长
  progressPercentage: number // 进度百分比
  isFireAchieved: boolean // 是否达到财务自由
}

/** 资产负债数据 */
export interface AssetLiabilityData {
  assets: {
    total: number
    categories: Array<{
      id: string
      name: string
      amount: number
      percentage: number
      accounts: Array<{
        id: string
        name: string
        amount: number
        currencyCode: string
      }>
    }>
  }
  liabilities: {
    total: number
    categories: Array<{
      id: string
      name: string
      amount: number
      percentage: number
      accounts: Array<{
        id: string
        name: string
        amount: number
        currencyCode: string
      }>
    }>
  }
  netWorth: number
  currencyCode: string
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
// 定期交易相关类型
// ============================================================================

/** 定期交易频率枚举 */
export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

/** 定期交易信息 */
export interface RecurringTransaction {
  id: string
  userId: string
  accountId: string
  currencyId: string // 使用 currencyId 而不是 currencyCode
  type: TransactionType.INCOME | TransactionType.EXPENSE
  amount: number
  description: string
  notes?: string | null
  tagIds?: string[] // 标签ID数组

  frequency: RecurrenceFrequency
  interval: number
  dayOfMonth?: number | null
  dayOfWeek?: number | null
  monthOfYear?: number | null

  startDate: Date
  endDate?: Date | null
  nextDate: Date

  isActive: boolean
  maxOccurrences?: number | null
  currentCount: number

  createdAt: Date
  updatedAt: Date

  // 关联数据
  account?: Account
  currency?: Currency
  tags?: Tag[]

  // 向后兼容字段（从 currency 对象派生）
  currencyCode?: string // 从 currency.code 派生，用于向后兼容
}

/** 定期交易表单数据 */
export interface RecurringTransactionFormData {
  id?: string
  accountId: string
  currencyCode: string
  type: TransactionType.INCOME | TransactionType.EXPENSE
  amount: number
  description: string
  notes?: string | null

  frequency: RecurrenceFrequency
  interval: number
  dayOfMonth?: number | null
  dayOfWeek?: number | null
  monthOfYear?: number | null

  startDate: string
  endDate?: string | null

  isActive: boolean
  maxOccurrences?: number | null

  tagIds?: string[]
}

// ============================================================================
// 贷款合约相关类型
// ============================================================================

/** 还款类型枚举 */

/** 贷款合约信息 */
export interface LoanContract {
  id: string
  userId: string
  accountId: string // 贷款账户ID (负债账户)
  currencyId: string // 使用 currencyId 而不是 currencyCode
  contractName: string
  loanAmount: number // 贷款金额
  interestRate: number // 年利率
  totalPeriods: number // 总期数
  repaymentType: RepaymentType
  startDate: Date // 贷款开始日期
  paymentDay: number // 每月还款日期（1-31号）

  // 还款账户信息
  paymentAccountId?: string // 还款账户ID (支出类型账户，货币需一致)

  // 交易模板信息
  transactionDescription?: string // 交易描述模板
  transactionNotes?: string // 交易备注模板
  transactionTagIds?: string[] // 交易标签ID列表

  isActive: boolean
  currentPeriod: number
  nextPaymentDate?: Date // 下次还款日期
  createdAt: Date
  updatedAt: Date

  // 关联数据
  account?: Account
  paymentAccount?: Account
  currency?: Currency
  payments?: LoanPayment[]

  // 向后兼容字段（从 currency 对象派生）
  currencyCode?: string // 从 currency.code 派生，用于向后兼容
}

/** 贷款还款记录 */
export interface LoanPayment {
  id: string
  loanContractId: string
  userId: string
  period: number
  paymentDate: Date

  principalAmount: number
  interestAmount: number
  totalAmount: number
  remainingBalance: number

  principalTransactionId?: string
  interestTransactionId?: string
  balanceTransactionId?: string

  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  processedAt?: Date
  createdAt: Date

  // 关联数据
  loanContract?: LoanContract
  principalTransaction?: Transaction
  interestTransaction?: Transaction
  balanceTransaction?: Transaction
}

/** 贷款合约表单数据 */
export interface LoanContractFormData {
  id?: string
  accountId: string
  currencyCode: string
  contractName: string
  loanAmount: number
  interestRate: number
  totalPeriods: number
  repaymentType: RepaymentType
  startDate: string
  paymentDay: number // 每月还款日期（1-31号）

  // 还款账户信息
  paymentAccountId?: string

  // 交易模板信息
  transactionDescription?: string
  transactionNotes?: string
  transactionTagIds?: string[] // 标签ID数组

  // 状态信息
  isActive?: boolean
}

/** 贷款计算结果 */
export interface LoanCalculationResult {
  monthlyPayment: number
  totalInterest: number
  totalPayment: number
  schedule: LoanPaymentSchedule[]
}

/** 贷款还款计划项 */
export interface LoanPaymentSchedule {
  period: number
  paymentDate: Date
  principalAmount: number
  interestAmount: number
  totalAmount: number
  remainingBalance: number
}

// ============================================================================
// 同步状态相关类型
// ============================================================================

/** 同步阶段状态 */
export interface SyncStageStatus {
  stage: 'pending' | 'processing' | 'completed' | 'failed'
  processed?: number
  errors?: string[]
  startTime?: Date
  endTime?: Date
}

/** 同步状态 */
export interface SyncStatus {
  status: 'idle' | 'processing' | 'completed' | 'failed'
  lastSyncTime?: Date
  processedRecurring?: number
  processedLoans?: number
  processedExchangeRates?: number
  failedCount?: number
  errorMessage?: string
  futureDataGenerated?: boolean
  futureDataUntil?: Date

  // 新增：分阶段状态
  stages?: {
    recurringTransactions: SyncStageStatus
    loanContracts: SyncStageStatus
    exchangeRates: SyncStageStatus
  }
  currentStage?: 'recurringTransactions' | 'loanContracts' | 'exchangeRates'
}

/** 定期交易处理日志 */
export interface RecurringProcessingLog {
  id: string
  userId: string
  startTime: Date
  endTime?: Date
  status: 'processing' | 'completed' | 'failed'
  processedRecurring: number
  processedLoans: number
  processedExchangeRates: number
  failedCount: number
  errorMessage?: string
  createdAt: Date
  updatedAt: Date

  // 新增：分阶段详细信息
  stageDetails?: string // JSON 字符串，存储各阶段的详细状态
  currentStage?: string // 当前处理阶段
}

// ============================================================================
// 交易扩展
// ============================================================================

/** 扩展的交易信息（包含新字段） */
export interface ExtendedTransaction extends Transaction {
  recurringTransactionId?: string | null
  loanContractId?: string | null
  loanPaymentId?: string | null
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

// ============================================================================
// 智能粘贴表格类型导出
// ============================================================================

export * from './smart-paste'
