/**
 * 智能粘贴表格数据验证工具
 * Smart Paste Grid Validation Utils
 */

import type {
  SmartPasteColumn,
  SmartPasteRowData,
  CellData,
  CellValidationError,
  CellValidationStatus,
  RowValidationStatus,
  GridValidationStatus,
} from '@/types/core'

/**
 * 验证单个单元格数据
 */
export function validateCell(
  value: unknown,
  column: SmartPasteColumn,
  rowData: SmartPasteRowData
): { status: CellValidationStatus; errors: CellValidationError[] } {
  const errors: CellValidationError[] = []

  // 检查必填字段
  if (
    column.isRequired &&
    (value === null || value === undefined || value === '')
  ) {
    errors.push({
      type: 'required',
      code: 'REQUIRED',
      message: `${column.title}是必填字段`,
      severity: 'error',
    })
  }

  // 如果值为空且不是必填，则跳过其他验证
  if (value === null || value === undefined || value === '') {
    return {
      status: column.isRequired ? 'invalid' : 'empty',
      errors,
    }
  }

  // 根据数据类型进行验证
  switch (column.dataType) {
    case 'number':
    case 'currency':
      validateNumber(value, column, errors)
      break

    case 'date':
      validateDate(value, column, errors)
      break

    case 'text':
      validateText(value, column, errors)
      break

    case 'account':
      validateAccount(value, column, errors)
      break

    case 'category':
      validateCategory(value, column, errors)
      break

    case 'tags':
      validateTags(value, column, errors)
      break
  }

  // 执行自定义验证
  if (column.validation?.custom) {
    const customError = column.validation.custom(value, rowData)
    if (customError) {
      errors.push(customError)
    }
  }

  // 确定验证状态
  const hasErrors = errors.some(e => e.severity === 'error')
  const hasWarnings = errors.some(e => e.severity === 'warning')

  let status: CellValidationStatus
  if (hasErrors) {
    status = 'invalid'
  } else if (hasWarnings) {
    status = 'pending'
  } else {
    status = 'valid'
  }

  return { status, errors }
}

/**
 * 验证数字类型
 */
function validateNumber(
  value: unknown,
  column: SmartPasteColumn,
  errors: CellValidationError[]
): void {
  const numValue = typeof value === 'number' ? value : parseFloat(String(value))

  if (isNaN(numValue)) {
    errors.push({
      type: 'format',
      code: 'INVALID_NUMBER',
      message: '请输入有效的数字',
      severity: 'error',
    })
    return
  }

  // 检查最小值
  if (
    column.validation?.min !== undefined &&
    numValue < column.validation.min
  ) {
    errors.push({
      type: 'range',
      code: 'MIN_VALUE',
      message: `值不能小于 ${column.validation.min}`,
      severity: 'error',
    })
  }

  // 检查最大值
  if (
    column.validation?.max !== undefined &&
    numValue > column.validation.max
  ) {
    errors.push({
      type: 'range',
      code: 'MAX_VALUE',
      message: `值不能大于 ${column.validation.max}`,
      severity: 'error',
    })
  }

  // 对于货币类型，检查小数位数
  if (column.dataType === 'currency' && column.format?.currency) {
    const decimalPlaces = column.format.currency.decimalPlaces
    const valueStr = numValue.toFixed(decimalPlaces + 2)
    const actualDecimalPlaces = (valueStr.split('.')[1] || '').replace(
      /0+$/,
      ''
    ).length

    if (actualDecimalPlaces > decimalPlaces) {
      errors.push({
        type: 'format',
        code: 'DECIMAL_PLACES',
        message: `建议保持 ${decimalPlaces} 位小数，当前为 ${actualDecimalPlaces} 位`,
        severity: 'warning',
      })
    }
  }
}

/**
 * 验证日期类型
 */
function validateDate(
  value: unknown,
  column: SmartPasteColumn,
  errors: CellValidationError[]
): void {
  let dateValue: Date

  if (value instanceof Date) {
    dateValue = value
  } else {
    dateValue = new Date(String(value))
  }

  if (isNaN(dateValue.getTime())) {
    errors.push({
      type: 'format',
      code: 'INVALID_DATE',
      message: '请输入有效的日期',
      severity: 'error',
    })
    return
  }

  // 检查日期范围（如果有配置）
  const now = new Date()
  const oneYearAgo = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate()
  )
  const oneYearLater = new Date(
    now.getFullYear() + 1,
    now.getMonth(),
    now.getDate()
  )

  if (dateValue < oneYearAgo) {
    errors.push({
      type: 'range',
      code: 'DATE_TOO_OLD',
      message: '日期较为久远，请确认是否正确',
      severity: 'warning',
    })
  }

  if (dateValue > oneYearLater) {
    errors.push({
      type: 'range',
      code: 'DATE_TOO_FUTURE',
      message: '日期为未来时间，请确认是否正确',
      severity: 'warning',
    })
  }
}

/**
 * 验证文本类型
 */
function validateText(
  value: unknown,
  column: SmartPasteColumn,
  errors: CellValidationError[]
): void {
  const textValue = String(value)

  // 检查长度
  if (
    column.validation?.min !== undefined &&
    textValue.length < column.validation.min
  ) {
    errors.push({
      type: 'range',
      code: 'MIN_LENGTH',
      message: `长度不能少于 ${column.validation.min} 个字符`,
      severity: 'error',
    })
  }

  if (
    column.validation?.max !== undefined &&
    textValue.length > column.validation.max
  ) {
    errors.push({
      type: 'range',
      code: 'MAX_LENGTH',
      message: `长度不能超过 ${column.validation.max} 个字符`,
      severity: 'error',
    })
  }

  // 检查正则表达式
  if (
    column.validation?.pattern &&
    !column.validation.pattern.test(textValue)
  ) {
    errors.push({
      type: 'format',
      code: 'PATTERN_MISMATCH',
      message: '格式不正确',
      severity: 'error',
    })
  }
}

/**
 * 验证账户类型
 */
function validateAccount(
  value: unknown,
  column: SmartPasteColumn,
  errors: CellValidationError[]
): void {
  if (!value || typeof value !== 'string') {
    errors.push({
      type: 'reference',
      code: 'INVALID_ACCOUNT',
      message: '请选择有效的账户',
      severity: 'error',
    })
    return
  }

  // 检查账户是否在选项列表中
  if (
    column.options &&
    !column.options.some(option => option.value === value)
  ) {
    errors.push({
      type: 'reference',
      code: 'ACCOUNT_NOT_FOUND',
      message: '账户不存在',
      severity: 'error',
    })
  }
}

/**
 * 验证分类类型
 */
function validateCategory(
  value: unknown,
  column: SmartPasteColumn,
  errors: CellValidationError[]
): void {
  if (!value || typeof value !== 'string') {
    errors.push({
      type: 'reference',
      code: 'INVALID_CATEGORY',
      message: '请选择有效的分类',
      severity: 'error',
    })
    return
  }

  // 检查分类是否在选项列表中
  if (
    column.options &&
    !column.options.some(option => option.value === value)
  ) {
    errors.push({
      type: 'reference',
      code: 'CATEGORY_NOT_FOUND',
      message: '分类不存在',
      severity: 'error',
    })
  }
}

/**
 * 验证标签类型
 */
function validateTags(
  value: unknown,
  column: SmartPasteColumn,
  errors: CellValidationError[]
): void {
  if (!Array.isArray(value)) {
    errors.push({
      type: 'format',
      code: 'INVALID_TAGS',
      message: '标签必须是数组格式',
      severity: 'error',
    })
    return
  }

  // 检查标签是否存在
  if (column.options) {
    const validTagIds = column.options.map(option => option.value)
    const invalidTags = value.filter(tagId => !validTagIds.includes(tagId))

    if (invalidTags.length > 0) {
      errors.push({
        type: 'reference',
        code: 'TAGS_NOT_FOUND',
        message: `标签 "${invalidTags.join(', ')}" 不存在，将自动忽略`,
        severity: 'warning',
      })
    }
  }
}

/**
 * 判断行是否应该被验证
 * 只有当用户开始输入必填项时才验证该行
 */
export function shouldValidateRow(
  rowData: SmartPasteRowData,
  columns: SmartPasteColumn[]
): boolean {
  // 获取必填列
  const requiredColumns = columns.filter(col => col.isRequired)

  // 检查是否有任何必填项被填写
  for (const column of requiredColumns) {
    const cellData = rowData.cells[column.key]
    if (
      cellData &&
      cellData.value !== undefined &&
      cellData.value !== null &&
      cellData.value !== ''
    ) {
      // 对于数组类型（如标签），检查是否有内容
      if (Array.isArray(cellData.value) && cellData.value.length > 0) {
        return true
      }
      // 对于其他类型，检查是否有值
      if (!Array.isArray(cellData.value)) {
        return true
      }
    }
  }

  return false
}

/**
 * 验证整行数据
 */
export function validateRow(
  rowData: SmartPasteRowData,
  columns: SmartPasteColumn[]
): RowValidationStatus {
  // 如果行不应该被验证，返回empty状态
  if (!shouldValidateRow(rowData, columns)) {
    return 'empty'
  }

  let hasErrors = false
  let hasWarnings = false
  let hasValidCells = false
  // let hasEmptyCells = false

  for (const column of columns) {
    const cellData = rowData.cells[column.key]
    if (!cellData) continue

    switch (cellData.validationStatus) {
      case 'invalid':
        hasErrors = true
        break
      case 'pending':
        hasWarnings = true
        break
      case 'valid':
        hasValidCells = true
        break
      case 'empty':
        // hasEmptyCells = true
        break
    }
  }

  if (hasErrors) {
    return 'invalid'
  } else if (hasWarnings) {
    return 'partial'
  } else if (hasValidCells) {
    return 'valid'
  } else {
    return 'empty'
  }
}

/**
 * 验证整个表格数据
 */
export function validateGrid(
  data: SmartPasteRowData[],
  _columns: SmartPasteColumn[]
): GridValidationStatus {
  if (data.length === 0) {
    return 'empty'
  }

  let hasErrors = false
  let hasWarnings = false
  let hasValidRows = false

  for (const rowData of data) {
    switch (rowData.validationStatus) {
      case 'invalid':
        hasErrors = true
        break
      case 'partial':
        hasWarnings = true
        break
      case 'valid':
        hasValidRows = true
        break
    }
  }

  if (hasErrors) {
    return 'invalid'
  } else if (hasWarnings) {
    return 'partial'
  } else if (hasValidRows) {
    return 'valid'
  } else {
    return 'empty'
  }
}

/**
 * 更新单元格数据的验证状态
 */
export function updateCellValidation(
  cellData: CellData,
  column: SmartPasteColumn,
  rowData: SmartPasteRowData
): CellData {
  const { status, errors } = validateCell(cellData.value, column, rowData)

  return {
    ...cellData,
    validationStatus: status,
    errors: errors.map(e => e.message), // 转换为字符串数组
  }
}

/**
 * 批量验证所有数据
 */
export function validateAllData(
  data: SmartPasteRowData[],
  columns: SmartPasteColumn[]
): SmartPasteRowData[] {
  return data.map(rowData => {
    // 检查是否应该验证这一行
    if (!shouldValidateRow(rowData, columns)) {
      // 如果不应该验证，清除所有验证状态，保持原始数据
      const clearedCells: Record<string, CellData> = {}

      for (const column of columns) {
        const cellData = rowData.cells[column.key]
        if (cellData) {
          clearedCells[column.key] = {
            ...cellData,
            validationStatus: 'empty',
            errors: [],
          }
        }
      }

      return {
        ...rowData,
        cells: clearedCells,
        validationStatus: 'empty',
      }
    }

    // 验证每个单元格
    const updatedCells: Record<string, CellData> = {}

    for (const column of columns) {
      const cellData = rowData.cells[column.key]
      if (cellData) {
        updatedCells[column.key] = updateCellValidation(
          cellData,
          column,
          rowData
        )
      }
    }

    // 更新行数据
    const updatedRowData: SmartPasteRowData = {
      ...rowData,
      cells: updatedCells,
    }

    // 验证整行
    updatedRowData.validationStatus = validateRow(updatedRowData, columns)

    return updatedRowData
  })
}
