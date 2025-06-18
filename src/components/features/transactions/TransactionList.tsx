'use client'

import { useState } from 'react'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { Transaction } from '@/types/business/transaction'

// 自定义圆形复选框组件
interface CircularCheckboxProps {
  checked: boolean
  onChange: () => void
  className?: string
  size?: 'sm' | 'md'
}

function CircularCheckbox({
  checked,
  onChange,
  className = '',
  size = 'md',
}: CircularCheckboxProps) {
  const sizeClasses = {
    sm: 'h-5 w-5', // 移动端使用更小尺寸
    md: 'h-6 w-6', // 桌面端使用更大尺寸
  }

  const iconSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-4 w-4',
  }

  return (
    <button
      type='button'
      onClick={onChange}
      className={`
        ${sizeClasses[size]} rounded-full border-2 transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
        hover:scale-105 active:scale-95 transform relative
        ${
          checked
            ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500'
            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
        }
        ${className}
      `}
      aria-checked={checked}
      role='checkbox'
    >
      {/* 选中状态的勾选图标 */}
      {checked && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <svg
            className={`${iconSizeClasses[size]} text-white`}
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
      )}

      {/* 未选中状态的内圈 */}
      {!checked && (
        <div className='absolute inset-1 rounded-full bg-gray-50 dark:bg-gray-600 opacity-40' />
      )}
    </button>
  )
}

interface TransactionListProps {
  transactions: Transaction[]
  onEdit: (transaction: Transaction) => void
  onDelete?: (transactionId: string) => void
  onBatchEdit?: (transactionIds: string[]) => void // 批量编辑回调
  onBatchDelete?: (transactionIds: string[]) => void // 批量删除回调
  currencySymbol: string
  showAccount?: boolean
  readOnly?: boolean

  // 新增分页属性
  pagination?: {
    currentPage: number
    totalPages: number
    totalItems: number
    onPageChange: (page: number) => void
    itemsPerPage: number
  }
  headerTitle?: string // 自定义表头标题
  headerDescription?: string // 自定义表头描述
  listType?: 'stock' | 'flow' | 'default' // 列表类型，用于确定默认表头文本
}

export default function TransactionList({
  transactions,
  onEdit,
  onDelete,
  // onBatchEdit,
  onBatchDelete,
  currencySymbol,
  showAccount = true,
  readOnly = false,

  pagination,
  // headerTitle,
  // headerDescription,
  // listType = 'default'
}: TransactionListProps) {
  const { t } = useLanguage()
  const { tags: userTags } = useUserData()
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set()
  )
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [showSingleDeleteConfirm, setShowSingleDeleteConfirm] = useState(false)
  const [deletingTransactionId, setDeletingTransactionId] = useState<
    string | null
  >(null)

  // 获取最新的标签颜色信息
  const getUpdatedTagColor = (tagId: string): string | undefined => {
    const userTag = userTags.find(tag => tag.id === tagId)
    return userTag?.color
  }

  const getTypeIcon = (transaction: Transaction) => {
    const type = transaction.type

    switch (type) {
      case 'INCOME':
        return (
          <div className='h-8 w-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center'>
            <svg
              className='h-4 w-4 text-green-600 dark:text-green-400'
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
        )
      case 'EXPENSE':
        return (
          <div className='h-8 w-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center'>
            <svg
              className='h-4 w-4 text-red-600 dark:text-red-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M20 12H4'
              />
            </svg>
          </div>
        )
      case 'BALANCE':
        return (
          <div className='h-8 w-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center'>
            <svg
              className='h-4 w-4 text-purple-600 dark:text-purple-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
              />
            </svg>
          </div>
        )
      default:
        return (
          <div className='h-8 w-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center'>
            <svg
              className='h-4 w-4 text-gray-600 dark:text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
        )
    }
  }

  const getAmountDisplay = (transaction: Transaction) => {
    const amount = Number(transaction.amount).toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    const symbol = transaction.currency.symbol || currencySymbol

    switch (transaction.type) {
      case 'INCOME':
        return (
          <span className='text-green-600 dark:text-green-400 font-medium'>
            +{symbol}
            {amount}
          </span>
        )
      case 'EXPENSE':
        return (
          <span className='text-red-600 dark:text-red-400 font-medium'>
            -{symbol}
            {amount}
          </span>
        )
      case 'BALANCE':
        return (
          <span className='text-purple-600 dark:text-purple-400 font-medium'>
            {symbol}
            {amount}
          </span>
        )
      default:
        return (
          <span className='text-gray-600 dark:text-gray-400 font-medium'>
            {symbol}
            {amount}
          </span>
        )
    }
  }

  // 检查是否为未来交易
  const isFutureTransaction = (date: string | Date) => {
    const transactionDate = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    // 设置时间为当天的开始，避免时间部分的影响
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const normalizedTransactionDate = new Date(
      transactionDate.getFullYear(),
      transactionDate.getMonth(),
      transactionDate.getDate()
    )
    return normalizedTransactionDate > today
  }

  const formatDate = (date: string | Date) => {
    const transactionDate = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    // 设置时间为当天的开始，避免时间部分的影响
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const normalizedTransactionDate = new Date(
      transactionDate.getFullYear(),
      transactionDate.getMonth(),
      transactionDate.getDate()
    )

    const diffTime = normalizedTransactionDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return t('common.date.today')
    } else if (diffDays === -1) {
      return t('common.date.yesterday')
    } else if (diffDays === 1) {
      return t('common.date.tomorrow')
    } else if (diffDays > 1 && diffDays <= 7) {
      return t('common.date.days.later', { days: diffDays })
    } else if (diffDays < -1 && diffDays >= -7) {
      return t('common.date.days.ago', { days: Math.abs(diffDays) })
    } else {
      return transactionDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
  }

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      pagination.onPageChange(page)
      setSelectedTransactions(new Set()) // 切换页面时清空选择
    }
  }

  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId)
    } else {
      newSelected.add(transactionId)
    }
    setSelectedTransactions(newSelected)
  }

  const handleSelectAll = () => {
    if (
      selectedTransactions.size === transactions.length &&
      transactions.length > 0
    ) {
      // 如果全部选中，则取消全选
      setSelectedTransactions(new Set())
    } else {
      // 否则选中全部
      setSelectedTransactions(new Set(transactions.map(t => t.id)))
    }
  }

  // 计算全选按钮的状态
  const isAllSelected =
    transactions.length > 0 && selectedTransactions.size === transactions.length
  const _isPartialSelected =
    selectedTransactions.size > 0 &&
    selectedTransactions.size < transactions.length

  // const handleBatchEditClick = () => {
  //   if (onBatchEdit && selectedTransactions.size > 0) {
  //     onBatchEdit(Array.from(selectedTransactions))
  //   }
  // }

  const handleBatchDeleteClick = () => {
    if (onBatchDelete && selectedTransactions.size > 0) {
      setShowBatchDeleteConfirm(true)
    }
  }

  const handleConfirmBatchDelete = () => {
    if (onBatchDelete && selectedTransactions.size > 0) {
      onBatchDelete(Array.from(selectedTransactions))
      setSelectedTransactions(new Set()) // 清空选择
      setShowBatchDeleteConfirm(false)
    }
  }

  // 处理单个删除
  const handleSingleDelete = (transaction: Transaction) => {
    setDeletingTransactionId(transaction.id)
    setShowSingleDeleteConfirm(true)
  }

  const handleConfirmSingleDelete = () => {
    if (onDelete && deletingTransactionId) {
      onDelete(deletingTransactionId)
      setShowSingleDeleteConfirm(false)
      setDeletingTransactionId(null)
    }
  }

  const handleCancelSingleDelete = () => {
    setShowSingleDeleteConfirm(false)
    setDeletingTransactionId(null)
  }

  if (transactions.length === 0) {
    return (
      <div className='p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400'>
        <svg
          className='mx-auto h-10 w-10 sm:h-12 sm:w-12 mb-4'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
          />
        </svg>
        <p className='text-base sm:text-lg font-medium'>
          {t('transaction.list.empty.title')}
        </p>
        <p className='text-xs sm:text-sm mt-1'>
          {t('transaction.list.empty.description')}
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* 批量操作栏 */}
      {!readOnly && selectedTransactions.size > 0 && (
        <div className='bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 sm:px-6 py-3'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0'>
            <span className='text-xs sm:text-sm text-blue-700 dark:text-blue-300'>
              {t('transaction.list.selected', {
                count: selectedTransactions.size,
              })}
            </span>
            <div className='flex space-x-2'>
              {/* 暂时隐藏批量编辑功能 */}
              {/* {onBatchEdit && (
                <button
                  onClick={handleBatchEditClick}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 touch-manipulation"
                >
                  {t('transaction.list.batch.edit')}
                </button>
              )} */}
              {onBatchDelete && (
                <button
                  onClick={handleBatchDeleteClick}
                  className='text-xs sm:text-sm text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 touch-manipulation'
                >
                  {t('transaction.list.batch.delete')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 表头 - 移动端隐藏 */}
      <div className='hidden sm:block bg-gray-50 dark:bg-gray-800 px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center'>
            {!readOnly && (
              <CircularCheckbox
                checked={isAllSelected}
                onChange={handleSelectAll}
                size='md'
                className='mr-3'
              />
            )}
            <span className='text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
              {readOnly
                ? t('transaction.list.header.records')
                : t('transaction.list.header.transactions')}
            </span>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className='flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400'>
              <span>
                {t('transaction.list.pagination.info', {
                  current: pagination.currentPage,
                  total: pagination.totalPages,
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 交易列表 */}
      <div className='divide-y divide-gray-200 dark:divide-gray-700'>
        {transactions.map(transaction => (
          <div
            key={transaction.id}
            className={`p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
              selectedTransactions.has(transaction.id)
                ? 'bg-blue-50 dark:bg-blue-900/20'
                : ''
            }`}
          >
            {/* 移动端布局 */}
            <div className='sm:hidden'>
              <div className='flex items-start space-x-3'>
                {/* 选择框和图标 */}
                <div className='flex flex-col items-center space-y-2'>
                  {!readOnly && (
                    <CircularCheckbox
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                      size='sm'
                    />
                  )}
                  <div className='flex-shrink-0'>
                    {getTypeIcon(transaction)}
                  </div>
                </div>

                {/* 交易信息 */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center space-x-2'>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                          {transaction.description}
                        </p>
                        {isFutureTransaction(transaction.date) && (
                          <span className='inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800'>
                            {t('common.date.future')}
                          </span>
                        )}
                      </div>
                      <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                        <div>{transaction.category.name}</div>
                        <div className='flex items-center space-x-1 mt-0.5'>
                          {showAccount && transaction.account && (
                            <span>{transaction.account.name} • </span>
                          )}
                          <span>{formatDate(transaction.date)}</span>
                          <span> • </span>
                          <span className='text-blue-600 dark:text-blue-400'>
                            {transaction.type === 'INCOME'
                              ? '收入'
                              : transaction.type === 'EXPENSE'
                                ? '支出'
                                : '余额'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className='flex flex-col items-end space-y-2'>
                      <div className='text-right'>
                        {getAmountDisplay(transaction)}
                      </div>
                      {!readOnly && (
                        <div className='flex items-center space-x-1'>
                          {/* 编辑按钮 */}
                          <button
                            onClick={() => onEdit(transaction)}
                            className='p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none touch-manipulation'
                            title={t('transaction.edit')}
                          >
                            <svg
                              className='h-4 w-4'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                              />
                            </svg>
                          </button>

                          {/* 删除按钮 */}
                          {onDelete && (
                            <button
                              onClick={() => handleSingleDelete(transaction)}
                              className='p-1 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 focus:outline-none touch-manipulation'
                              title={t('transaction.delete')}
                            >
                              <svg
                                className='h-4 w-4'
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
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 桌面端布局 */}
            <div className='hidden sm:flex items-center space-x-4'>
              {/* 选择框 */}
              {!readOnly && (
                <CircularCheckbox
                  checked={selectedTransactions.has(transaction.id)}
                  onChange={() => handleSelectTransaction(transaction.id)}
                  size='md'
                />
              )}

              {/* 交易类型图标 */}
              <div className='flex-shrink-0'>{getTypeIcon(transaction)}</div>

              {/* 交易信息 */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center space-x-2'>
                      <p className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                        {transaction.description}
                      </p>
                      {isFutureTransaction(transaction.date) && (
                        <span className='inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800'>
                          {t('common.date.future')}
                        </span>
                      )}
                    </div>
                    <div className='flex items-center space-x-2 mt-1 text-xs text-gray-500 dark:text-gray-400'>
                      <span>{transaction.category.name}</span>
                      {showAccount && transaction.account && (
                        <>
                          <span>•</span>
                          <span>{transaction.account.name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDate(transaction.date)}</span>
                      <span>•</span>
                      <span className='text-blue-600 dark:text-blue-400'>
                        {transaction.type === 'INCOME'
                          ? '收入交易'
                          : transaction.type === 'EXPENSE'
                            ? '支出交易'
                            : '余额更新'}
                      </span>
                    </div>
                  </div>

                  <div className='flex items-center space-x-4'>
                    <div className='text-right'>
                      {getAmountDisplay(transaction)}
                    </div>

                    {!readOnly && (
                      <div className='flex items-center space-x-2'>
                        {/* 编辑按钮 */}
                        <button
                          onClick={() => onEdit(transaction)}
                          className='text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none'
                          title={t('transaction.edit')}
                        >
                          <svg
                            className='h-4 w-4'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                            />
                          </svg>
                        </button>

                        {/* 删除按钮 */}
                        {onDelete && (
                          <button
                            onClick={() => handleSingleDelete(transaction)}
                            className='text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 focus:outline-none'
                            title={t('transaction.delete')}
                          >
                            <svg
                              className='h-4 w-4'
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
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 标签和备注 - 共享布局 */}
                <div className='mt-2 sm:ml-12'>
                  {/* 标签 */}
                  {transaction.tags && transaction.tags.length > 0 && (
                    <div className='flex items-center flex-wrap gap-1 mb-2'>
                      {transaction.tags.slice(0, 3).map(({ tag }) => {
                        // 安全检查：确保tag对象存在
                        if (!tag) return null

                        // 从 UserDataContext 获取标签颜色信息
                        const currentColor = getUpdatedTagColor(tag.id)

                        return (
                          <span
                            key={tag.id}
                            className='inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            style={
                              currentColor
                                ? {
                                    backgroundColor: currentColor + '20',
                                    color: currentColor,
                                  }
                                : {}
                            }
                          >
                            {tag.name}
                          </span>
                        )
                      })}
                      {transaction.tags.length > 3 && (
                        <span className='text-xs text-gray-500 dark:text-gray-400'>
                          +{transaction.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 备注 */}
                  {transaction.notes && (
                    <p className='text-xs text-gray-500 dark:text-gray-400 italic'>
                      {transaction.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页控件 */}
      {pagination && pagination.totalPages > 1 && (
        <div className='bg-white dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6'>
          <div className='flex items-center justify-between'>
            <div className='flex-1 flex justify-between sm:hidden'>
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className='relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {t('common.pagination.previous')}
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className='ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {t('common.pagination.next')}
              </button>
            </div>
            <div className='hidden sm:flex-1 sm:flex sm:items-center sm:justify-between'>
              <div>
                <p className='text-sm text-gray-700 dark:text-gray-300'>
                  {t('common.pagination.showing', {
                    start:
                      (pagination.currentPage - 1) * pagination.itemsPerPage +
                      1,
                    end: Math.min(
                      pagination.currentPage * pagination.itemsPerPage,
                      pagination.totalItems
                    ),
                    total: pagination.totalItems,
                  })}
                </p>
              </div>
              <div>
                <nav
                  className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px'
                  aria-label='Pagination'
                >
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className='relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <span className='sr-only'>
                      {t('common.pagination.previous')}
                    </span>
                    <svg
                      className='h-5 w-5'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </button>
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1
                  ).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pagination.currentPage
                          ? 'z-10 bg-blue-50 dark:bg-blue-900/50 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className='relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <span className='sr-only'>
                      {t('common.pagination.next')}
                    </span>
                    <svg
                      className='h-5 w-5'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 单个删除确认模态框 */}
      <ConfirmationModal
        isOpen={showSingleDeleteConfirm}
        title={t('transaction.delete.transaction.title')}
        message={t('transaction.delete.transaction.message')}
        confirmLabel={t('common.confirm.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmSingleDelete}
        onCancel={handleCancelSingleDelete}
        variant='danger'
      />

      {/* 批量删除确认模态框 */}
      <ConfirmationModal
        isOpen={showBatchDeleteConfirm}
        title={t('transaction.delete.batch.title')}
        message={t('transaction.delete.batch.message', {
          count: selectedTransactions.size,
        })}
        confirmLabel={t('common.confirm.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmBatchDelete}
        onCancel={() => setShowBatchDeleteConfirm(false)}
        variant='danger'
      />
    </div>
  )
}
