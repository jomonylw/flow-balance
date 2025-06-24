'use client'

import { useState, useEffect, useCallback } from 'react'
import QuickFlowTransactionModal from '@/components/features/dashboard/QuickFlowTransactionModal'
import FlowTransactionModal from '../accounts/FlowTransactionModal'
import TransactionList from './TransactionList'
import TransactionFiltersComponent from './TransactionFilters'
import TransactionStats from './TransactionStats'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import PageContainer from '@/components/ui/layout/PageContainer'
import TranslationLoader from '@/components/ui/data-display/TranslationLoader'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import { TransactionListSkeleton } from '@/components/ui/data-display/page-skeletons'
import { useToast } from '@/contexts/providers/ToastContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import { Transaction, User } from '@/types/business/transaction'
import { PAGINATION } from '@/lib/constants/app-config'
import type { TransactionFilters } from '@/types/components'
import { publishTransactionDelete } from '@/lib/services/data-update.service'

interface TransactionListViewProps {
  user: User
}

export default function TransactionListView({
  user,
}: TransactionListViewProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const { currencies, tags } = useUserData()
  const { formatInputDate } = useUserDateFormatter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingTransactionId, setDeletingTransactionId] = useState<
    string | null
  >(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGINATION.PAGE_SIZE_OPTIONS[0], // 使用配置的第一个选项 (10)
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState<TransactionFilters>({
    accountId: '',
    categoryId: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    tagIds: [],
  })
  const [stats, setStats] = useState(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const currencyId = user.settings?.baseCurrency?.id || ''

  // 加载统计数据
  const loadStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const params = new URLSearchParams()

      // 添加过滤条件
      if (filters.accountId) params.append('accountId', filters.accountId)
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.type) params.append('type', filters.type)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.search) params.append('search', filters.search)
      if (filters.tagIds && filters.tagIds.length > 0)
        params.append('tagIds', filters.tagIds.join(','))

      const response = await fetch(`/api/transactions/stats?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setStats(result.data)
      } else {
        console.error('Failed to load transaction stats:', result.error)
        showError(
          t('error.load.transactions'),
          result.error || t('error.unknown')
        )
      }
    } catch (error) {
      console.error('Error loading transaction stats:', error)
      const errorMessage =
        error instanceof Error ? error.message : t('error.network')
      showError(t('error.load.transactions'), errorMessage)
    } finally {
      setIsLoadingStats(false)
    }
  }, [filters, showError, t])

  // 加载交易数据
  const loadTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        excludeBalanceAdjustment: 'true', // 通用交易页面排除余额调整记录
      })

      // 添加过滤条件
      if (filters.accountId) params.append('accountId', filters.accountId)
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.type) params.append('type', filters.type)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.search) params.append('search', filters.search)
      if (filters.tagIds && filters.tagIds.length > 0)
        params.append('tagIds', filters.tagIds.join(','))

      const response = await fetch(`/api/transactions?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setTransactions(result.data.transactions)
        setPagination(result.data.pagination)
      } else {
        console.error('Failed to load transactions:', result.error)
        showError(
          t('error.load.transactions'),
          result.error || t('error.unknown')
        )
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
      const errorMessage =
        error instanceof Error ? error.message : t('error.network')
      showError(t('error.load.transactions'), errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, filters, showError, t])

  // 初始加载和过滤条件变化时重新加载
  useEffect(() => {
    loadTransactions()
    loadStats()
  }, [loadTransactions, loadStats])

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setIsCreateModalOpen(true)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    if (!transaction.account) {
      console.error('Transaction is missing account data', transaction)
      showError('错误', '交易数据不完整，缺少账户信息。')
      return
    }
    setEditingTransaction(transaction)
    setIsEditModalOpen(true)
  }

  const handleTransactionSuccess = () => {
    loadTransactions()
    loadStats()
  }

  const handleFilterChange = (newFilters: Partial<TransactionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, page: 1 })) // 重置到第一页
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handleDeleteTransaction = (transactionId: string) => {
    setDeletingTransactionId(transactionId)
    setShowDeleteConfirm(true)
  }

  const handleBatchDelete = async (transactionIds: string[]) => {
    try {
      const deletePromises = transactionIds.map(id =>
        fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      )

      const responses = await Promise.all(deletePromises)
      const results = await Promise.all(responses.map(r => r.json()))

      const failedDeletes = results.filter(result => !result.success)
      const successfulDeletes = results.filter(result => result.success)

      if (failedDeletes.length > 0) {
        showError(
          t('common.delete.failed'),
          t('transaction.delete.batch.partial.error', {
            failed: failedDeletes.length,
            total: transactionIds.length,
          })
        )
      } else {
        showSuccess(
          t('success.deleted'),
          t('transaction.delete.batch.success', {
            count: transactionIds.length,
          })
        )
      }

      // 发布删除事件，触发其他组件更新
      for (const result of successfulDeletes) {
        if (result.data?.transaction) {
          const transaction = result.data.transaction
          await publishTransactionDelete(
            transaction.accountId || transaction.account?.id,
            transaction.categoryId || transaction.category?.id,
            { transaction }
          )
        }
      }

      await loadTransactions()
      await loadStats()
    } catch (error) {
      console.error('Error batch deleting transactions:', error)
      showError(t('common.delete.failed'), t('error.network'))
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingTransactionId) return

    try {
      const response = await fetch(
        `/api/transactions/${deletingTransactionId}`,
        {
          method: 'DELETE',
        }
      )

      const result = await response.json()

      if (result.success) {
        showSuccess(t('success.deleted'), t('transaction.record.deleted'))

        // 发布删除事件，触发其他组件更新
        if (result.data?.transaction) {
          const transaction = result.data.transaction
          console.log(
            '[TransactionListView] Publishing transaction-delete event:',
            {
              accountId: transaction.accountId || transaction.account?.id,
              categoryId: transaction.categoryId || transaction.category?.id,
              transaction,
            }
          )
          await publishTransactionDelete(
            transaction.accountId || transaction.account?.id,
            transaction.categoryId || transaction.category?.id,
            { transaction }
          )
        } else {
          console.warn(
            '[TransactionListView] No transaction data in delete result:',
            result
          )
        }

        loadTransactions()
        loadStats()
      } else {
        showError(t('common.delete.failed'), result.error || t('error.unknown'))
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      showError(t('common.delete.failed'), t('error.network'))
    } finally {
      setShowDeleteConfirm(false)
      setDeletingTransactionId(null)
    }
  }

  return (
    <TranslationLoader fallback={<TransactionListSkeleton />}>
      <PageContainer
        title={t('transaction.list')}
        subtitle={t('transaction.list.subtitle')}
        actions={
          <button
            onClick={handleAddTransaction}
            className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600'
          >
            <svg
              className='mr-2 h-4 w-4'
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
            {t('transaction.create')}
          </button>
        }
      >
        {/* 统计卡片 */}
        <div className='mb-8'>
          <TransactionStats
            stats={stats}
            currencyId={currencyId}
            isLoading={isLoadingStats}
          />
        </div>

        {/* 过滤器 */}
        <div className='bg-white dark:bg-gray-800 shadow rounded-lg mb-6'>
          <TransactionFiltersComponent
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* 交易列表 */}
        <div className='bg-white dark:bg-gray-800 shadow rounded-lg'>
          <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                {t('account.transactions')}
              </h2>
              <div className='flex items-center space-x-4'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>
                  {t('account.total.transactions', { count: pagination.total })}
                </span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className='p-8 text-center'>
              <LoadingSpinner size='lg' showText text={t('common.loading')} />
            </div>
          ) : (
            <TransactionList
              transactions={transactions}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onBatchDelete={handleBatchDelete}
              currencySymbol={user.settings?.baseCurrency?.symbol || '$'}
              showAccount={true}
              pagination={{
                currentPage: pagination.page,
                totalPages: pagination.totalPages,
                totalItems: pagination.total,
                onPageChange: handlePageChange,
                itemsPerPage: pagination.limit,
              }}
            />
          )}
        </div>

        {/* 创建交易模态框 */}
        <QuickFlowTransactionModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleTransactionSuccess}
        />

        {/* 编辑交易模态框 */}
        {editingTransaction && editingTransaction.account && (
          <FlowTransactionModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={handleTransactionSuccess}
            transaction={{
              id: editingTransaction.id,
              accountId: editingTransaction.account.id,
              amount: editingTransaction.amount,
              description: editingTransaction.description,
              notes: editingTransaction.notes || undefined,
              date:
                editingTransaction.date instanceof Date
                  ? formatInputDate(editingTransaction.date)
                  : editingTransaction.date,
              tagIds: editingTransaction.tags.map(t => t.tag.id),
            }}
            account={editingTransaction.account}
            currencies={currencies}
            tags={tags}
          />
        )}

        {/* 删除确认模态框 */}
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          title={t('transaction.delete')}
          message={t('confirm.delete.transaction')}
          confirmLabel={t('common.confirm.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setDeletingTransactionId(null)
          }}
          variant='danger'
        />
      </PageContainer>
    </TranslationLoader>
  )
}
