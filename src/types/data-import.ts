/**
 * 数据导入相关类型定义
 */

// ============================================================================
// 导入数据结构类型
// ============================================================================

/** 导出数据的基本信息 */
export interface ExportInfo {
  exportDate: string
  version: string
  appName: string
  description?: string
}

/** 导出的用户基本信息 */
export interface ExportedUser {
  email: string
  createdAt: string
}

/** 导出的用户设置 */
export interface ExportedUserSettings {
  baseCurrencyCode?: string
  dateFormat: string
  theme: string
  language: string
  fireEnabled: boolean
  fireSWR?: string
  futureDataDays: number
  autoUpdateExchangeRates: boolean
  lastExchangeRateUpdate?: string
  createdAt: string
  updatedAt: string
}

/** 导出的分类数据 */
export interface ExportedCategory {
  id: string
  name: string
  type: string
  parentId?: string
  order: number
  createdAt: string
  updatedAt: string
}

/** 导出的账户数据 */
export interface ExportedAccount {
  id: string
  name: string
  description?: string
  color?: string
  categoryId: string
  categoryName: string
  categoryType: string
  currencyId: string
  currencyCode: string
  currencyName: string
  currencySymbol: string
  createdAt: string
  updatedAt: string
}

/** 导出的交易数据 */
export interface ExportedTransaction {
  id: string
  type: string
  amount: string
  description: string
  notes?: string
  date: string
  accountId: string
  accountName: string
  currencyId: string
  currencyCode: string
  recurringTransactionId?: string
  loanContractId?: string
  loanPaymentId?: string
  tags: Array<{
    id: string
    name: string
    color: string
  }>
  createdAt: string
  updatedAt: string
}

/** 导出的标签数据 */
export interface ExportedTag {
  id: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

/** 导出的用户货币关联数据 */
export interface ExportedUserCurrency {
  currencyId: string
  currencyCode: string
  currencyName: string
  currencySymbol: string
  currencyDecimalPlaces: number
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
}

/** 导出的自定义货币数据 */
export interface ExportedCustomCurrency {
  id: string
  code: string
  name: string
  symbol: string
  decimalPlaces: number
  isCustom: boolean
}

/** 导出的汇率数据 */
export interface ExportedExchangeRate {
  id: string
  fromCurrencyCode: string
  toCurrencyCode: string
  rate: string
  effectiveDate: string
  type: string
  sourceRateId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

/** 导出的交易模板数据 */
export interface ExportedTransactionTemplate {
  id: string
  name: string
  type: string
  description: string
  notes?: string
  accountId: string
  accountName: string
  categoryId: string
  categoryName: string
  currencyId: string
  currencyCode: string
  tagIds?: any
  createdAt: string
  updatedAt: string
}

/** 导出的定期交易数据 */
export interface ExportedRecurringTransaction {
  id: string
  type: string
  amount: string
  description: string
  notes?: string
  accountId: string
  accountName: string
  currencyId: string
  currencyCode: string
  tagIds?: any
  frequency: string
  interval: number
  dayOfMonth?: number
  dayOfWeek?: number
  monthOfYear?: number
  startDate: string
  endDate?: string
  nextDate: string
  maxOccurrences?: number
  currentCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** 导出的贷款合约数据 */
export interface ExportedLoanContract {
  id: string
  contractName: string
  loanAmount: string
  interestRate: string
  totalPeriods: number
  repaymentType: string
  startDate: string
  paymentDay: number
  accountId: string
  accountName: string
  currencyId: string
  currencyCode: string
  paymentAccountId?: string
  paymentAccountName?: string
  transactionDescription?: string
  transactionNotes?: string
  transactionTagIds?: any
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** 导出的贷款还款记录数据 */
export interface ExportedLoanPayment {
  id: string
  loanContractId: string
  period: number
  paymentDate: string
  principalAmount: string
  interestAmount: string
  totalAmount: string
  remainingBalance: string
  status: string
  processedAt?: string
  principalTransactionId?: string
  interestTransactionId?: string
  balanceTransactionId?: string
  createdAt: string
}

/** 导出数据统计信息 */
export interface ExportStatistics {
  totalCategories: number
  totalAccounts: number
  totalTransactions: number
  totalTags: number
  totalUserCurrencies: number
  totalCustomCurrencies: number
  totalExchangeRates: number
  totalTransactionTemplates: number
  totalRecurringTransactions: number
  totalLoanContracts: number
  totalLoanPayments: number
}

/** 完整的导出数据结构 */
export interface ExportedData {
  exportInfo: ExportInfo
  user: ExportedUser
  userSettings: ExportedUserSettings | null
  categories: ExportedCategory[]
  accounts: ExportedAccount[]
  transactions: ExportedTransaction[]
  tags: ExportedTag[]
  userCurrencies: ExportedUserCurrency[]
  customCurrencies: ExportedCustomCurrency[]
  exchangeRates: ExportedExchangeRate[]
  transactionTemplates: ExportedTransactionTemplate[]
  recurringTransactions: ExportedRecurringTransaction[]
  loanContracts: ExportedLoanContract[]
  loanPayments: ExportedLoanPayment[]
  statistics: ExportStatistics
}

// ============================================================================
// 导入处理相关类型
// ============================================================================

/** ID映射表 */
export interface IdMapping {
  [oldId: string]: string
}

/** 导入选项 */
export interface ImportOptions {
  overwriteExisting?: boolean
  skipDuplicates?: boolean
  validateData?: boolean
  createMissingCurrencies?: boolean
  batchSize?: number
  enableProgressTracking?: boolean
  onProgress?: (progress: ImportProgress) => void
}

/** 导入结果 */
export interface ImportResult {
  success: boolean
  message: string
  statistics: {
    processed: number
    created: number
    updated: number
    skipped: number
    failed: number
  }
  errors: string[]
  warnings: string[]
}

/** 单项导入结果 */
export interface ItemImportResult {
  success: boolean
  id?: string
  error?: string
  warning?: string
}

/** 导入进度信息 */
export interface ImportProgress {
  stage: string
  current: number
  total: number
  percentage: number
  message: string
}

/** 导入验证结果 */
export interface ImportValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  missingCurrencies: string[]
  duplicateNames: string[]
  dataInfo?: {
    version: string
    exportDate: string
    appName: string
    statistics?: ExportStatistics
  }
}
