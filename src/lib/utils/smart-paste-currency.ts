/**
 * 智能表格货币格式化工具
 * 处理混合账户情况下的动态货币格式化
 */

import type { SmartPasteColumn, SmartPasteRowData } from '@/types/core'

/**
 * 获取行数据中账户对应的货币信息
 * @param rowData 行数据
 * @param columns 列配置
 * @returns 货币信息或null
 */
export function getAccountCurrencyFromRow(
  rowData: SmartPasteRowData,
  columns: SmartPasteColumn[]
): { code: string; decimalPlaces: number } | null {
  // 查找账户列
  const accountColumn = columns.find(col => col.dataType === 'account')
  if (!accountColumn || !accountColumn.options) {
    return null
  }

  // 获取当前行选择的账户ID
  const selectedAccountId = rowData.cells?.account?.value
  if (!selectedAccountId) {
    return null
  }

  // 从账户选项中找到对应的账户数据
  const selectedAccountOption = accountColumn.options.find(
    opt => opt.value === selectedAccountId
  )

  if (!selectedAccountOption?.data) {
    return null
  }

  // 类型断言以访问账户数据
  const accountData = selectedAccountOption.data as any

  // 检查账户是否有货币信息
  if (accountData?.currency?.code) {
    return {
      code: accountData.currency.code,
      decimalPlaces: accountData.currency.decimalPlaces || 2,
    }
  }

  return null
}

/**
 * 获取金额列应该使用的货币信息
 * 优先级：行账户货币 > 列默认货币 > 系统默认
 * @param value 金额值
 * @param column 列配置
 * @param rowData 行数据
 * @param columns 所有列配置
 * @returns 货币格式化信息
 */
export function getCurrencyFormatInfo(
  value: unknown,
  column: SmartPasteColumn,
  rowData: SmartPasteRowData,
  columns: SmartPasteColumn[]
): {
  currencyCode: string
  decimalPlaces: number
  shouldFormat: boolean
} {
  // 只处理数字类型的值
  if (typeof value !== 'number') {
    return {
      currencyCode: 'CNY',
      decimalPlaces: 2,
      shouldFormat: false,
    }
  }

  // 尝试从行数据中获取账户货币信息（混合账户模式）
  const accountCurrency = getAccountCurrencyFromRow(rowData, columns)
  if (accountCurrency) {
    return {
      currencyCode: accountCurrency.code,
      decimalPlaces: accountCurrency.decimalPlaces,
      shouldFormat: true,
    }
  }

  // 回退到列的默认货币配置
  if (column.format?.currency) {
    return {
      currencyCode: column.format.currency.code,
      decimalPlaces: column.format.currency.decimalPlaces || 2,
      shouldFormat: true,
    }
  }

  // 最后回退到系统默认
  return {
    currencyCode: 'CNY',
    decimalPlaces: 2,
    shouldFormat: false,
  }
}

/**
 * 检查是否为混合账户模式
 * @param columns 列配置
 * @returns 是否为混合账户模式
 */
export function isMixedAccountMode(columns: SmartPasteColumn[]): boolean {
  return columns.some(col => col.dataType === 'account')
}

/**
 * 获取账户选择变化时需要更新的相关列
 * @param columns 列配置
 * @returns 需要更新的列键名数组
 */
export function getColumnsToUpdateOnAccountChange(
  columns: SmartPasteColumn[]
): string[] {
  const columnsToUpdate: string[] = []

  // 金额列需要更新货币格式化
  columns.forEach(col => {
    if (col.dataType === 'currency') {
      columnsToUpdate.push(col.key)
    }
  })

  return columnsToUpdate
}

/**
 * 为智能表格行数据添加货币格式化提示
 * @param rowData 行数据
 * @param columns 列配置
 * @returns 包含货币提示的行数据
 */
export function addCurrencyHintsToRow(
  rowData: SmartPasteRowData,
  columns: SmartPasteColumn[]
): SmartPasteRowData {
  const accountCurrency = getAccountCurrencyFromRow(rowData, columns)

  if (!accountCurrency) {
    return rowData
  }

  // 为金额列添加货币提示
  const updatedCells = { ...rowData.cells }

  columns.forEach(col => {
    if (col.dataType === 'currency' && updatedCells[col.key]) {
      updatedCells[col.key] = {
        ...updatedCells[col.key],
        currencyHint: accountCurrency.code,
        decimalPlacesHint: accountCurrency.decimalPlaces,
      }
    }
  })

  return {
    ...rowData,
    cells: updatedCells,
  }
}
