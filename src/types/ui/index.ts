/**
 * UI 组件相关类型定义
 * 统一管理 UI 组件的 props、状态和事件类型
 */

import type {
  Theme as _Theme,
  Language as _Language,
  LoadingState as _LoadingState,
  Size as _Size,
  ColorVariant as _ColorVariant,
} from '@/types/core/constants'
import { ReactNode, MouseEvent, ChangeEvent, FormEvent } from 'react'

// ============================================================================
// 基础 UI 类型
// ============================================================================

/** 基础组件 Props */
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
  'data-testid'?: string
}

/** 主题类型 - 重新导出核心类型 */
export type { Theme } from '@/types/core/constants'

/** 语言类型 - 重新导出核心类型 */
export type { Language } from '@/types/core/constants'

/** 加载状态类型 - 重新导出核心类型 */
export type { LoadingState } from '@/types/core/constants'

/** 尺寸类型 - 重新导出核心类型 */
export type { Size } from '@/types/core/constants'

/** 颜色变体类型 - 重新导出核心类型 */
export type { ColorVariant } from '@/types/core/constants'

/** 对齐方式 */
export type Alignment = 'left' | 'center' | 'right'

/** 方向类型 */
export type Direction = 'horizontal' | 'vertical'

// ============================================================================
// 表单相关类型
// ============================================================================

/** 表单字段状态 */
export interface FormFieldState {
  value: string | number | boolean
  error?: string
  touched: boolean
  dirty: boolean
}

/** 表单验证规则 */
export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: unknown) => string | undefined
}

/** 表单字段配置 */
export interface FormFieldConfig {
  name: string
  label: string
  type:
    | 'text'
    | 'number'
    | 'email'
    | 'password'
    | 'select'
    | 'textarea'
    | 'date'
    | 'checkbox'
  placeholder?: string
  defaultValue?: unknown
  validation?: ValidationRule
  options?: Array<{ label: string; value: string | number }>
}

/** 表单事件处理器 */
export interface FormEventHandlers {
  onChange?: (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void
  onBlur?: (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  onReset?: (event: FormEvent<HTMLFormElement>) => void
}

// ============================================================================
// 表格相关类型
// ============================================================================

/** 表格列定义 */
export interface TableColumn<T = Record<string, unknown>> {
  key: string
  title: string
  dataIndex?: keyof T
  render?: (value: unknown, record: T, index: number) => ReactNode
  width?: string | number
  align?: Alignment
  sortable?: boolean
  filterable?: boolean
  fixed?: 'left' | 'right'
  mobileHidden?: boolean
}

/** 表格排序状态 */
export interface TableSortState {
  column: string
  direction: 'asc' | 'desc'
}

/** 表格筛选状态 */
export interface TableFilterState {
  [key: string]: unknown
}

/** 表格分页状态 */
export interface TablePaginationState {
  current: number
  pageSize: number
  total: number
}

/** 表格事件处理器 */
export interface TableEventHandlers<T = Record<string, unknown>> {
  onRowClick?: (record: T, index: number) => void
  onRowSelect?: (selectedRowKeys: string[], selectedRows: T[]) => void
  onSortChange?: (sort: TableSortState | null) => void
  onFilterChange?: (filters: TableFilterState) => void
  onPaginationChange?: (pagination: TablePaginationState) => void
}

// ============================================================================
// 模态框相关类型
// ============================================================================

/** 模态框尺寸 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

/** 模态框位置 */
export type ModalPosition = 'center' | 'top' | 'bottom'

/** 模态框 Props */
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: ModalSize
  position?: ModalPosition
  closable?: boolean
  maskClosable?: boolean
  destroyOnClose?: boolean
  footer?: ReactNode
  loading?: boolean
  zIndex?: number
}

// ============================================================================
// 通知相关类型
// ============================================================================

/** 通知类型 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/** 通知配置 */
export interface NotificationConfig {
  type: NotificationType
  title: string
  message?: string
  duration?: number
  closable?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

// ============================================================================
// 图表相关类型
// ============================================================================

/** 图表数据点 */
export interface ChartDataPoint {
  name: string
  value: number
  color?: string
  [key: string]: unknown
}

/** ECharts 工具提示参数 - 统一的 tooltip formatter 参数类型 */
export interface TooltipParam {
  /** 轴值（通常是日期或分类名称） */
  axisValue?: string
  /** 数据值 */
  value?: number
  /** 颜色标记 */
  color?: string
  /** 系列名称 */
  seriesName?: string
  /** 标记符号（HTML） */
  marker?: string
  /** 系列类型（bar, line 等） */
  seriesType?: string
  /** 数据索引 */
  dataIndex?: number
  /** 其他可能的属性 */
  [key: string]: unknown
}

/** 图表配置 */
export interface ChartConfig {
  title?: string
  width?: number | string
  height?: number | string
  responsive?: boolean
  theme?: 'light' | 'dark'
  legend?: boolean
  tooltip?: boolean
  animation?: boolean
}

/** 图表事件处理器 */
export interface ChartEventHandlers {
  onClick?: (data: ChartDataPoint, event: MouseEvent) => void
  onHover?: (data: ChartDataPoint | null, event: MouseEvent) => void
}

// ============================================================================
// 导航相关类型
// ============================================================================

/** 导航菜单项 */
export interface NavigationItem {
  key: string
  label: string
  icon?: ReactNode
  path?: string
  children?: NavigationItem[]
  disabled?: boolean
  badge?: string | number
}

/** 面包屑项 */
export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
}

// ============================================================================
// 加载状态类型
// ============================================================================

/** 加载状态 */

/** 异步操作状态 */
export interface AsyncState<T = unknown> {
  data?: T
  loading: boolean
  error?: string
  lastUpdated?: Date
}

// ============================================================================
// 响应式相关类型
// ============================================================================

/** 断点类型 - 重新导出响应式工具中的类型 */
export type { Breakpoint } from '@/lib/utils/responsive'

/** 响应式值类型 */
export type ResponsiveValue<T> =
  | T
  | Partial<Record<import('@/lib/utils/responsive').Breakpoint, T>>

// ============================================================================
// 事件处理器类型
// ============================================================================

/** 通用点击事件处理器 */
export type ClickHandler = (event: MouseEvent<HTMLElement>) => void

/** 通用变更事件处理器 */
export type ChangeHandler<T = string> = (value: T) => void

/** 通用选择事件处理器 */
export type SelectHandler<T = string> = (value: T, option?: unknown) => void

// ============================================================================
// 组件状态类型
// ============================================================================

/** 组件可见性状态 */
export interface VisibilityState {
  visible: boolean
  toggle: () => void
  show: () => void
  hide: () => void
}

/** 组件折叠状态 */
export interface CollapseState {
  collapsed: boolean
  toggle: () => void
  expand: () => void
  collapse: () => void
}

// ============================================================================
// 特定组件类型
// ============================================================================

/** 侧边栏 Props */
export interface SidebarProps extends BaseComponentProps {
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
  width?: number
  collapsedWidth?: number
  resizable?: boolean
}

/** 头部导航 Props */
export interface HeaderProps extends BaseComponentProps {
  title?: string
  logo?: ReactNode
  actions?: ReactNode
  navigation?: NavigationItem[]
}

/** 页面容器 Props */
export interface PageContainerProps extends BaseComponentProps {
  title?: string
  subtitle?: string
  breadcrumb?: BreadcrumbItem[]
  actions?: ReactNode
  loading?: boolean
  error?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full'
  padding?: boolean
}
