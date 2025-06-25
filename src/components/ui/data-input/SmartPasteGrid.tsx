'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
// import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useToast } from '@/contexts/providers/ToastContext'
import SmartPasteRow from './SmartPasteRow'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import {
  createHistoryManager,
  HistoryUtils,
} from '@/lib/utils/smart-paste-history'
import {
  validateAllData,
  validateCell,
  validateGrid,
} from '@/lib/utils/smart-paste-validation'
import {
  parsePasteText,
  createRowsFromPasteData,
} from '@/lib/utils/smart-paste-data'
import type {
  SmartPasteGridProps,
  SmartPasteRowData,
  CellPosition,
  CellData,
  HistoryManager,
} from '@/types/core'

export default function SmartPasteGrid({
  config,
  data,
  _selectedAccount,
  availableAccounts,
  availableCategories,
  availableCurrencies,
  availableTags,
  onDataChange,
  onCellEdit,
  onRowOperation,
  onPaste,
  onValidation,
  onSubmit,
  isLoading = false,
  _isReadOnly = false,
  showValidationSummary = true,
  className = '',
  _height = 'auto',
  width = '100%',
}: SmartPasteGridProps) {
  const { showSuccess, showError } = useToast()

  // 状态管理
  const [internalData, setInternalData] = useState<SmartPasteRowData[]>(data)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [activeCell, setActiveCell] = useState<CellPosition | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationSummary, setValidationSummary] = useState({
    totalRows: 0,
    activeRows: 0,
    validRows: 0,
    invalidRows: 0,
    partialRows: 0,
    emptyRows: 0,
  })

  // 引用
  const gridRef = useRef<HTMLDivElement>(null)
  const historyManager = useRef<HistoryManager>(
    createHistoryManager(config.maxRows)
  )

  // 计算列配置
  const columns = useMemo(() => {
    return config.columns.map(column => {
      // 根据数据类型设置选项
      switch (column.dataType) {
        case 'account':
          return {
            ...column,
            options: availableAccounts.map(account => ({
              value: account.id,
              label: account.name,
              data: account,
            })),
          }

        case 'category':
          return {
            ...column,
            options: availableCategories.map(category => ({
              value: category.id,
              label: category.name,
              data: category,
            })),
          }

        case 'currency':
          return {
            ...column,
            options: availableCurrencies.map(currency => ({
              value: currency.code,
              label: `${currency.code} (${currency.symbol})`,
              data: currency,
            })),
          }

        case 'tags':
          return {
            ...column,
            options: availableTags.map(tag => ({
              value: tag.id,
              label: tag.name,
              data: tag,
            })),
          }

        default:
          return column
      }
    })
  }, [
    config.columns,
    availableAccounts,
    availableCategories,
    availableCurrencies,
    availableTags,
  ])

  // 同步外部数据变化
  useEffect(() => {
    setInternalData(data)
  }, [data])

  // 验证数据并更新汇总
  const validateAndUpdateSummary = useCallback(
    async (dataToValidate?: SmartPasteRowData[]) => {
      if (isValidating) return

      const targetData = dataToValidate || internalData
      setIsValidating(true)

      try {
        const validatedData = validateAllData(targetData, columns)

        // 更新验证汇总 - 只统计有内容的行
        const nonEmptyRows = validatedData.filter(
          row => row.validationStatus !== 'empty'
        )
        const summary = {
          totalRows: validatedData.length,
          activeRows: nonEmptyRows.length, // 有内容的行数
          validRows: validatedData.filter(
            row => row.validationStatus === 'valid'
          ).length,
          invalidRows: validatedData.filter(
            row => row.validationStatus === 'invalid'
          ).length,
          partialRows: validatedData.filter(
            row => row.validationStatus === 'partial'
          ).length,
          emptyRows: validatedData.filter(
            row => row.validationStatus === 'empty'
          ).length,
        }

        setValidationSummary(summary)

        // 触发验证事件
        const gridStatus = validateGrid(validatedData, columns)
        onValidation({
          type: 'grid',
          target: 'all',
          status: gridStatus,
          errors: [],
        })

        // 只有当数据真正发生变化时才更新
        if (JSON.stringify(targetData) !== JSON.stringify(validatedData)) {
          setInternalData(validatedData)
          onDataChange(validatedData)
        }
      } finally {
        setIsValidating(false)
      }
    },
    [columns, onValidation, onDataChange, isValidating, internalData]
  )

  // 自动验证 - 只在数据变化时触发，不包含验证函数在依赖中
  useEffect(() => {
    if (config.validationMode === 'onChange') {
      validateAndUpdateSummary()
    }
  }, [internalData, config.validationMode]) // 移除validateAndUpdateSummary依赖

  // 处理单元格变化
  const handleCellChange = useCallback(
    (rowIndex: number, columnKey: string, value: unknown) => {
      const beforeState = [...internalData]

      setInternalData(prevData => {
        const newData = [...prevData]
        const rowData = newData[rowIndex]

        if (!rowData) return prevData

        // 更新单元格数据
        const column = columns.find(col => col.key === columnKey)
        if (!column) return prevData

        const oldCellData = rowData.cells[columnKey]
        const newCellData: CellData = {
          ...oldCellData,
          value,
          displayValue: String(value || ''),
        }

        // 如果是实时验证模式，立即验证
        if (config.validationMode === 'onChange') {
          const { status, errors } = validateCell(value, column, rowData)
          newCellData.validationStatus = status
          newCellData.errors = errors
        }

        rowData.cells[columnKey] = newCellData
        rowData.isModified = true

        return newData
      })

      // 记录历史
      const afterState = [...internalData]
      afterState[rowIndex].cells[columnKey] = {
        ...afterState[rowIndex].cells[columnKey],
        value,
      }

      historyManager.current.push(
        HistoryUtils.createEditHistory(
          beforeState,
          afterState,
          `编辑 ${columnKey}`
        )
      )

      // 触发事件
      onCellEdit({
        position: {
          rowIndex,
          columnIndex: columns.findIndex(col => col.key === columnKey),
          columnKey,
        },
        oldValue: beforeState[rowIndex]?.cells[columnKey]?.value,
        newValue: value,
        rowData: internalData[rowIndex],
      })
    },
    [internalData, columns, config.validationMode, onCellEdit]
  )

  // 处理列粘贴
  const handleColumnPaste = useCallback(
    (columnKey: string, values: unknown[]) => {
      const beforeState = [...internalData]

      setInternalData(prevData => {
        const newData = [...prevData]
        const column = columns.find(col => col.key === columnKey)
        if (!column) return prevData

        // 确保有足够的行来容纳所有数据
        while (newData.length < values.length) {
          const newRowIndex = newData.length
          const newRowData: SmartPasteRowData = {
            id: `row_${Date.now()}_${newRowIndex}_${Math.random().toString(36).substr(2, 9)}`,
            index: newRowIndex,
            isNew: true,
            isModified: false,
            isSelected: false,
            validationStatus: 'empty',
            errors: [],
            cells: {},
            originalData: {},
          }

          // 初始化所有列的单元格数据
          columns.forEach(col => {
            newRowData.cells[col.key] = {
              value: col.defaultValue || null,
              displayValue: '',
              dataType: col.dataType,
              isRequired: col.isRequired,
              isReadOnly: col.isReadOnly,
              validationStatus: 'empty',
              errors: [],
            }
          })

          newData.push(newRowData)
        }

        // 填充粘贴的数据
        values.forEach((value, index) => {
          if (index < newData.length) {
            const rowData = newData[index]
            const newCellData: CellData = {
              ...rowData.cells[columnKey],
              value,
              displayValue: String(value || ''),
            }

            // 如果是实时验证模式，立即验证
            if (config.validationMode === 'onChange') {
              const { status, errors } = validateCell(value, column, rowData)
              newCellData.validationStatus = status
              newCellData.errors = errors
            }

            rowData.cells[columnKey] = newCellData
            rowData.isModified = true
          }
        })

        return newData
      })

      // 记录历史
      const afterState = [...internalData]
      // 模拟更新后的状态
      values.forEach((value, index) => {
        if (index < afterState.length) {
          afterState[index].cells[columnKey] = {
            ...afterState[index].cells[columnKey],
            value,
          }
        }
      })

      historyManager.current.push(
        HistoryUtils.createPasteHistory(beforeState, afterState, values.length)
      )

      showSuccess(
        '列粘贴成功',
        `已粘贴 ${values.length} 行数据到 ${columnKey} 列`
      )
    },
    [internalData, columns, config.validationMode, showSuccess]
  )

  // 处理单元格聚焦
  const handleCellFocus = useCallback((position: CellPosition) => {
    setActiveCell(position)
  }, [])

  // 处理单元格失焦
  const handleCellBlur = useCallback(() => {
    if (config.validationMode === 'onBlur') {
      validateAndUpdateSummary()
    }
  }, [config.validationMode, validateAndUpdateSummary])

  // 处理粘贴事件
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      event.preventDefault()

      const clipboardData = event.clipboardData?.getData('text')
      if (!clipboardData || !activeCell) return

      const beforeState = [...internalData]

      try {
        // 解析粘贴数据
        const pasteData = parsePasteText(
          clipboardData,
          config.pasteConfig.delimiter
        )

        if (pasteData.length === 0) return

        // 创建新行数据
        const newRows = createRowsFromPasteData(
          pasteData,
          columns,
          activeCell.rowIndex
        )

        // 更新数据
        const newData = [...internalData]

        // 替换或插入数据
        newRows.forEach((newRow, index) => {
          const targetIndex = activeCell.rowIndex + index
          if (targetIndex < newData.length) {
            // 替换现有行
            newData[targetIndex] = newRow
          } else {
            // 添加新行
            newData.push(newRow)
          }
        })

        setInternalData(newData)
        onDataChange(newData)

        // 记录历史
        historyManager.current.push(
          HistoryUtils.createPasteHistory(beforeState, newData, newRows.length)
        )

        // 触发粘贴事件
        onPaste({
          data: pasteData,
          startPosition: activeCell,
          affectedRows: newRows.length,
          affectedColumns: columns.length,
        })

        showSuccess('粘贴成功', `已粘贴 ${newRows.length} 行数据`)
      } catch (error) {
        console.error('Paste error:', error)
        showError('粘贴失败', '数据格式不正确')
      }
    },
    [
      activeCell,
      internalData,
      columns,
      config.pasteConfig,
      onDataChange,
      onPaste,
      showSuccess,
      showError,
    ]
  )

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, position: CellPosition) => {
      const { rowIndex, columnIndex } = position

      // 检查是否是粘贴快捷键
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        // 粘贴事件由 onPaste 处理
        return
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          if (rowIndex > 0) {
            setActiveCell({
              ...position,
              rowIndex: rowIndex - 1,
            })
          }
          break

        case 'ArrowDown':
          event.preventDefault()
          if (rowIndex < internalData.length - 1) {
            setActiveCell({
              ...position,
              rowIndex: rowIndex + 1,
            })
          }
          break

        case 'ArrowLeft':
          event.preventDefault()
          if (columnIndex > 0) {
            setActiveCell({
              ...position,
              columnIndex: columnIndex - 1,
              columnKey: columns[columnIndex - 1].key,
            })
          }
          break

        case 'ArrowRight':
          event.preventDefault()
          if (columnIndex < columns.length - 1) {
            setActiveCell({
              ...position,
              columnIndex: columnIndex + 1,
              columnKey: columns[columnIndex + 1].key,
            })
          }
          break

        case 'Tab':
          event.preventDefault()
          if (event.shiftKey) {
            // Shift+Tab: 向左移动
            if (columnIndex > 0) {
              setActiveCell({
                ...position,
                columnIndex: columnIndex - 1,
                columnKey: columns[columnIndex - 1].key,
              })
            } else if (rowIndex > 0) {
              setActiveCell({
                rowIndex: rowIndex - 1,
                columnIndex: columns.length - 1,
                columnKey: columns[columns.length - 1].key,
              })
            }
          } else {
            // Tab: 向右移动
            if (columnIndex < columns.length - 1) {
              setActiveCell({
                ...position,
                columnIndex: columnIndex + 1,
                columnKey: columns[columnIndex + 1].key,
              })
            } else if (rowIndex < internalData.length - 1) {
              setActiveCell({
                rowIndex: rowIndex + 1,
                columnIndex: 0,
                columnKey: columns[0].key,
              })
            }
          }
          break
      }
    },
    [internalData.length, columns]
  )

  // 添加粘贴事件监听器
  useEffect(() => {
    const handleGlobalPaste = (event: ClipboardEvent) => {
      if (activeCell && gridRef.current?.contains(document.activeElement)) {
        handlePaste(event)
      }
    }

    document.addEventListener('paste', handleGlobalPaste)
    return () => {
      document.removeEventListener('paste', handleGlobalPaste)
    }
  }, [handlePaste, activeCell])

  return (
    <div
      ref={gridRef}
      className={`smart-paste-grid flex flex-col h-full ${className}`}
      style={{ width }}
    >
      {/* 工具栏 */}
      <div className='flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center space-x-4'>
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
            智能批量录入
          </h3>

          {showValidationSummary && (
            <div className='flex items-center space-x-2 text-sm'>
              <span className='text-gray-500 dark:text-gray-400'>
                总计 {validationSummary.totalRows} 行
              </span>
              {validationSummary.validRows > 0 && (
                <span className='text-green-600 dark:text-green-400'>
                  ✓ {validationSummary.validRows}
                </span>
              )}
              {validationSummary.invalidRows > 0 && (
                <span className='text-red-600 dark:text-red-400'>
                  ✗ {validationSummary.invalidRows}
                </span>
              )}
              {validationSummary.partialRows > 0 && (
                <span className='text-yellow-600 dark:text-yellow-400'>
                  ⚠ {validationSummary.partialRows}
                </span>
              )}
            </div>
          )}
        </div>

        <div className='flex items-center space-x-2'>
          {/* 撤销/重做按钮 */}
          {config.enableUndo && (
            <>
              <button
                onClick={() => {
                  const newData = historyManager.current.undo()
                  if (newData) {
                    setInternalData(newData)
                    onDataChange(newData)
                  }
                }}
                disabled={!historyManager.current.canUndo}
                className='p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50'
                title='撤销'
              >
                <svg
                  className='w-4 h-4'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z'
                    clipRule='evenodd'
                  />
                </svg>
              </button>

              <button
                onClick={() => {
                  const newData = historyManager.current.redo()
                  if (newData) {
                    setInternalData(newData)
                    onDataChange(newData)
                  }
                }}
                disabled={!historyManager.current.canRedo}
                className='p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50'
                title='重做'
              >
                <svg
                  className='w-4 h-4'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z'
                    clipRule='evenodd'
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 表格头部 */}
      <div className='bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600'>
        <div className='flex items-stretch'>
          {/* 全选复选框 */}
          <div className='flex items-center justify-center w-12 px-2 border-r border-gray-200 dark:border-gray-700'>
            <input
              type='checkbox'
              checked={
                selectedRows.size === internalData.length &&
                internalData.length > 0
              }
              onChange={e => {
                if (e.target.checked) {
                  setSelectedRows(
                    new Set(internalData.map((_, index) => index))
                  )
                } else {
                  setSelectedRows(new Set())
                }
              }}
              className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
            />
          </div>

          {/* 行号列头 */}
          <div className='flex items-center justify-center w-12 px-2 border-r border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300'>
            #
          </div>

          {/* 状态列头 */}
          <div className='flex items-center justify-center w-12 px-2 border-r border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300'>
            状态
          </div>

          {/* 数据列头 */}
          {columns.map(column => (
            <div
              key={column.key}
              className='flex items-center px-3 py-2 border-r border-gray-200 dark:border-gray-700 last:border-r-0 text-sm font-medium text-gray-700 dark:text-gray-300'
              style={{
                width: column.width || 'auto',
                minWidth: column.minWidth || 100,
                maxWidth: column.maxWidth || 'none',
              }}
            >
              {column.title}
              {column.isRequired && (
                <span className='ml-1 text-red-500'>*</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 表格主体 */}
      <div className='flex-1 overflow-auto min-h-0'>
        {isLoading ? (
          <div className='flex items-center justify-center h-32'>
            <LoadingSpinner size='lg' showText text='加载中...' />
          </div>
        ) : internalData.length === 0 ? (
          <div className='flex items-center justify-center h-32 text-gray-500 dark:text-gray-400'>
            暂无数据，请粘贴或添加数据
          </div>
        ) : (
          <div className='divide-y divide-gray-200 dark:divide-gray-700'>
            {internalData.map((rowData, rowIndex) => (
              <SmartPasteRow
                key={rowData.id}
                rowData={rowData}
                columns={columns}
                rowIndex={rowIndex}
                isSelected={selectedRows.has(rowIndex)}
                activeCell={activeCell}
                onCellChange={(columnKey, value) =>
                  handleCellChange(rowIndex, columnKey, value)
                }
                onCellFocus={handleCellFocus}
                onCellBlur={handleCellBlur}
                onCellKeyDown={handleKeyDown}
                onColumnPaste={handleColumnPaste}
                availableTags={availableTags}
                onRowSelect={selected => {
                  const newSelectedRows = new Set(selectedRows)
                  if (selected) {
                    newSelectedRows.add(rowIndex)
                  } else {
                    newSelectedRows.delete(rowIndex)
                  }
                  setSelectedRows(newSelectedRows)
                }}
                onRowDelete={
                  config.allowDeleteRows
                    ? () => {
                        const beforeState = [...internalData]
                        const newData = internalData.filter(
                          (_, index) => index !== rowIndex
                        )
                        setInternalData(newData)
                        onDataChange(newData)

                        historyManager.current.push(
                          HistoryUtils.createDeleteRowHistory(
                            beforeState,
                            newData,
                            1
                          )
                        )

                        onRowOperation({
                          type: 'delete',
                          rowIndex,
                          rowData,
                        })
                      }
                    : undefined
                }
                showRowNumber={true}
                showCheckbox={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className='flex-shrink-0 flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'>
        <div className='flex items-center space-x-2'>
          {/* 添加行按钮 */}
          {config.allowAddRows && (
            <button
              onClick={() => {
                const beforeState = [...internalData]
                const newRowData: SmartPasteRowData = {
                  id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  index: internalData.length,
                  isNew: true,
                  isModified: false,
                  isSelected: false,
                  validationStatus: 'empty',
                  errors: [],
                  cells: {},
                  originalData: {},
                }

                // 初始化单元格数据
                columns.forEach(column => {
                  newRowData.cells[column.key] = {
                    value: column.defaultValue || null,
                    displayValue: '',
                    dataType: column.dataType,
                    isRequired: column.isRequired,
                    isReadOnly: column.isReadOnly,
                    validationStatus: 'empty',
                    errors: [],
                  }
                })

                const newData = [...internalData, newRowData]
                setInternalData(newData)
                onDataChange(newData)

                historyManager.current.push(
                  HistoryUtils.createAddRowHistory(beforeState, newData, 1)
                )

                onRowOperation({
                  type: 'add',
                  rowIndex: internalData.length,
                  rowData: newRowData,
                })
              }}
              className='px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200'
            >
              + 添加行
            </button>
          )}

          {/* 删除选中行按钮 */}
          {selectedRows.size > 0 && config.allowDeleteRows && (
            <button
              onClick={() => {
                const beforeState = [...internalData]
                const newData = internalData.filter(
                  (_, index) => !selectedRows.has(index)
                )
                setInternalData(newData)
                onDataChange(newData)
                setSelectedRows(new Set())

                historyManager.current.push(
                  HistoryUtils.createDeleteRowHistory(
                    beforeState,
                    newData,
                    selectedRows.size
                  )
                )

                onRowOperation({
                  type: 'delete',
                  rowIndex: -1, // 批量删除
                })
              }}
              className='px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200'
            >
              删除选中 ({selectedRows.size})
            </button>
          )}
        </div>

        <div className='flex items-center space-x-2'>
          {/* 提交按钮 */}
          <button
            onClick={() => onSubmit(internalData)}
            disabled={
              validationSummary.invalidRows > 0 ||
              validationSummary.activeRows === 0
            }
            className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
          >
            提交数据 (
            {validationSummary.validRows + validationSummary.partialRows}/
            {validationSummary.activeRows || validationSummary.totalRows})
          </button>
        </div>
      </div>
    </div>
  )
}
