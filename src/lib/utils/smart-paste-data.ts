/**
 * 智能粘贴表格数据工具
 * Smart Paste Grid Data Utils
 */

import type {
  SmartPasteRowData,
  SmartPasteColumn,
  CellData,
  AccountType,
} from '@/types/core'

/**
 * 创建空的单元格数据
 */
export function createEmptyCell(column: SmartPasteColumn): CellData {
  return {
    value: column.defaultValue || null,
    displayValue: '',
    dataType: column.dataType,
    isRequired: column.isRequired,
    isReadOnly: column.isReadOnly,
    validationStatus: 'empty',
    errors: [],
  }
}

/**
 * 创建空的行数据
 */
export function createEmptyRow(
  columns: SmartPasteColumn[],
  index: number = 0
): SmartPasteRowData {
  const id = `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const cells: Record<string, CellData> = {}
  columns.forEach(column => {
    cells[column.key] = createEmptyCell(column)
  })

  return {
    id,
    index,
    isNew: true,
    isModified: false,
    isSelected: false,
    validationStatus: 'empty',
    errors: [],
    cells,
    originalData: {},
  }
}

/**
 * 创建多个空行
 */
export function createEmptyRows(
  columns: SmartPasteColumn[],
  count: number = 5
): SmartPasteRowData[] {
  return Array.from({ length: count }, (_, index) =>
    createEmptyRow(columns, index)
  )
}

/**
 * 从粘贴数据创建行数据
 */
export function createRowsFromPasteData(
  pasteData: string[][],
  columns: SmartPasteColumn[],
  startIndex: number = 0
): SmartPasteRowData[] {
  return pasteData.map((rowValues, index) => {
    const id = `row_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`

    const cells: Record<string, CellData> = {}

    columns.forEach((column, columnIndex) => {
      const rawValue = rowValues[columnIndex] || ''
      let processedValue: unknown = rawValue.trim()

      // 根据数据类型处理值
      switch (column.dataType) {
        case 'number':
        case 'currency':
          // 移除货币符号、千分位分隔符和空格，然后解析数值
          const cleanedValue = (processedValue as string).replace(
            /[￥$€£¥,\s]/g,
            ''
          )
          const numValue = parseFloat(cleanedValue)
          processedValue = isNaN(numValue) ? null : numValue
          break

        case 'date':
          try {
            if (processedValue) {
              // 尝试解析日期
              const dateValue = new Date(processedValue as string)
              processedValue = isNaN(dateValue.getTime()) ? null : dateValue
            } else {
              processedValue = null
            }
          } catch {
            processedValue = null
          }
          break

        case 'tags':
          if (processedValue) {
            // 将逗号分隔的字符串转换为数组
            processedValue = (processedValue as string)
              .split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)
          } else {
            processedValue = []
          }
          break

        default:
          processedValue = processedValue || null
      }

      cells[column.key] = {
        value: processedValue,
        displayValue: String(processedValue || ''),
        dataType: column.dataType,
        isRequired: column.isRequired,
        isReadOnly: column.isReadOnly,
        validationStatus: 'pending' as const,
        errors: [],
      }
    })

    return {
      id,
      index: startIndex + index,
      isNew: true,
      isModified: true,
      isSelected: false,
      validationStatus: 'partial' as const,
      errors: [],
      cells,
      originalData: {},
    }
  })
}

/**
 * 解析粘贴的文本数据
 */
export function parsePasteText(
  text: string,
  delimiter: string = '\t'
): string[][] {
  const lines = text.trim().split('\n')
  return lines.map(line => line.split(delimiter))
}

/**
 * 创建交易类型的默认列配置
 */
export function createTransactionColumns(
  accountType: AccountType,
  defaultCurrency?: {
    code: string
    symbol: string
    decimalPlaces: number
  },
  options?: {
    includeAccountColumn?: boolean
    isStockAccount?: boolean
  }
): SmartPasteColumn[] {
  const currency = defaultCurrency || {
    code: 'CNY',
    symbol: '¥',
    decimalPlaces: 2,
  }

  const baseColumns: SmartPasteColumn[] = []

  // 根据选项决定是否包含账户列，如果包含则放在第一列
  if (options?.includeAccountColumn) {
    baseColumns.push({
      key: 'account',
      title: '账户',
      dataType: 'account',
      width: 150,
      isRequired: true,
      isReadOnly: false,
      editMode: 'dropdown',
      validation: { required: true },
      defaultValue: null,
      placeholder: '请选择账户',
      helpText: '选择交易账户',
    })
  }

  // 添加其他列
  baseColumns.push(
    {
      key: 'date',
      title: '日期',
      dataType: 'date',
      width: 120,
      isRequired: true,
      isReadOnly: false,
      editMode: 'inline',
      validation: { required: true },
      defaultValue: null,
      placeholder: 'YYYY-MM-DD',
      helpText: '交易发生的日期',
    },
    {
      key: 'amount',
      title: '金额',
      dataType: 'currency',
      width: 120,
      isRequired: true,
      isReadOnly: false,
      editMode: 'inline',
      validation: { required: true, min: 0.01 },
      format: {
        currency: {
          code: currency.code,
          symbol: currency.symbol,
          decimalPlaces: currency.decimalPlaces,
        },
      },
      placeholder: '0.00',
      helpText: '交易金额，必须大于0',
    }
  )

  // 根据账户类型添加不同的列
  if (options?.isStockAccount) {
    // 存量账户：只需要备注列
    baseColumns.push({
      key: 'notes',
      title: '备注',
      dataType: 'text',
      width: 200,
      isRequired: false,
      isReadOnly: false,
      editMode: 'inline',
      validation: { max: 1000 },
      placeholder: '可选备注',
      helpText: '详细备注信息（可选）',
    })
  } else {
    // 流量账户：需要描述、备注和标签列
    baseColumns.push(
      {
        key: 'description',
        title: '描述',
        dataType: 'text',
        width: 200,
        isRequired: true,
        isReadOnly: false,
        editMode: 'inline',
        validation: { required: true, min: 1, max: 200 },
        placeholder: '请输入交易描述',
        helpText: '简要描述这笔交易',
      },
      {
        key: 'notes',
        title: '备注',
        dataType: 'text',
        width: 150,
        isRequired: false,
        isReadOnly: false,
        editMode: 'inline',
        validation: { max: 1000 },
        placeholder: '可选备注',
        helpText: '详细备注信息（可选）',
      },
      {
        key: 'tags',
        title: '标签',
        dataType: 'tags',
        width: 150,
        isRequired: false,
        isReadOnly: false,
        editMode: 'modal',
        validation: {},
        defaultValue: [],
        helpText: '为交易添加标签（可选）',
      }
    )
  }

  return baseColumns
}

/**
 * 生成示例数据
 */
export function generateSampleData(
  columns: SmartPasteColumn[],
  accountType: AccountType,
  count: number = 3
): SmartPasteRowData[] {
  const sampleData =
    accountType === 'INCOME'
      ? [
          ['2024-01-15', '5000.00', '工资', '月薪'],
          ['2024-01-10', '200.00', '兼职收入', '周末兼职'],
          ['2024-01-05', '50.00', '利息收入', '银行存款利息'],
        ]
      : [
          ['2024-01-15', '50.00', '午餐', '麦当劳'],
          ['2024-01-15', '25.50', '交通', '地铁费用'],
          ['2024-01-16', '120.00', '购物', '超市采购'],
        ]

  return createRowsFromPasteData(sampleData.slice(0, count), columns, 0)
}

/**
 * 导出数据为CSV格式
 */
export function exportToCSV(
  data: SmartPasteRowData[],
  columns: SmartPasteColumn[]
): string {
  // 创建表头
  const headers = columns.map(col => col.title)

  // 创建数据行
  const rows = data.map(row => {
    return columns.map(col => {
      const cell = row.cells[col.key]
      if (!cell) return ''

      let value = cell.value

      // 格式化特殊类型
      if (col.dataType === 'date' && value instanceof Date) {
        value = value.toISOString().split('T')[0]
      } else if (col.dataType === 'tags' && Array.isArray(value)) {
        value = value.join(', ')
      }

      return String(value || '')
    })
  })

  // 组合CSV内容
  const csvContent = [headers, ...rows]
    .map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n')

  return csvContent
}

/**
 * 从CSV导入数据
 */
export function importFromCSV(
  csvText: string,
  columns: SmartPasteColumn[],
  hasHeader: boolean = true
): SmartPasteRowData[] {
  const lines = csvText.trim().split('\n')

  // 解析CSV行
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++ // 跳过下一个引号
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }

    result.push(current)
    return result
  }

  // 跳过表头（如果有）
  const dataLines = hasHeader ? lines.slice(1) : lines

  // 解析数据
  const parsedData = dataLines.map(line => parseCSVLine(line))

  return createRowsFromPasteData(parsedData, columns, 0)
}
