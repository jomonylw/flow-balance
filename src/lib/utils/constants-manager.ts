/**
 * 常量管理器
 * 提供统一的常量访问和验证方法
 */

import {
  AccountType,
  TransactionType,
  Theme,
  Language,
  SortOrder,
  ExportFormat,
  ACCOUNT_TYPE_CONFIGS,
  CURRENCY_SYMBOLS,
  COMMON_CURRENCIES,
  CHART_COLOR_SEQUENCE,
  STOCK_ACCOUNT_TYPES,
  FLOW_ACCOUNT_TYPES,
  isStockAccountType,
  isFlowAccountType,
  isValidAccountType,
  isValidTransactionType,
  isValidTheme,
  isValidLanguage,
  convertPrismaAccountType,
  convertPrismaTransactionType,
  convertPrismaLanguage,
  convertPrismaTheme,
  type AccountTypeConfig,
} from '@/types/core/constants'

/**
 * 常量管理器类
 * 提供类型安全的常量访问方法
 */
export class ConstantsManager {
  // ============================================================================
  // 账户类型相关
  // ============================================================================

  /**
   * 获取所有账户类型配置
   */
  static getAccountTypeConfigs(): AccountTypeConfig[] {
    return Object.values(ACCOUNT_TYPE_CONFIGS)
  }

  /**
   * 根据账户类型获取配置
   */
  static getAccountTypeConfig(type: AccountType): AccountTypeConfig | null {
    return ACCOUNT_TYPE_CONFIGS[type] || null
  }

  /**
   * 获取存量账户类型
   */
  static getStockAccountTypes(): readonly AccountType[] {
    return STOCK_ACCOUNT_TYPES
  }

  /**
   * 获取流量账户类型
   */
  static getFlowAccountTypes(): readonly AccountType[] {
    return FLOW_ACCOUNT_TYPES
  }

  /**
   * 检查是否为存量账户类型
   */
  static isStockAccount(type: string): boolean {
    return isStockAccountType(type)
  }

  /**
   * 检查是否为流量账户类型
   */
  static isFlowAccount(type: string): boolean {
    return isFlowAccountType(type)
  }

  // ============================================================================
  // 货币相关
  // ============================================================================

  /**
   * 获取货币符号
   */
  static getCurrencySymbol(currencyCode: string): string {
    return CURRENCY_SYMBOLS[currencyCode as keyof typeof CURRENCY_SYMBOLS] || currencyCode
  }

  /**
   * 获取常用货币列表
   */
  static getCommonCurrencies(): readonly string[] {
    return COMMON_CURRENCIES
  }

  /**
   * 检查是否为支持的货币
   */
  static isSupportedCurrency(currencyCode: string): boolean {
    return currencyCode in CURRENCY_SYMBOLS
  }

  /**
   * 获取所有支持的货币代码
   */
  static getSupportedCurrencies(): string[] {
    return Object.keys(CURRENCY_SYMBOLS)
  }

  // ============================================================================
  // 颜色相关
  // ============================================================================

  /**
   * 获取图表颜色序列
   */
  static getChartColors(): readonly string[] {
    return CHART_COLOR_SEQUENCE
  }

  /**
   * 根据索引获取图表颜色
   */
  static getChartColor(index: number): string {
    return CHART_COLOR_SEQUENCE[index % CHART_COLOR_SEQUENCE.length]
  }

  /**
   * 获取账户类型默认颜色
   */
  static getAccountTypeColor(type: AccountType): string {
    const config = this.getAccountTypeConfig(type)
    return config?.defaultColor || '#6b7280'
  }

  // ============================================================================
  // 验证方法
  // ============================================================================

  /**
   * 验证账户类型
   */
  static validateAccountType(type: string): AccountType | null {
    return isValidAccountType(type) ? (type as AccountType) : null
  }

  /**
   * 验证交易类型
   */
  static validateTransactionType(type: string): TransactionType | null {
    return isValidTransactionType(type) ? (type as TransactionType) : null
  }

  /**
   * 验证主题
   */
  static validateTheme(theme: string): Theme | null {
    return isValidTheme(theme) ? (theme as Theme) : null
  }

  /**
   * 验证语言
   */
  static validateLanguage(language: string): Language | null {
    return isValidLanguage(language) ? (language as Language) : null
  }

  // ============================================================================
  // 枚举转换方法
  // ============================================================================

  /**
   * 获取所有账户类型枚举值
   */
  static getAllAccountTypes(): AccountType[] {
    return Object.values(AccountType)
  }

  /**
   * 获取所有交易类型枚举值
   */
  static getAllTransactionTypes(): TransactionType[] {
    return Object.values(TransactionType)
  }

  /**
   * 获取所有主题枚举值
   */
  static getAllThemes(): Theme[] {
    return Object.values(Theme)
  }

  /**
   * 获取所有语言枚举值
   */
  static getAllLanguages(): Language[] {
    return Object.values(Language)
  }

  /**
   * 获取所有排序顺序枚举值
   */
  static getAllSortOrders(): SortOrder[] {
    return Object.values(SortOrder)
  }

  /**
   * 获取所有导出格式枚举值
   */
  static getAllExportFormats(): ExportFormat[] {
    return Object.values(ExportFormat)
  }

  // ============================================================================
  // 业务逻辑辅助方法
  // ============================================================================

  /**
   * 根据账户类型获取适用的交易类型
   */
  static getValidTransactionTypes(accountType: AccountType): TransactionType[] {
    if (this.isStockAccount(accountType)) {
      // 存量账户支持所有交易类型
      return [TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.BALANCE]
    } else {
      // 流量账户只支持收入和支出
      return [TransactionType.INCOME, TransactionType.EXPENSE]
    }
  }

  /**
   * 检查交易类型是否适用于账户类型
   */
  static isValidTransactionForAccount(
    transactionType: TransactionType,
    accountType: AccountType
  ): boolean {
    const validTypes = this.getValidTransactionTypes(accountType)
    return validTypes.includes(transactionType)
  }

  /**
   * 获取账户类型的统计方法描述键
   */
  static getAccountTypeStatsKey(accountType: AccountType): string {
    return this.isStockAccount(accountType) 
      ? 'category.settings.stock.statistics'
      : 'category.settings.flow.statistics'
  }

  // ============================================================================
  // 配置生成方法
  // ============================================================================

  /**
   * 生成 Zod 枚举配置
   */
  static getZodAccountTypeEnum(): [AccountType, ...AccountType[]] {
    const types = this.getAllAccountTypes()
    return [types[0], ...types.slice(1)]
  }

  /**
   * 生成 Zod 交易类型枚举配置
   */
  static getZodTransactionTypeEnum(): [TransactionType, ...TransactionType[]] {
    const types = this.getAllTransactionTypes()
    return [types[0], ...types.slice(1)]
  }

  /**
   * 生成 Zod 主题枚举配置
   */
  static getZodThemeEnum(): [Theme, ...Theme[]] {
    const themes = this.getAllThemes()
    return [themes[0], ...themes.slice(1)]
  }

  /**
   * 生成 Zod 语言枚举配置
   */
  static getZodLanguageEnum(): [Language, ...Language[]] {
    const languages = this.getAllLanguages()
    return [languages[0], ...languages.slice(1)]
  }

  /**
   * 生成 Zod 排序顺序枚举配置
   */
  static getZodSortOrderEnum(): [SortOrder, ...SortOrder[]] {
    const orders = this.getAllSortOrders()
    return [orders[0], ...orders.slice(1)]
  }

  /**
   * 生成 Zod 导出格式枚举配置
   */
  static getZodExportFormatEnum(): [ExportFormat, ...ExportFormat[]] {
    const formats = this.getAllExportFormats()
    return [formats[0], ...formats.slice(1)]
  }

  // ============================================================================
  // Prisma 类型转换方法
  // ============================================================================

  /**
   * 转换 Prisma AccountType 到我们的 AccountType
   */
  static convertPrismaAccountType(prismaType: string): AccountType {
    return convertPrismaAccountType(prismaType)
  }

  /**
   * 转换 Prisma TransactionType 到我们的 TransactionType
   */
  static convertPrismaTransactionType(prismaType: string): TransactionType {
    return convertPrismaTransactionType(prismaType)
  }

  /**
   * 转换 Prisma Language 到我们的 Language
   */
  static convertPrismaLanguage(prismaLang: string): Language {
    return convertPrismaLanguage(prismaLang)
  }

  /**
   * 转换 Prisma Theme 到我们的 Theme
   */
  static convertPrismaTheme(prismaTheme: string): Theme {
    return convertPrismaTheme(prismaTheme)
  }

  // ============================================================================
  // 安全转换方法（不抛出异常）
  // ============================================================================

  /**
   * 安全转换语言 - 如果转换失败返回默认值
   */
  static safeConvertLanguage(language: string): Language {
    try {
      return this.convertPrismaLanguage(language)
    } catch {
      return Language.ZH // 默认中文
    }
  }

  /**
   * 安全转换主题 - 如果转换失败返回默认值
   */
  static safeConvertTheme(theme: string): Theme {
    try {
      return this.convertPrismaTheme(theme)
    } catch {
      return Theme.SYSTEM // 默认系统主题
    }
  }

  /**
   * 安全转换账户类型 - 如果转换失败返回原值
   */
  static safeConvertAccountType(type: string): AccountType | string {
    try {
      return this.convertPrismaAccountType(type)
    } catch {
      return type
    }
  }

  /**
   * 安全转换交易类型 - 如果转换失败返回原值
   */
  static safeConvertTransactionType(type: string): TransactionType | string {
    try {
      return this.convertPrismaTransactionType(type)
    } catch {
      return type
    }
  }
}
