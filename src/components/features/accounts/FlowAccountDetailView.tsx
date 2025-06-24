'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FlowTransactionModal from '@/components/features/accounts/FlowTransactionModal'
import TransactionList from '@/components/features/transactions/TransactionList'
import FlowAccountSummaryCard from './FlowAccountSummaryCard'
import FlowAccountTrendChart from '@/components/features/charts/FlowAccountTrendChart'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import DetailPageLayout from '@/components/ui/layout/DetailPageLayout'
import RecurringTransactionCards from './RecurringTransactionCards'
import RecurringTransactionModal from './RecurringTransactionModal'
import { calculateAccountBalance } from '@/lib/services/account.service'
import { useToast } from '@/contexts/providers/ToastContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import { SkeletonTable } from '@/components/ui/data-display/skeleton'
import { useTransactionListener } from '@/hooks/business/useDataUpdateListener'
import {
  publishTransactionDelete,
  publishAccountClear,
} from '@/lib/services/data-update.service'

import {
  Tag,
  User,
  LegacyAccount,
  LegacyCategory,
  LegacyCurrency,
  TrendDataPoint,
  TimeRange,
} from '@/types/business/transaction'
import type { RecurringTransaction, ExtendedTransaction } from '@/types/core'
import { convertPrismaAccountType } from '@/types/core/constants'

interface FlowAccountDetailViewProps {
  account: LegacyAccount
  categories: LegacyCategory[]
  currencies: LegacyCurrency[]
  tags: Tag[]
  user: User
}

export default function FlowAccountDetailView({
  account,
  categories: _categories,
  currencies,
  tags,
  user,
}: FlowAccountDetailViewProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const { formatInputDate } = useUserDateFormatter()
  const router = useRouter()
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<{
    id: string
    accountId: string
    amount: number
    description: string
    notes?: string
    date: string
    tagIds?: string[]
  } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [transactions, setTransactions] = useState<ExtendedTransaction[]>([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  })

  // 定期交易相关状态
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false)
  const [editingRecurringTransaction, setEditingRecurringTransaction] =
    useState<RecurringTransaction | null>(null)
  const [selectedRecurringTransactionId, setSelectedRecurringTransactionId] =
    useState<string | null>(null)
  const [showDeleteRecurringConfirm, setShowDeleteRecurringConfirm] =
    useState(false)
  const [deletingRecurringTransactionId, setDeletingRecurringTransactionId] =
    useState<string | null>(null)
  const [recurringTransactionsKey, setRecurringTransactionsKey] = useState(0) // 用于强制刷新定期交易列表
  const [isLoading, setIsLoading] = useState(true)
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('lastYear')
  const [isTrendLoading, setIsTrendLoading] = useState(true)

  // 监听交易相关事件
  useTransactionListener(
    async event => {
      // 检查是否是当前账户的交易
      if (event.accountId === account.id) {
        await loadTransactions(pagination.currentPage)
        await fetchTrendData(timeRange)
      }
    },
    [account.id]
  )

  const fetchTrendData = async (range: TimeRange) => {
    setIsTrendLoading(true)
    try {
      const granularity = range === 'lastMonth' ? 'daily' : 'monthly'
      const url = `/api/accounts/${account.id}/trends?range=${range}&granularity=${granularity}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch trend data')
      }
      const result = await response.json()
      if (result.success) {
        setTrendData(result.data.data || [])
      } else {
        throw new Error(result.error || 'Failed to fetch trend data')
      }
    } catch (error) {
      console.error('Error fetching trend data:', error)
      showError(
        '获取趋势数据失败',
        error instanceof Error ? error.message : '未知错误'
      )
      setTrendData([])
    } finally {
      setIsTrendLoading(false)
    }
  }

  useEffect(() => {
    fetchTrendData(timeRange)
  }, [account.id, timeRange])

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setIsTransactionModalOpen(true)
  }

  const handleEditTransaction = (transaction: ExtendedTransaction) => {
    // 转换为FlowTransactionModal期望的格式
    const formTransaction = {
      id: transaction.id,
      accountId: account.id,
      amount: transaction.amount,
      description: transaction.description,
      notes: transaction.notes || undefined,
      date:
        transaction.date instanceof Date
          ? formatInputDate(transaction.date)
          : transaction.date,
      tagIds: transaction.tags
        ? transaction.tags.map((tt: { tag: { id: string } }) => tt.tag.id)
        : [],
    }
    setEditingTransaction(formTransaction)
    setIsTransactionModalOpen(true)
  }

  const loadTransactions = async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
      })

      // 如果有选中的定期交易，添加筛选参数
      if (selectedRecurringTransactionId) {
        params.append('recurringTransactionId', selectedRecurringTransactionId)
      }

      // 使用账户专用的交易API，确保数据一致性
      const response = await fetch(
        `/api/accounts/${account.id}/transactions?${params}`
      )
      const result = await response.json()
      if (result.success) {
        setTransactions(result.data.transactions)
        setPagination(prev => ({
          ...prev,
          currentPage: result.data.pagination.page,
          totalPages: result.data.pagination.totalPages,
          totalItems: result.data.pagination.totalCount,
        }))
      } else {
        showError(
          t('error.load.transactions'),
          result.error || t('error.unknown')
        )
      }
    } catch (error) {
      console.error('Failed to load transactions', error)
      const errorMessage =
        error instanceof Error ? error.message : t('error.network')
      showError(t('error.load.transactions'), errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions(pagination.currentPage)
  }, [pagination.currentPage, account.id, selectedRecurringTransactionId])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        showSuccess('删除成功', '交易记录已删除')

        // 发布删除事件，触发其他组件更新
        if (result.data?.transaction) {
          const transaction = result.data.transaction
          await publishTransactionDelete(
            transaction.accountId || transaction.account?.id,
            transaction.categoryId || transaction.category?.id,
            { transaction }
          )
        }

        loadTransactions(pagination.currentPage) // 重新加载当前页
      } else {
        showError('删除失败', result.error || '未知错误')
      }
    } catch (error) {
      console.error('Delete transaction error:', error)
      showError('删除失败', '网络错误，请稍后重试')
    }
  }

  const handleTransactionSuccess = () => {
    // 重新获取数据，但不重载页面
    loadTransactions(pagination.currentPage)
  }

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        showSuccess('删除成功', `账户"${account.name}"已删除`)
        // 删除成功，返回到主页面
        router.push('/')
      } else {
        const error = await response.json()
        showError('删除失败', error.message || '未知错误')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      showError('删除失败', '网络错误，请稍后重试')
    }
  }

  const handleClearTransactions = async () => {
    try {
      const response = await fetch(
        `/api/accounts/${account.id}/clear-transactions`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        const result = await response.json()
        showSuccess(
          t('success.cleared'),
          result.message || t('account.transactions.cleared')
        )

        // 发布账户清空事件，触发侧边栏刷新
        await publishAccountClear(account.id, {
          clearedCount: result.data?.clearedCount || 0,
          accountType: 'flow',
        })

        // 清空成功后，重新加载交易记录
        loadTransactions(pagination.currentPage)
      } else {
        const error = await response.json()
        showError(
          t('error.clear.failed'),
          error.message || t('account.transactions.clear.failed')
        )
      }
    } catch (error) {
      console.error('Error clearing transactions:', error)
      showError(t('error.clear.failed'), t('error.network'))
    }
  }

  // 批量编辑功能（暂时隐藏）
  // const handleBatchEdit = (transactionIds: string[]) => {
  //   showInfo(t('feature.in.development'), t('batch.edit.development', { count: transactionIds.length }))
  //   // TODO: 实现批量编辑功能
  // }

  const handleBatchDelete = async (transactionIds: string[]) => {
    try {
      const deletePromises = transactionIds.map(id =>
        fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      )

      const responses = await Promise.all(deletePromises)
      const results = await Promise.all(responses.map(r => r.json()))

      const successfulDeletes = results.filter(result => result.success)
      const successCount = successfulDeletes.length

      if (successCount === transactionIds.length) {
        showSuccess(
          t('success.batch.deleted'),
          t('batch.delete.success', { count: successCount })
        )
      } else {
        showError(
          t('error.partial.delete'),
          t('batch.delete.partial', {
            success: successCount,
            total: transactionIds.length,
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

      loadTransactions(pagination.currentPage)
    } catch (error) {
      console.error('Batch delete error:', error)
      showError(t('error.batch.delete.failed'), t('error.network'))
    }
  }

  // 定期交易相关处理函数
  const handleCreateRecurringTransaction = () => {
    setEditingRecurringTransaction(null)
    setIsRecurringModalOpen(true)
  }

  const handleEditRecurringTransaction = (
    transaction: RecurringTransaction
  ) => {
    setEditingRecurringTransaction(transaction)
    setIsRecurringModalOpen(true)
  }

  const handleSaveRecurringTransaction = async (
    transactionData: Partial<RecurringTransaction>
  ) => {
    try {
      const url = editingRecurringTransaction
        ? `/api/recurring-transactions/${editingRecurringTransaction.id}`
        : '/api/recurring-transactions'

      const method = editingRecurringTransaction ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '保存定期交易失败')
      }

      showSuccess(
        editingRecurringTransaction
          ? t('recurring.transaction.updated')
          : t('recurring.transaction.created'),
        editingRecurringTransaction ? '定期交易已更新' : '定期交易已创建'
      )

      // 刷新定期交易列表
      setRecurringTransactionsKey(prev => prev + 1)
    } catch (error) {
      console.error('Failed to save recurring transaction:', error)
      showError('保存失败', error instanceof Error ? error.message : '未知错误')
      throw error // 重新抛出错误，让模态框处理
    }
  }

  const handleDeleteRecurringTransaction = (transactionId: string) => {
    setDeletingRecurringTransactionId(transactionId)
    setShowDeleteRecurringConfirm(true)
  }

  const handleConfirmDeleteRecurringTransaction = async () => {
    if (!deletingRecurringTransactionId) return

    try {
      const response = await fetch(
        `/api/recurring-transactions/${deletingRecurringTransactionId}`,
        {
          method: 'DELETE',
        }
      )

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '删除定期交易失败')
      }

      showSuccess('删除成功', '定期交易已删除')

      // 刷新定期交易列表
      setRecurringTransactionsKey(prev => prev + 1)

      // 如果删除的是当前筛选的定期交易，清除筛选
      if (selectedRecurringTransactionId === deletingRecurringTransactionId) {
        setSelectedRecurringTransactionId(null)
      }
    } catch (error) {
      console.error('Failed to delete recurring transaction:', error)
      showError('删除失败', error instanceof Error ? error.message : '未知错误')
    } finally {
      setShowDeleteRecurringConfirm(false)
      setDeletingRecurringTransactionId(null)
    }
  }

  // 处理定期交易筛选
  const handleFilterTransactions = (recurringTransactionId: string | null) => {
    setSelectedRecurringTransactionId(recurringTransactionId)
    // 重置到第一页
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  // 使用专业的余额计算服务（流量类账户）
  const accountBalances = calculateAccountBalance({
    ...account,
    transactions: account.transactions || [],
  })
  const baseCurrencyCode = user.settings?.baseCurrency?.code || 'USD'
  const flowTotal = accountBalances[baseCurrencyCode]?.amount || 0
  const currencySymbol = user.settings?.baseCurrency?.symbol || '$'

  return (
    <DetailPageLayout
      accountId={account.id}
      title={account.name}
      subtitle={`${account.category.name}${account.description ? ` • ${account.description}` : ''}`}
      badge={
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            account.category.type === 'INCOME'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
          }`}
        >
          {account.category.type === 'INCOME'
            ? t('type.income.account')
            : t('type.expense.account')}{' '}
          • {t('type.flow.data')}
        </span>
      }
      actions={
        <>
          <button
            onClick={handleAddTransaction}
            className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
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
            {t('account.add.transaction')}
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className='inline-flex items-center justify-center p-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md shadow-sm text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
            aria-label={t('account.delete')}
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
        </>
      }
    >
      {/* 账户类型提示横幅 */}
      {/* <div
        className={`mb-6 p-4 rounded-lg border-l-4 ${
          account.category.type === 'INCOME'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-500'
            : 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-500'
        }`}
      >
        <div className='flex items-center'>
          <div className='flex-shrink-0'>
            <svg
              className={`h-5 w-5 ${
                account.category.type === 'INCOME'
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <div className='ml-3'>
            <p
              className={`text-sm font-medium ${
                account.category.type === 'INCOME'
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              }`}
            >
              📊 {t('account.flow.operation.tips')}
            </p>
            <p
              className={`text-sm ${
                account.category.type === 'INCOME'
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {t('account.flow.operation.description', {
                type:
                  account.category.type === 'INCOME'
                    ? t('type.income')
                    : t('type.expense'),
              })}
            </p>
          </div>
        </div>
      </div> */}

      {/* 账户摘要卡片 */}
      <div className='mb-8'>
        <FlowAccountSummaryCard
          account={{
            ...account,
            transactions: account.transactions || [],
            category: {
              ...account.category,
              type: account.category.type
                ? convertPrismaAccountType(account.category.type)
                : undefined,
            },
          }}
          balance={flowTotal}
          currencyCode={account.currency?.code || 'USD'}
        />
      </div>

      {/* 账户趋势图表 */}
      <div className='mb-8'>
        <FlowAccountTrendChart
          trendData={trendData}
          account={{
            ...account,
            type: account.category.type
              ? convertPrismaAccountType(account.category.type)
              : convertPrismaAccountType('INCOME'),
            category: {
              ...account.category,
              type: account.category.type
                ? convertPrismaAccountType(account.category.type)
                : undefined,
            },
            currency: account.currency || {
              id: 'default-usd',
              code: 'USD',
              symbol: '$',
              name: 'US Dollar',
              decimalPlaces: 2,
              isCustom: false,
              createdBy: null,
              isActive: true,
            },
          }}
          displayCurrency={
            account.currency ||
            user.settings?.baseCurrency || {
              id: 'default-usd',
              code: 'USD',
              symbol: '$',
              name: 'US Dollar',
              decimalPlaces: 2,
            }
          }
          height={400}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          isLoading={isTrendLoading}
        />
      </div>

      {/* 定期交易卡片 */}
      <RecurringTransactionCards
        key={recurringTransactionsKey}
        accountId={account.id}
        onEdit={handleEditRecurringTransaction}
        onDelete={handleDeleteRecurringTransaction}
        onCreateNew={handleCreateRecurringTransaction}
        onFilterTransactions={handleFilterTransactions}
        selectedRecurringTransactionId={selectedRecurringTransactionId}
      />

      {/* 交易记录 */}
      <div className='bg-white dark:bg-gray-800 shadow rounded-lg'>
        <div className='px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0'>
            <div>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                {t('account.transactions')}
              </h3>
              <p className='text-xs sm:text-sm text-gray-600 dark:text-gray-400'>
                {selectedRecurringTransactionId
                  ? t('account.transaction.filtered.description')
                  : t('account.transaction.description', {
                      type:
                        account.category.type === 'INCOME'
                          ? t('type.income')
                          : t('type.expense'),
                    })}
              </p>
            </div>
            <div className='flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3'>
              {selectedRecurringTransactionId && (
                <button
                  onClick={() => handleFilterTransactions(null)}
                  className='text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
                >
                  {t('common.clear.filter')}
                </button>
              )}
              <span className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
                {t('account.total.transactions', {
                  count: pagination.totalItems,
                })}
              </span>
              {pagination.totalItems > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className='inline-flex items-center px-3 py-1 border border-red-300 dark:border-red-600 text-xs font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                >
                  <svg
                    className='mr-1 h-3 w-3'
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
                  {t('account.clear.records')}
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <SkeletonTable rows={8} columns={5} className='shadow-none' />
        ) : (
          <TransactionList
            transactions={transactions}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            onBatchDelete={handleBatchDelete}
            currencySymbol={currencySymbol}
            showAccount={false}
            pagination={{
              ...pagination,
              onPageChange: handlePageChange,
            }}
          />
        )}
      </div>

      {/* 简化的交易表单模态框 */}
      <FlowTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={handleTransactionSuccess}
        transaction={editingTransaction || undefined}
        account={{
          ...account,
          category: {
            ...account.category,
            type: account.category.type
              ? convertPrismaAccountType(account.category.type)
              : undefined,
          },
        }}
        currencies={currencies}
        tags={tags}
      />

      {/* 删除账户确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={t('account.delete')}
        message={t('confirm.delete.account.message', { name: account.name })}
        confirmLabel={t('common.delete')}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
        variant='danger'
      />

      {/* 清空交易记录确认模态框 */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        title={t('account.clear.transactions')}
        message={t('confirm.clear.transactions')}
        confirmLabel={t('common.confirm.clear')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setShowClearConfirm(false)
          handleClearTransactions()
        }}
        onCancel={() => setShowClearConfirm(false)}
        variant='danger'
      />

      {/* 删除定期交易确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteRecurringConfirm}
        title={t('recurring.transaction.delete')}
        message={t('confirm.delete.recurring.transaction.message')}
        confirmLabel={t('common.delete')}
        onConfirm={handleConfirmDeleteRecurringTransaction}
        onCancel={() => {
          setShowDeleteRecurringConfirm(false)
          setDeletingRecurringTransactionId(null)
        }}
        variant='danger'
      />

      {/* 定期交易模态框 */}
      <RecurringTransactionModal
        isOpen={isRecurringModalOpen}
        onClose={() => {
          setIsRecurringModalOpen(false)
          setEditingRecurringTransaction(null)
        }}
        onSave={handleSaveRecurringTransaction}
        accountId={account.id}
        accountCurrency={
          account.currency?.code || user.settings?.baseCurrency?.code || 'USD'
        }
        accountType={account.category.type as 'INCOME' | 'EXPENSE'}
        editingTransaction={editingRecurringTransaction}
      />
    </DetailPageLayout>
  )
}
