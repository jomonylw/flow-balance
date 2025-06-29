'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useTheme } from '@/contexts/providers/ThemeContext'
import type { RecurringTransaction } from '@/types/core'
import { format } from 'date-fns'

interface RecurringTransactionsListProps {
  accountId: string
  onEdit?: (transaction: RecurringTransaction) => void
  onDelete?: (transactionId: string) => void
}

export default function RecurringTransactionsList({
  accountId,
  onEdit,
  onDelete,
}: RecurringTransactionsListProps) {
  const { t } = useLanguage()
  const { formatCurrency } = useUserCurrencyFormatter()
  const { theme: _theme } = useTheme()
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取定期交易列表
  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(
        `/api/accounts/${accountId}/recurring-transactions`
      )
      if (!response.ok) {
        throw new Error('获取定期交易失败')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '获取定期交易失败')
      }

      // API返回的数据结构是 { success: true, data: { recurringTransactions: [...] } }
      setTransactions(result.data?.recurringTransactions || [])
    } catch (error) {
      console.error('Failed to fetch recurring transactions:', error)
      setError(error instanceof Error ? error.message : '未知错误')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [accountId])

  // 删除定期交易
  const handleDelete = async (transactionId: string) => {
    try {
      const response = await fetch(
        `/api/recurring-transactions/${transactionId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('删除定期交易失败')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || '删除定期交易失败')
      }

      // 刷新列表
      await fetchTransactions()

      // 调用父组件回调
      onDelete?.(transactionId)
    } catch (error) {
      console.error('Failed to delete recurring transaction:', error)
      setError(error instanceof Error ? error.message : '未知错误')
    }
  }

  // 获取状态颜色（基于isActive字段）
  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'text-green-600 dark:text-green-400'
      : 'text-orange-600 dark:text-orange-400'
  }

  // 获取状态背景色（基于isActive字段）
  const getStatusBgColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-50 dark:bg-green-900/20'
      : 'bg-orange-50 dark:bg-orange-900/20'
  }

  // 获取状态文本（基于isActive字段）
  const getStatusText = (isActive: boolean) => {
    return isActive ? 'active' : 'inactive'
  }

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

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className='bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse'
          >
            <div className='flex justify-between items-start'>
              <div className='space-y-2 flex-1'>
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3'></div>
                <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2'></div>
                <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4'></div>
              </div>
              <div className='h-6 bg-gray-200 dark:bg-gray-700 rounded w-16'></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
        <div className='flex items-center'>
          <span className='text-red-600 dark:text-red-400 mr-2'>❌</span>
          <p className='text-red-600 dark:text-red-400 text-sm'>{error}</p>
        </div>
        <button
          onClick={fetchTransactions}
          className='mt-2 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400
                   border border-red-300 dark:border-red-600 rounded-md
                   hover:bg-red-50 dark:hover:bg-red-900/20
                   transition-colors duration-200'
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className='bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center'>
        <div className='text-gray-400 dark:text-gray-500 text-4xl mb-4'>🔄</div>
        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
          {t('recurring.transactions.empty.title')}
        </h3>
        <p className='text-gray-500 dark:text-gray-400 text-sm'>
          {t('recurring.transactions.empty.description')}
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {transactions.map(transaction => (
        <div
          key={transaction.id}
          className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4
                   hover:shadow-md transition-shadow duration-200'
        >
          <div className='flex justify-between items-start'>
            <div className='flex-1'>
              <div className='flex items-center space-x-3 mb-2'>
                <h4 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                  {transaction.description}
                </h4>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(transaction.isActive)} ${getStatusColor(transaction.isActive)}`}
                >
                  {t(`recurring.status.${getStatusText(transaction.isActive)}`)}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 ${getTransactionTypeColor(transaction.type)}`}
                >
                  {t(`transaction.type.${transaction.type.toLowerCase()}`)}
                </span>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
                <div>
                  <span className='text-gray-500 dark:text-gray-400'>
                    {t('recurring.amount')}:
                  </span>
                  <span
                    className={`ml-2 font-medium ${getTransactionTypeColor(transaction.type)}`}
                  >
                    {transaction.type === 'EXPENSE' ? '-' : '+'}
                    {formatCurrency(
                      transaction.amount,
                      transaction.currencyCode || 'CNY'
                    )}
                  </span>
                </div>

                <div>
                  <span className='text-gray-500 dark:text-gray-400'>
                    {t('recurring.frequency')}:
                  </span>
                  <span className='ml-2 font-medium text-gray-900 dark:text-gray-100'>
                    {t(`frequency.${transaction.frequency.toLowerCase()}`)}
                  </span>
                </div>

                <div>
                  <span className='text-gray-500 dark:text-gray-400'>
                    {t('recurring.start.date')}:
                  </span>
                  <span className='ml-2 font-medium text-gray-900 dark:text-gray-100'>
                    {format(new Date(transaction.startDate), 'yyyy-MM-dd')}
                  </span>
                </div>

                {transaction.endDate && (
                  <div>
                    <span className='text-gray-500 dark:text-gray-400'>
                      {t('recurring.end.date')}:
                    </span>
                    <span className='ml-2 font-medium text-gray-900 dark:text-gray-100'>
                      {format(new Date(transaction.endDate), 'yyyy-MM-dd')}
                    </span>
                  </div>
                )}

                {transaction.nextDate && (
                  <div>
                    <span className='text-gray-500 dark:text-gray-400'>
                      {t('recurring.next.execution')}:
                    </span>
                    <span className='ml-2 font-medium text-blue-600 dark:text-blue-400'>
                      {format(new Date(transaction.nextDate), 'yyyy-MM-dd')}
                    </span>
                  </div>
                )}
              </div>

              {transaction.notes && (
                <p className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                  {transaction.notes}
                </p>
              )}
            </div>

            <div className='flex space-x-2 ml-4'>
              {onEdit && (
                <button
                  onClick={() => onEdit(transaction)}
                  className='p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400
                           hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md
                           transition-colors duration-200'
                  title={t('common.edit')}
                >
                  ✏️
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => handleDelete(transaction.id)}
                  className='p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400
                           hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md
                           transition-colors duration-200'
                  title={t('common.delete')}
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
