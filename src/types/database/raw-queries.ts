/**
 * 统一查询层类型定义
 * 定义所有原生 SQL 查询的输入参数和返回结果类型
 */

// ============================================================================
// 数据库方言类型
// ============================================================================

export type DatabaseDialect = 'postgresql' | 'sqlite'

// ============================================================================
// 分类树查询相关类型
// ============================================================================

export interface CategoryHierarchyMap {
  childrenMap: Map<string, string[]>
  descendantsMap: Map<string, string[]>
  allCategoryIds: Set<string>
}

// ============================================================================
// 余额计算查询相关类型
// ============================================================================

export interface AccountBalanceResult {
  accountId: string
  currencyCode: string
  currencySymbol: string
  currencyName: string
  finalBalance: number
}

export interface BalanceHistoryResult {
  currencyCode: string
  currencySymbol: string
  currencyName: string
  finalBalance: number
}

export interface AssetLiabilityResult {
  assets: Array<{
    currencyCode: string
    totalBalance: number
  }>
  liabilities: Array<{
    currencyCode: string
    totalBalance: number
  }>
}

// ============================================================================
// 现金流查询相关类型
// ============================================================================

export interface CashFlowResult {
  categoryId: string
  categoryName: string
  categoryType: string
  accountId: string
  accountName: string
  currencyCode: string
  currencySymbol: string
  currencyName: string
  transactionType: string
  totalAmount: number
  transactionCount: number
}

export interface IncomeExpenseResult {
  accountType: string
  currencyCode: string
  totalAmount: number
}

export interface DashboardCashFlowResult {
  month: string
  categoryType: string
  currencyCode: string
  totalAmount: number
}

export interface NetWorthHistoryResult {
  month: string
  categoryType: string
  currencyCode: string
  totalBalance: number
}

// ============================================================================
// 月度汇总查询相关类型
// ============================================================================

export interface MonthlyFlowResult {
  month: string
  accountId: string
  accountName: string
  accountDescription: string | null
  categoryId: string
  categoryName: string
  currencyCode: string
  transactionType: string
  totalAmount: number
  transactionCount: number
}

export interface MonthlyStockResult {
  month: string
  accountId: string
  accountName: string
  accountDescription: string | null
  categoryId: string
  categoryName: string
  currencyCode: string
  balanceAmount: number
}

// ============================================================================
// 仪表板查询相关类型
// ============================================================================

export interface DashboardAccountResult {
  accountId: string
  accountName: string
  categoryId: string
  categoryName: string
  categoryType: string
  currencyCode: string
  currencySymbol: string
  currencyName: string
  balance: number
}

export interface DashboardSummaryResult {
  categoryType: string
  currencyCode: string
  currencySymbol: string
  currencyName: string
  totalAmount: number
  transactionCount: number
}

export interface DashboardActivityResult {
  date: string
  transactionType: string
  currencyCode: string
  totalAmount: number
  transactionCount: number
}

// ============================================================================
// 系统查询相关类型
// ============================================================================

export interface DatabaseStatsResult {
  totalConnections?: number
  activeConnections?: number
  idleConnections?: number
}

// ============================================================================
// 查询参数类型
// ============================================================================

export interface DateRangeParams {
  startDate: Date
  endDate: Date
}

export interface UserQueryParams {
  userId: string
}

export interface AccountQueryParams extends UserQueryParams {
  accountId: string
}

export interface CategoryQueryParams extends UserQueryParams {
  categoryId: string
  timeRange?: 'lastYear' | 'all'
}

// ============================================================================
// 通用查询结果类型
// ============================================================================

export interface QueryResult<T> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// 数据库连接相关类型
// ============================================================================

export interface ConnectionTestResult {
  connected: boolean
  responseTime: number
  error?: string
}
