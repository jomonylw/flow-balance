'use client'

/**
 * 响应式设计工具函数
 */

// 断点定义（与 Tailwind CSS 保持一致）
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof breakpoints

/**
 * 检测当前屏幕是否为移动设备
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < breakpoints.md
}

/**
 * 检测当前屏幕是否为平板设备
 */
export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false
  return (
    window.innerWidth >= breakpoints.md && window.innerWidth < breakpoints.lg
  )
}

/**
 * 检测当前屏幕是否为桌面设备
 */
export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= breakpoints.lg
}

/**
 * 检测当前屏幕是否小于指定断点
 */
export const isBelow = (breakpoint: Breakpoint): boolean => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < breakpoints[breakpoint]
}

/**
 * 检测当前屏幕是否大于等于指定断点
 */
export const isAbove = (breakpoint: Breakpoint): boolean => {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= breakpoints[breakpoint]
}

/**
 * 检测是否为触摸设备
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * 获取当前屏幕尺寸分类
 */
export const getScreenSize = (): 'mobile' | 'tablet' | 'desktop' => {
  if (isMobile()) return 'mobile'
  if (isTablet()) return 'tablet'
  return 'desktop'
}

/**
 * 根据屏幕尺寸返回不同的值
 */
export const responsive = <T>(values: {
  mobile: T
  tablet?: T
  desktop?: T
}): T => {
  const screenSize = getScreenSize()

  switch (screenSize) {
    case 'mobile':
      return values.mobile
    case 'tablet':
      return values.tablet ?? values.mobile
    case 'desktop':
      return values.desktop ?? values.tablet ?? values.mobile
    default:
      return values.mobile
  }
}

/**
 * 获取响应式的图表高度
 */
export const getChartHeight = (): number => {
  return responsive({
    mobile: 300,
    tablet: 350,
    desktop: 400,
  })
}

/**
 * 获取响应式的模态框尺寸
 */
export const getModalSize = (
  size: 'sm' | 'md' | 'lg' | 'xl' = 'md',
): string => {
  const sizeMap = {
    sm: responsive({
      mobile: 'w-full mx-2',
      tablet: 'max-w-md',
      desktop: 'max-w-md',
    }),
    md: responsive({
      mobile: 'w-full mx-2',
      tablet: 'max-w-lg',
      desktop: 'max-w-lg',
    }),
    lg: responsive({
      mobile: 'w-full mx-2',
      tablet: 'max-w-xl',
      desktop: 'max-w-2xl',
    }),
    xl: responsive({
      mobile: 'w-full mx-2',
      tablet: 'max-w-2xl',
      desktop: 'max-w-4xl',
    }),
  }

  return sizeMap[size]
}

/**
 * 获取响应式的网格列数
 */
export const getGridCols = (options: {
  mobile: number
  tablet?: number
  desktop?: number
}): string => {
  const cols = responsive({
    mobile: options.mobile,
    tablet: options.tablet,
    desktop: options.desktop,
  })

  return `grid-cols-${cols}`
}

/**
 * 获取响应式的间距类名
 */
export const getSpacing = (type: 'padding' | 'margin' = 'padding'): string => {
  const spacing = responsive({
    mobile: 4,
    tablet: 6,
    desktop: 6,
  })

  const prefix = type === 'padding' ? 'p' : 'm'
  return `${prefix}-${spacing}`
}

/**
 * 获取响应式的文本大小类名
 */
export const getTextSize = (
  level: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' = 'base',
): string => {
  const sizeMap = {
    xs: responsive({ mobile: 'text-xs', desktop: 'text-xs' }),
    sm: responsive({ mobile: 'text-xs', desktop: 'text-sm' }),
    base: responsive({ mobile: 'text-sm', desktop: 'text-base' }),
    lg: responsive({ mobile: 'text-base', desktop: 'text-lg' }),
    xl: responsive({ mobile: 'text-lg', desktop: 'text-xl' }),
    '2xl': responsive({ mobile: 'text-xl', desktop: 'text-2xl' }),
    '3xl': responsive({ mobile: 'text-2xl', desktop: 'text-3xl' }),
  }

  return sizeMap[level]
}

/**
 * 获取响应式的按钮尺寸类名
 */
export const getButtonSize = (size: 'sm' | 'md' | 'lg' = 'md'): string => {
  const sizeMap = {
    sm: responsive({
      mobile: 'px-3 py-2 text-sm min-h-[40px]',
      desktop: 'px-3 py-1.5 text-sm',
    }),
    md: responsive({
      mobile: 'px-4 py-2.5 text-base min-h-[44px]',
      desktop: 'px-4 py-2 text-sm',
    }),
    lg: responsive({
      mobile: 'px-6 py-3 text-lg min-h-[48px]',
      desktop: 'px-6 py-2.5 text-base',
    }),
  }

  return sizeMap[size]
}

/**
 * 获取安全区域类名（用于支持刘海屏等）
 */
export const getSafeAreaClasses = (): string => {
  return 'safe-area-inset-top safe-area-inset-bottom safe-area-inset-left safe-area-inset-right'
}

/**
 * 防抖函数，用于优化 resize 事件处理
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * 响应式监听器 Hook 的类型定义
 */
export interface ResponsiveListener {
  mobile: boolean
  tablet: boolean
  desktop: boolean
  touchDevice: boolean
  screenSize: 'mobile' | 'tablet' | 'desktop'
}
