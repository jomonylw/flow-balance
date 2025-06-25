'use client'

import React, { useCallback } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import SmartPasteCell from './SmartPasteCell'
import CircularCheckbox from '@/components/ui/forms/CircularCheckbox'
import type {
  SmartPasteColumn,
  SmartPasteRowData,
  CellPosition,
} from '@/types/core'

interface SmartPasteRowProps {
  rowData: SmartPasteRowData
  columns: SmartPasteColumn[]
  rowIndex: number
  isSelected: boolean
  activeCell: CellPosition | null
  onCellChange: (columnKey: string, value: unknown) => void
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
  onCellChange,
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

  // 获取行背景色
  const getRowBackgroundColor = useCallback(() => {
    if (isSelected) {
      return 'bg-blue-50 dark:bg-blue-900/20'
    }

    switch (rowData.validationStatus) {
      case 'valid':
        return 'bg-white dark:bg-gray-800'
      case 'invalid':
        return 'bg-red-50/50 dark:bg-red-900/10'
      case 'partial':
        return 'bg-yellow-50/50 dark:bg-yellow-900/10'
      default:
        return 'bg-white dark:bg-gray-800'
    }
  }, [isSelected, rowData.validationStatus])

  // 获取行状态指示器
  const getRowStatusIndicator = () => {
    switch (rowData.validationStatus) {
      case 'valid':
        return (
          <div className='flex items-center justify-center w-6 h-6'>
            <div className='w-4 h-4 bg-green-500 rounded-full flex items-center justify-center'>
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
            <div className='w-4 h-4 bg-red-500 rounded-full flex items-center justify-center'>
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
            <div className='w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center'>
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
            <div className='w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full'></div>
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
              rowData={rowData}
              value={cellData?.value}
              isActive={isActiveCell}
              isSelected={isSelected}
              validationStatus={cellData?.validationStatus || 'empty'}
              errors={cellData?.errors?.map(e => e.message) || []}
              onChange={value => handleCellChange(column.key, value)}
              onFocus={() => handleCellFocus(column.key, columnIndex)}
              onBlur={onCellBlur}
              onKeyDown={event =>
                handleCellKeyDown(event, column.key, columnIndex)
              }
              onColumnPaste={onColumnPaste}
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
