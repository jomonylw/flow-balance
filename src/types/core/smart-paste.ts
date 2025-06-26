/**
 * 智能粘贴表格相关类型定义
 * Smart Paste Grid Types
 */

// ============================================================================
// 基础类型
// ============================================================================

/** 单元格位置 */
export interface CellPosition {
  rowIndex: number
  columnIndex: number
  columnKey: string
}

/** 单元格选择范围 */
export interface CellRange {
  start: CellPosition
  end: CellPosition
}

/** 单元格选择状态 */
export interface CellSelection {
  selectedCells: Set<string> // 格式: "rowIndex:columnIndex"
  activeCell: CellPosition | null
  selectionRange: CellRange | null
  copyState: {
    copiedCells: Set<string>
    copyTimestamp: number
  } | null
}

/** 单元格验证状态 */
export type CellValidationStatus =
  | 'empty'
  | 'pending'
  | 'valid'
  | 'invalid'
  | 'warning'

/** 行验证状态 */
export type RowValidationStatus = 'empty' | 'partial' | 'valid' | 'invalid'

/** 表格验证状态 */
export type GridValidationStatus = 'empty' | 'partial' | 'valid' | 'invalid'

/** 单元格验证错误 */
export interface CellValidationError {
  type: 'required' | 'format' | 'range' | 'duplicate' | 'reference' | 'custom'
  code?: string
  message: string
  severity: 'error' | 'warning'
}

/** 单元格数据类型 */
export type CellDataType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'account'
  | 'category'
  | 'tags'

/** 单元格数据 */
export interface CellData {
  value: unknown
  displayValue: string
  dataType: CellDataType
  isRequired: boolean
  isReadOnly: boolean
  validationStatus: CellValidationStatus
  errors: string[]
  options?: Array<{ value: unknown; label: string; [key: string]: unknown }>
  isSelected?: boolean
  isCopied?: boolean
}

/** 智能粘贴行数据 */
export interface SmartPasteRowData {
  id: string
  index: number
  isNew: boolean
  isModified: boolean
  isSelected: boolean
  validationStatus: RowValidationStatus
  errors: string[]
  cells: Record<string, CellData>
  originalData: Record<string, unknown>
}

// ============================================================================
// 列配置类型
// ============================================================================

/** 智能粘贴列配置 */
export interface SmartPasteColumn {
  key: string
  title: string
  dataType: CellDataType
  width?: number | string
  minWidth?: number
  maxWidth?: number
  isRequired: boolean
  isReadOnly: boolean
  isHidden?: boolean
  defaultValue?: unknown
  placeholder?: string
  validation?: {
    required?: boolean
    min?: number
    max?: number
    pattern?: RegExp
    custom?: (
      value: unknown,
      rowData: SmartPasteRowData
    ) => CellValidationError | null
  }
  format?: {
    currency?: {
      code: string
      symbol: string
      decimalPlaces: number
    }
    number?: {
      decimalPlaces: number
      thousandSeparator: boolean
    }
    date?: {
      format: string
    }
  }
  options?: Array<{ value: unknown; label: string; [key: string]: unknown }>
  formatter?: (value: unknown) => string
  parser?: (text: string) => unknown
  editMode?: 'inline' | 'dropdown' | 'modal'
  helpText?: string
}

// ============================================================================
// 配置类型
// ============================================================================

/** 粘贴配置 */
export interface PasteConfig {
  delimiter: string
  hasHeader: boolean
  skipEmptyRows: boolean
  trimWhitespace: boolean
  maxRows: number
  autoDetectFormat: boolean
}

/** 键盘快捷键配置 */
export interface KeyboardShortcuts {
  copy: string[]
  paste: string[]
  undo: string[]
  redo: string[]
  delete: string[]
  selectAll: string[]
  fillDown: string[]
  insertRow: string[]
  deleteRow: string[]
  save: string[]
  validate: string[]
}

/** 智能粘贴表格配置 */
export interface SmartPasteGridConfig {
  columns: SmartPasteColumn[]
  defaultRowData: Record<string, unknown>
  maxRows: number
  minRows: number
  allowAddRows: boolean
  allowDeleteRows: boolean
  allowReorderRows: boolean
  enableUndo: boolean
  enableKeyboardShortcuts: boolean
  pasteConfig: PasteConfig
  keyboardShortcuts: KeyboardShortcuts
  validationMode: 'onChange' | 'onBlur' | 'onSubmit'
  autoSave: boolean
  autoSaveInterval: number
}

// ============================================================================
// 事件类型
// ============================================================================

/** 单元格编辑事件 */
export interface CellEditEvent {
  position: CellPosition
  oldValue: unknown
  newValue: unknown
  rowData: SmartPasteRowData
}

/** 行操作事件 */
export interface RowOperationEvent {
  type: 'add' | 'delete' | 'move' | 'select'
  rowIndex: number
  rowData?: SmartPasteRowData
  targetIndex?: number
}

/** 粘贴事件 */
export interface PasteEvent {
  data: string[][]
  startPosition: CellPosition
  affectedRows: number[]
  newRowsCount: number
}

/** 验证事件 */
export interface ValidationEvent {
  type: 'cell' | 'row' | 'grid'
  position?: CellPosition
  rowIndex?: number
  status: CellValidationStatus | RowValidationStatus | GridValidationStatus
  errors: string[]
}

// ============================================================================
// 历史记录类型
// ============================================================================

/** 历史记录条目类型 */
export interface HistoryEntry {
  type: 'edit' | 'paste' | 'add_row' | 'delete_row' | 'bulk_operation'
  timestamp: number
  description: string
  beforeState: SmartPasteRowData[]
  afterState: SmartPasteRowData[]
  metadata?: {
    position?: CellPosition
    rowCount?: number
    affectedRows?: number[]
  }
}

/** 历史记录管理器接口 */
export interface HistoryManager {
  push: (entry: HistoryEntry) => void
  canUndo: () => boolean
  canRedo: () => boolean
  undo: () => SmartPasteRowData[] | null
  redo: () => SmartPasteRowData[] | null
  clear: () => void
  getState: () => {
    past: HistoryEntry[]
    future: HistoryEntry[]
    maxSize: number
  }
}

// ============================================================================
// 组件 Props 类型
// ============================================================================

/** 智能粘贴表格组件 Props */
export interface SmartPasteGridProps {
  config: SmartPasteGridConfig
  data: SmartPasteRowData[]
  selectedAccount?: any
  availableAccounts?: any[]
  availableCategories?: any[]
  availableCurrencies?: any[]
  availableTags?: Array<{ id: string; name: string; color?: string }>
  onDataChange: (data: SmartPasteRowData[]) => void
  onCellEdit?: (event: CellEditEvent) => void
  onRowOperation?: (event: RowOperationEvent) => void
  onPaste?: (event: PasteEvent) => void
  onValidation?: (event: ValidationEvent) => void
  onSubmit?: (data: SmartPasteRowData[]) => void
  isLoading?: boolean
  isReadOnly?: boolean
  showValidationSummary?: boolean
  className?: string
  height?: string
  width?: string
}

// ============================================================================
// 业务相关类型
// ============================================================================

/** 交易批量配置 */
export interface TransactionBatchConfig {
  accountType?: import('./constants').AccountType
  selectedAccount?: {
    id: string
    name: string
    categoryId: string
    currencyCode: string
  }
  showAccountSelector?: boolean
  allowMultipleAccounts?: boolean
}

/** 交易批量结果 */
export interface TransactionBatchResult {
  success: boolean
  created: number
  updated: number
  failed: number
  errors: string[]
  transactions?: Array<{
    id: string
    amount: number
    description: string
    date: string
  }>
}
