'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
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
  createEmptySelection,
  selectSingleCell,
  toggleCellSelection,
  selectRange,
  clearSelection,
  setCopyState,
  clearCopyState,
  getSelectedCellsData,
  createCellKey,
  parseCellKey,
} from '@/lib/utils/smart-paste-selection'
import type {
  SmartPasteGridProps,
  SmartPasteRowData,
  SmartPasteColumn,
  CellPosition,
  CellData,
  CellSelection,
  HistoryManager,
} from '@/types/core'

export default function SmartPasteGrid({
  config,
  data,
  selectedAccount: _selectedAccount,
  availableAccounts,
  availableCategories,
  availableCurrencies,
  availableTags,
  onDataChange,
  onCellEdit,
  onRowOperation,
  onPaste: _onPaste,
  onValidation,
  onSubmit,
  isLoading = false,
  isReadOnly: _isReadOnly = false,
  showValidationSummary = true,
  className = '',
  height: _height = 'auto',
  width = '100%',
}: SmartPasteGridProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()

  // 状态管理
  const [internalData, setInternalData] = useState<SmartPasteRowData[]>(data)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [cellSelection, setCellSelection] = useState<CellSelection>(
    createEmptySelection()
  )
  const [isValidating, setIsValidating] = useState(false)
  const [_historyVersion, _setHistoryVersion] = useState(0) // 用于强制重新渲染撤销/重做按钮
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
            options: availableAccounts?.map(account => ({
              value: account.id,
              label: account.name,
              data: account,
              // 添加货币信息用于显示
              currencyCode: account.currency?.code,
              currencySymbol: account.currency?.symbol,
              accountColor: account.color,
            })),
          }

        case 'category':
          return {
            ...column,
            options: availableCategories?.map(category => ({
              value: category.id,
              label: category.name,
              data: category,
            })),
          }

        case 'currency':
          return {
            ...column,
            options: availableCurrencies?.map(currency => ({
              value: currency.code,
              label: `${currency.code} (${currency.symbol})`,
              data: currency,
            })),
          }

        case 'tags':
          return {
            ...column,
            options: availableTags?.map(tag => ({
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
        onValidation?.({
          type: 'grid',
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
          newCellData.errors = errors.map(e => e.message) // 转换为字符串数组
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
          `${t('common.edit')} ${columnKey}`
        )
      )

      // 更新历史版本以触发重新渲染
      _setHistoryVersion((prev: number) => prev + 1)

      // 触发事件
      onCellEdit?.({
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
    [internalData, columns, config.validationMode, onCellEdit, t]
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
              newCellData.errors = errors.map(e => e.message) // 转换为字符串数组
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

      // 更新历史版本以触发重新渲染
      _setHistoryVersion((prev: number) => prev + 1)

      showSuccess(
        t('smart.paste.paste.column.success'),
        t('smart.paste.paste.column.success.detail', {
          count: values.length,
          column: columnKey,
        })
      )
    },
    [internalData, columns, config.validationMode, showSuccess, t]
  )

  // 处理单元格选择
  const handleCellSelect = useCallback(
    (position: CellPosition, event?: React.MouseEvent) => {
      setCellSelection(prevSelection => {
        if (event?.ctrlKey || event?.metaKey) {
          // Ctrl+点击：切换选择
          return toggleCellSelection(prevSelection, position)
        } else if (event?.shiftKey && prevSelection.activeCell) {
          // Shift+点击：范围选择
          return selectRange(prevSelection, position)
        } else {
          // 普通点击：单选
          return selectSingleCell(prevSelection, position)
        }
      })
    },
    []
  )

  // 处理单元格聚焦
  const handleCellFocus = useCallback((position: CellPosition) => {
    // 更新选择状态中的活动单元格
    setCellSelection(prevSelection => ({
      ...prevSelection,
      activeCell: position,
    }))
  }, [])

  // 处理单元格失焦
  const handleCellBlur = useCallback(() => {
    if (config.validationMode === 'onBlur') {
      validateAndUpdateSummary()
    }
  }, [config.validationMode, validateAndUpdateSummary])

  // 处理复制事件
  const handleCopy = useCallback(() => {
    if (cellSelection.selectedCells.size === 0) return

    try {
      // 获取选中单元格的数据
      const selectedData = getSelectedCellsData(
        cellSelection,
        internalData,
        columns
      )

      if (selectedData.length === 0) return

      // 构建复制文本，根据数据类型进行适当的序列化
      const copyText = selectedData
        .map(({ value, dataType }) => {
          if (value === null || value === undefined) return ''

          switch (dataType) {
            case 'date':
              if (value instanceof Date) {
                return value.toISOString().split('T')[0] // YYYY-MM-DD格式
              }
              return String(value)

            case 'tags':
              if (Array.isArray(value)) {
                return value.join(',') // 标签用逗号分隔
              }
              return String(value)

            case 'boolean':
              return value ? 'true' : 'false'

            case 'number':
            case 'currency':
              return typeof value === 'number'
                ? value.toString()
                : String(value)

            default:
              return String(value)
          }
        })
        .join('\t')

      // 复制到剪贴板
      navigator.clipboard.writeText(copyText).then(() => {
        // 设置复制状态，显示视觉反馈
        setCellSelection(prevSelection => setCopyState(prevSelection))

        showSuccess(
          t('smart.paste.copy.success'),
          t('smart.paste.copy.success.detail', { count: selectedData.length })
        )

        // 3秒后清除复制状态
        setTimeout(() => {
          setCellSelection(prevSelection => clearCopyState(prevSelection))
        }, 3000)
      })
    } catch (error) {
      console.error('Copy error:', error)
      showError(t('smart.paste.copy.error'), t('error.clipboard.access'))
    }
  }, [cellSelection, internalData, columns, showSuccess, showError, t])

  // 根据列类型处理值
  const processValueByColumnType = useCallback(
    (value: string, column: SmartPasteColumn): unknown => {
      const trimmedValue = value.trim()

      switch (column.dataType) {
        case 'number':
        case 'currency':
          // 移除货币符号、千分位分隔符和空格，然后解析数值
          const cleanedValue = trimmedValue.replace(/[￥$€£¥,\s]/g, '')
          const numValue = parseFloat(cleanedValue)
          return isNaN(numValue) ? null : numValue

        case 'date':
          try {
            if (trimmedValue) {
              const dateValue = new Date(trimmedValue)
              return isNaN(dateValue.getTime()) ? null : dateValue
            } else {
              return null
            }
          } catch {
            return null
          }

        case 'tags':
          if (trimmedValue) {
            const tagNames = trimmedValue
              .split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)

            // 将标签名称转换为标签ID
            const tagIds = tagNames.map(tagName => {
              const tag = availableTags?.find(
                t => t.name.toLowerCase() === tagName.toLowerCase()
              )
              return tag ? tag.id : tagName // 如果找不到匹配的标签，保留原始名称
            })

            return tagIds
          } else {
            return []
          }

        default:
          return trimmedValue || null
      }
    },
    [availableTags]
  )

  // 处理多单元格粘贴
  const handleMultiCellPaste = useCallback(
    (value: unknown) => {
      const beforeState = [...internalData]
      const selectedCells = Array.from(cellSelection.selectedCells)

      if (selectedCells.length === 0) return

      setInternalData(prevData => {
        const newData = [...prevData]

        selectedCells.forEach(cellKey => {
          const { rowIndex, columnIndex } = parseCellKey(cellKey)
          const column = columns[columnIndex]

          if (rowIndex < newData.length && column) {
            const rowData = newData[rowIndex]

            // 为不同数据类型生成正确的displayValue
            let displayValue: string
            if (column.dataType === 'tags' && Array.isArray(value)) {
              // 对于tags类型，将ID数组转换为名称字符串
              const tagNames = value.map(tagId => {
                const tag = availableTags?.find(t => t.id === tagId)
                return tag ? tag.name : tagId
              })
              displayValue = tagNames.join(', ')
            } else {
              displayValue = String(value || '')
            }

            const newCellData: CellData = {
              ...rowData.cells[column.key],
              value,
              displayValue,
            }

            // 如果是实时验证模式，立即验证
            if (config.validationMode === 'onChange') {
              const { status, errors } = validateCell(value, column, rowData)
              newCellData.validationStatus = status
              newCellData.errors = errors.map(e => e.message)
            }

            rowData.cells[column.key] = newCellData
            rowData.isModified = true
          }
        })

        return newData
      })

      // 记录历史
      const afterState = [...internalData]
      selectedCells.forEach(cellKey => {
        const { rowIndex, columnIndex } = parseCellKey(cellKey)
        const column = columns[columnIndex]

        if (rowIndex < afterState.length && column) {
          afterState[rowIndex].cells[column.key] = {
            ...afterState[rowIndex].cells[column.key],
            value,
          }
        }
      })

      historyManager.current.push(
        HistoryUtils.createEditHistory(
          beforeState,
          afterState,
          `${t('smart.paste.multi.cell.paste')} (${selectedCells.length} ${t('smart.paste.cells')})`
        )
      )

      // 更新历史版本以触发重新渲染
      _setHistoryVersion((prev: number) => prev + 1)

      showSuccess(
        t('smart.paste.copy.success'),
        t('smart.paste.multi.cell.success', { count: selectedCells.length })
      )
    },
    [
      cellSelection.selectedCells,
      internalData,
      columns,
      config.validationMode,
      availableTags,
      showSuccess,
      t,
    ]
  )

  // 处理粘贴事件（支持单元格、多单元格和列粘贴）
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      event.preventDefault()

      const clipboardData = event.clipboardData?.getData('text')
      if (!clipboardData || !cellSelection.activeCell) return

      const activeColumn = columns[cellSelection.activeCell.columnIndex]
      if (!activeColumn) return

      // 检查是否是多行数据（包含换行符）
      const lines = clipboardData.split('\n').filter(line => line.trim() !== '')

      if (lines.length > 1) {
        // 多行数据：使用列粘贴
        handleColumnPaste(activeColumn.key, lines)
      } else {
        // 单行数据：检查是否有多个单元格被选中
        const rawValue = clipboardData.trim()

        if (cellSelection.selectedCells.size > 1) {
          // 多单元格选中：需要根据列类型处理数据
          const processedValue = processValueByColumnType(
            rawValue,
            activeColumn
          )
          handleMultiCellPaste(processedValue)
        } else {
          // 单单元格：直接更新当前单元格
          handleCellChange(
            cellSelection.activeCell.rowIndex,
            activeColumn.key,
            rawValue
          )

          showSuccess(t('smart.paste.copy.success'), t('common.success'))
        }
      }
    },
    [
      cellSelection.activeCell,
      cellSelection.selectedCells,
      columns,
      handleColumnPaste,
      handleCellChange,
      handleMultiCellPaste,
      processValueByColumnType,
      showSuccess,
      t,
    ]
  )

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, position: CellPosition) => {
      const { rowIndex, columnIndex } = position

      // 处理复制粘贴快捷键
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'c':
            event.preventDefault()
            handleCopy()
            return
          case 'v':
            // 粘贴事件由 onPaste 处理
            return
          case 'a':
            event.preventDefault()
            // 全选所有单元格
            setCellSelection(prevSelection => {
              const allCells = new Set<string>()
              for (let row = 0; row < internalData.length; row++) {
                for (let col = 0; col < columns.length; col++) {
                  allCells.add(createCellKey(row, col))
                }
              }
              return {
                ...prevSelection,
                selectedCells: allCells,
                activeCell: position,
                selectionRange: null,
              }
            })
            return
        }
      }

      // 处理Escape键
      if (event.key === 'Escape') {
        event.preventDefault()
        setCellSelection(clearSelection)
        return
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          if (rowIndex > 0) {
            const newPosition = { ...position, rowIndex: rowIndex - 1 }
            if (event.shiftKey && cellSelection.activeCell) {
              // Shift+方向键：范围选择
              setCellSelection(prevSelection =>
                selectRange(prevSelection, newPosition)
              )
            } else {
              handleCellFocus(newPosition)
            }
          }
          break

        case 'ArrowDown':
          event.preventDefault()
          if (rowIndex < internalData.length - 1) {
            const newPosition = { ...position, rowIndex: rowIndex + 1 }
            if (event.shiftKey && cellSelection.activeCell) {
              setCellSelection(prevSelection =>
                selectRange(prevSelection, newPosition)
              )
            } else {
              handleCellFocus(newPosition)
            }
          }
          break

        case 'ArrowLeft':
          event.preventDefault()
          if (columnIndex > 0) {
            const newPosition = {
              ...position,
              columnIndex: columnIndex - 1,
              columnKey: columns[columnIndex - 1].key,
            }
            if (event.shiftKey && cellSelection.activeCell) {
              setCellSelection(prevSelection =>
                selectRange(prevSelection, newPosition)
              )
            } else {
              handleCellFocus(newPosition)
            }
          }
          break

        case 'ArrowRight':
          event.preventDefault()
          if (columnIndex < columns.length - 1) {
            const newPosition = {
              ...position,
              columnIndex: columnIndex + 1,
              columnKey: columns[columnIndex + 1].key,
            }
            if (event.shiftKey && cellSelection.activeCell) {
              setCellSelection(prevSelection =>
                selectRange(prevSelection, newPosition)
              )
            } else {
              handleCellFocus(newPosition)
            }
          }
          break

        case 'Tab':
          event.preventDefault()
          if (event.shiftKey) {
            // Shift+Tab: 向左移动
            if (columnIndex > 0) {
              const newPosition = {
                ...position,
                columnIndex: columnIndex - 1,
                columnKey: columns[columnIndex - 1].key,
              }
              handleCellFocus(newPosition)
            } else if (rowIndex > 0) {
              const newPosition = {
                rowIndex: rowIndex - 1,
                columnIndex: columns.length - 1,
                columnKey: columns[columns.length - 1].key,
              }
              handleCellFocus(newPosition)
            }
          } else {
            // Tab: 向右移动
            if (columnIndex < columns.length - 1) {
              const newPosition = {
                ...position,
                columnIndex: columnIndex + 1,
                columnKey: columns[columnIndex + 1].key,
              }
              handleCellFocus(newPosition)
            } else if (rowIndex < internalData.length - 1) {
              const newPosition = {
                rowIndex: rowIndex + 1,
                columnIndex: 0,
                columnKey: columns[0].key,
              }
              handleCellFocus(newPosition)
            }
          }
          break
      }
    },
    [internalData.length, columns, handleCopy, cellSelection, handleCellFocus]
  )

  // 添加粘贴事件监听器
  useEffect(() => {
    const handleGlobalPaste = (event: ClipboardEvent) => {
      // 检查是否有活动单元格且表格容器存在
      if (cellSelection.activeCell && gridRef.current) {
        // 检查焦点是否在表格内部，或者有多个单元格被选中
        const isInGrid = gridRef.current.contains(document.activeElement)
        const hasMultipleSelection = cellSelection.selectedCells.size > 1

        if (isInGrid || hasMultipleSelection) {
          handlePaste(event)
        }
      }
    }

    document.addEventListener('paste', handleGlobalPaste)
    return () => {
      document.removeEventListener('paste', handleGlobalPaste)
    }
  }, [handlePaste, cellSelection.activeCell, cellSelection.selectedCells])

  return (
    <div
      ref={gridRef}
      className={`smart-paste-grid flex flex-col h-full ${className}`}
      style={{ width }}
    >
      {/* 工具栏 - 美化设计 */}
      <div className='flex-shrink-0 flex items-center justify-between p-4 bg-gradient-to-r from-white to-blue-50/50 dark:from-gray-800 dark:to-blue-900/20 border-b border-blue-200/50 dark:border-blue-700/50 shadow-sm'>
        <div className='flex items-center space-x-4'>
          <div className='flex items-center space-x-3'>
            <div className='w-2 h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse'></div>
            <h3 className='text-lg font-semibold bg-gradient-to-r from-gray-900 to-blue-800 dark:from-gray-100 dark:to-blue-200 bg-clip-text text-transparent'>
              {t('smart.paste.intelligent.batch.entry')}
            </h3>
          </div>

          {showValidationSummary && (
            <div className='flex items-center space-x-3 text-sm bg-white/50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-200/50 dark:border-gray-600/50 shadow-sm'>
              <div className='flex items-center space-x-1'>
                <div className='w-1.5 h-1.5 bg-gray-400 rounded-full'></div>
                <span className='text-gray-600 dark:text-gray-300 font-medium'>
                  {t('smart.paste.validation.total.rows', {
                    count: validationSummary.totalRows,
                  })}
                </span>
              </div>
              {validationSummary.validRows > 0 && (
                <div className='flex items-center space-x-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200/50 dark:border-green-700/50'>
                  <div className='w-1.5 h-1.5 bg-green-500 rounded-full'></div>
                  <span className='text-green-700 dark:text-green-400 font-medium'>
                    {validationSummary.validRows}
                  </span>
                </div>
              )}
              {validationSummary.invalidRows > 0 && (
                <div className='flex items-center space-x-1 px-2 py-0.5 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200/50 dark:border-red-700/50'>
                  <div className='w-1.5 h-1.5 bg-red-500 rounded-full'></div>
                  <span className='text-red-700 dark:text-red-400 font-medium'>
                    {validationSummary.invalidRows}
                  </span>
                </div>
              )}
              {validationSummary.partialRows > 0 && (
                <div className='flex items-center space-x-1 px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200/50 dark:border-yellow-700/50'>
                  <div className='w-1.5 h-1.5 bg-yellow-500 rounded-full'></div>
                  <span className='text-yellow-700 dark:text-yellow-400 font-medium'>
                    {validationSummary.partialRows}
                  </span>
                </div>
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
                    _setHistoryVersion((prev: number) => prev + 1)
                  }
                }}
                disabled={!historyManager.current.canUndo()}
                className={`
                  p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center shadow-sm
                  ${
                    historyManager.current.canUndo()
                      ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 hover:shadow-md hover:scale-105 border border-blue-200/50 dark:border-blue-700/50'
                      : 'text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }
                `}
                title={t('smart.paste.keyboard.undo')}
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6'
                  />
                </svg>
              </button>

              <button
                onClick={() => {
                  const newData = historyManager.current.redo()
                  if (newData) {
                    setInternalData(newData)
                    onDataChange(newData)
                    _setHistoryVersion((prev: number) => prev + 1)
                  }
                }}
                disabled={!historyManager.current.canRedo()}
                className={`
                  p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center shadow-sm
                  ${
                    historyManager.current.canRedo()
                      ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 hover:shadow-md hover:scale-105 border border-blue-200/50 dark:border-blue-700/50'
                      : 'text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }
                `}
                title={t('smart.paste.keyboard.redo')}
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6'
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
            {t('status.status')}
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

      {/* 表格主体 - 美化设计 */}
      <div className='flex-1 overflow-auto min-h-0 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50'>
        {isLoading ? (
          <div className='flex flex-col items-center justify-center h-32 space-y-3'>
            <LoadingSpinner size='lg' showText text={t('common.loading')} />
            <div className='text-sm text-gray-500 dark:text-gray-400'>
              {t('data.loading')}
            </div>
          </div>
        ) : internalData.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-32 space-y-3'>
            <div className='w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-full flex items-center justify-center'>
              <svg
                className='w-6 h-6 text-blue-600 dark:text-blue-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                />
              </svg>
            </div>
            <div className='text-gray-500 dark:text-gray-400 text-center'>
              <div className='font-medium'>{t('common.no.data')}</div>
              <div className='text-sm mt-1'>{t('smart.paste.empty.hint')}</div>
            </div>
          </div>
        ) : (
          <div className='divide-y divide-blue-100/50 dark:divide-blue-800/30'>
            {internalData.map((rowData, rowIndex) => (
              <SmartPasteRow
                key={rowData.id}
                rowData={rowData}
                columns={columns}
                rowIndex={rowIndex}
                isSelected={selectedRows.has(rowIndex)}
                activeCell={cellSelection.activeCell}
                cellSelection={cellSelection}
                onCellChange={(columnKey, value) =>
                  handleCellChange(rowIndex, columnKey, value)
                }
                onCellSelect={handleCellSelect}
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

                        onRowOperation?.({
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

      {/* 底部操作栏 - 美化设计 */}
      <div className='flex-shrink-0 flex items-center justify-between p-4 border-t border-blue-200/50 dark:border-blue-700/50 bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-gray-800 dark:to-blue-900/20 shadow-sm'>
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

                onRowOperation?.({
                  type: 'add',
                  rowIndex: internalData.length,
                  rowData: newRowData,
                })
              }}
              className='px-4 py-2 text-sm bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 flex items-center space-x-2 border border-green-400/50'
            >
              <svg
                className='w-4 h-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                />
              </svg>
              <span>{t('smart.paste.toolbar.add.row')}</span>
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

                onRowOperation?.({
                  type: 'delete',
                  rowIndex: -1, // 批量删除
                })
              }}
              className='px-4 py-2 text-sm bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 flex items-center space-x-2 border border-red-400/50'
            >
              <svg
                className='w-4 h-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                />
              </svg>
              <span>
                {t('smart.paste.toolbar.delete.selected')} ({selectedRows.size})
              </span>
            </button>
          )}
        </div>

        <div className='flex items-center space-x-2'>
          {/* 提交按钮 */}
          <button
            onClick={() => onSubmit?.(internalData)}
            disabled={
              validationSummary.invalidRows > 0 ||
              validationSummary.activeRows === 0
            }
            className={`
              px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-sm
              ${
                validationSummary.invalidRows > 0 ||
                validationSummary.activeRows === 0
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-md hover:scale-105 border border-blue-500/50'
              }
            `}
          >
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <span>
              {t('smart.paste.toolbar.submit')} (
              {validationSummary.validRows + validationSummary.partialRows}/
              {validationSummary.activeRows || validationSummary.totalRows})
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
