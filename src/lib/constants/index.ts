/**
 * 统一常量导出
 * 提供项目中所有常量的统一入口
 */

// 核心常量和枚举
export * from '@/types/core/constants'

// API 端点常量
export * from './api-endpoints'
export { default as ApiEndpoints } from './api-endpoints'

// 尺寸和间距常量
export * from './dimensions'
export { default as Dimensions } from './dimensions'

// 应用配置常量
export * from './app-config'
export { default as AppConfig } from './app-config'

// 工具类重新导出
export { default as ConstantsManager } from '@/lib/utils/constants-manager'
export { default as ColorManager } from '@/lib/utils/color'

/**
 * 常量使用指南
 *
 * 1. 核心业务常量
 *    - AccountType, TransactionType, Language, Theme 等枚举
 *    - CURRENCY_SYMBOLS, ACCOUNT_TYPE_COLORS 等业务常量
 *
 * 2. API 端点常量
 *    - ApiEndpoints.auth.LOGIN
 *    - ApiEndpoints.user.SETTINGS
 *    - ApiEndpoints.buildUrl(endpoint, params)
 *
 * 3. 尺寸和样式常量
 *    - SPACING, BORDER_RADIUS, FONT_SIZE
 *    - COMPONENT_SIZE, LAYOUT, SHADOW
 *    - Dimensions.spacing('MD'), Dimensions.toCss(16)
 *
 * 4. 应用配置常量
 *    - PAGINATION, VALIDATION, CACHE
 *    - NOTIFICATION, CHART, EXPORT
 *    - AppConfig.isDevelopment(), AppConfig.formatFileSize()
 *
 * 5. 颜色管理
 *    - COLORS.PRIMARY, COLORS.SUCCESS
 *    - ColorManager.getSemanticColor('success')
 *    - ColorManager.getThemeColor('background', isDark)
 *
 * 6. 常量管理器
 *    - ConstantsManager.getAccountTypeConfigs()
 *    - ConstantsManager.convertPrismaAccountType()
 *    - ConstantsManager.getZodTransactionTypeEnum()
 */

/** 常量类别枚举 */
export enum ConstantCategory {
  CORE = 'core',
  API = 'api',
  UI = 'ui',
  CONFIG = 'config',
  BUSINESS = 'business',
}

/** 常量元数据接口 */
export interface ConstantMetadata {
  category: ConstantCategory
  description: string
  version: string
  lastUpdated: string
}

/** 所有常量的元数据 */
export const CONSTANTS_METADATA: Record<string, ConstantMetadata> = {
  AccountType: {
    category: ConstantCategory.CORE,
    description: '账户类型枚举',
    version: '1.0.0',
    lastUpdated: '2024-01-01',
  },
  TransactionType: {
    category: ConstantCategory.CORE,
    description: '交易类型枚举',
    version: '1.0.0',
    lastUpdated: '2024-01-01',
  },
  ApiEndpoints: {
    category: ConstantCategory.API,
    description: 'API 端点常量',
    version: '1.0.0',
    lastUpdated: '2024-01-01',
  },
  COLORS: {
    category: ConstantCategory.UI,
    description: '颜色常量',
    version: '1.0.0',
    lastUpdated: '2024-01-01',
  },
  SPACING: {
    category: ConstantCategory.UI,
    description: '间距常量',
    version: '1.0.0',
    lastUpdated: '2024-01-01',
  },
  AppConfig: {
    category: ConstantCategory.CONFIG,
    description: '应用配置常量',
    version: '1.0.0',
    lastUpdated: '2024-01-01',
  },
} as const

/** 常量工具类 */
export class Constants {
  /** 获取常量元数据 */
  static getMetadata(constantName: string): ConstantMetadata | undefined {
    return CONSTANTS_METADATA[constantName]
  }

  /** 获取指定类别的所有常量 */
  static getByCategory(category: ConstantCategory): string[] {
    return Object.entries(CONSTANTS_METADATA)
      .filter(([, metadata]) => metadata.category === category)
      .map(([name]) => name)
  }

  /** 获取所有常量名称 */
  static getAllConstantNames(): string[] {
    return Object.keys(CONSTANTS_METADATA)
  }

  /** 验证常量是否存在 */
  static exists(constantName: string): boolean {
    return constantName in CONSTANTS_METADATA
  }

  /** 获取常量使用统计 */
  static getUsageStats(): Record<ConstantCategory, number> {
    const stats: Record<ConstantCategory, number> = {
      [ConstantCategory.CORE]: 0,
      [ConstantCategory.API]: 0,
      [ConstantCategory.UI]: 0,
      [ConstantCategory.CONFIG]: 0,
      [ConstantCategory.BUSINESS]: 0,
    }

    Object.values(CONSTANTS_METADATA).forEach(metadata => {
      stats[metadata.category]++
    })

    return stats
  }
}

/** 常量验证工具 */
export class ConstantValidator {
  /** 验证枚举值 */
  static validateEnum<T extends Record<string, string>>(
    enumObject: T,
    value: string
  ): value is T[keyof T] {
    return Object.values(enumObject).includes(value)
  }

  /** 验证常量范围 */
  static validateRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max
  }

  /** 验证字符串长度 */
  static validateStringLength(
    value: string,
    minLength: number,
    maxLength: number
  ): boolean {
    return value.length >= minLength && value.length <= maxLength
  }

  /** 验证文件大小 */
  static validateFileSize(size: number, maxSize: number): boolean {
    return size <= maxSize
  }

  /** 验证颜色格式 */
  static validateColorFormat(color: string): boolean {
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    const rgbPattern = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/
    const rgbaPattern = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/

    return (
      hexPattern.test(color) ||
      rgbPattern.test(color) ||
      rgbaPattern.test(color)
    )
  }
}

export default Constants
