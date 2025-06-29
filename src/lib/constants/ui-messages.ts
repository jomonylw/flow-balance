/**
 * UI 组件文本常量
 * 统一管理所有组件中的硬编码文本，支持国际化
 */

// ============================================================================
// 通用UI文本
// ============================================================================

export const COMMON_UI = {
  LOADING: '加载中...',
  SAVING: '保存中...',
  DELETING: '删除中...',
  SUBMITTING: '提交中...',
  PROCESSING: '处理中...',
  CONFIRM: '确认',
  CANCEL: '取消',
  SAVE: '保存',
  DELETE: '删除',
  EDIT: '编辑',
  ADD: '添加',
  CREATE: '创建',
  UPDATE: '更新',
  CLOSE: '关闭',
  BACK: '返回',
  NEXT: '下一步',
  PREVIOUS: '上一步',
  SUBMIT: '提交',
  RESET: '重置',
  CLEAR: '清空',
  SEARCH: '搜索',
  FILTER: '筛选',
  SORT: '排序',
  EXPORT: '导出',
  IMPORT: '导入',
  REFRESH: '刷新',
  RETRY: '重试',
  VIEW: '查看',
  DETAILS: '详情',
  SETTINGS: '设置',
  HELP: '帮助',
  MORE: '更多',
  LESS: '收起',
  EXPAND: '展开',
  COLLAPSE: '折叠',
  SELECT_ALL: '全选',
  DESELECT_ALL: '取消全选',
  NO_DATA: '暂无数据',
  NO_RESULTS: '无搜索结果',
  EMPTY_STATE: '暂无内容',
} as const

// ============================================================================
// 表单相关文本
// ============================================================================

export const FORM_UI = {
  REQUIRED_FIELD: '必填项',
  OPTIONAL_FIELD: '选填项',
  INVALID_FORMAT: '格式不正确',
  FIELD_TOO_SHORT: '内容过短',
  FIELD_TOO_LONG: '内容过长',
  INVALID_EMAIL: '邮箱格式不正确',
  INVALID_PASSWORD: '密码格式不正确',
  PASSWORD_MISMATCH: '密码不一致',
  INVALID_NUMBER: '请输入有效数字',
  INVALID_DATE: '日期格式不正确',
  INVALID_URL: '网址格式不正确',
  INVALID_PHONE: '手机号格式不正确',
  SELECT_OPTION: '请选择',
  ENTER_TEXT: '请输入',
  CHOOSE_FILE: '选择文件',
  UPLOAD_FILE: '上传文件',
  DROP_FILE_HERE: '拖拽文件到此处',
  FILE_TOO_LARGE: '文件过大',
  INVALID_FILE_TYPE: '文件类型不支持',
} as const

// ============================================================================
// 操作确认文本
// ============================================================================

export const CONFIRMATION_UI = {
  DELETE_CONFIRM: '确定要删除吗？',
  DELETE_CONFIRM_DETAIL: '此操作不可撤销',
  CLEAR_CONFIRM: '确定要清空吗？',
  RESET_CONFIRM: '确定要重置吗？',
  LOGOUT_CONFIRM: '确定要退出登录吗？',
  DISCARD_CHANGES: '确定要放弃更改吗？',
  OVERWRITE_CONFIRM: '确定要覆盖现有数据吗？',
  PERMANENT_ACTION: '此操作无法撤销',
  DATA_LOSS_WARNING: '未保存的数据将丢失',
} as const

// ============================================================================
// 状态提示文本
// ============================================================================

export const STATUS_UI = {
  SUCCESS: '操作成功',
  ERROR: '操作失败',
  WARNING: '警告',
  INFO: '提示',
  SAVED: '已保存',
  DELETED: '已删除',
  CREATED: '已创建',
  UPDATED: '已更新',
  UPLOADED: '已上传',
  DOWNLOADED: '已下载',
  COPIED: '已复制',
  SENT: '已发送',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  EXPIRED: '已过期',
  PENDING: '待处理',
  IN_PROGRESS: '进行中',
  FAILED: '失败',
  TIMEOUT: '超时',
  OFFLINE: '离线',
  ONLINE: '在线',
  CONNECTED: '已连接',
  DISCONNECTED: '已断开',
} as const

// ============================================================================
// 导航相关文本
// ============================================================================

export const NAVIGATION_UI = {
  HOME: '首页',
  DASHBOARD: '仪表板',
  ACCOUNTS: '账户',
  TRANSACTIONS: '交易',
  CATEGORIES: '分类',
  TAGS: '标签',
  REPORTS: '报表',
  SETTINGS: '设置',
  PROFILE: '个人资料',
  LOGOUT: '退出登录',
  LOGIN: '登录',
  REGISTER: '注册',
  FORGOT_PASSWORD: '忘记密码',
  RESET_PASSWORD: '重置密码',
  CHANGE_PASSWORD: '修改密码',
  ACCOUNT_SETTINGS: '账户设置',
  PRIVACY_SETTINGS: '隐私设置',
  NOTIFICATION_SETTINGS: '通知设置',
  LANGUAGE_SETTINGS: '语言设置',
  THEME_SETTINGS: '主题设置',
} as const

// ============================================================================
// 时间相关文本
// ============================================================================

export const TIME_UI = {
  TODAY: '今天',
  YESTERDAY: '昨天',
  TOMORROW: '明天',
  THIS_WEEK: '本周',
  LAST_WEEK: '上周',
  NEXT_WEEK: '下周',
  THIS_MONTH: '本月',
  LAST_MONTH: '上月',
  NEXT_MONTH: '下月',
  THIS_YEAR: '今年',
  LAST_YEAR: '去年',
  NEXT_YEAR: '明年',
  RECENT: '最近',
  LATEST: '最新',
  OLDEST: '最早',
  CUSTOM_RANGE: '自定义范围',
  DATE_RANGE: '日期范围',
  START_DATE: '开始日期',
  END_DATE: '结束日期',
  DURATION: '时长',
  FREQUENCY: '频率',
  DAILY: '每日',
  WEEKLY: '每周',
  MONTHLY: '每月',
  QUARTERLY: '每季度',
  YEARLY: '每年',
} as const

// ============================================================================
// 数据相关文本
// ============================================================================

export const DATA_UI = {
  TOTAL: '总计',
  SUBTOTAL: '小计',
  AMOUNT: '金额',
  QUANTITY: '数量',
  PRICE: '价格',
  RATE: '汇率',
  PERCENTAGE: '百分比',
  AVERAGE: '平均',
  MAXIMUM: '最大',
  MINIMUM: '最小',
  COUNT: '计数',
  SUM: '求和',
  BALANCE: '余额',
  INCOME: '收入',
  EXPENSE: '支出',
  PROFIT: '利润',
  LOSS: '亏损',
  GROWTH: '增长',
  DECLINE: '下降',
  CHANGE: '变化',
  TREND: '趋势',
  COMPARISON: '对比',
  ANALYSIS: '分析',
  STATISTICS: '统计',
  SUMMARY: '摘要',
  OVERVIEW: '概览',
} as const

// ============================================================================
// 导出所有UI文本
// ============================================================================

export const UI_MESSAGES = {
  COMMON: COMMON_UI,
  FORM: FORM_UI,
  CONFIRMATION: CONFIRMATION_UI,
  STATUS: STATUS_UI,
  NAVIGATION: NAVIGATION_UI,
  TIME: TIME_UI,
  DATA: DATA_UI,
} as const

// ============================================================================
// 类型定义
// ============================================================================

export type UiMessageCategory = keyof typeof UI_MESSAGES
export type CommonUiKey = keyof typeof COMMON_UI
export type FormUiKey = keyof typeof FORM_UI
export type ConfirmationUiKey = keyof typeof CONFIRMATION_UI
export type StatusUiKey = keyof typeof STATUS_UI
export type NavigationUiKey = keyof typeof NAVIGATION_UI
export type TimeUiKey = keyof typeof TIME_UI
export type DataUiKey = keyof typeof DATA_UI

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取UI文本
 */
export function getUiMessage(category: UiMessageCategory, key: string): string {
  const messages = UI_MESSAGES[category] as Record<string, string>
  return messages[key] || key
}

/**
 * 获取通用UI文本
 */
export function getCommonUi(key: CommonUiKey): string {
  return COMMON_UI[key]
}

/**
 * 获取表单UI文本
 */
export function getFormUi(key: FormUiKey): string {
  return FORM_UI[key]
}

/**
 * 获取确认UI文本
 */
export function getConfirmationUi(key: ConfirmationUiKey): string {
  return CONFIRMATION_UI[key]
}

/**
 * 获取状态UI文本
 */
export function getStatusUi(key: StatusUiKey): string {
  return STATUS_UI[key]
}

/**
 * 获取导航UI文本
 */
export function getNavigationUi(key: NavigationUiKey): string {
  return NAVIGATION_UI[key]
}

/**
 * 获取时间UI文本
 */
export function getTimeUi(key: TimeUiKey): string {
  return TIME_UI[key]
}

/**
 * 获取数据UI文本
 */
export function getDataUi(key: DataUiKey): string {
  return DATA_UI[key]
}
