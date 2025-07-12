/**
 * API 端点常量管理
 * 统一管理所有 API 端点，避免硬编码 URL
 */

/** API 基础路径 */
export const API_BASE = '/api'

/** 认证相关端点 */
export const AUTH_ENDPOINTS = {
  ME: `${API_BASE}/auth/me`,
  LOGIN: `${API_BASE}/auth/login`,
  LOGOUT: `${API_BASE}/auth/logout`,
  REGISTER: `${API_BASE}/auth/signup`,
  REQUEST_PASSWORD_RESET: `${API_BASE}/auth/request-password-reset`,
  RESET_PASSWORD: `${API_BASE}/auth/reset-password`,
  VERIFY_RECOVERY_KEY: `${API_BASE}/auth/verify-recovery-key`,
  RESET_PASSWORD_WITH_KEY: `${API_BASE}/auth/reset-password-with-key`,
} as const

/** 用户相关端点 */
export const USER_ENDPOINTS = {
  PROFILE: `${API_BASE}/user/profile`,
  SETTINGS: `${API_BASE}/user/settings`,
  CURRENCIES: `${API_BASE}/user/currencies`,
  CURRENCIES_DELETE: (currencyCodeOrId: string) =>
    `${API_BASE}/user/currencies/${currencyCodeOrId}`,
  DELETE: `${API_BASE}/user/delete`,
  CHANGE_PASSWORD: `${API_BASE}/user/change-password`,
  RECOVERY_KEY: `${API_BASE}/user/recovery-key`,
} as const

/** 账户相关端点 */
export const ACCOUNT_ENDPOINTS = {
  LIST: `${API_BASE}/accounts`,
  BALANCES: `${API_BASE}/accounts/balances`,
  CREATE: `${API_BASE}/accounts`,
  DETAIL: (id: string) => `${API_BASE}/accounts/${id}`,
  UPDATE: (id: string) => `${API_BASE}/accounts/${id}`,
  DELETE: (id: string) => `${API_BASE}/accounts/${id}`,
  TRANSACTIONS: (id: string) => `${API_BASE}/accounts/${id}/transactions`,
} as const

/** 分类相关端点 */
export const CATEGORY_ENDPOINTS = {
  LIST: `${API_BASE}/categories`,
  CREATE: `${API_BASE}/categories`,
  DETAIL: (id: string) => `${API_BASE}/categories/${id}`,
  UPDATE: (id: string) => `${API_BASE}/categories/${id}`,
  DELETE: (id: string) => `${API_BASE}/categories/${id}`,
  SUMMARY: (id: string) => `${API_BASE}/categories/${id}/summary`,
  TREE: `${API_BASE}/categories/tree`,
} as const

/** 交易相关端点 */
export const TRANSACTION_ENDPOINTS = {
  LIST: `${API_BASE}/transactions`,
  CREATE: `${API_BASE}/transactions`,
  DETAIL: (id: string) => `${API_BASE}/transactions/${id}`,
  UPDATE: (id: string) => `${API_BASE}/transactions/${id}`,
  DELETE: (id: string) => `${API_BASE}/transactions/${id}`,
  STATS: `${API_BASE}/transactions/stats`,
  TEMPLATES: `${API_BASE}/transaction-templates`,
} as const

/** 标签相关端点 */
export const TAG_ENDPOINTS = {
  LIST: `${API_BASE}/tags`,
  CREATE: `${API_BASE}/tags`,
  DETAIL: (id: string) => `${API_BASE}/tags/${id}`,
  UPDATE: (id: string) => `${API_BASE}/tags/${id}`,
  DELETE: (id: string) => `${API_BASE}/tags/${id}`,
} as const

/** 货币相关端点 */
export const CURRENCY_ENDPOINTS = {
  LIST: `${API_BASE}/currencies`,
  EXCHANGE_RATES: `${API_BASE}/exchange-rates`, // 修复汇率API端点
  UPDATE_RATES: `${API_BASE}/exchange-rates/auto-update`, // 修复汇率更新端点
  DETAIL: (code: string) => `${API_BASE}/currencies/${code}`,
  CUSTOM_CREATE: `${API_BASE}/currencies/custom`,
  CUSTOM_UPDATE: (currencyCode: string) =>
    `${API_BASE}/currencies/custom/${currencyCode}`,
  CUSTOM_DELETE: (currencyCode: string) =>
    `${API_BASE}/currencies/custom/${currencyCode}`,
} as const

/** 仪表板相关端点 */
export const DASHBOARD_ENDPOINTS = {
  SUMMARY: `${API_BASE}/dashboard/summary`,
  // 图表端点
  NET_WORTH_CHART: `${API_BASE}/dashboard/charts/net-worth`,
  CASH_FLOW_CHART: `${API_BASE}/dashboard/charts/cash-flow`,
  // 其他图表端点（预留）
  BALANCE_SHEET: `${API_BASE}/dashboard/charts/balance-sheet`,
  NET_WORTH_TREND: `${API_BASE}/dashboard/charts/net-worth-trend`,
  MONTHLY_SUMMARY: `${API_BASE}/dashboard/charts/monthly-summary`,
} as const

/** 报表相关端点 */
export const REPORT_ENDPOINTS = {
  BALANCE_SHEET: `${API_BASE}/reports/balance-sheet`,
  INCOME_STATEMENT: `${API_BASE}/reports/income-statement`,
  CASH_FLOW: `${API_BASE}/reports/cash-flow`,
  EXPORT: `${API_BASE}/reports/export`,
} as const

/** 同步相关端点 */
export const SYNC_ENDPOINTS = {
  STATUS: `${API_BASE}/sync/status`,
  CHECK: `${API_BASE}/sync/check`,
  TRIGGER: `${API_BASE}/sync/trigger`,
  SUMMARY: `${API_BASE}/sync/summary`,
} as const

/** 系统相关端点 */
export const SYSTEM_ENDPOINTS = {
  HEALTH: `${API_BASE}/health`,
  VERSION: `${API_BASE}/version`,
  BACKUP: `${API_BASE}/system/backup`,
  RESTORE: `${API_BASE}/system/restore`,
} as const

/** 外部 API 端点 */
export const EXTERNAL_ENDPOINTS = {
  FRANKFURTER_BASE: 'https://api.frankfurter.dev/v1',
  FRANKFURTER_LATEST: (base: string) =>
    `https://api.frankfurter.dev/v1/latest?base=${base}`,
  FRANKFURTER_CURRENCIES: 'https://api.frankfurter.dev/v1/currencies',
} as const

/** 所有端点的联合类型 */
export type ApiEndpoint =
  | (typeof AUTH_ENDPOINTS)[keyof typeof AUTH_ENDPOINTS]
  | (typeof USER_ENDPOINTS)[keyof typeof USER_ENDPOINTS]
  | (typeof ACCOUNT_ENDPOINTS)[keyof typeof ACCOUNT_ENDPOINTS]
  | (typeof CATEGORY_ENDPOINTS)[keyof typeof CATEGORY_ENDPOINTS]
  | (typeof TRANSACTION_ENDPOINTS)[keyof typeof TRANSACTION_ENDPOINTS]
  | (typeof TAG_ENDPOINTS)[keyof typeof TAG_ENDPOINTS]
  | (typeof CURRENCY_ENDPOINTS)[keyof typeof CURRENCY_ENDPOINTS]
  | (typeof DASHBOARD_ENDPOINTS)[keyof typeof DASHBOARD_ENDPOINTS]
  | (typeof REPORT_ENDPOINTS)[keyof typeof REPORT_ENDPOINTS]
  | (typeof SYNC_ENDPOINTS)[keyof typeof SYNC_ENDPOINTS]
  | (typeof SYSTEM_ENDPOINTS)[keyof typeof SYSTEM_ENDPOINTS]

/** API 端点工具函数 */
export class ApiEndpoints {
  /** 获取认证端点 */
  static auth = AUTH_ENDPOINTS

  /** 获取用户端点 */
  static user = USER_ENDPOINTS

  /** 获取账户端点 */
  static account = ACCOUNT_ENDPOINTS

  /** 获取分类端点 */
  static category = CATEGORY_ENDPOINTS

  /** 获取交易端点 */
  static transaction = TRANSACTION_ENDPOINTS

  /** 获取标签端点 */
  static tag = TAG_ENDPOINTS

  /** 获取货币端点 */
  static currency = CURRENCY_ENDPOINTS

  /** 获取仪表板端点 */
  static dashboard = DASHBOARD_ENDPOINTS

  /** 获取报表端点 */
  static report = REPORT_ENDPOINTS

  /** 获取同步端点 */
  static sync = SYNC_ENDPOINTS

  /** 获取系统端点 */
  static system = SYSTEM_ENDPOINTS

  /** 获取外部端点 */
  static external = EXTERNAL_ENDPOINTS

  /** 构建查询参数 */
  static buildQuery(
    params: Record<string, string | number | boolean | undefined>
  ): string {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })

    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ''
  }

  /** 构建完整的 URL */
  static buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const query = params ? this.buildQuery(params) : ''
    return `${endpoint}${query}`
  }

  /** 检查是否为认证相关的端点 */
  static isAuthEndpoint(url: string): boolean {
    return Object.values(AUTH_ENDPOINTS).some(endpoint =>
      url.includes(endpoint)
    )
  }

  /** 检查是否为公开端点（不需要认证） */
  static isPublicEndpoint(url: string): boolean {
    const publicEndpoints = [
      AUTH_ENDPOINTS.LOGIN,
      AUTH_ENDPOINTS.REGISTER,
      SYSTEM_ENDPOINTS.HEALTH,
      SYSTEM_ENDPOINTS.VERSION,
    ]
    return publicEndpoints.some(endpoint => url.includes(endpoint))
  }
}

export default ApiEndpoints
