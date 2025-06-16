import { COLOR_OPTIONS } from '@/components/ui/ColorPicker'

// 颜色缓存接口
interface ColorCache {
  accounts: Map<string, string>
  categories: Map<string, string>
  tags: Map<string, string>
  lastUpdated: number
}

// 全局颜色缓存
let colorCache: ColorCache = {
  accounts: new Map(),
  categories: new Map(),
  tags: new Map(),
  lastUpdated: 0
}

// 缓存过期时间（5分钟）
const CACHE_EXPIRY = 5 * 60 * 1000

// 默认颜色配置
const DEFAULT_COLORS = {
  ASSET: '#3b82f6',      // 蓝色
  LIABILITY: '#f97316',   // 橙色
  INCOME: '#10b981',      // 绿色
  EXPENSE: '#ef4444',     // 红色
  DEFAULT: '#6b7280'      // 灰色
}

// 预定义图表颜色序列（从ColorPicker中提取）
const CHART_COLOR_SEQUENCE = COLOR_OPTIONS.map(option => option.value)

/**
 * 颜色管理服务类
 */
export class ColorManager {
  /**
   * 清除颜色缓存
   */
  static clearCache(): void {
    colorCache = {
      accounts: new Map(),
      categories: new Map(),
      tags: new Map(),
      lastUpdated: 0
    }
  }

  /**
   * 检查缓存是否过期
   */
  static isCacheExpired(): boolean {
    return Date.now() - colorCache.lastUpdated > CACHE_EXPIRY
  }

  /**
   * 更新缓存时间戳
   */
  static updateCacheTimestamp(): void {
    colorCache.lastUpdated = Date.now()
  }

  /**
   * 获取账户颜色
   * @param accountId 账户ID
   * @param accountColor 账户自定义颜色
   * @param accountType 账户类型
   * @returns 颜色值
   */
  static getAccountColor(
    accountId: string, 
    accountColor?: string | null, 
    accountType?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  ): string {
    // 优先使用自定义颜色
    if (accountColor) {
      colorCache.accounts.set(accountId, accountColor)
      return accountColor
    }

    // 检查缓存
    const cachedColor = colorCache.accounts.get(accountId)
    if (cachedColor && !this.isCacheExpired()) {
      return cachedColor
    }

    // 根据账户类型返回默认颜色
    const defaultColor = accountType ? DEFAULT_COLORS[accountType] : DEFAULT_COLORS.DEFAULT
    colorCache.accounts.set(accountId, defaultColor)
    this.updateCacheTimestamp()
    
    return defaultColor
  }

  /**
   * 获取标签颜色
   * @param tagId 标签ID
   * @param tagColor 标签自定义颜色
   * @returns 颜色值
   */
  static getTagColor(tagId: string, tagColor?: string | null): string {
    // 优先使用自定义颜色
    if (tagColor) {
      colorCache.tags.set(tagId, tagColor)
      return tagColor
    }

    // 检查缓存
    const cachedColor = colorCache.tags.get(tagId)
    if (cachedColor && !this.isCacheExpired()) {
      return cachedColor
    }

    // 返回默认颜色
    const defaultColor = DEFAULT_COLORS.DEFAULT
    colorCache.tags.set(tagId, defaultColor)
    this.updateCacheTimestamp()
    
    return defaultColor
  }

  /**
   * 为图表生成颜色映射
   * @param items 需要着色的项目列表
   * @param getItemColor 获取项目颜色的函数
   * @returns 颜色数组
   */
  static generateChartColors<T>(
    items: T[],
    getItemColor: (item: T, index: number) => string | null | undefined
  ): string[] {
    return items.map((item, index) => {
      const customColor = getItemColor(item, index)
      return customColor || CHART_COLOR_SEQUENCE[index % CHART_COLOR_SEQUENCE.length]
    })
  }

  /**
   * 获取对比度友好的文本颜色
   * @param backgroundColor 背景颜色
   * @returns 文本颜色（黑色或白色）
   */
  static getContrastTextColor(backgroundColor: string): string {
    // 移除 # 符号
    const hex = backgroundColor.replace('#', '')
    
    // 转换为 RGB
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    // 计算亮度
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    
    // 返回对比色
    return brightness > 128 ? '#000000' : '#ffffff'
  }

  /**
   * 调整颜色透明度
   * @param color 原始颜色
   * @param alpha 透明度 (0-1)
   * @returns RGBA颜色值
   */
  static adjustColorAlpha(color: string, alpha: number): string {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  /**
   * 生成颜色的渐变色
   * @param color 基础颜色
   * @param steps 渐变步数
   * @returns 渐变色数组
   */
  static generateColorGradient(color: string, steps: number = 5): string[] {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    const gradient: string[] = []
    
    for (let i = 0; i < steps; i++) {
      const factor = i / (steps - 1)
      const newR = Math.round(r + (255 - r) * factor)
      const newG = Math.round(g + (255 - g) * factor)
      const newB = Math.round(b + (255 - b) * factor)
      
      gradient.push(`#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`)
    }
    
    return gradient
  }

  /**
   * 批量设置账户颜色
   * @param accountColors 账户颜色映射
   */
  static setAccountColors(accountColors: Record<string, string>): void {
    Object.entries(accountColors).forEach(([accountId, color]) => {
      colorCache.accounts.set(accountId, color)
    })
    this.updateCacheTimestamp()
  }

  /**
   * 批量设置标签颜色
   * @param tagColors 标签颜色映射
   */
  static setTagColors(tagColors: Record<string, string>): void {
    Object.entries(tagColors).forEach(([tagId, color]) => {
      colorCache.tags.set(tagId, color)
    })
    this.updateCacheTimestamp()
  }

  /**
   * 获取所有可用颜色选项
   */
  static getAvailableColors() {
    return COLOR_OPTIONS
  }

  /**
   * 获取默认颜色配置
   */
  static getDefaultColors() {
    return DEFAULT_COLORS
  }
}

export default ColorManager
