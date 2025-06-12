'use client'

import { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useResponsive'

interface Column {
  key: string
  title: string
  render?: (value: any, record: any, index: number) => ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  mobileHidden?: boolean // 移动端是否隐藏此列
}

interface ResponsiveTableProps {
  columns: Column[]
  data: any[]
  loading?: boolean
  emptyText?: string
  onRowClick?: (record: any, index: number) => void
  rowKey?: string | ((record: any) => string)
  className?: string
  mobileCardRender?: (record: any, index: number) => ReactNode // 移动端卡片渲染函数
}

export default function ResponsiveTable({
  columns,
  data,
  loading = false,
  emptyText = '暂无数据',
  onRowClick,
  rowKey = 'id',
  className = '',
  mobileCardRender
}: ResponsiveTableProps) {
  const isMobile = useIsMobile()

  const getRowKey = (record: any, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record)
    }
    return record[rowKey] || index.toString()
  }

  // 移动端卡片视图
  const renderMobileCards = () => {
    if (mobileCardRender) {
      return data.map((record, index) => (
        <div
          key={getRowKey(record, index)}
          className={`bg-white border border-gray-200 rounded-lg p-4 mb-3 ${
            onRowClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''
          }`}
          onClick={() => onRowClick?.(record, index)}
        >
          {mobileCardRender(record, index)}
        </div>
      ))
    }

    // 默认移动端卡片布局
    const visibleColumns = columns.filter(col => !col.mobileHidden)
    
    return data.map((record, index) => (
      <div
        key={getRowKey(record, index)}
        className={`bg-white border border-gray-200 rounded-lg p-4 mb-3 ${
          onRowClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''
        }`}
        onClick={() => onRowClick?.(record, index)}
      >
        {visibleColumns.map((column, colIndex) => {
          const value = record[column.key]
          const displayValue = column.render ? column.render(value, record, index) : value

          return (
            <div key={column.key} className={colIndex > 0 ? 'mt-2' : ''}>
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-gray-500 min-w-0 flex-shrink-0 mr-3">
                  {column.title}:
                </span>
                <span className="text-sm text-gray-900 text-right min-w-0 flex-1">
                  {displayValue}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    ))
  }

  // 桌面端表格视图
  const renderDesktopTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.width ? `w-${column.width}` : ''
                } ${
                  column.align === 'center' ? 'text-center' :
                  column.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((record, index) => (
            <tr
              key={getRowKey(record, index)}
              className={`${
                onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
              }`}
              onClick={() => onRowClick?.(record, index)}
            >
              {columns.map((column) => {
                const value = record[column.key]
                const displayValue = column.render ? column.render(value, record, index) : value

                return (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      column.align === 'center' ? 'text-center' :
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {displayValue}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // 加载状态
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  // 空数据状态
  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">{emptyText}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {isMobile ? (
        <div className="p-4">
          {renderMobileCards()}
        </div>
      ) : (
        renderDesktopTable()
      )}
    </div>
  )
}

// 导出一些常用的列渲染函数
export const columnRenderers = {
  // 货币格式化
  currency: (symbol: string = '¥') => (value: number) => (
    <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
      {value >= 0 ? '' : '-'}{symbol}{Math.abs(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  ),

  // 日期格式化
  date: (format: 'short' | 'long' = 'short') => (value: string | Date) => {
    const date = new Date(value)
    return format === 'short' 
      ? date.toLocaleDateString('zh-CN')
      : date.toLocaleString('zh-CN')
  },

  // 标签渲染
  tag: (color?: string) => (value: string) => (
    <span 
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={color ? { backgroundColor: color + '20', color } : { backgroundColor: '#f3f4f6', color: '#374151' }}
    >
      {value}
    </span>
  ),

  // 状态渲染
  status: (statusMap: Record<string, { label: string; color: string }>) => (value: string) => {
    const status = statusMap[value] || { label: value, color: '#6b7280' }
    return (
      <span 
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: status.color + '20', color: status.color }}
      >
        {status.label}
      </span>
    )
  },

  // 操作按钮
  actions: (actions: Array<{ label: string; onClick: (record: any) => void; color?: string }>) => 
    (value: any, record: any) => (
      <div className="flex space-x-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation()
              action.onClick(record)
            }}
            className={`text-sm font-medium hover:underline ${
              action.color || 'text-blue-600 hover:text-blue-500'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    )
}
