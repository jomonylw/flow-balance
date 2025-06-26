import type { CellPosition, CellSelection } from '@/types/core'

/**
 * 智能表格单元格选择管理工具
 */

/**
 * 创建单元格键值
 */
export function createCellKey(rowIndex: number, columnIndex: number): string {
  return `${rowIndex}:${columnIndex}`
}

/**
 * 解析单元格键值
 */
export function parseCellKey(cellKey: string): {
  rowIndex: number
  columnIndex: number
} {
  const [rowIndex, columnIndex] = cellKey.split(':').map(Number)
  return { rowIndex, columnIndex }
}

/**
 * 创建空的选择状态
 */
export function createEmptySelection(): CellSelection {
  return {
    selectedCells: new Set(),
    activeCell: null,
    selectionRange: null,
    copyState: null,
  }
}

/**
 * 选择单个单元格
 */
export function selectSingleCell(
  selection: CellSelection,
  position: CellPosition
): CellSelection {
  const cellKey = createCellKey(position.rowIndex, position.columnIndex)

  return {
    ...selection,
    selectedCells: new Set([cellKey]),
    activeCell: position,
    selectionRange: null,
  }
}

/**
 * 切换单元格选择状态（Ctrl+点击）
 */
export function toggleCellSelection(
  selection: CellSelection,
  position: CellPosition
): CellSelection {
  const cellKey = createCellKey(position.rowIndex, position.columnIndex)
  const newSelectedCells = new Set(selection.selectedCells)

  if (newSelectedCells.has(cellKey)) {
    newSelectedCells.delete(cellKey)
  } else {
    newSelectedCells.add(cellKey)
  }

  return {
    ...selection,
    selectedCells: newSelectedCells,
    activeCell: position,
    selectionRange: null,
  }
}

/**
 * 范围选择（Shift+点击）
 */
export function selectRange(
  selection: CellSelection,
  endPosition: CellPosition
): CellSelection {
  if (!selection.activeCell) {
    return selectSingleCell(selection, endPosition)
  }

  const start = selection.activeCell
  const end = endPosition

  const minRow = Math.min(start.rowIndex, end.rowIndex)
  const maxRow = Math.max(start.rowIndex, end.rowIndex)
  const minCol = Math.min(start.columnIndex, end.columnIndex)
  const maxCol = Math.max(start.columnIndex, end.columnIndex)

  const selectedCells = new Set<string>()

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      selectedCells.add(createCellKey(row, col))
    }
  }

  return {
    ...selection,
    selectedCells,
    activeCell: selection.activeCell,
    selectionRange: { start, end },
  }
}

/**
 * 清除选择
 */
export function clearSelection(selection: CellSelection): CellSelection {
  return {
    ...selection,
    selectedCells: new Set(),
    activeCell: null,
    selectionRange: null,
  }
}

/**
 * 设置复制状态
 */
export function setCopyState(
  selection: CellSelection,
  copiedCells?: Set<string>
): CellSelection {
  const cellsToCopy = copiedCells || selection.selectedCells

  return {
    ...selection,
    copyState: {
      copiedCells: new Set(cellsToCopy),
      copyTimestamp: Date.now(),
    },
  }
}

/**
 * 清除复制状态
 */
export function clearCopyState(selection: CellSelection): CellSelection {
  return {
    ...selection,
    copyState: null,
  }
}

/**
 * 检查单元格是否被选中
 */
export function isCellSelected(
  selection: CellSelection,
  rowIndex: number,
  columnIndex: number
): boolean {
  const cellKey = createCellKey(rowIndex, columnIndex)
  return selection.selectedCells.has(cellKey)
}

/**
 * 检查单元格是否被复制
 */
export function isCellCopied(
  selection: CellSelection,
  rowIndex: number,
  columnIndex: number
): boolean {
  if (!selection.copyState) return false

  const cellKey = createCellKey(rowIndex, columnIndex)
  return selection.copyState.copiedCells.has(cellKey)
}

/**
 * 检查单元格是否是活动单元格
 */
export function isCellActive(
  selection: CellSelection,
  rowIndex: number,
  columnIndex: number
): boolean {
  if (!selection.activeCell) return false

  return (
    selection.activeCell.rowIndex === rowIndex &&
    selection.activeCell.columnIndex === columnIndex
  )
}

/**
 * 获取选中单元格的数据
 */
export function getSelectedCellsData(
  selection: CellSelection,
  data: Array<any>, // 支持SmartPasteRowData或简单对象
  columns: Array<{ key: string; dataType?: string }>
): Array<{ position: CellPosition; value: unknown; dataType: string }> {
  const result: Array<{
    position: CellPosition
    value: unknown
    dataType: string
  }> = []

  selection.selectedCells.forEach(cellKey => {
    const { rowIndex, columnIndex } = parseCellKey(cellKey)

    if (rowIndex < data.length && columnIndex < columns.length) {
      const column = columns[columnIndex]
      const rowData = data[rowIndex]

      // 支持SmartPasteRowData结构
      let value: unknown
      let dataType: string

      if (rowData.cells && rowData.cells[column.key]) {
        // SmartPasteRowData结构
        const cellData = rowData.cells[column.key]
        value = cellData.value
        dataType = cellData.dataType
      } else {
        // 简单对象结构
        value = rowData[column.key]
        dataType = column.dataType || typeof value
      }

      result.push({
        position: {
          rowIndex,
          columnIndex,
          columnKey: column.key,
        },
        value,
        dataType,
      })
    }
  })

  return result
}

/**
 * 复制状态是否过期（用于动画效果）
 */
export function isCopyStateExpired(
  selection: CellSelection,
  expirationTime: number = 3000
): boolean {
  if (!selection.copyState) return true

  return Date.now() - selection.copyState.copyTimestamp > expirationTime
}
