'use client'

import React, { useCallback } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import SmartPasteCell from './SmartPasteCell'
import CircularCheckbox from '@/components/ui/forms/CircularCheckbox'
import { isCellSelected, isCellCopied } from '@/lib/utils/smart-paste-selection'
import type {
  SmartPasteColumn,
  SmartPasteRowData,
  CellPosition,
  CellSelection,
} from '@/types/core'

interface SmartPasteRowProps {
  rowData: SmartPasteRowData
  columns: SmartPasteColumn[]
  rowIndex: number
  isSelected: boolean
  activeCell: CellPosition | null
  cellSelection: CellSelection
  onCellChange: (columnKey: string, value: unknown) => void
  onCellSelect: (position: CellPosition, event?: React.MouseEvent) => void
  onCellFocus: (position: CellPosition) => void
  onCellBlur: () => void
  onCellKeyDown: (event: React.KeyboardEvent, position: CellPosition) => void
  onColumnPaste?: (columnKey: string, values: unknown[]) => void
  onRowSelect: (selected: boolean) => void
  onRowDelete?: () => void
  availableTags?: Array<{ id: string; name: string; color?: string }>
  showRowNumber?: boolean
  showCheckbox?: boolean
  className?: string
}

export default function SmartPasteRow({
  rowData,
  columns,
  rowIndex,
  isSelected,
  activeCell,
  cellSelection,
  onCellChange,
  onCellSelect,
  onCellFocus,
  onCellBlur,
  onCellKeyDown,
  onColumnPaste,
  onRowSelect,
  onRowDelete,
  availableTags = [],
  showRowNumber = true,
  showCheckbox = true,
  className = '',
}: SmartPasteRowProps) {
  const { t } = useLanguage()

  // 获取行背景色 - 美化设计
  const getRowBackgroundColor = useCallback(() => {
    if (isSelected) {
      return 'bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 border-l-2 border-blue-500'
    }

    switch (rowData.validationStatus) {
      case 'valid':
        return 'bg-gradient-to-r from-white to-green-50/30 dark:from-gray-800 dark:to-green-900/10 hover:from-green-50/50 hover:to-green-100/30 dark:hover:from-green-900/20 dark:hover:to-green-800/10'
      case 'invalid':
        return 'bg-gradient-to-r from-red-50/70 to-red-100/30 dark:from-red-900/20 dark:to-red-800/10 border-l-2 border-red-400/50'
      case 'partial':
        return 'bg-gradient-to-r from-yellow-50/70 to-yellow-100/30 dark:from-yellow-900/20 dark:to-yellow-800/10 border-l-2 border-yellow-400/50'
      default:
        return 'bg-gradient-to-r from-white to-gray-50/30 dark:from-gray-800 dark:to-gray-700/30 hover:from-gray-50/50 hover:to-gray-100/30 dark:hover:from-gray-700/50 dark:hover:to-gray-600/30'
    }
  }, [isSelected, rowData.validationStatus])

  // 获取行状态指示器 - 美化设计
  const getRowStatusIndicator = () => {
    switch (rowData.validationStatus) {
      case 'valid':
        return (
          <div className='flex items-center justify-center w-6 h-6'>
            <div className='w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-sm ring-2 ring-green-200 dark:ring-green-800/50'>
              <svg
                className='w-3 h-3 text-white'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
          </div>
        )

      case 'invalid':
        return (
          <div className='flex items-center justify-center w-6 h-6'>
            <div className='w-5 h-5 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-sm ring-2 ring-red-200 dark:ring-red-800/50'>
              <svg
                className='w-3 h-3 text-white'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
          </div>
        )

      case 'partial':
        return (
          <div className='flex items-center justify-center w-6 h-6'>
            <div className='w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-sm ring-2 ring-yellow-200 dark:ring-yellow-800/50'>
              <svg
                className='w-3 h-3 text-white'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
          </div>
        )

      default:
        return (
          <div className='flex items-center justify-center w-6 h-6'>
            <div className='w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-sm'></div>
          </div>
        )
    }
  }

  // 处理单元格变化
  const handleCellChange = useCallback(
    (columnKey: string, value: unknown) => {
      onCellChange(columnKey, value)
    },
    [onCellChange]
  )

  // 处理单元格聚焦
  const handleCellFocus = useCallback(
    (columnKey: string, columnIndex: number) => {
      onCellFocus({
        rowIndex,
        columnIndex,
        columnKey,
      })
    },
    [rowIndex, onCellFocus]
  )

  // 处理单元格键盘事件
  const handleCellKeyDown = useCallback(
    (event: React.KeyboardEvent, columnKey: string, columnIndex: number) => {
      onCellKeyDown(event, {
        rowIndex,
        columnIndex,
        columnKey,
      })
    },
    [rowIndex, onCellKeyDown]
  )

  return (
    <div
      className={`
        flex items-stretch border-b border-gray-200 dark:border-gray-700 transition-colors duration-200
        ${getRowBackgroundColor()}
        ${isSelected ? 'ring-1 ring-blue-500/20' : ''}
        ${className}
      `}
    >
      {/* 行选择复选框 */}
      {showCheckbox && (
        <div className='flex items-center justify-center w-12 px-2 border-r border-gray-200 dark:border-gray-700'>
          <CircularCheckbox
            checked={isSelected}
            onChange={() => onRowSelect(!isSelected)}
            size='sm'
            variant='enhanced'
          />
        </div>
      )}

      {/* 行号 */}
      {showRowNumber && (
        <div className='flex items-center justify-center w-12 px-2 border-r border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400'>
          {rowIndex + 1}
        </div>
      )}

      {/* 行状态指示器 */}
      <div className='flex items-center justify-center w-12 px-2 border-r border-gray-200 dark:border-gray-700'>
        {getRowStatusIndicator()}
      </div>

      {/* 数据单元格 */}
      {columns.map((column, columnIndex) => {
        const cellData = rowData.cells[column.key]
        const isActiveCell =
          activeCell?.rowIndex === rowIndex &&
          activeCell?.columnKey === column.key

        return (
          <div
            key={column.key}
            className='border-r border-gray-200 dark:border-gray-700 last:border-r-0 flex'
            style={{
              width: column.width || 'auto',
              minWidth: column.minWidth || 100,
              maxWidth: column.maxWidth || 'none',
            }}
          >
            <SmartPasteCell
              column={column}
              _rowData={rowData}
              columns={columns}
              value={cellData?.value}
              isActive={isActiveCell}
              isSelected={isCellSelected(cellSelection, rowIndex, columnIndex)}
              isCopied={isCellCopied(cellSelection, rowIndex, columnIndex)}
              validationStatus={cellData?.validationStatus || 'empty'}
              errors={cellData?.errors || []}
              onChange={value => handleCellChange(column.key, value)}
              onSelect={event => {
                const position: CellPosition = {
                  rowIndex,
                  columnIndex,
                  columnKey: column.key,
                }
                onCellSelect(position, event)
              }}
              onFocus={() => handleCellFocus(column.key, columnIndex)}
              onBlur={onCellBlur}
              onKeyDown={event =>
                handleCellKeyDown(event, column.key, columnIndex)
              }
              onColumnPaste={onColumnPaste}
              hasMultipleSelection={cellSelection.selectedCells.size > 1}
              availableTags={availableTags}
              className='w-full'
            />
          </div>
        )
      })}

      {/* 行操作按钮 */}
      {onRowDelete && (
        <div className='flex items-center justify-center w-12 px-2'>
          <button
            onClick={onRowDelete}
            className='p-1 text-gray-400 hover:text-red-500 transition-colors duration-200'
            title={t('common.delete')}
          >
            <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v1H4V5zM3 8a1 1 0 011-1h12a1 1 0 110 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2V9a1 1 0 01-1-1zm3 3a1 1 0 112 0v4a1 1 0 11-2 0v-4zm4 0a1 1 0 112 0v4a1 1 0 11-2 0v-4z'
                clipRule='evenodd'
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
