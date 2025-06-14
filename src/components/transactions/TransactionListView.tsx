'use client'

import { useState, useEffect, useCallback } from 'react'
import TransactionFormModal from './TransactionFormModal'
import TransactionList from './TransactionList'
import TransactionFilters from './TransactionFilters'
import TransactionStats from './TransactionStats'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import PageContainer from '@/components/ui/PageContainer'
import TranslationLoader from '@/components/ui/TranslationLoader'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUserData } from '@/contexts/UserDataContext'
import {
  Transaction,
  TransactionFormData,
  User
} from '@/types/transaction'

interface TransactionListViewProps {
  user: User
}

interface Filters {
  accountId: string
  categoryId: string
  type: string
  dateFrom: string
  dateTo: string
  search: string
  tagIds: string[]
}

export default function TransactionListView({
  user
}: TransactionListViewProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const { accounts, categories, currencies, tags } = useUserData()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionFormData | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState<Filters>({
    accountId: '',
    categoryId: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    tagIds: []
  })

  const currencySymbol = user.settings?.baseCurrency?.symbol || '$'

  // 加载交易数据
  const loadTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        excludeBalanceAdjustment: 'true' // 通用交易页面排除余额调整记录
      })

      // 添加过滤条件
      if (filters.accountId) params.append('accountId', filters.accountId)
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.type) params.append('type', filters.type)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.search) params.append('search', filters.search)
      if (filters.tagIds && filters.tagIds.length > 0) params.append('tagIds', filters.tagIds.join(','))

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
        showError(t('error.load.transactions'), result.error || t('error.unknown'))
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
      const errorMessage = error instanceof Error ? error.message : t('error.network')
      showError(t('error.load.transactions'), errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, filters, showError, t])

  // 初始加载和过滤条件变化时重新加载
  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setIsTransactionModalOpen(true)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    if (!transaction.account) {
      console.error('Transaction is missing account data', transaction)
      showError('错误', '交易数据不完整，缺少账户信息。')
      return
    }
    const formTransaction: TransactionFormData = {
      id: transaction.id,
      accountId: transaction.account.id,
      categoryId: transaction.category.id,
      currencyCode: transaction.currency.code,
      type: transaction.type === 'BALANCE_ADJUSTMENT' ? 'EXPENSE' : transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      notes: transaction.notes,
      date: transaction.date,
      tagIds: transaction.tags.map(t => t.tag.id)
    }
    setEditingTransaction(formTransaction)
    setIsTransactionModalOpen(true)
  }

  const handleTransactionSuccess = () => {
    loadTransactions()
  }

  const handleFilterChange = (newFilters: Partial<Filters>) => {
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

  const handleConfirmDelete = async () => {
    if (!deletingTransactionId) return

    try {
      const response = await fetch(`/api/transactions/${deletingTransactionId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(t('success.deleted'), t('transaction.record.deleted'))
        loadTransactions()
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
    <TranslationLoader
      fallback={
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      }
    >
      <PageContainer
        title={t('transaction.list')}
        subtitle={t('transaction.list.subtitle')}
        actions={
          <button
            onClick={handleAddTransaction}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('transaction.create')}
          </button>
        }
      >

        {/* 统计卡片 */}
        <div className="mb-8">
          <TransactionStats
            transactions={transactions}
            currencySymbol={currencySymbol}
          />
        </div>

        {/* 过滤器 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
          <TransactionFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* 交易列表 */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('account.transactions')}
              </h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('account.total.transactions', { count: pagination.total })}
                </span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
            </div>
          ) : (
            <TransactionList
              transactions={transactions}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              currencySymbol={currencySymbol}
              showAccount={true}
              pagination={{
                currentPage: pagination.page,
                totalPages: pagination.totalPages,
                totalItems: pagination.total,
                onPageChange: handlePageChange,
                itemsPerPage: pagination.limit
              }}
            />
          )}
        </div>

        {/* 交易表单模态框 */}
        <TransactionFormModal
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          onSuccess={handleTransactionSuccess}
          transaction={editingTransaction}
          accounts={accounts}
          categories={categories}
          currencies={currencies}
          tags={tags}
        />

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
          variant="danger"
        />
      </PageContainer>
    </TranslationLoader>
  )
}
