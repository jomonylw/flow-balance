'use client'

import { useState } from 'react'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import CircularCheckbox from '@/components/ui/forms/CircularCheckbox'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import { ExtendedTransaction } from '@/types/core'

interface TransactionListProps {
  transactions: ExtendedTransaction[]
  onEdit: (transaction: ExtendedTransaction) => void
  onDelete?: (transactionId: string) => void
  onBatchEdit?: (transactionIds: string[]) => void // 批量编辑回调
  onBatchDelete?: (transactionIds: string[]) => void // 批量删除回调
  currencySymbol?: string // 保持向后兼容，但不再使用
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
  currencySymbol: _currencySymbol, // 保持向后兼容但不使用
  showAccount = true,
  readOnly = false,

  pagination,
  // headerTitle,
  // headerDescription,
  // listType = 'default'
}: TransactionListProps) {
  const { t } = useLanguage()
  const { tags: userTags } = useUserData()
  const { formatCurrencyById, getUserLocale: _getUserLocale } =
    useUserCurrencyFormatter()
  const { formatSmartDate } = useUserDateFormatter()
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

  const getTypeIcon = (transaction: ExtendedTransaction) => {
    const type = transaction.type

    switch (type) {
      case 'INCOME':
        return (
          <div className='h-9 w-9 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center border border-green-200 dark:border-green-800'>
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
          <div className='h-9 w-9 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center border border-red-200 dark:border-red-800'>
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
          <div className='h-9 w-9 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center border border-purple-200 dark:border-purple-800'>
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
          <div className='h-9 w-9 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600'>
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

  const getAmountDisplay = (transaction: ExtendedTransaction) => {
    // 使用基于ID的货币格式化，避免重复货币代码问题
    const formattedAmount = formatCurrencyById(
      Number(transaction.amount),
      transaction.currency.id
    )

    switch (transaction.type) {
      case 'INCOME':
        return (
          <div className='text-right'>
            <span className='text-lg font-bold text-green-600 dark:text-green-400 tracking-tight'>
              +{formattedAmount}
            </span>
          </div>
        )
      case 'EXPENSE':
        return (
          <div className='text-right'>
            <span className='text-lg font-bold text-red-600 dark:text-red-400 tracking-tight'>
              -{formattedAmount}
            </span>
          </div>
        )
      case 'BALANCE':
        return (
          <div className='text-right'>
            <span className='text-lg font-bold text-purple-600 dark:text-purple-400 tracking-tight'>
              {formattedAmount}
            </span>
          </div>
        )
      default:
        return (
          <div className='text-right'>
            <span className='text-lg font-bold text-gray-600 dark:text-gray-400 tracking-tight'>
              {formattedAmount}
            </span>
          </div>
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

  // 获取关联类型标签
  const getRelationshipTags = (transaction: ExtendedTransaction) => {
    const tags = []

    // 未来交易标签
    if (isFutureTransaction(transaction.date)) {
      tags.push({
        key: 'future',
        text: t('common.date.future'),
        className:
          'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/30 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-700/50 shadow-sm',
      })
    }

    // 定期交易标签
    if (transaction.recurringTransactionId) {
      tags.push({
        key: 'recurring',
        text: t('transaction.tag.recurring'),
        className:
          'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/50 shadow-sm',
      })
    }

    // 贷款合约标签
    if (transaction.loanContractId) {
      tags.push({
        key: 'loan',
        text: t('transaction.tag.loan'),
        className:
          'bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-700/50 shadow-sm',
      })
    }

    // 贷款还款标签
    if (transaction.loanPaymentId) {
      // 根据交易类型显示不同标签：EXPENSE 显示"还款"，BALANCE 显示"本金"
      const isExpenseType = transaction.type === 'EXPENSE'
      tags.push({
        key: 'loan-payment',
        text: isExpenseType
          ? t('transaction.tag.loan.payment')
          : t('transaction.tag.loan.principal'),
        className:
          'bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-700/50 shadow-sm',
      })
    }

    return tags
  }

  // 使用统一的日期格式化Hook，遵循用户设置的日期格式偏好
  const formatDate = (date: string | Date) => {
    const transactionDate = typeof date === 'string' ? new Date(date) : date
    return formatSmartDate(transactionDate)
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
  const handleSingleDelete = (transaction: ExtendedTransaction) => {
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
      <div className='p-8 sm:p-12 text-center'>
        <div className='bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm'>
          <div className='h-16 w-16 mx-auto mb-6 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-2xl flex items-center justify-center shadow-sm'>
            <svg
              className='h-8 w-8 text-white drop-shadow-sm'
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
          </div>
          <h3 className='text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2'>
            {t('transaction.list.empty.title')}
          </h3>
          <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400'>
            {t('transaction.list.empty.description')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 批量操作栏 */}
      {!readOnly && selectedTransactions.size > 0 && (
        <div className='bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 border-b border-blue-200/60 dark:border-blue-700/50 px-4 sm:px-6 py-4 shadow-sm'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0'>
            <div className='flex items-center space-x-2'>
              <div className='h-2 w-2 bg-blue-500 rounded-full animate-pulse'></div>
              <span className='text-sm font-medium text-blue-700 dark:text-blue-300'>
                {t('transaction.list.selected', {
                  count: selectedTransactions.size,
                })}
              </span>
            </div>
            <div className='flex space-x-3'>
              {/* 暂时隐藏批量编辑功能 */}
              {/* {onBatchEdit && (
                <button
                  onClick={handleBatchEditClick}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 touch-manipulation"
                >
                  {t('transaction.list.batch.edit')}
                </button>
              )} */}
              {onBatchDelete && (
                <button
                  onClick={handleBatchDeleteClick}
                  className='px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 touch-manipulation shadow-sm'
                >
                  {t('transaction.list.batch.delete')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 表头 - 移动端隐藏 */}
      <div className='hidden sm:block bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 px-4 sm:px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/50'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            {!readOnly && (
              <CircularCheckbox
                checked={isAllSelected}
                onChange={handleSelectAll}
                size='md'
                variant='enhanced'
              />
            )}
            <div className='flex items-center space-x-2'>
              <div className='h-2 w-2 bg-blue-500 rounded-full'></div>
              <span className='text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide'>
                {readOnly
                  ? t('transaction.list.header.records')
                  : t('transaction.list.header.transactions')}
              </span>
            </div>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className='flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm'>
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
                  d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                />
              </svg>
              <span className='font-medium'>
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
      <div className='space-y-3 p-4'>
        {transactions.map(transaction => (
          <div
            key={transaction.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
              selectedTransactions.has(transaction.id)
                ? 'border-blue-300 dark:border-blue-600 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 shadow-md ring-1 ring-blue-200 dark:ring-blue-700'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm'
            }`}
          >
            {/* 移动端布局 */}
            <div className='sm:hidden p-4'>
              <div className='flex items-start space-x-4'>
                {/* 选择框和图标 */}
                <div className='flex flex-col items-center space-y-3'>
                  {!readOnly && (
                    <CircularCheckbox
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                      size='sm'
                      variant='enhanced'
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
                      <div className='flex items-start flex-col space-y-2'>
                        <h4 className='text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight'>
                          {transaction.description}
                        </h4>
                        {/* 关联类型标签 */}
                        {getRelationshipTags(transaction).length > 0 && (
                          <div className='flex flex-wrap gap-1.5'>
                            {getRelationshipTags(transaction).map(tag => (
                              <span
                                key={tag.key}
                                className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${tag.className}`}
                              >
                                {tag.text}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className='mt-3 space-y-1'>
                        <div className='text-sm text-gray-600 dark:text-gray-400'>
                          <span className='font-medium'>
                            {transaction.category.name}
                          </span>
                        </div>
                        <div className='text-sm text-gray-600 dark:text-gray-400'>
                          <span>{formatDate(transaction.date)}</span>
                        </div>
                        {showAccount && transaction.account && (
                          <div className='text-sm text-gray-600 dark:text-gray-400'>
                            <span>{transaction.account.name}</span>
                          </div>
                        )}
                        <div className='text-sm'>
                          <div className={'inline-flex items-center space-x-2'}>
                            <div
                              className={`h-2 w-2 rounded-full ${
                                transaction.type === 'INCOME'
                                  ? 'bg-green-500'
                                  : transaction.type === 'EXPENSE'
                                    ? 'bg-red-500'
                                    : 'bg-purple-500'
                              }`}
                            ></div>
                            <span
                              className={`font-medium ${
                                transaction.type === 'INCOME'
                                  ? 'text-green-600 dark:text-green-400'
                                  : transaction.type === 'EXPENSE'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-purple-600 dark:text-purple-400'
                              }`}
                            >
                              {transaction.type === 'INCOME'
                                ? t('type.income')
                                : transaction.type === 'EXPENSE'
                                  ? t('type.expense')
                                  : t('type.asset')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className='flex flex-col items-end space-y-3 ml-4'>
                      {getAmountDisplay(transaction)}
                      {!readOnly && (
                        <div className='flex items-center space-x-2'>
                          {/* 编辑按钮 */}
                          <button
                            onClick={() => onEdit(transaction)}
                            className='p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 touch-manipulation shadow-sm'
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
                              className='p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 touch-manipulation shadow-sm'
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
            <div className='hidden sm:flex items-start space-x-5 p-5'>
              {/* 选择框 */}
              {!readOnly && (
                <div className='pt-1'>
                  <CircularCheckbox
                    checked={selectedTransactions.has(transaction.id)}
                    onChange={() => handleSelectTransaction(transaction.id)}
                    size='md'
                    variant='enhanced'
                  />
                </div>
              )}

              {/* 交易类型图标 */}
              <div className='flex-shrink-0 pt-1'>
                {getTypeIcon(transaction)}
              </div>

              {/* 交易信息 */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-start justify-between'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start flex-col space-y-2'>
                      <div className='flex items-center space-x-3 w-full'>
                        <h4 className='text-lg font-semibold text-gray-900 dark:text-gray-100 truncate'>
                          {transaction.description}
                        </h4>
                        {/* 关联类型标签 */}
                        {getRelationshipTags(transaction).length > 0 && (
                          <div className='flex flex-wrap gap-1.5'>
                            {getRelationshipTags(transaction).map(tag => (
                              <span
                                key={tag.key}
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${tag.className}`}
                              >
                                {tag.text}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400'>
                      <div>
                        <span className='font-medium'>
                          {transaction.category.name}
                        </span>
                      </div>
                      {showAccount && transaction.account && (
                        <>
                          <div className='h-1 w-1 bg-gray-400 rounded-full'></div>
                          <div>
                            <span>{transaction.account.name}</span>
                          </div>
                        </>
                      )}
                      <div className='h-1 w-1 bg-gray-400 rounded-full'></div>
                      <div>
                        <span>{formatDate(transaction.date)}</span>
                      </div>
                      <div className='h-1 w-1 bg-gray-400 rounded-full'></div>
                      <div className='flex items-center space-x-1.5'>
                        <div
                          className={`h-2 w-2 rounded-full ${
                            transaction.type === 'INCOME'
                              ? 'bg-green-500'
                              : transaction.type === 'EXPENSE'
                                ? 'bg-red-500'
                                : 'bg-purple-500'
                          }`}
                        ></div>
                        <span
                          className={`font-medium ${
                            transaction.type === 'INCOME'
                              ? 'text-green-600 dark:text-green-400'
                              : transaction.type === 'EXPENSE'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-purple-600 dark:text-purple-400'
                          }`}
                        >
                          {transaction.type === 'INCOME'
                            ? t('type.income')
                            : transaction.type === 'EXPENSE'
                              ? t('type.expense')
                              : t('type.asset')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='flex items-start space-x-4 ml-6'>
                    {getAmountDisplay(transaction)}

                    {!readOnly && (
                      <div className='flex items-center space-x-2 pt-1'>
                        {/* 编辑按钮 */}
                        <button
                          onClick={() => onEdit(transaction)}
                          className='p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 shadow-sm'
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
                            className='p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 shadow-sm'
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
                {(transaction.tags && transaction.tags.length > 0) ||
                transaction.notes ? (
                  <div className='mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 sm:ml-16'>
                    {/* 标签 */}
                    {transaction.tags && transaction.tags.length > 0 && (
                      <div className='mb-2'>
                        <div className='flex items-center flex-wrap gap-1.5'>
                          {transaction.tags.slice(0, 6).map(({ tag }) => {
                            // 安全检查：确保tag对象存在
                            if (!tag) return null

                            // 从 UserDataContext 获取标签颜色信息
                            const currentColor = getUpdatedTagColor(tag.id)

                            return (
                              <span
                                key={tag.id}
                                className='inline-block px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                                style={
                                  currentColor
                                    ? {
                                        backgroundColor: currentColor + '10',
                                        borderColor: currentColor + '25',
                                        color: currentColor,
                                      }
                                    : {}
                                }
                              >
                                {tag.name}
                              </span>
                            )
                          })}
                          {transaction.tags.length > 6 && (
                            <span className='inline-block px-2 py-0.5 rounded text-xs bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'>
                              +{transaction.tags.length - 6}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 备注 */}
                    {transaction.notes && (
                      <div className='bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-2'>
                        <p className='text-sm text-gray-600 dark:text-gray-400 leading-relaxed'>
                          {transaction.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页控件 */}
      {pagination && pagination.totalPages > 1 && (
        <div className='bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 px-4 py-4 border-t border-gray-200/60 dark:border-gray-700/50 sm:px-6 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div className='flex-1 flex justify-between sm:hidden'>
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className='relative inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm'
              >
                <svg
                  className='h-4 w-4 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 19l-7-7 7-7'
                  />
                </svg>
                {t('common.pagination.previous')}
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className='relative inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm'
              >
                {t('common.pagination.next')}
                <svg
                  className='h-4 w-4 ml-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 5l7 7-7 7'
                  />
                </svg>
              </button>
            </div>
            <div className='hidden sm:flex-1 sm:flex sm:items-center sm:justify-between'>
              <div className='bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm'>
                <div className='flex items-center space-x-2'>
                  <svg
                    className='h-4 w-4 text-gray-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                    />
                  </svg>
                  <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>
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
              </div>
              <div>
                <nav
                  className='relative z-0 inline-flex rounded-xl shadow-sm overflow-hidden'
                  aria-label='Pagination'
                >
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className='relative inline-flex items-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
                  >
                    <span className='sr-only'>
                      {t('common.pagination.previous')}
                    </span>
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
                        d='M15 19l-7-7 7-7'
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
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-all duration-200 ${
                        page === pagination.currentPage
                          ? 'z-10 bg-gradient-to-r from-blue-500 to-blue-600 border-blue-500 text-white shadow-md'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className='relative inline-flex items-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
                  >
                    <span className='sr-only'>
                      {t('common.pagination.next')}
                    </span>
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
                        d='M9 5l7 7-7 7'
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
