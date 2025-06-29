'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import { getCurrencyFormatInfo } from '@/lib/utils/smart-paste-currency'

import Calendar from '@/components/ui/forms/Calendar'
import CurrencyTag from '@/components/ui/data-display/CurrencyTag'
import { ColorManager } from '@/lib/utils/color'

import type {
  CellValidationStatus,
  SmartPasteColumn,
  SmartPasteRowData,
} from '@/types/core'

interface SmartPasteCellProps {
  column: SmartPasteColumn
  _rowData?: SmartPasteRowData
  columns?: SmartPasteColumn[] // 所有列配置，用于混合账户模式的货币格式化
  value: unknown
  isActive: boolean
  isSelected: boolean
  isCopied?: boolean
  validationStatus: CellValidationStatus
  errors: string[]
  onChange: (value: unknown) => void
  onSelect?: (event: React.MouseEvent) => void
  onFocus: () => void
  onBlur: () => void
  onKeyDown: (event: React.KeyboardEvent) => void
  onColumnPaste?: (columnKey: string, values: unknown[]) => void
  availableTags?: Array<{ id: string; name: string; color?: string }>
  hasMultipleSelection?: boolean // 是否有多个单元格被选中
  className?: string
}

export default function SmartPasteCell({
  column,
  _rowData,
  columns = [],
  value,
  isActive,
  isSelected,
  isCopied = false,
  validationStatus,
  errors,
  onChange,
  onSelect,
  onFocus,
  onBlur,
  onKeyDown,
  onColumnPaste,
  hasMultipleSelection = false,
  availableTags = [],
  className = '',
}: SmartPasteCellProps) {
  const { t } = useLanguage()
  const { formatCurrency } = useUserCurrencyFormatter()
  const { formatInputDate } = useUserDateFormatter()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<string>('')
  const [showTagSelector, setShowTagSelector] = useState(false)
  const [showAccountSelector, setShowAccountSelector] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cellRef = useRef<HTMLDivElement>(null)

  // 计算弹出菜单位置
  const calculateDropdownPosition = useCallback(() => {
    if (!cellRef.current) return null

    const rect = cellRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const dropdownHeight = 200 // 估算的下拉菜单高度

    // 检查是否有足够空间在下方显示
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top

    let top: number
    if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
      // 在下方显示
      top = rect.bottom + window.scrollY + 4
    } else {
      // 在上方显示
      top = rect.top + window.scrollY - dropdownHeight - 4
    }

    return {
      top,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 200), // 最小宽度200px
    }
  }, [])

  // 获取单元格背景色
  const getCellBackgroundColor = useCallback(() => {
    // 复制状态优先级最高（显示动画边框）
    if (isCopied) {
      return 'bg-blue-100 dark:bg-blue-900/30'
    }

    // 选中状态
    if (isSelected) {
      return 'bg-blue-50 dark:bg-blue-900/20'
    }

    // 编辑状态
    if (isEditing) {
      return 'bg-white dark:bg-gray-800'
    }

    // 验证状态
    switch (validationStatus) {
      case 'valid':
        return 'bg-green-50/50 dark:bg-green-900/10'
      case 'invalid':
        return 'bg-red-50/50 dark:bg-red-900/10'
      case 'pending':
        return 'bg-yellow-50/50 dark:bg-yellow-900/10'
      case 'empty':
      default:
        return 'bg-white dark:bg-gray-900'
    }
  }, [isCopied, isSelected, validationStatus, isEditing])

  // 获取单元格边框样式（复制状态的动画效果）
  const getCellBorderStyle = useCallback(() => {
    if (isCopied) {
      return 'ring-2 ring-blue-400 ring-opacity-75 animate-pulse'
    }
    return ''
  }, [isCopied])

  // 格式化显示值
  const getDisplayValue = useCallback(() => {
    if (value === null || value === undefined || value === '') {
      return ''
    }

    switch (column.dataType) {
      case 'currency':
        if (typeof value === 'number' && _rowData) {
          // 使用智能货币格式化工具
          const formatInfo = getCurrencyFormatInfo(
            value,
            column,
            _rowData,
            columns
          )

          if (formatInfo.shouldFormat) {
            return formatCurrency(value, formatInfo.currencyCode, {
              precision: formatInfo.decimalPlaces,
              showSymbol: true,
            })
          }
        }
        return String(value)

      case 'date':
        if (value instanceof Date && !isNaN(value.getTime())) {
          return formatInputDate(value)
        }
        if (value && typeof value === 'string') {
          try {
            const dateValue = new Date(value)
            if (!isNaN(dateValue.getTime())) {
              return formatInputDate(dateValue)
            }
          } catch {
            // 忽略无效日期
          }
        }
        return ''

      case 'number':
        if (typeof value === 'number' && column.format?.number) {
          const { decimalPlaces = 2, thousandSeparator = true } =
            column.format.number
          const formatted = value.toFixed(decimalPlaces)
          return thousandSeparator
            ? formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            : formatted
        }
        return String(value)

      case 'account':
        if (value && column.options) {
          // 如果是账户ID，需要从options中找到对应的账户名称
          const option = column.options.find(opt => opt.value === value)
          return option ? option.label : String(value)
        }
        return String(value)

      case 'tags':
        if (Array.isArray(value) && value.length > 0) {
          // 如果是标签ID数组，需要从availableTags中找到对应的标签名称
          const tagNames = value.map(tagId => {
            const tag = availableTags.find(t => t.id === tagId)
            return tag ? tag.name : tagId
          })
          return tagNames.join(', ')
        }
        return ''

      default:
        return String(value)
    }
  }, [value, column, formatCurrency, formatInputDate, _rowData, columns])

  // 开始编辑
  const startEditing = useCallback(() => {
    if (column.isReadOnly || isEditing) return

    // 特殊类型不使用传统编辑模式
    if (
      column.dataType === 'tags' ||
      column.dataType === 'account' ||
      column.dataType === 'date'
    ) {
      return
    }

    setIsEditing(true)
    setEditValue(String(value || ''))

    // 延迟聚焦，确保输入框已渲染
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }, [column.isReadOnly, column.dataType, isEditing, value])

  // 结束编辑
  const finishEditing = useCallback(
    (save: boolean = true) => {
      if (!isEditing) return

      setIsEditing(false)

      if (save && editValue !== String(value || '')) {
        // 根据数据类型转换值
        let newValue: unknown = editValue

        switch (column.dataType) {
          case 'number':
          case 'currency':
            const numValue = parseFloat(editValue.replace(/[,\s]/g, ''))
            newValue = isNaN(numValue) ? null : numValue
            break

          case 'date':
            try {
              newValue = editValue ? new Date(editValue) : null
            } catch {
              newValue = null
            }
            break

          default:
            newValue = editValue.trim() || null
        }

        onChange(newValue)
      }

      onBlur()
    },
    [isEditing, editValue, value, column.dataType, onChange, onBlur]
  )

  // 处理复制
  const handleCopy = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        event.preventDefault()
        const textValue = getDisplayValue()
        if (textValue) {
          navigator.clipboard.writeText(textValue)
        }
      }
    },
    [getDisplayValue]
  )

  // 处理单个值的类型转换
  const processValueByType = useCallback(
    (value: string): unknown => {
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
              const tag = availableTags.find(
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
    [column.dataType, availableTags]
  )

  // 处理粘贴
  const handlePaste = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        // 如果有多个单元格被选中，让SmartPasteGrid处理粘贴事件
        if (hasMultipleSelection) {
          // 不阻止事件，让它冒泡到SmartPasteGrid
          return
        }

        event.preventDefault()

        navigator.clipboard
          .readText()
          .then(text => {
            if (text) {
              // 检查是否是多行数据（列粘贴）
              const lines = text.split('\n').filter(line => line.trim() !== '')

              if (lines.length > 1 && onColumnPaste) {
                // 多行数据，触发列粘贴
                // 如果当前单元格处于编辑状态，先退出编辑模式
                if (isEditing) {
                  finishEditing(false) // 不保存当前编辑的值，因为会被粘贴的数据覆盖
                }

                const processedValues = lines.map(line =>
                  processValueByType(line)
                )
                onColumnPaste(column.key, processedValues)
              } else {
                // 单行数据，正常处理
                const processedValue = processValueByType(text)

                if (isEditing) {
                  // 如果处于编辑状态，直接更新编辑值并结束编辑
                  setEditValue(String(processedValue || ''))
                  finishEditing(true)
                } else {
                  // 如果不在编辑状态，直接更新值
                  onChange(processedValue)
                }
              }
            }
          })
          .catch(err => {
            console.error('Failed to read clipboard:', err)
          })
      }
    },
    [
      column.dataType,
      column.key,
      onChange,
      onColumnPaste,
      processValueByType,
      isEditing,
      finishEditing,
      hasMultipleSelection,
    ]
  )

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // 处理复制粘贴
      handleCopy(event)
      handlePaste(event)

      if (isEditing) {
        switch (event.key) {
          case 'Enter':
            event.preventDefault()
            finishEditing(true)
            onKeyDown(event)
            break

          case 'Escape':
            event.preventDefault()
            finishEditing(false)
            break

          case 'Tab':
            finishEditing(true)
            onKeyDown(event)
            break

          default:
            // 允许其他键盘事件继续传播
            break
        }
      } else {
        switch (event.key) {
          case 'Enter':
          case 'F2':
            event.preventDefault()

            // 对于特殊类型，打开相应的选择器
            if (column.dataType === 'tags') {
              const position = calculateDropdownPosition()
              if (position) {
                setDropdownPosition(position)
                setShowTagSelector(true)
              }
            } else if (column.dataType === 'account') {
              const position = calculateDropdownPosition()
              if (position) {
                setDropdownPosition(position)
                setShowAccountSelector(true)
              }
            } else if (column.dataType === 'date') {
              const position = calculateDropdownPosition()
              if (position) {
                setDropdownPosition(position)
                setShowDatePicker(true)
              }
            } else {
              // 其他类型进入编辑模式
              startEditing()
            }
            break

          default:
            onKeyDown(event)
            break
        }
      }
    },
    [isEditing, finishEditing, startEditing, onKeyDown, handleCopy, handlePaste]
  )

  // 处理单击事件
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()

      // 触发选择事件
      if (onSelect) {
        onSelect(e)
      }

      onFocus()

      // 统一逻辑：单击只选择，不进入编辑模式或打开选择器
      // 编辑模式和选择器通过双击或F2键触发
    },
    [onSelect, onFocus]
  )

  // 处理双击事件
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()

      // 对于特殊类型，双击打开相应的选择器
      if (column.dataType === 'tags') {
        const position = calculateDropdownPosition()
        if (position) {
          setDropdownPosition(position)
          setShowTagSelector(true)
        }
        return
      }

      if (column.dataType === 'account') {
        const position = calculateDropdownPosition()
        if (position) {
          setDropdownPosition(position)
          setShowAccountSelector(true)
        }
        return
      }

      if (column.dataType === 'date') {
        const position = calculateDropdownPosition()
        if (position) {
          setDropdownPosition(position)
          setShowDatePicker(true)
        }
        return
      }

      // 其他类型：双击进入编辑模式
      if (!isEditing && !column.isReadOnly) {
        startEditing()
      }
    },
    [
      column.dataType,
      column.isReadOnly,
      isEditing,
      startEditing,
      calculateDropdownPosition,
    ]
  )

  // 处理标签选择器外部点击关闭
  useEffect(() => {
    if (!showTagSelector) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // 检查是否点击在cell内或Portal弹出菜单内
      if (cellRef.current && !cellRef.current.contains(target)) {
        // 检查是否点击在Portal渲染的弹出菜单内
        const portalElements = document.querySelectorAll(
          '[data-portal-type="tag-selector"]'
        )
        let clickedInPortal = false
        portalElements.forEach(element => {
          if (element.contains(target)) {
            clickedInPortal = true
          }
        })

        if (!clickedInPortal) {
          setShowTagSelector(false)
          setDropdownPosition(null)
        }
      }
    }

    // 延迟添加监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTagSelector])

  // 处理账户选择器外部点击关闭
  useEffect(() => {
    if (!showAccountSelector) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // 检查是否点击在cell内或Portal弹出菜单内
      if (cellRef.current && !cellRef.current.contains(target)) {
        // 检查是否点击在Portal渲染的弹出菜单内
        const portalElements = document.querySelectorAll(
          '[data-portal-type="account-selector"]'
        )
        let clickedInPortal = false
        portalElements.forEach(element => {
          if (element.contains(target)) {
            clickedInPortal = true
          }
        })

        if (!clickedInPortal) {
          setShowAccountSelector(false)
          setDropdownPosition(null)
        }
      }
    }

    // 延迟添加监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAccountSelector])

  // 处理日期选择器外部点击关闭
  useEffect(() => {
    if (!showDatePicker) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // 检查是否点击在cell内或Portal弹出菜单内
      if (cellRef.current && !cellRef.current.contains(target)) {
        // 检查是否点击在Portal渲染的弹出菜单内
        const portalElements = document.querySelectorAll(
          '[data-portal-type="date-picker"]'
        )
        let clickedInPortal = false
        portalElements.forEach(element => {
          if (element.contains(target)) {
            clickedInPortal = true
          }
        })

        if (!clickedInPortal) {
          setShowDatePicker(false)
          setDropdownPosition(null)
        }
      }
    }

    // 延迟添加监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDatePicker])

  // 监听窗口滚动和resize事件，更新弹出菜单位置
  useEffect(() => {
    if (!showAccountSelector && !showTagSelector && !showDatePicker) return

    const updatePosition = () => {
      const newPosition = calculateDropdownPosition()
      if (newPosition) {
        setDropdownPosition(newPosition)
      }
    }

    const handleScroll = () => updatePosition()
    const handleResize = () => updatePosition()

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [
    showAccountSelector,
    showTagSelector,
    showDatePicker,
    calculateDropdownPosition,
  ])

  // 渲染编辑器
  const renderEditor = () => {
    if (!isEditing) return null

    const commonProps = {
      ref: inputRef,
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setEditValue(e.target.value),
      onBlur: () => finishEditing(true),
      onKeyDown: handleKeyDown,
      className:
        'w-full h-full px-2 py-1 border-0 outline-none bg-transparent text-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100',
      autoFocus: true,
    }

    switch (column.dataType) {
      case 'number':
      case 'currency':
        return (
          <input
            {...commonProps}
            type='number'
            step='any'
            placeholder={column.placeholder}
          />
        )

      case 'date':
        return (
          <input
            {...commonProps}
            type='date'
            placeholder={column.placeholder}
            className='w-full h-full px-2 py-1 text-sm bg-transparent border-none outline-none focus:ring-0 text-gray-900 dark:text-gray-100 [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100'
          />
        )

      case 'account':
        // 账户类型不需要传统的输入框编辑器
        return null

      case 'tags':
        // 标签类型不需要传统的输入框编辑器
        return null

      default:
        return (
          <input
            {...commonProps}
            type='text'
            placeholder={column.placeholder}
          />
        )
    }
  }

  return (
    <div
      ref={cellRef}
      className={`
        relative h-full min-h-[36px] border-r border-b border-blue-100/50 dark:border-blue-800/30
        transition-all duration-200 cursor-pointer flex flex-col
        hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-blue-100/20 dark:hover:from-blue-900/20 dark:hover:to-blue-800/10
        hover:shadow-sm hover:border-blue-200/70 dark:hover:border-blue-700/50
        ${getCellBackgroundColor()}
        ${getCellBorderStyle()}
        ${isActive ? 'ring-2 ring-blue-500/50 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 shadow-sm' : ''}
        ${isEditing ? 'ring-2 ring-blue-600/70 bg-white dark:bg-gray-800 shadow-md z-10' : ''}
        ${isSelected && !isCopied ? 'ring-2 ring-blue-400/60 bg-blue-50/30 dark:bg-blue-900/20' : ''}
        ${className}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* 标签类型的特殊渲染 */}
      {column.dataType === 'tags' ? (
        <div className='px-2 py-1 text-sm flex-1 flex items-center flex-wrap gap-1 min-h-0'>
          {Array.isArray(value) && value.length > 0 ? (
            value.map(tagId => {
              const tag = availableTags.find(t => t.id === tagId)
              return tag ? (
                <span
                  key={tagId}
                  className='inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 leading-none'
                  style={{
                    backgroundColor: tag.color ? `${tag.color}20` : undefined,
                  }}
                >
                  {tag.name}
                </span>
              ) : null
            })
          ) : (
            <span className='text-gray-400 dark:text-gray-500 text-xs py-1'>
              {t('smart.paste.cell.placeholder.tags')}
            </span>
          )}
        </div>
      ) : column.dataType === 'account' ? (
        // 账户类型的特殊渲染 - 紧凑设计
        <div className='px-2 py-1 text-sm flex-1 flex items-center min-h-0'>
          {value && column.options ? (
            (() => {
              const option = column.options.find(opt => opt.value === value)
              return option ? (
                <div className='flex items-center space-x-2 flex-1 min-w-0'>
                  <span className='text-gray-900 dark:text-gray-100 truncate'>
                    {option.label}
                  </span>
                  {(option as any).currencyCode && (
                    <CurrencyTag
                      currencyCode={(option as any).currencyCode}
                      color={(option as any).accountColor || undefined}
                      size='xs'
                      className='flex-shrink-0'
                    />
                  )}
                </div>
              ) : (
                <span className='text-gray-500 dark:text-gray-400 truncate'>
                  {String(value)}
                </span>
              )
            })()
          ) : (
            <span className='text-gray-400 dark:text-gray-500 text-xs'>
              {t('smart.paste.cell.placeholder.account')}
            </span>
          )}
        </div>
      ) : // 其他类型的正常渲染
      isEditing ? (
        <div className='flex-1 flex items-center'>{renderEditor()}</div>
      ) : (
        <div className='px-2 py-1 text-sm flex-1 flex items-center min-h-0 text-gray-900 dark:text-gray-100'>
          {getDisplayValue() || (
            <span className='text-gray-400 dark:text-gray-500 text-xs'>
              {column.placeholder || t('common.empty')}
            </span>
          )}
        </div>
      )}

      {/* 验证状态指示器 - 紧凑设计 */}
      {/* 验证状态指示器 */}
      {!isEditing && validationStatus !== 'empty' && (
        <div className='absolute top-0.5 right-0.5 z-10'>
          {validationStatus === 'valid' && (
            <div
              className='w-2 h-2 bg-green-500 rounded-full opacity-90 cursor-help shadow-sm'
              title='✅ 数据验证通过'
            ></div>
          )}
          {validationStatus === 'invalid' && errors.length > 0 && (
            <div
              className='w-2 h-2 bg-red-500 rounded-full opacity-90 cursor-help animate-pulse shadow-sm'
              title={`❌ 错误: ${errors.join('; ')}`}
            ></div>
          )}
          {validationStatus === 'pending' && errors.length > 0 && (
            <div
              className='w-2 h-2 bg-yellow-500 rounded-full opacity-90 cursor-help animate-pulse shadow-sm'
              title={`💡 提示: ${errors.join('; ')}`}
            ></div>
          )}
        </div>
      )}

      {/* 错误信息悬浮提示 */}
      {!isEditing &&
        errors.length > 0 &&
        (validationStatus === 'invalid' || validationStatus === 'pending') && (
          <div className='absolute bottom-full left-0 right-0 mb-1 opacity-0 hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none'>
            <div
              className={`
            text-xs px-2 py-1 rounded shadow-lg max-w-xs
            ${
              validationStatus === 'invalid'
                ? 'bg-red-100 dark:bg-red-900/80 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700'
                : 'bg-yellow-100 dark:bg-yellow-900/80 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700'
            }
          `}
            >
              <div className='font-medium mb-1'>
                {validationStatus === 'invalid' ? '❌ 错误' : '💡 提示'}
              </div>
              <ul className='space-y-0.5'>
                {errors.map((error, index) => (
                  <li key={index} className='text-xs'>
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

      {/* 标签选择器弹出层 - 使用Portal渲染到body */}
      {showTagSelector &&
        column.dataType === 'tags' &&
        dropdownPosition &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className='fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4'
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              minWidth: Math.max(dropdownPosition.width, 250),
              maxWidth: 400,
            }}
            data-portal-type='tag-selector'
            onClick={e => e.stopPropagation()}
          >
            <div className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
              {t('transaction.tags')}
            </div>
            <div className='flex flex-wrap gap-2 max-h-48 overflow-y-auto'>
              {availableTags.map(tag => {
                const isSelected =
                  Array.isArray(value) && value.includes(tag.id)
                const tagColor =
                  tag.color || ColorManager.getSemanticColor('primary')
                return (
                  <button
                    key={tag.id}
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      const currentTags = (value as string[]) || []
                      const newTags = currentTags.includes(tag.id)
                        ? currentTags.filter(id => id !== tag.id)
                        : [...currentTags, tag.id]
                      onChange(newTags)
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 border-2 ${
                      isSelected
                        ? 'text-white border-opacity-100'
                        : 'text-gray-700 dark:text-gray-300 border-transparent hover:border-opacity-50'
                    }`}
                    style={{
                      backgroundColor: isSelected ? tagColor : 'transparent',
                      borderColor: isSelected ? tagColor : tagColor + '40', // 40 = 25% opacity
                      color: isSelected ? 'white' : undefined,
                    }}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
            {availableTags.length === 0 && (
              <div className='text-center text-gray-500 dark:text-gray-400 py-4'>
                {t('smart.paste.tag.selector.no.results')}
              </div>
            )}
          </div>,
          document.body
        )}

      {/* 账户选择器弹出层 - 使用Portal渲染到body */}
      {showAccountSelector &&
        column.dataType === 'account' &&
        column.options &&
        dropdownPosition &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className='fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2'
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              minWidth: 150,
              width: 'auto',
            }}
            data-portal-type='account-selector'
            onClick={e => e.stopPropagation()}
          >
            {/* <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
            选择账户
          </div> */}
            <div className='max-h-48 overflow-y-auto'>
              {(() => {
                // 按账户类型分组
                const groupedAccounts = column.options.reduce(
                  (groups, option) => {
                    try {
                      const accountData = option.data as {
                        category?: { type?: string }
                      }
                      const accountType = accountData?.category?.type || 'OTHER'

                      if (!groups[accountType]) {
                        groups[accountType] = []
                      }
                      groups[accountType].push(option)
                    } catch {
                      if (!groups['OTHER']) {
                        groups['OTHER'] = []
                      }
                      groups['OTHER'].push(option)
                    }
                    return groups
                  },
                  {} as Record<string, typeof column.options>
                )

                // 定义显示顺序和标题
                const sectionOrder = [
                  {
                    key: 'INCOME',
                    title: t('account.type.income.category'),
                    color: 'text-green-600 dark:text-green-400',
                  },
                  {
                    key: 'EXPENSE',
                    title: t('account.type.expense.category'),
                    color: 'text-orange-600 dark:text-orange-400',
                  },
                  {
                    key: 'ASSET',
                    title: t('account.type.asset.category'),
                    color: 'text-blue-600 dark:text-blue-400',
                  },
                  {
                    key: 'LIABILITY',
                    title: t('account.type.liability.category'),
                    color: 'text-red-600 dark:text-red-400',
                  },
                  {
                    key: 'OTHER',
                    title: t('common.other'),
                    color: 'text-gray-600 dark:text-gray-400',
                  },
                ]

                return sectionOrder.map(section => {
                  const accounts = groupedAccounts[section.key]
                  if (!accounts || accounts.length === 0) return null

                  return (
                    <div key={section.key} className='mb-3 last:mb-0'>
                      <div
                        className={`text-xs font-medium px-2 py-1 ${section.color} border-b border-gray-200 dark:border-gray-600`}
                      >
                        {section.title}
                      </div>
                      <div className='mt-1'>
                        {accounts.map(option => {
                          const isSelected = value === option.value
                          return (
                            <button
                              key={String(option.value)}
                              onClick={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                onChange(option.value)
                                setShowAccountSelector(false)
                                setDropdownPosition(null)
                              }}
                              className={`
                              w-full text-left px-3 py-2 text-sm transition-all duration-200 flex items-center justify-between
                              ${
                                isSelected
                                  ? 'bg-blue-500 text-white'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }
                            `}
                            >
                              <div className='flex items-center space-x-2 flex-1 min-w-0'>
                                <span className='truncate'>{option.label}</span>
                                {(option as any).currencyCode && (
                                  <CurrencyTag
                                    currencyCode={(option as any).currencyCode}
                                    color={
                                      (option as any).accountColor || undefined
                                    }
                                    size='xs'
                                    className='flex-shrink-0'
                                  />
                                )}
                              </div>
                              {isSelected && (
                                <svg
                                  className='w-4 h-4 flex-shrink-0'
                                  fill='currentColor'
                                  viewBox='0 0 20 20'
                                >
                                  <path
                                    fillRule='evenodd'
                                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                                    clipRule='evenodd'
                                  />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
            {column.options.length === 0 && (
              <div className='text-center text-gray-500 dark:text-gray-400 py-4'>
                {t('smart.paste.account.selector.no.results')}
              </div>
            )}
          </div>,
          document.body
        )}

      {/* 日期选择器弹出层 - 使用Portal渲染到body */}
      {showDatePicker &&
        column.dataType === 'date' &&
        dropdownPosition &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className='fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg'
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: 280,
            }}
            data-portal-type='date-picker'
            onClick={e => e.stopPropagation()}
          >
            <Calendar
              key={`calendar-${column.key}-${showDatePicker}`}
              value={value ? String(value) : ''}
              onChange={newValue => {
                onChange(newValue)
                setShowDatePicker(false)
                setDropdownPosition(null)
              }}
              showYearMonthSelector={true}
            />
          </div>,
          document.body
        )}
    </div>
  )
}
