/**
 * 项目常量定义
 * 统一管理所有硬编码常量，避免魔法字符串
 */

// ============================================================================
// 业务类型枚举
// ============================================================================

/** 账户类型枚举 */
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY', 
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

/** 交易类型枚举 */
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  BALANCE = 'BALANCE'
}

/** 主题类型枚举 */
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

/** 语言类型枚举 */
export enum Language {
  ZH = 'zh',
  EN = 'en'
}

/** 加载状态枚举 */
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

/** 尺寸枚举 */
export enum Size {
  XS = 'xs',
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl'
}

/** 颜色变体枚举 */
export enum ColorVariant {
  DEFAULT = 'default',
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info'
}

/** 排序顺序枚举 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

/** 导出格式枚举 */
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  XLSX = 'xlsx'
}

// ============================================================================
// 业务常量
// ============================================================================

/** 存量账户类型 */
export const STOCK_ACCOUNT_TYPES = [AccountType.ASSET, AccountType.LIABILITY] as const

/** 流量账户类型 */
export const FLOW_ACCOUNT_TYPES = [AccountType.INCOME, AccountType.EXPENSE] as const

/** 所有账户类型 */
export const ALL_ACCOUNT_TYPES = Object.values(AccountType)

/** 所有交易类型 */
export const ALL_TRANSACTION_TYPES = Object.values(TransactionType)

/** 所有主题类型 */
export const ALL_THEMES = Object.values(Theme)

/** 所有语言类型 */
export const ALL_LANGUAGES = Object.values(Language)

// ============================================================================
// 默认颜色配置
// ============================================================================

/** 账户类型默认颜色映射 */
export const ACCOUNT_TYPE_COLORS = {
  [AccountType.ASSET]: '#3b82f6', // 蓝色
  [AccountType.LIABILITY]: '#f97316', // 橙色
  [AccountType.INCOME]: '#10b981', // 绿色
  [AccountType.EXPENSE]: '#ef4444', // 红色
} as const

/** 默认颜色 */
export const DEFAULT_COLOR = '#6b7280' // 灰色

// ============================================================================
// 货币相关常量
// ============================================================================

/** 常见货币符号映射 */
export const CURRENCY_SYMBOLS = {
  AUD: '$', // 澳大利亚元 | Australian Dollar
  BGN: 'лв', // 保加利亚列弗 | Bulgarian Lev
  BRL: 'R$', // 巴西雷亚尔 | Brazilian Real
  CAD: '$', // 加拿大元 | Canadian Dollar
  CHF: 'Fr.', // 瑞士法郎 | Swiss Franc
  CNY: '¥', // 人民币 | Chinese Renminbi Yuan
  CZK: 'Kč', // 捷克克朗 | Czech Koruna
  DKK: 'kr.', // 丹麦克朗 | Danish Krone
  EUR: '€', // 欧元 | Euro
  GBP: '£', // 英镑 | British Pound
  HKD: 'HK$', // 港币 | Hong Kong Dollar
  HUF: 'Ft', // 匈牙利福林 | Hungarian Forint
  IDR: 'Rp', // 印尼盾 | Indonesian Rupiah
  ILS: '₪', // 以色列新谢克尔 | Israeli New Sheqel
  INR: '₹', // 印度卢比 | Indian Rupee
  ISK: 'kr', // 冰岛克朗 | Icelandic Króna
  JPY: '¥', // 日元 | Japanese Yen
  KRW: '₩', // 韩元 | South Korean Won
  MXN: '$', // 墨西哥比索 | Mexican Peso
  MYR: 'RM', // 马来西亚林吉特 | Malaysian Ringgit
  NOK: 'kr', // 挪威克朗 | Norwegian Krone
  NZD: 'NZ$', // 新西兰元 | New Zealand Dollar
  PHP: '₱', // 菲律宾比索 | Philippine Peso
  PLN: 'zł', // 波兰兹罗提 | Polish Złoty
  RON: 'lei', // 罗马尼亚列伊 | Romanian Leu
  RUB: '₽', // 俄罗斯卢布 | Russian Ruble
  SEK: 'kr', // 瑞典克朗 | Swedish Krona
  SGD: 'S$', // 新加坡元 | Singapore Dollar
  THB: '฿', // 泰铢 | Thai Baht
  TRY: '₺', // 土耳其里拉 | Turkish Lira
  TWD: 'NT$', // 新台币 | Taiwan Dollar
  USD: '$', // 美元 | United States Dollar
  VND: '₫', // 越南盾 | Vietnamese Dong
  ZAR: 'R', // 南非兰特 | South African Rand
} as const

/** 常用货币代码 */
export const COMMON_CURRENCIES = ['USD', 'EUR', 'CNY', 'JPY', 'GBP'] as const

// ============================================================================
// UI 相关常量
// ============================================================================

/** 图表颜色序列 */
export const CHART_COLOR_SEQUENCE = [
  '#3b82f6', // 蓝色
  '#ef4444', // 红色
  '#10b981', // 绿色
  '#f97316', // 橙色
  '#8b5cf6', // 紫色
  '#84cc16', // 柠檬绿
  '#ec4899', // 粉色
  '#0891b2', // 天蓝
  '#1e40af', // 深蓝
  '#dc2626', // 深红
  '#059669', // 深绿
  '#ea580c', // 深橙
] as const

/** 缓存过期时间（毫秒） */
export const CACHE_EXPIRY_TIME = 5 * 60 * 1000 // 5分钟

// ============================================================================
// 类型守卫函数
// ============================================================================

/** 检查是否为存量账户类型 */
export function isStockAccountType(
  type: string
): type is AccountType.ASSET | AccountType.LIABILITY {
  return (STOCK_ACCOUNT_TYPES as readonly string[]).includes(type)
}

/** 检查是否为流量账户类型 */
export function isFlowAccountType(
  type: string
): type is AccountType.INCOME | AccountType.EXPENSE {
  return (FLOW_ACCOUNT_TYPES as readonly string[]).includes(type)
}

/** 检查是否为有效的账户类型 */
export function isValidAccountType(type: string): type is AccountType {
  return Object.values(AccountType).includes(type as AccountType)
}

/** 检查是否为有效的交易类型 */
export function isValidTransactionType(type: string): type is TransactionType {
  return Object.values(TransactionType).includes(type as TransactionType)
}

/** 检查是否为有效的主题 */
export function isValidTheme(theme: string): theme is Theme {
  return Object.values(Theme).includes(theme as Theme)
}

/** 检查是否为有效的语言 */
export function isValidLanguage(language: string): language is Language {
  return Object.values(Language).includes(language as Language)
}

// ============================================================================
// 账户类型配置
// ============================================================================

/** 账户类型配置接口 */
export interface AccountTypeConfig {
  value: AccountType
  labelKey: string
  descriptionKey: string
  colorClass: string
  defaultColor: string
}

/** 账户类型配置映射 */
export const ACCOUNT_TYPE_CONFIGS: Record<AccountType, AccountTypeConfig> = {
  [AccountType.ASSET]: {
    value: AccountType.ASSET,
    labelKey: 'category.type.asset',
    descriptionKey: 'category.settings.asset.description',
    colorClass: 'text-blue-600 dark:text-blue-400',
    defaultColor: ACCOUNT_TYPE_COLORS[AccountType.ASSET],
  },
  [AccountType.LIABILITY]: {
    value: AccountType.LIABILITY,
    labelKey: 'category.type.liability',
    descriptionKey: 'category.settings.liability.description',
    colorClass: 'text-red-600 dark:text-red-400',
    defaultColor: ACCOUNT_TYPE_COLORS[AccountType.LIABILITY],
  },
  [AccountType.INCOME]: {
    value: AccountType.INCOME,
    labelKey: 'category.type.income',
    descriptionKey: 'category.settings.income.description',
    colorClass: 'text-green-600 dark:text-green-400',
    defaultColor: ACCOUNT_TYPE_COLORS[AccountType.INCOME],
  },
  [AccountType.EXPENSE]: {
    value: AccountType.EXPENSE,
    labelKey: 'category.type.expense',
    descriptionKey: 'category.settings.expense.description',
    colorClass: 'text-orange-600 dark:text-orange-400',
    defaultColor: ACCOUNT_TYPE_COLORS[AccountType.EXPENSE],
  },
} as const

/** 获取账户类型配置数组 */
export const getAccountTypeConfigs = (): AccountTypeConfig[] => {
  return Object.values(ACCOUNT_TYPE_CONFIGS)
}

// ============================================================================
// Prisma 类型转换函数
// ============================================================================

/**
 * 将 Prisma 枚举转换为我们的常量枚举
 * 这解决了 Prisma 生成的枚举与我们的常量枚举类型不匹配的问题
 */

/** 转换 Prisma AccountType 到我们的 AccountType */
export function convertPrismaAccountType(prismaType: string): AccountType {
  switch (prismaType) {
    case 'ASSET':
      return AccountType.ASSET
    case 'LIABILITY':
      return AccountType.LIABILITY
    case 'INCOME':
      return AccountType.INCOME
    case 'EXPENSE':
      return AccountType.EXPENSE
    default:
      throw new Error(`Unknown account type: ${prismaType}`)
  }
}

/** 转换 Prisma TransactionType 到我们的 TransactionType */
export function convertPrismaTransactionType(prismaType: string): TransactionType {
  switch (prismaType) {
    case 'INCOME':
      return TransactionType.INCOME
    case 'EXPENSE':
      return TransactionType.EXPENSE
    case 'BALANCE':
      return TransactionType.BALANCE
    default:
      throw new Error(`Unknown transaction type: ${prismaType}`)
  }
}

/** 转换 Prisma Language 到我们的 Language */
export function convertPrismaLanguage(prismaLang: string): Language {
  switch (prismaLang) {
    case 'zh':
      return Language.ZH
    case 'en':
      return Language.EN
    default:
      throw new Error(`Unknown language: ${prismaLang}`)
  }
}

/** 转换 Prisma Theme 到我们的 Theme */
export function convertPrismaTheme(prismaTheme: string): Theme {
  switch (prismaTheme) {
    case 'light':
      return Theme.LIGHT
    case 'dark':
      return Theme.DARK
    case 'system':
      return Theme.SYSTEM
    default:
      throw new Error(`Unknown theme: ${prismaTheme}`)
  }
}
