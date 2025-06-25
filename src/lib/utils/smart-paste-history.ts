import type {
  SmartPasteRowData,
  HistoryManager,
  HistoryEntry,
} from '@/types/core'

/**
 * 历史记录状态
 */
export type HistoryState = {
  past: HistoryEntry[]
  future: HistoryEntry[]
  maxSize: number
}

/**
 * 创建历史记录管理器
 */
export function createHistoryManager(maxSize: number = 50): HistoryManager {
  const state: HistoryState = {
    past: [],
    future: [],
    maxSize,
  }

  const push = (entry: HistoryEntry) => {
    // 添加到历史记录
    state.past.push(entry)

    // 清空future（因为有新操作）
    state.future = []

    // 限制历史记录大小
    if (state.past.length > state.maxSize) {
      state.past.shift()
    }
  }

  const canUndo = state.past.length > 0

  const canRedo = state.future.length > 0

  const undo = (): SmartPasteRowData[] | null => {
    if (!canUndo) return null

    const entry = state.past.pop()!
    state.future.push(entry)

    return entry.beforeState
  }

  const redo = (): SmartPasteRowData[] | null => {
    if (!canRedo) return null

    const entry = state.future.pop()!
    state.past.push(entry)

    return entry.afterState
  }

  const clear = () => {
    state.past = []
    state.future = []
  }

  const getState = () => ({ ...state })

  return {
    push,
    canUndo,
    canRedo,
    undo,
    redo,
    clear,
    getState,
  }
}

/**
 * 历史记录工具类
 */
export class HistoryUtils {
  /**
   * 创建编辑历史记录
   */
  static createEditHistory(
    beforeState: SmartPasteRowData[],
    afterState: SmartPasteRowData[],
    description: string
  ): HistoryEntry {
    return {
      type: 'edit',
      timestamp: Date.now(),
      description,
      beforeState: beforeState.map(row => ({ ...row })),
      afterState: afterState.map(row => ({ ...row })),
    }
  }

  /**
   * 创建粘贴历史记录
   */
  static createPasteHistory(
    beforeState: SmartPasteRowData[],
    afterState: SmartPasteRowData[],
    rowCount: number
  ): HistoryEntry {
    return {
      type: 'paste',
      timestamp: Date.now(),
      description: `粘贴 ${rowCount} 行数据`,
      beforeState: beforeState.map(row => ({ ...row })),
      afterState: afterState.map(row => ({ ...row })),
      metadata: {
        rowCount,
      },
    }
  }

  /**
   * 创建添加行历史记录
   */
  static createAddRowHistory(
    beforeState: SmartPasteRowData[],
    afterState: SmartPasteRowData[],
    rowCount: number
  ): HistoryEntry {
    return {
      type: 'add_row',
      timestamp: Date.now(),
      description: `添加 ${rowCount} 行`,
      beforeState: beforeState.map(row => ({ ...row })),
      afterState: afterState.map(row => ({ ...row })),
      metadata: {
        rowCount,
      },
    }
  }

  /**
   * 创建删除行历史记录
   */
  static createDeleteRowHistory(
    beforeState: SmartPasteRowData[],
    afterState: SmartPasteRowData[],
    rowCount: number
  ): HistoryEntry {
    return {
      type: 'delete_row',
      timestamp: Date.now(),
      description: `删除 ${rowCount} 行`,
      beforeState: beforeState.map(row => ({ ...row })),
      afterState: afterState.map(row => ({ ...row })),
      metadata: {
        rowCount,
      },
    }
  }

  /**
   * 创建批量操作历史记录
   */
  static createBulkOperationHistory(
    beforeState: SmartPasteRowData[],
    afterState: SmartPasteRowData[],
    description: string,
    affectedRows?: number[]
  ): HistoryEntry {
    return {
      type: 'bulk_operation',
      timestamp: Date.now(),
      description,
      beforeState: beforeState.map(row => ({ ...row })),
      afterState: afterState.map(row => ({ ...row })),
      metadata: {
        affectedRows,
      },
    }
  }

  /**
   * 格式化操作描述
   */
  static formatActionDescription(
    entry: HistoryEntry,
    t: (key: string) => string
  ): string {
    switch (entry.type) {
      case 'edit':
        return t('smartPaste.history.edit')
      case 'paste':
        const pasteCount = entry.metadata?.rowCount || 1
        return t('smartPaste.history.paste', { count: pasteCount })
      case 'add_row':
        const addCount = entry.metadata?.rowCount || 1
        return t('smartPaste.history.addRow', { count: addCount })
      case 'delete_row':
        const deleteCount = entry.metadata?.rowCount || 1
        return t('smartPaste.history.deleteRow', { count: deleteCount })
      case 'bulk_operation':
        return entry.description
      default:
        return t('smartPaste.history.unknown')
    }
  }

  /**
   * 检查操作是否可以合并
   */
  static canMergeEntries(entry1: HistoryEntry, entry2: HistoryEntry): boolean {
    // 只有相同类型的操作才能合并
    if (entry1.type !== entry2.type) return false

    // 时间间隔不能超过1秒
    if (Math.abs(entry2.timestamp - entry1.timestamp) > 1000) return false

    // 只有编辑操作可以合并
    return entry1.type === 'edit' && entry2.type === 'edit'
  }

  /**
   * 合并两个历史记录条目
   */
  static mergeEntries(
    entry1: HistoryEntry,
    entry2: HistoryEntry
  ): HistoryEntry {
    if (!HistoryUtils.canMergeEntries(entry1, entry2)) {
      throw new Error('Cannot merge incompatible entries')
    }

    return {
      type: entry1.type,
      timestamp: entry2.timestamp,
      description: entry2.description,
      beforeState: entry1.beforeState, // 保持最初的状态
      afterState: entry2.afterState, // 使用最新的状态
      metadata: entry2.metadata,
    }
  }

  /**
   * 获取操作影响的行数
   */
  static getAffectedRowCount(entry: HistoryEntry): number {
    return (
      entry.metadata?.rowCount ||
      entry.metadata?.affectedRows?.length ||
      Math.abs(entry.afterState.length - entry.beforeState.length)
    )
  }

  /**
   * 检查操作是否为重要操作（不应该被自动清理）
   */
  static isImportantEntry(entry: HistoryEntry): boolean {
    // 批量操作和行操作被认为是重要的
    return ['paste', 'add_row', 'delete_row', 'bulk_operation'].includes(
      entry.type
    )
  }

  /**
   * 清理历史记录（保留重要操作）
   */
  static cleanupHistory(
    entries: HistoryEntry[],
    maxSize: number
  ): HistoryEntry[] {
    if (entries.length <= maxSize) return entries

    // 分离重要和非重要操作
    const importantEntries = entries.filter(entry =>
      HistoryUtils.isImportantEntry(entry)
    )
    const normalEntries = entries.filter(
      entry => !HistoryUtils.isImportantEntry(entry)
    )

    // 如果重要操作就超过了限制，只保留最新的重要操作
    if (importantEntries.length >= maxSize) {
      return importantEntries.slice(-maxSize)
    }

    // 计算可以保留的普通操作数量
    const remainingSlots = maxSize - importantEntries.length
    const keptNormalEntries = normalEntries.slice(-remainingSlots)

    // 合并并按时间排序
    const result = [...importantEntries, ...keptNormalEntries]
    return result.sort((a, b) => a.timestamp - b.timestamp)
  }
}
