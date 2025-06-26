'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import type { RecurringTransaction } from '@/types/core'

interface RecurringTransactionCardsProps {
  accountId: string
  onEdit: (transaction: RecurringTransaction) => void
  onDelete: (transactionId: string) => void
  onCreateNew: () => void
  onFilterTransactions: (recurringTransactionId: string | null) => void
  selectedRecurringTransactionId: string | null
}

export default function RecurringTransactionCards({
  accountId,
  onEdit,
  onDelete,
  onCreateNew,
  onFilterTransactions,
  selectedRecurringTransactionId,
}: RecurringTransactionCardsProps) {
  const { t } = useLanguage()
  const { formatCurrency, formatCurrencyById } = useUserCurrencyFormatter()
  const [recurringTransactions, setRecurringTransactions] = useState<
    RecurringTransaction[]
  >([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchRecurringTransactions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/accounts/${accountId}/recurring-transactions`
      )
      if (!response.ok) {
        throw new Error('获取定期交易失败')
      }

      const result = await response.json()
      if (result.success) {
        setRecurringTransactions(result.data.recurringTransactions || [])
      } else {
        throw new Error(result.error || '获取定期交易失败')
      }
    } catch (error) {
      console.error('获取定期交易失败:', error)
      setRecurringTransactions([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecurringTransactions()
  }, [accountId])

  // 获取交易类型颜色
  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-600 dark:text-green-400'
      case 'EXPENSE':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  // 获取状态颜色
  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'text-green-600 dark:text-green-400'
      : 'text-orange-600 dark:text-orange-400'
  }

  // 获取状态背景色
  const getStatusBgColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-50 dark:bg-green-900/20'
      : 'bg-orange-50 dark:bg-orange-900/20'
  }

  // 获取状态文本
  const getStatusText = (isActive: boolean) => {
    return isActive ? 'active' : 'inactive'
  }

  // 获取频率显示文本
  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'DAILY':
        return t('recurring.frequency.daily')
      case 'WEEKLY':
        return t('recurring.frequency.weekly')
      case 'MONTHLY':
        return t('recurring.frequency.monthly')
      case 'QUARTERLY':
        return t('recurring.frequency.quarterly')
      case 'YEARLY':
        return t('recurring.frequency.yearly')
      default:
        return frequency
    }
  }

  const handleCardClick = (recurringTransaction: RecurringTransaction) => {
    if (selectedRecurringTransactionId === recurringTransaction.id) {
      // 如果当前卡片已选中，则取消筛选
      onFilterTransactions(null)
    } else {
      // 否则筛选该定期交易的相关交易
      onFilterTransactions(recurringTransaction.id)
    }
  }

  if (isLoading) {
    return (
      <div className='mb-8'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
            {t('recurring.transactions')}
          </h3>
          <div className='h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse'></div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className='bg-gray-200 dark:bg-gray-700 rounded-lg h-32 animate-pulse'
            ></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='mb-8'>
      <div className='mb-4'>
        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
          {t('recurring.transactions')}
        </h3>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {recurringTransactions.length === 0 ? (
          // 空状态卡片 - 与正常卡片大小一致
          <div
            onClick={onCreateNew}
            className='bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 cursor-pointer transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
          >
            <div className='flex flex-col items-center justify-center h-full min-h-[120px]'>
              <svg
                className='h-8 w-8 text-gray-400 dark:text-gray-500 mb-2'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 4v16m8-8H4'
                />
              </svg>
              <h4 className='text-sm font-medium text-gray-900 dark:text-gray-100 text-center'>
                {t('recurring.transactions.empty.title')}
              </h4>
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400 text-center'>
                {t('recurring.transactions.empty.description')}
              </p>
            </div>
          </div>
        ) : (
          <>
            {recurringTransactions.map(transaction => (
              <div
                key={transaction.id}
                onClick={() => handleCardClick(transaction)}
                className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedRecurringTransactionId === transaction.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className='flex items-start justify-between mb-3'>
                  <h4 className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1'>
                    {transaction.description}
                  </h4>
                  <div className='flex items-center space-x-2 ml-2'>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onEdit(transaction)
                      }}
                      className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
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
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onDelete(transaction.id)
                      }}
                      className='text-gray-400 hover:text-red-600 dark:hover:text-red-400'
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
                  </div>
                </div>

                <div className='flex items-center justify-between mb-2'>
                  <span
                    className={`text-lg font-semibold ${getTransactionTypeColor(transaction.type)}`}
                  >
                    {transaction.type === 'EXPENSE' ? '-' : '+'}
                    {transaction.currency?.id
                      ? formatCurrencyById(transaction.amount, transaction.currency.id)
                      : formatCurrency(transaction.amount, transaction.currency?.code || 'CNY')
                    }
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(transaction.isActive)} ${getStatusColor(transaction.isActive)}`}
                  >
                    {t(
                      `recurring.status.${getStatusText(transaction.isActive)}`
                    )}
                  </span>
                </div>

                <div className='text-xs text-gray-500 dark:text-gray-400 space-y-1'>
                  <div className='flex items-center justify-between'>
                    <span>{t('recurring.frequency')}:</span>
                    <span className='font-medium'>
                      {getFrequencyText(transaction.frequency)}
                    </span>
                  </div>
                  {transaction.nextDate && (
                    <div className='flex items-center justify-between'>
                      <span>{t('recurring.next.execution')}:</span>
                      <span className='font-medium text-blue-600 dark:text-blue-400'>
                        {format(new Date(transaction.nextDate), 'yyyy-MM-dd')}
                      </span>
                    </div>
                  )}
                </div>

                {transaction.notes && (
                  <p className='mt-2 text-xs text-gray-600 dark:text-gray-300 truncate'>
                    {transaction.notes}
                  </p>
                )}
              </div>
            ))}

            {/* 新增定期交易卡片 */}
            <div
              onClick={onCreateNew}
              className='bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 cursor-pointer transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
            >
              <div className='flex flex-col items-center justify-center h-full min-h-[120px]'>
                <svg
                  className='h-8 w-8 text-blue-500 dark:text-blue-400 mb-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
                  />
                </svg>
                <h4 className='text-sm font-medium text-blue-600 dark:text-blue-400 text-center'>
                  {t('recurring.transaction.create')}
                </h4>
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400 text-center'>
                  {t('recurring.transaction.add.new')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
