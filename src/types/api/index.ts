/**
 * API 相关类型定义
 * 统一管理 API 请求、响应和错误处理类型
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  AccountType,
  TransactionType,
  Language,
  Theme,
} from '@/types/core/constants'
import type {
  User,
  Account,
  Category,
  Transaction,
  Currency,
  Tag,
  ExchangeRate,
  Balance,
  TrendDataPoint,
  MonthlySummaryData,
  CategorySummaryBase,
} from '@/types/core'

// ============================================================================
// 基础 API 类型
// ============================================================================

/** API 响应基础结构 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  details?: unknown
}

/** API 成功响应 */
export interface ApiSuccessResponse<T = unknown> extends ApiResponse<T> {
  success: true
  data: T
  message?: string
}

/** API 错误响应 */
export interface ApiErrorResponse extends ApiResponse<never> {
  success: false
  error: string
  details?: unknown
}

/** 分页参数 */
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/** 排序参数 */
export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/** 筛选参数基础类型 */
export interface FilterParams {
  search?: string
  startDate?: string
  endDate?: string
}

// ============================================================================
// API 上下文和中间件类型
// ============================================================================

/** API 请求上下文 */
export interface ApiContext {
  user: User
  startTime: number
  requestId: string
}

/** API 处理函数类型 */
export interface ApiHandler {
  (request: NextRequest, context: ApiContext): Promise<NextResponse>
}

/** 验证 Schema 类型 */
export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object'
    required?: boolean
    min?: number
    max?: number
    pattern?: RegExp
    enum?: readonly string[]
  }
}

// ============================================================================
// API 路由参数类型
// ============================================================================

/** 通用路由参数类型 */
export interface RouteParams<
  T extends Record<string, string> = Record<string, string>,
> {
  params: Promise<T>
}

/** 货币代码路由参数 */
export type CurrencyCodeRouteParams = RouteParams<{ currencyCode: string }>

/** 账户ID路由参数 */
export type AccountIdRouteParams = RouteParams<{ accountId: string }>

/** 分类ID路由参数 */
export type CategoryIdRouteParams = RouteParams<{ categoryId: string }>

/** 交易ID路由参数 */
export type TransactionIdRouteParams = RouteParams<{ transactionId: string }>

/** 标签ID路由参数 */
export type TagIdRouteParams = RouteParams<{ tagId: string }>

// ============================================================================
// 具体 API 端点类型
// ============================================================================

// 用户相关 API
export type UserProfileResponse = ApiSuccessResponse<User>

export interface UserSettingsUpdateRequest {
  baseCurrencyCode?: string
  language?: Language
  theme?: Theme
}

// 账户相关 API
export type AccountListResponse = ApiSuccessResponse<Account[]>

export type AccountDetailResponse = ApiSuccessResponse<Account>

export interface AccountCreateRequest {
  name: string
  description?: string
  color?: string
  currencyCode: string
  categoryId: string
}

export type AccountUpdateRequest = Partial<AccountCreateRequest>

export type AccountBalancesResponse = ApiSuccessResponse<{
  balances: Record<string, Balance>
  conversionResults: Array<{
    accountId: string
    balances: Balance[]
    convertedBalances: Array<{
      currencyCode: string
      amount: number
      convertedAmount: number
      hasConversionError: boolean
    }>
  }>
}>

// 分类相关 API
export type CategoryListResponse = ApiSuccessResponse<Category[]>

export type CategoryDetailResponse = ApiSuccessResponse<Category>

export interface CategoryCreateRequest {
  name: string
  type: AccountType
  icon?: string
  color?: string
  description?: string
  parentId?: string
}

export type CategoryUpdateRequest = Partial<CategoryCreateRequest>

export type CategorySummaryResponse = ApiSuccessResponse<CategorySummaryBase>

// 交易相关 API
export interface TransactionListParams
  extends PaginationParams,
    SortParams,
    FilterParams {
  accountId?: string
  categoryId?: string
  type?: TransactionType
  tagIds?: string[]
}

export type TransactionListResponse = ApiSuccessResponse<
  PaginatedResponse<Transaction>
>

export type TransactionDetailResponse = ApiSuccessResponse<Transaction>

export interface TransactionCreateRequest {
  accountId: string
  currencyCode: string
  type: TransactionType
  amount: number
  description: string
  notes?: string
  date: string
  tagIds?: string[]
}

export type TransactionUpdateRequest = Partial<TransactionCreateRequest>

/** API 响应中的交易数据 */
export interface ApiTransaction {
  type: TransactionType
  amount: number | string
  date: string
  notes?: string | null
  currency?: {
    code: string
    symbol: string
    name: string
  }
}

export type TransactionStatsResponse = ApiSuccessResponse<{
  totalIncome: number
  totalExpense: number
  netAmount: number
  transactionCount: number
  currencyCode: string
}>

// 货币相关 API
export type CurrencyListResponse = ApiSuccessResponse<Currency[]>

export type ExchangeRateListResponse = ApiSuccessResponse<ExchangeRate[]>

export interface ExchangeRateCreateRequest {
  fromCurrency: string
  toCurrency: string
  rate: number
  date: string
}

// 标签相关 API
export type TagListResponse = ApiSuccessResponse<Tag[]>

export interface TagCreateRequest {
  name: string
  color?: string
}

export type TagUpdateRequest = Partial<TagCreateRequest>

// 图表和统计相关 API
export type TrendChartResponse = ApiSuccessResponse<TrendDataPoint[]>

export type MonthlySummaryChartResponse = ApiSuccessResponse<
  MonthlySummaryData[]
>

export type DashboardSummaryResponse = ApiSuccessResponse<{
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  monthlyIncome: number
  monthlyExpense: number
  monthlyNet: number
  currencyCode: string
}>

// 树状结构 API
export interface TreeStructureNode {
  id: string
  name: string
  type: 'category' | 'account'
  categoryType?: AccountType
  color?: string
  currencyCode?: string
  children?: TreeStructureNode[]
  summary?: {
    balance?: number
    transactionCount?: number
    currencyCode?: string
  }
}

export type TreeStructureResponse = ApiSuccessResponse<TreeStructureNode[]>

/** 分类树结构（包含子分类和账户） */
export interface CategoryWithChildren {
  id: string
  userId: string
  name: string
  parentId: string | null
  type: AccountType
  order: number
  createdAt: Date
  updatedAt: Date
  children: CategoryWithChildren[]
  accounts: TreeAccountInfo[]
}

/** 树结构中的账户信息 */
export interface TreeAccountInfo {
  id: string
  name: string
  description: string | null
  color: string | null
  currencyCode: string
  categoryId: string
  category: {
    id: string
    name: string
    type: AccountType
  }
}

// ============================================================================
// 错误类型
// ============================================================================

/** API 错误类型 */
export type ApiErrorType =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'CONFLICT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INTERNAL_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'

/** 详细错误信息 */
export interface ApiErrorDetails {
  type: ApiErrorType
  field?: string
  code?: string
  context?: Record<string, unknown>
}

// ============================================================================
// 工具类型
// ============================================================================

/** 从 API 响应中提取数据类型 */
export type ExtractApiData<T> =
  T extends ApiSuccessResponse<infer U> ? U : never

/** 创建 API 响应类型的工具函数 */
export type CreateApiResponse<T> = ApiSuccessResponse<T>

/** 创建分页 API 响应类型的工具函数 */
export type CreatePaginatedApiResponse<T> = ApiSuccessResponse<
  PaginatedResponse<T>
>
