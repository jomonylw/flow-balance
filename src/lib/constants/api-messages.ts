/**
 * API 错误消息常量
 * 统一管理所有 API 返回的错误消息，支持国际化
 */

// ============================================================================
// 通用错误消息
// ============================================================================

export const COMMON_ERRORS = {
  UNAUTHORIZED: '未授权访问',
  FORBIDDEN: '权限不足',
  NOT_FOUND: '资源不存在',
  INTERNAL_ERROR: '服务器内部错误',
  INVALID_REQUEST: '请求数据格式错误',
  VALIDATION_FAILED: '数据验证失败',
} as const

// ============================================================================
// 账户相关错误消息
// ============================================================================

export const ACCOUNT_ERRORS = {
  NOT_FOUND: '账户不存在',
  ALREADY_EXISTS: '账户已存在',
  INVALID_TYPE: '账户类型无效',
  CANNOT_DELETE: '账户无法删除',
  HAS_TRANSACTIONS: '账户存在交易记录，无法删除',
  HAS_BALANCE: '账户存在余额，无法删除',
  CLEAR_FAILED: '清空失败',
  CLEAR_BALANCE_FAILED: '清空失败：余额记录存在关联数据，请先删除相关记录',
  CLEAR_TRANSACTIONS_FAILED: '清空失败：交易记录存在关联数据，请先删除相关记录',
  GET_DETAILS_FAILED: '获取账户详情失败',
  CREATE_FAILED: '创建账户失败',
  UPDATE_FAILED: '更新账户失败',
  DELETE_FAILED: '删除账户失败',
} as const

// ============================================================================
// 交易相关错误消息
// ============================================================================

export const TRANSACTION_ERRORS = {
  NOT_FOUND: '交易不存在',
  INVALID_TYPE: '交易类型无效',
  INVALID_AMOUNT: '交易金额无效',
  INVALID_DATE: '交易日期无效',
  ACCOUNT_NOT_FOUND: '关联账户不存在',
  CURRENCY_NOT_FOUND: '货币不存在',
  CREATE_FAILED: '创建交易失败',
  UPDATE_FAILED: '更新交易失败',
  DELETE_FAILED: '删除交易失败',
  BATCH_CREATE_FAILED: '批量创建交易失败',
  VALIDATION_FAILED: '交易数据验证失败',
} as const

// ============================================================================
// 货币相关错误消息
// ============================================================================

export const CURRENCY_ERRORS = {
  NOT_FOUND: '货币不存在',
  ALREADY_EXISTS: '货币已存在',
  INVALID_CODE: '货币代码无效',
  INVALID_SYMBOL: '货币符号无效',
  IN_USE: '货币正在使用中，无法删除',
  CREATE_FAILED: '创建货币失败',
  UPDATE_FAILED: '更新货币失败',
  DELETE_FAILED: '删除货币失败',
} as const

// ============================================================================
// 汇率相关错误消息
// ============================================================================

export const EXCHANGE_RATE_ERRORS = {
  NOT_FOUND: '汇率不存在',
  INVALID_RATE: '汇率值无效',
  INVALID_DATE: '汇率日期无效',
  SAME_CURRENCY: '源货币和目标货币不能相同',
  ALREADY_EXISTS: '该日期的汇率已存在',
  CREATE_FAILED: '创建汇率失败',
  UPDATE_FAILED: '更新汇率失败',
  DELETE_FAILED: '删除汇率失败',
  AUTO_UPDATE_FAILED: '自动更新汇率失败',
} as const

// ============================================================================
// 用户设置相关错误消息
// ============================================================================

export const USER_SETTINGS_ERRORS = {
  NOT_FOUND: '用户设置不存在',
  INVALID_LANGUAGE: '语言设置无效',
  INVALID_THEME: '主题设置无效',
  INVALID_CURRENCY: '基础货币设置无效',
  UPDATE_FAILED: '更新用户设置失败',
} as const

// ============================================================================
// 标签相关错误消息
// ============================================================================

export const TAG_ERRORS = {
  NOT_FOUND: '标签不存在',
  ALREADY_EXISTS: '标签已存在',
  INVALID_NAME: '标签名称无效',
  INVALID_COLOR: '标签颜色无效',
  IN_USE: '标签正在使用中，无法删除',
  CREATE_FAILED: '创建标签失败',
  UPDATE_FAILED: '更新标签失败',
  DELETE_FAILED: '删除标签失败',
} as const

// ============================================================================
// 分类相关错误消息
// ============================================================================

export const CATEGORY_ERRORS = {
  NOT_FOUND: '分类不存在',
  ALREADY_EXISTS: '分类已存在',
  INVALID_TYPE: '分类类型无效',
  INVALID_NAME: '分类名称无效',
  HAS_ACCOUNTS: '分类下存在账户，无法删除',
  CREATE_FAILED: '创建分类失败',
  UPDATE_FAILED: '更新分类失败',
  DELETE_FAILED: '删除分类失败',
} as const

// ============================================================================
// 定期交易相关错误消息
// ============================================================================

export const RECURRING_TRANSACTION_ERRORS = {
  NOT_FOUND: '定期交易不存在',
  INVALID_FREQUENCY: '重复频率无效',
  INVALID_DATE_RANGE: '日期范围无效',
  INVALID_AMOUNT: '交易金额无效',
  ACCOUNT_NOT_FOUND: '关联账户不存在',
  CREATE_FAILED: '创建定期交易失败',
  UPDATE_FAILED: '更新定期交易失败',
  DELETE_FAILED: '删除定期交易失败',
  EXECUTE_FAILED: '执行定期交易失败',
} as const

// ============================================================================
// 贷款合同相关错误消息
// ============================================================================

export const LOAN_CONTRACT_ERRORS = {
  NOT_FOUND: '贷款合同不存在',
  INVALID_AMOUNT: '贷款金额无效',
  INVALID_RATE: '利率无效',
  INVALID_TERM: '贷款期限无效',
  INVALID_TYPE: '还款类型无效',
  ACCOUNT_NOT_FOUND: '关联账户不存在',
  CREATE_FAILED: '创建贷款合同失败',
  UPDATE_FAILED: '更新贷款合同失败',
  DELETE_FAILED: '删除贷款合同失败',
  CALCULATE_FAILED: '计算还款计划失败',
} as const

// ============================================================================
// 导出所有错误消息
// ============================================================================

export const API_MESSAGES = {
  COMMON: COMMON_ERRORS,
  ACCOUNT: ACCOUNT_ERRORS,
  TRANSACTION: TRANSACTION_ERRORS,
  CURRENCY: CURRENCY_ERRORS,
  EXCHANGE_RATE: EXCHANGE_RATE_ERRORS,
  USER_SETTINGS: USER_SETTINGS_ERRORS,
  TAG: TAG_ERRORS,
  CATEGORY: CATEGORY_ERRORS,
  RECURRING_TRANSACTION: RECURRING_TRANSACTION_ERRORS,
  LOAN_CONTRACT: LOAN_CONTRACT_ERRORS,
} as const

// ============================================================================
// 类型定义
// ============================================================================

export type ApiMessageKey = keyof typeof API_MESSAGES
export type CommonErrorKey = keyof typeof COMMON_ERRORS
export type AccountErrorKey = keyof typeof ACCOUNT_ERRORS
export type TransactionErrorKey = keyof typeof TRANSACTION_ERRORS
export type CurrencyErrorKey = keyof typeof CURRENCY_ERRORS
export type ExchangeRateErrorKey = keyof typeof EXCHANGE_RATE_ERRORS
export type UserSettingsErrorKey = keyof typeof USER_SETTINGS_ERRORS
export type TagErrorKey = keyof typeof TAG_ERRORS
export type CategoryErrorKey = keyof typeof CATEGORY_ERRORS
export type RecurringTransactionErrorKey =
  keyof typeof RECURRING_TRANSACTION_ERRORS
export type LoanContractErrorKey = keyof typeof LOAN_CONTRACT_ERRORS

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取错误消息
 */
export function getErrorMessage(category: ApiMessageKey, key: string): string {
  const messages = API_MESSAGES[category] as Record<string, string>
  return messages[key] || COMMON_ERRORS.INTERNAL_ERROR
}

/**
 * 获取通用错误消息
 */
export function getCommonError(key: CommonErrorKey): string {
  return COMMON_ERRORS[key]
}

/**
 * 获取账户错误消息
 */
export function getAccountError(key: AccountErrorKey): string {
  return ACCOUNT_ERRORS[key]
}

/**
 * 获取交易错误消息
 */
export function getTransactionError(key: TransactionErrorKey): string {
  return TRANSACTION_ERRORS[key]
}

/**
 * 获取货币错误消息
 */
export function getCurrencyError(key: CurrencyErrorKey): string {
  return CURRENCY_ERRORS[key]
}

/**
 * 获取汇率错误消息
 */
export function getExchangeRateError(key: ExchangeRateErrorKey): string {
  return EXCHANGE_RATE_ERRORS[key]
}

/**
 * 获取用户设置错误消息
 */
export function getUserSettingsError(key: UserSettingsErrorKey): string {
  return USER_SETTINGS_ERRORS[key]
}

/**
 * 获取标签错误消息
 */
export function getTagError(key: TagErrorKey): string {
  return TAG_ERRORS[key]
}

/**
 * 获取分类错误消息
 */
export function getCategoryError(key: CategoryErrorKey): string {
  return CATEGORY_ERRORS[key]
}

/**
 * 获取定期交易错误消息
 */
export function getRecurringTransactionError(
  key: RecurringTransactionErrorKey
): string {
  return RECURRING_TRANSACTION_ERRORS[key]
}

/**
 * 获取贷款合同错误消息
 */
export function getLoanContractError(key: LoanContractErrorKey): string {
  return LOAN_CONTRACT_ERRORS[key]
}
