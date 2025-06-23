import { COLOR_OPTIONS } from '@/components/ui/forms/ColorPicker'
import {
  CHART_COLOR_SEQUENCE,
  ACCOUNT_TYPE_COLORS,
  DEFAULT_COLOR,
  COLORS,
  AccountType,
} from '@/types/core/constants'

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
  lastUpdated: 0,
}

// 缓存过期时间（5分钟）
const CACHE_EXPIRY = 5 * 60 * 1000

// 注意：默认颜色和图表颜色序列现在统一从 constants.ts 导入

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
      lastUpdated: 0,
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
    accountType?: AccountType
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
    const defaultColor = accountType
      ? ACCOUNT_TYPE_COLORS[accountType]
      : DEFAULT_COLOR
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
    const defaultColor = DEFAULT_COLOR
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
      return (
        customColor || CHART_COLOR_SEQUENCE[index % CHART_COLOR_SEQUENCE.length]
      )
    })
  }

  /**
   * 为图表生成智能颜色映射，确保没有自定义颜色的项目使用不同颜色
   * @param items 需要着色的项目列表
   * @param getItemColor 获取项目颜色的函数
   * @returns 颜色数组
   */
  static generateSmartChartColors<T>(
    items: T[],
    getItemColor: (item: T, index: number) => string | null | undefined
  ): string[] {
    const colors: string[] = []
    const usedColors: string[] = []

    // 第一遍：收集所有自定义颜色并分配
    items.forEach((item, index) => {
      const customColor = getItemColor(item, index)
      if (customColor) {
        colors.push(customColor)
        usedColors.push(customColor)
      } else {
        colors.push('') // 占位符，稍后分配
      }
    })

    // 第二遍：为没有自定义颜色的项目分配默认颜色
    let defaultColorIndex = 0
    for (let i = 0; i < colors.length; i++) {
      if (colors[i] === '') {
        let assignedColor: string
        let attempts = 0
        const maxAttempts = CHART_COLOR_SEQUENCE.length * 2

        do {
          if (attempts < CHART_COLOR_SEQUENCE.length) {
            // 先尝试预定义颜色
            assignedColor =
              CHART_COLOR_SEQUENCE[
                defaultColorIndex % CHART_COLOR_SEQUENCE.length
              ]
            defaultColorIndex++
          } else {
            // 如果预定义颜色不够，生成颜色变体
            const baseColorIndex =
              (attempts - CHART_COLOR_SEQUENCE.length) %
              CHART_COLOR_SEQUENCE.length
            const variantIndex = Math.floor(
              (attempts - CHART_COLOR_SEQUENCE.length) /
                CHART_COLOR_SEQUENCE.length
            )
            const baseColor = CHART_COLOR_SEQUENCE[baseColorIndex]
            assignedColor = this.generateColorVariant(baseColor, variantIndex)
          }

          attempts++

          // 防止无限循环
          if (attempts >= maxAttempts) {
            // 最后的回退方案：生成一个基于时间戳的随机颜色
            assignedColor = this.generateRandomColor(i)
            break
          }
        } while (this.isColorTooSimilar(assignedColor, usedColors))

        colors[i] = assignedColor
        usedColors.push(assignedColor)
      }
    }

    return colors
  }

  /**
   * 检查颜色是否与已使用的颜色太相似
   * @param color 要检查的颜色
   * @param usedColors 已使用的颜色列表
   * @returns 是否太相似
   */
  static isColorTooSimilar(color: string, usedColors: string[]): boolean {
    const threshold = 80 // 提高颜色差异阈值，确保更大的区别

    for (const usedColor of usedColors) {
      if (this.getColorDistance(color, usedColor) < threshold) {
        return true
      }
    }
    return false
  }

  /**
   * 计算两个颜色之间的距离（欧几里得距离）
   * @param color1 颜色1
   * @param color2 颜色2
   * @returns 颜色距离
   */
  static getColorDistance(color1: string, color2: string): number {
    const hex1 = color1.replace('#', '')
    const hex2 = color2.replace('#', '')

    const r1 = parseInt(hex1.substr(0, 2), 16)
    const g1 = parseInt(hex1.substr(2, 2), 16)
    const b1 = parseInt(hex1.substr(4, 2), 16)

    const r2 = parseInt(hex2.substr(0, 2), 16)
    const g2 = parseInt(hex2.substr(2, 2), 16)
    const b2 = parseInt(hex2.substr(4, 2), 16)

    return Math.sqrt(
      Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2)
    )
  }

  /**
   * 生成一个随机颜色（作为最后的回退方案）
   * @param seed 种子值
   * @returns 随机颜色
   */
  static generateRandomColor(seed: number): string {
    // 使用种子生成伪随机颜色，确保相同种子产生相同颜色
    // 使用黄金角度分布确保颜色均匀分布
    const hue = (seed * 137.508) % 360 // 黄金角度分布
    const saturation = 0.7 + (seed % 2) * 0.2 // 70%-90%，提高饱和度
    const lightness = 0.45 + (seed % 3) * 0.15 // 45%-75%，适中的亮度

    return this.hslToHex(hue, saturation, lightness)
  }

  /**
   * HSL转十六进制颜色
   * @param h 色相 (0-360)
   * @param s 饱和度 (0-1)
   * @param l 亮度 (0-1)
   * @returns 十六进制颜色
   */
  static hslToHex(h: number, s: number, l: number): string {
    h /= 360
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    let r: number, g: number, b: number

    if (s === 0) {
      r = g = b = l
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    const toHex = (c: number) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
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

      gradient.push(
        `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
      )
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
    return ACCOUNT_TYPE_COLORS
  }

  /**
   * 生成颜色变体（用于当预定义颜色不够时）
   * @param baseColor 基础颜色
   * @param variant 变体索引
   * @returns 颜色变体
   */
  static generateColorVariant(baseColor: string, variant: number): string {
    const hex = baseColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    // 使用更智能的颜色变体生成策略
    switch (variant % 6) {
      case 0:
        // 增加饱和度和亮度
        return this.adjustColorHSL(baseColor, 0, 0.2, 0.1)
      case 1:
        // 降低饱和度
        return this.adjustColorHSL(baseColor, 0, -0.3, 0)
      case 2:
        // 色相偏移 +60度
        return this.adjustColorHSL(baseColor, 60, 0, 0)
      case 3:
        // 色相偏移 -60度
        return this.adjustColorHSL(baseColor, -60, 0, 0)
      case 4:
        // 增加亮度
        return this.adjustColorHSL(baseColor, 0, 0, 0.2)
      case 5:
        // 降低亮度
        return this.adjustColorHSL(baseColor, 0, 0, -0.2)
      default:
        // 回退到原来的方法
        const adjustmentFactor = (variant + 1) * 40
        const direction = variant % 2 === 0 ? 1 : -1
        const newR = Math.max(
          0,
          Math.min(255, r + adjustmentFactor * direction)
        )
        const newG = Math.max(
          0,
          Math.min(255, g + adjustmentFactor * direction * 0.8)
        )
        const newB = Math.max(
          0,
          Math.min(255, b + adjustmentFactor * direction * 0.6)
        )
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
    }
  }

  /**
   * 调整颜色的HSL值
   * @param color 原始颜色
   * @param hueShift 色相偏移（度）
   * @param saturationShift 饱和度偏移（-1到1）
   * @param lightnessShift 亮度偏移（-1到1）
   * @returns 调整后的颜色
   */
  static adjustColorHSL(
    color: string,
    hueShift: number,
    saturationShift: number,
    lightnessShift: number
  ): string {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255

    // RGB转HSL
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0,
      s = 0,
      l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }

    // 调整HSL值
    h = (h * 360 + hueShift) % 360
    if (h < 0) h += 360
    h /= 360

    s = Math.max(0, Math.min(1, s + saturationShift))
    l = Math.max(0, Math.min(1, l + lightnessShift))

    // HSL转RGB
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    let newR: number, newG: number, newB: number

    if (s === 0) {
      newR = newG = newB = l // 无色
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      newR = hue2rgb(p, q, h + 1 / 3)
      newG = hue2rgb(p, q, h)
      newB = hue2rgb(p, q, h - 1 / 3)
    }

    // 转换回十六进制
    const toHex = (c: number) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, '0')
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`
  }

  /**
   * 生成互补色或对比色
   * @param color 原始颜色
   * @returns 互补色
   */
  static generateComplementaryColor(color: string): string {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    // 计算亮度
    const brightness = (r * 299 + g * 587 + b * 114) / 1000

    // 如果原色较暗，返回较亮的对比色
    // 如果原色较亮，返回较暗的对比色
    if (brightness < 128) {
      // 原色较暗，生成较亮的对比色
      const newR = Math.min(255, r + 100)
      const newG = Math.min(255, g + 100)
      const newB = Math.min(255, b + 100)
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
    } else {
      // 原色较亮，生成较暗的对比色
      const newR = Math.max(0, r - 100)
      const newG = Math.max(0, g - 100)
      const newB = Math.max(0, b - 100)
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
    }
  }

  /**
   * 获取主题相关的颜色
   */
  static getThemeColor(colorKey: string, isDark: boolean = false): string {
    // 根据主题返回相应的颜色
    const themeColors = {
      background: isDark ? COLORS.BACKGROUND_DARK : COLORS.BACKGROUND,
      text: isDark ? COLORS.TEXT_DARK : COLORS.TEXT,
      border: isDark ? COLORS.BORDER_DARK : COLORS.BORDER,
      muted: isDark ? COLORS.GRAY_500 : COLORS.GRAY_400,
    }

    return themeColors[colorKey as keyof typeof themeColors] || colorKey
  }

  /**
   * 获取语义化颜色
   */
  static getSemanticColor(
    type: 'success' | 'error' | 'warning' | 'info' | 'primary'
  ): string {
    const semanticColors = {
      success: COLORS.SUCCESS,
      error: COLORS.ERROR,
      warning: COLORS.WARNING,
      info: COLORS.INFO,
      primary: COLORS.PRIMARY,
    }
    return semanticColors[type]
  }

  /**
   * 获取带透明度的颜色
   */
  static getColorWithOpacity(
    type: 'primary' | 'success' | 'error' | 'warning',
    opacity: 10 | 20 | 50
  ): string {
    const colorMap = {
      primary: {
        10: COLORS.PRIMARY_10,
        20: COLORS.PRIMARY_20,
        50: COLORS.PRIMARY_50,
      },
      success: {
        10: COLORS.SUCCESS_10,
        20: COLORS.SUCCESS_20,
        50: COLORS.SUCCESS_50,
      },
      error: {
        10: COLORS.ERROR_10,
        20: COLORS.ERROR_20,
        50: COLORS.ERROR_50,
      },
      warning: {
        10: COLORS.WARNING_10,
        20: COLORS.WARNING_20,
        50: COLORS.WARNING_50,
      },
    }
    return colorMap[type][opacity]
  }

  /**
   * 获取灰度颜色
   */
  static getGrayColor(
    shade: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  ): string {
    const grayMap = {
      50: COLORS.GRAY_50,
      100: COLORS.GRAY_100,
      200: COLORS.GRAY_200,
      300: COLORS.GRAY_300,
      400: COLORS.GRAY_400,
      500: COLORS.GRAY_500,
      600: COLORS.GRAY_600,
      700: COLORS.GRAY_700,
      800: COLORS.GRAY_800,
      900: COLORS.GRAY_900,
    }
    return grayMap[shade]
  }
}

export default ColorManager
