/**
 * 应用配置常量管理
 * 统一管理应用级别的配置常量，避免硬编码配置值
 */

/** 应用基础信息 */
export const APP_INFO = {
  NAME: 'Flow Balance',
  VERSION: '1.0.0',
  DESCRIPTION: '个人财务管理系统',
  AUTHOR: 'Flow Balance Team',
  HOMEPAGE: 'https://flowbalance.app',
  REPOSITORY: 'https://github.com/flowbalance/app',
} as const

/** 分页配置 */
export const PAGINATION = {
  /** 默认每页条数 */
  DEFAULT_PAGE_SIZE: 20,
  /** 最小每页条数 */
  MIN_PAGE_SIZE: 5,
  /** 最大每页条数 */
  MAX_PAGE_SIZE: 100,
  /** 可选的每页条数 */
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,
} as const

/** 表单验证配置 */
export const VALIDATION = {
  /** 密码最小长度 */
  PASSWORD_MIN_LENGTH: 8,
  /** 密码最大长度 */
  PASSWORD_MAX_LENGTH: 128,
  /** 用户名最小长度 */
  USERNAME_MIN_LENGTH: 2,
  /** 用户名最大长度 */
  USERNAME_MAX_LENGTH: 50,
  /** 邮箱最大长度 */
  EMAIL_MAX_LENGTH: 254,
  /** 描述最大长度 */
  DESCRIPTION_MAX_LENGTH: 500,
  /** 备注最大长度 */
  NOTES_MAX_LENGTH: 1000,
  /** 账户名最大长度 */
  ACCOUNT_NAME_MAX_LENGTH: 100,
  /** 分类名最大长度 */
  CATEGORY_NAME_MAX_LENGTH: 100,
  /** 标签名最大长度 */
  TAG_NAME_MAX_LENGTH: 50,
  /** 交易金额最大值 */
  TRANSACTION_AMOUNT_MAX: 999999999.99,
  /** 交易金额最小值 */
  TRANSACTION_AMOUNT_MIN: 0.01,
  /** FIRE SWR 最小值 */
  FIRE_SWR_MIN: 1.0,
  /** FIRE SWR 最大值 */
  FIRE_SWR_MAX: 10.0,
  /** FIRE SWR 步长 */
  FIRE_SWR_STEP: 0.1,
  /** 未来数据天数最小值 */
  FUTURE_DATA_DAYS_MIN: 0,
  /** 未来数据天数最大值 */
  FUTURE_DATA_DAYS_MAX: 30,
  /** 未来数据天数步长 */
  FUTURE_DATA_DAYS_STEP: 1,
} as const

/** 缓存配置 */
export const CACHE = {
  /** 默认缓存时间（毫秒） */
  DEFAULT_TTL: 5 * 60 * 1000, // 5分钟
  /** 用户数据缓存时间 */
  USER_DATA_TTL: 10 * 60 * 1000, // 10分钟
  /** 汇率数据缓存时间 */
  EXCHANGE_RATE_TTL: 60 * 60 * 1000, // 1小时
  /** 图表数据缓存时间 */
  CHART_DATA_TTL: 2 * 60 * 1000, // 2分钟
  /** 静态数据缓存时间 */
  STATIC_DATA_TTL: 24 * 60 * 60 * 1000, // 24小时
} as const

/** 文件上传配置 */
export const FILE_UPLOAD = {
  /** 最大文件大小（字节） */
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  /** 允许的图片格式 */
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ] as const,
  /** 允许的文档格式 */
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
  ] as const,
  /** 头像最大尺寸 */
  AVATAR_MAX_SIZE: 1024 * 1024, // 1MB
} as const

/** 安全配置 */
export const SECURITY = {
  /** 会话超时时间（毫秒） */
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24小时
  /** 登录失败最大次数 */
  MAX_LOGIN_ATTEMPTS: 5,
  /** 登录锁定时间（毫秒） */
  LOGIN_LOCKOUT_TIME: 15 * 60 * 1000, // 15分钟
  /** CSRF Token 有效期 */
  CSRF_TOKEN_TTL: 60 * 60 * 1000, // 1小时
  /** API 请求频率限制（每分钟） */
  API_RATE_LIMIT: 100,
} as const

/** 通知配置 */
export const NOTIFICATION = {
  /** 默认显示时间（毫秒） */
  DEFAULT_DURATION: 4000,
  /** 成功通知显示时间 */
  SUCCESS_DURATION: 3000,
  /** 错误通知显示时间 */
  ERROR_DURATION: 6000,
  /** 警告通知显示时间 */
  WARNING_DURATION: 5000,
  /** 最大同时显示数量 */
  MAX_NOTIFICATIONS: 5,
} as const

/** 图表配置 */
export const CHART = {
  /** 默认图表高度 */
  DEFAULT_HEIGHT: 400,
  /** 小图表高度 */
  SMALL_HEIGHT: 200,
  /** 大图表高度 */
  LARGE_HEIGHT: 600,
  /** 默认动画持续时间 */
  ANIMATION_DURATION: 300,
  /** 数据点最大数量 */
  MAX_DATA_POINTS: 100,
  /** 图例最大项目数 */
  MAX_LEGEND_ITEMS: 20,
} as const

/** 数据导出配置 */
export const EXPORT = {
  /** 默认文件名前缀 */
  DEFAULT_FILENAME_PREFIX: 'flowbalance',
  /** 支持的导出格式 */
  SUPPORTED_FORMATS: ['csv', 'xlsx', 'pdf'] as const,
  /** 最大导出记录数 */
  MAX_EXPORT_RECORDS: 10000,
  /** 导出任务超时时间（毫秒） */
  EXPORT_TIMEOUT: 5 * 60 * 1000, // 5分钟
} as const

/** 搜索配置 */
export const SEARCH = {
  /** 最小搜索关键词长度 */
  MIN_QUERY_LENGTH: 2,
  /** 最大搜索关键词长度 */
  MAX_QUERY_LENGTH: 100,
  /** 搜索结果最大数量 */
  MAX_RESULTS: 50,
  /** 搜索防抖延迟（毫秒） */
  DEBOUNCE_DELAY: 300,
  /** 搜索历史最大保存数量 */
  MAX_SEARCH_HISTORY: 10,
} as const

/** 备份配置 */
export const BACKUP = {
  /** 自动备份间隔（毫秒） */
  AUTO_BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24小时
  /** 备份文件保留天数 */
  BACKUP_RETENTION_DAYS: 30,
  /** 最大备份文件大小 */
  MAX_BACKUP_SIZE: 100 * 1024 * 1024, // 100MB
  /** 备份压缩级别 */
  COMPRESSION_LEVEL: 6,
} as const

/** 性能配置 */
export const PERFORMANCE = {
  /** 虚拟滚动阈值 */
  VIRTUAL_SCROLL_THRESHOLD: 100,
  /** 图片懒加载阈值 */
  LAZY_LOAD_THRESHOLD: 200,
  /** 防抖默认延迟 */
  DEFAULT_DEBOUNCE_DELAY: 300,
  /** 节流默认延迟 */
  DEFAULT_THROTTLE_DELAY: 100,
  /** 长列表分页大小 */
  LONG_LIST_PAGE_SIZE: 50,
} as const

/** 开发配置 */
export const DEVELOPMENT = {
  /** 是否启用调试模式 */
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  /** 是否显示性能指标 */
  SHOW_PERFORMANCE_METRICS: process.env.NODE_ENV === 'development',
  /** 是否启用详细日志 */
  VERBOSE_LOGGING: process.env.NODE_ENV === 'development',
  /** 模拟网络延迟（毫秒） */
  MOCK_NETWORK_DELAY: 0,
} as const

/** 应用配置工具类 */
export class AppConfig {
  /** 获取应用信息 */
  static getAppInfo() {
    return APP_INFO
  }

  /** 获取分页配置 */
  static getPagination() {
    return PAGINATION
  }

  /** 获取验证配置 */
  static getValidation() {
    return VALIDATION
  }

  /** 获取缓存配置 */
  static getCache() {
    return CACHE
  }

  /** 获取安全配置 */
  static getSecurity() {
    return SECURITY
  }

  /** 获取通知配置 */
  static getNotification() {
    return NOTIFICATION
  }

  /** 获取图表配置 */
  static getChart() {
    return CHART
  }

  /** 检查是否为开发环境 */
  static isDevelopment(): boolean {
    return DEVELOPMENT.DEBUG_MODE
  }

  /** 检查是否为生产环境 */
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  }

  /** 获取环境变量 */
  static getEnv(key: string, defaultValue?: string): string {
    return process.env[key] || defaultValue || ''
  }

  /** 格式化文件大小 */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /** 检查文件类型是否允许 */
  static isAllowedFileType(
    type: string,
    category: 'image' | 'document'
  ): boolean {
    const allowedTypes =
      category === 'image'
        ? FILE_UPLOAD.ALLOWED_IMAGE_TYPES
        : FILE_UPLOAD.ALLOWED_DOCUMENT_TYPES
    return (allowedTypes as readonly string[]).includes(type)
  }
}

export default AppConfig
