/**
 * 尺寸和间距常量管理
 * 统一管理所有尺寸、间距、边框等数值，避免魔法数字
 */

/** 间距常量 */
export const SPACING = {
  /** 无间距 */
  NONE: 0,
  /** 极小间距 - 2px */
  XS: 2,
  /** 小间距 - 4px */
  SM: 4,
  /** 默认间距 - 8px */
  MD: 8,
  /** 大间距 - 12px */
  LG: 12,
  /** 超大间距 - 16px */
  XL: 16,
  /** 巨大间距 - 20px */
  XXL: 20,
  /** 超巨大间距 - 24px */
  XXXL: 24,
  /** 最大间距 - 32px */
  MAX: 32,
} as const

/** 边框半径常量 */
export const BORDER_RADIUS = {
  /** 无圆角 */
  NONE: 0,
  /** 小圆角 - 2px */
  SM: 2,
  /** 默认圆角 - 4px */
  MD: 4,
  /** 大圆角 - 6px */
  LG: 6,
  /** 超大圆角 - 8px */
  XL: 8,
  /** 圆形 - 50% */
  FULL: '50%',
} as const

/** 边框宽度常量 */
export const BORDER_WIDTH = {
  /** 无边框 */
  NONE: 0,
  /** 细边框 - 1px */
  THIN: 1,
  /** 默认边框 - 2px */
  DEFAULT: 2,
  /** 粗边框 - 3px */
  THICK: 3,
  /** 超粗边框 - 4px */
  EXTRA_THICK: 4,
} as const

/** 字体大小常量 */
export const FONT_SIZE = {
  /** 极小字体 - 10px */
  XS: 10,
  /** 小字体 - 12px */
  SM: 12,
  /** 默认字体 - 14px */
  BASE: 14,
  /** 大字体 - 16px */
  LG: 16,
  /** 超大字体 - 18px */
  XL: 18,
  /** 标题字体 - 20px */
  XXL: 20,
  /** 大标题字体 - 24px */
  XXXL: 24,
  /** 超大标题字体 - 32px */
  HEADING: 32,
} as const

/** 行高常量 */
export const LINE_HEIGHT = {
  /** 紧密行高 - 1.2 */
  TIGHT: 1.2,
  /** 默认行高 - 1.4 */
  DEFAULT: 1.4,
  /** 宽松行高 - 1.6 */
  RELAXED: 1.6,
  /** 超宽松行高 - 1.8 */
  LOOSE: 1.8,
} as const

/** 阴影常量 */
export const SHADOW = {
  /** 无阴影 */
  NONE: 'none',
  /** 小阴影 */
  SM: '0 1px 2px rgba(0, 0, 0, 0.05)',
  /** 默认阴影 */
  DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  /** 中等阴影 */
  MD: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
  /** 大阴影 */
  LG: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  /** 超大阴影 */
  XL: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  /** 内阴影 */
  INNER: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
} as const

/** Z-index 层级常量 */
export const Z_INDEX = {
  /** 基础层 */
  BASE: 0,
  /** 下拉菜单 */
  DROPDOWN: 10,
  /** 粘性元素 */
  STICKY: 20,
  /** 固定元素 */
  FIXED: 30,
  /** 模态框背景 */
  MODAL_BACKDROP: 40,
  /** 模态框 */
  MODAL: 50,
  /** 弹出框 */
  POPOVER: 60,
  /** 工具提示 */
  TOOLTIP: 70,
  /** 通知 */
  NOTIFICATION: 80,
  /** 最高层 */
  MAX: 9999,
} as const

/** 组件尺寸常量 */
export const COMPONENT_SIZE = {
  /** 按钮高度 */
  BUTTON: {
    SM: 28,
    MD: 36,
    LG: 44,
  },
  /** 输入框高度 */
  INPUT: {
    SM: 32,
    MD: 40,
    LG: 48,
  },
  /** 图标尺寸 */
  ICON: {
    XS: 12,
    SM: 16,
    MD: 20,
    LG: 24,
    XL: 32,
  },
  /** 头像尺寸 */
  AVATAR: {
    SM: 24,
    MD: 32,
    LG: 40,
    XL: 48,
  },
  /** 滑块尺寸 */
  SLIDER: {
    TRACK_HEIGHT: 8,
    THUMB_SIZE: 20,
  },
  /** 开关组件尺寸 */
  TOGGLE: {
    /** 开关高度 */
    HEIGHT: 28,
    /** 开关宽度 */
    WIDTH: 48,
    /** 开关拖拽点大小 */
    THUMB_SIZE: 20,
    /** 开关拖拽点偏移量 */
    THUMB_OFFSET: 20,
  },
} as const

/** 布局常量 */
export const LAYOUT = {
  /** 侧边栏宽度 */
  SIDEBAR_WIDTH: 256,
  /** 侧边栏折叠宽度 */
  SIDEBAR_COLLAPSED_WIDTH: 64,
  /** 顶部导航高度 */
  HEADER_HEIGHT: 64,
  /** 底部导航高度 */
  FOOTER_HEIGHT: 48,
  /** 容器最大宽度 */
  CONTAINER_MAX_WIDTH: 1200,
  /** 内容区域内边距 */
  CONTENT_PADDING: 24,
} as const

/** 动画持续时间常量 */
export const ANIMATION_DURATION = {
  /** 快速动画 - 150ms */
  FAST: 150,
  /** 默认动画 - 200ms */
  DEFAULT: 200,
  /** 慢速动画 - 300ms */
  SLOW: 300,
  /** 超慢动画 - 500ms */
  EXTRA_SLOW: 500,
} as const

/** 断点常量 */
export const BREAKPOINTS = {
  /** 小屏幕 - 640px */
  SM: 640,
  /** 中等屏幕 - 768px */
  MD: 768,
  /** 大屏幕 - 1024px */
  LG: 1024,
  /** 超大屏幕 - 1280px */
  XL: 1280,
  /** 超超大屏幕 - 1536px */
  XXL: 1536,
} as const

/** 尺寸工具类 */
export class Dimensions {
  /** 获取间距值 */
  static spacing(size: keyof typeof SPACING): number {
    return SPACING[size]
  }

  /** 获取边框半径值 */
  static borderRadius(size: keyof typeof BORDER_RADIUS): number | string {
    return BORDER_RADIUS[size]
  }

  /** 获取字体大小值 */
  static fontSize(size: keyof typeof FONT_SIZE): number {
    return FONT_SIZE[size]
  }

  /** 获取组件尺寸 */
  static componentSize(
    component: keyof typeof COMPONENT_SIZE,
    size?: string
  ): number | Record<string, number> {
    const componentSizes = COMPONENT_SIZE[component]
    if (size && typeof componentSizes === 'object' && size in componentSizes) {
      return componentSizes[size as keyof typeof componentSizes]
    }
    return componentSizes
  }

  /** 转换为 CSS 值 */
  static toCss(value: number | string): string {
    return typeof value === 'number' ? `${value}px` : value
  }

  /** 转换为 rem 值 */
  static toRem(px: number, baseFontSize: number = 16): string {
    return `${px / baseFontSize}rem`
  }

  /** 检查是否为移动端断点 */
  static isMobile(width: number): boolean {
    return width < BREAKPOINTS.MD
  }

  /** 检查是否为平板端断点 */
  static isTablet(width: number): boolean {
    return width >= BREAKPOINTS.MD && width < BREAKPOINTS.LG
  }

  /** 检查是否为桌面端断点 */
  static isDesktop(width: number): boolean {
    return width >= BREAKPOINTS.LG
  }
}

export default Dimensions
