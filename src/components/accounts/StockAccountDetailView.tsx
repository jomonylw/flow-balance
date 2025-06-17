'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BalanceUpdateModal from './BalanceUpdateModal'
import TransactionList from '@/components/transactions/TransactionList'
import StockAccountSummaryCard from './StockAccountSummaryCard'
import StockAccountTrendChart from '@/components/charts/StockAccountTrendChart'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import DetailPageLayout from '@/components/ui/DetailPageLayout'
import { calculateAccountBalance } from '@/lib/account-balance'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { SkeletonTable } from '@/components/ui/skeleton'
import { useBalanceUpdateListener, useTransactionListener } from '@/hooks/useDataUpdateListener'
import {
  Account,
  Currency,
  Transaction,
  User,
  TrendDataPoint
} from '@/types/transaction'

type TimeRange = 'lastMonth' | 'lastYear' | 'all'

interface StockAccountDetailViewProps {
  account: Account
  currencies: Currency[]
  user: User
}

export default function StockAccountDetailView({
  account,
  currencies,
  user
}: StockAccountDetailViewProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const router = useRouter()
  const [isBalanceUpdateModalOpen, setIsBalanceUpdateModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  })
  const [isLoading, setIsLoading] = useState(true)
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('lastYear')
  const [isTrendLoading, setIsTrendLoading] = useState(true)

  // 监听余额更新事件
  useBalanceUpdateListener(async (event) => {
    // 检查是否是当前账户的更新
    if (event.accountId === account.id) {
      await loadTransactions(pagination.currentPage)
      await fetchTrendData(timeRange)
    }
  }, [account.id])

  // 监听交易相关事件（主要是删除操作）
  useTransactionListener(async (event) => {
    // 检查是否是当前账户的交易
    if (event.accountId === account.id) {
      await loadTransactions(pagination.currentPage)
      await fetchTrendData(timeRange)
    }
  }, [account.id])

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
      showError('获取趋势数据失败', error instanceof Error ? error.message : '未知错误')
      setTrendData([])
    } finally {
      setIsTrendLoading(false)
    }
  }

  useEffect(() => {
    fetchTrendData(timeRange)
  }, [account.id, timeRange])

  const handleUpdateBalance = () => {
    setIsBalanceUpdateModalOpen(true)
  }

  const handleBalanceUpdateSuccess = () => {
    // 重新获取数据，但不重载页面
    loadTransactions(pagination.currentPage)
  }

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // 删除成功，返回到主页面
        router.push('/')
      } else {
        const error = await response.json()
        const errorMessage = error.message || t('common.delete.failed')

        // 检查是否是存量账户的余额记录问题
        if (errorMessage.includes('余额调整记录')) {
          // 显示错误信息，用户可以通过删除确认模态框处理
          showError(t('common.delete.failed'), `${errorMessage}。${t('account.use.clear.option')}`)
          return
        }

        showError(t('common.delete.failed'), errorMessage)
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      showError(t('common.delete.failed'), t('error.network'))
    }
  }

  const handleClearBalanceHistory = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}/clear-balance`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        showSuccess(t('success.cleared'), result.message || t('account.balance.history.cleared'))

        // 清空成功后，直接删除账户
        await handleDeleteAccount()
      } else {
        const error = await response.json()
        showError(t('error.clear.failed'), error.message || t('account.balance.history.clear.failed'))
      }
    } catch (error) {
      console.error('Error clearing balance history:', error)
      showError(t('error.clear.failed'), t('error.network'))
    }
  }

  const loadTransactions = async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString()
      })
      // 使用账户专用的交易API，包含余额调整记录
      const response = await fetch(`/api/accounts/${account.id}/transactions?${params}`)
      const result = await response.json()
      if (result.success) {
        setTransactions(result.data.transactions)
        setPagination(prev => ({
          ...prev,
          currentPage: result.data.pagination.page,
          totalPages: result.data.pagination.totalPages,
          totalItems: result.data.pagination.totalCount
        }))
      } else {
        showError(t('error.load.transactions'), result.error || t('error.unknown'))
      }
    } catch (error) {
      console.error('Failed to load transactions', error)
      const errorMessage = error instanceof Error ? error.message : t('error.network')
      showError(t('error.load.transactions'), errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions(pagination.currentPage)
  }, [pagination.currentPage, account.id])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
  }

  const handleDeleteBalanceRecord = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        showSuccess(t('success.deleted'), t('account.balance.record.deleted'))
        loadTransactions(pagination.currentPage)
      } else {
        showError(t('common.delete.failed'), result.error || t('error.unknown'))
      }
    } catch (error) {
      console.error('Delete balance record error:', error)
      showError(t('common.delete.failed'), t('error.network'))
    }
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsBalanceUpdateModalOpen(true)
  }

  const handleBatchDelete = async (transactionIds: string[]) => {
    try {
      const deletePromises = transactionIds.map(id =>
        fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      )

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.ok).length

      if (successCount === transactionIds.length) {
        showSuccess(t('success.batch.deleted'), t('batch.delete.success', { count: successCount }))
        loadTransactions(pagination.currentPage)
      } else {
        showError(t('error.partial.delete'), t('batch.delete.partial', { success: successCount, total: transactionIds.length }))
        loadTransactions(pagination.currentPage)
      }
    } catch (error) {
      console.error('Batch delete error:', error)
      showError(t('error.batch.delete.failed'), t('error.network'))
    }
  }

  // 使用专业的余额计算服务，计算截止至当前日期的余额
  const accountBalances = calculateAccountBalance(
    { ...account, transactions: account.transactions || [] },
    {
      asOfDate: new Date(), // 截止至当前日期
      validateData: false
    }
  )
  const baseCurrencyCode = user.settings?.baseCurrency?.code || 'USD'

  // 获取账户的实际余额（优先使用基础货币，如果没有则使用账户的主要货币）
  let balance = 0
  let currencySymbol = user.settings?.baseCurrency?.symbol || '$'
  let actualCurrencyCode = baseCurrencyCode

  if (accountBalances[baseCurrencyCode]) {
    // 如果有基础货币的余额，使用基础货币
    balance = accountBalances[baseCurrencyCode].amount
  } else {
    // 如果没有基础货币的余额，使用账户中第一个有余额的货币
    const availableCurrencies = Object.keys(accountBalances)
    if (availableCurrencies.length > 0) {
      actualCurrencyCode = availableCurrencies[0]
      const accountBalance = accountBalances[actualCurrencyCode]
      balance = accountBalance.amount
      currencySymbol = accountBalance.currency.symbol
    }
  }

  return (
    <DetailPageLayout
      accountId={account.id}
      title={account.name}
      subtitle={`${account.category.name}${account.description ? ` • ${account.description}` : ''}`}
      badge={
        <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
          account.category.type === 'ASSET'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
        }`}>
          {account.category.type === 'ASSET' ? t('type.asset.account') : t('type.liability.account')} • {t('type.stock.data')}
        </span>
      }
      actions={
        <>
          <button
            onClick={handleUpdateBalance}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('account.update.balance')}
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center justify-center p-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md shadow-sm text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 touch-manipulation"
            aria-label={t('account.delete')}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </>
      }
    >
      {/* 账户类型提示横幅 */}
      <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border-l-4 ${
        account.category.type === 'ASSET'
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500'
          : 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-500'
      }`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${
              account.category.type === 'ASSET' ? 'text-blue-400' : 'text-orange-400'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${
              account.category.type === 'ASSET' ? 'text-blue-800 dark:text-blue-300' : 'text-orange-800 dark:text-orange-300'
            }`}>
              💡 {t('account.stock.operation.tips')}
            </p>
            <p className={`text-sm ${
              account.category.type === 'ASSET' ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'
            }`}>
              {t('account.stock.operation.description', {
                type: account.category.type === 'ASSET' ? t('type.asset') : t('type.liability')
              })}
            </p>
          </div>
        </div>
      </div>

      {/* 账户摘要卡片 */}
      <div className="mb-6 sm:mb-8">
        {(account.category.type === 'ASSET' || account.category.type === 'LIABILITY') && (
          <StockAccountSummaryCard
            account={{
              ...account,
              category: {
                ...account.category,
                type: account.category.type
              },
              transactions: account.transactions || []
            }}
            balance={balance}
            currencySymbol={currencySymbol}
          />
        )}
      </div>

      {/* 账户趋势图表 */}
      <div className="mb-6 sm:mb-8">
        <StockAccountTrendChart
          trendData={trendData}
          account={{
            id: account.id,
            name: account.name,
            type: account.category.type || 'ASSET',
            color: account.color
          }}
          displayCurrency={account.currency || user.settings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }}
          height={400}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          isLoading={isTrendLoading}
        />
      </div>

      {/* 余额变化记录 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('account.balance.history')}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('account.balance.history.description')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {t('account.total.records', { count: pagination.totalItems })}
              </span>
              {pagination.totalItems > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center px-3 py-1 border border-red-300 dark:border-red-600 text-xs font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {t('account.clear.records')}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <SkeletonTable rows={8} columns={5} className="shadow-none" />
        ) : (
          <TransactionList
            transactions={transactions}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteBalanceRecord}
            onBatchDelete={handleBatchDelete}
            currencySymbol={currencySymbol}
            showAccount={false}
            readOnly={false}

            pagination={{
              ...pagination,
              onPageChange: handlePageChange
            }}
          />
        )}
      </div>

      {/* 余额更新模态框 */}
      <BalanceUpdateModal
        isOpen={isBalanceUpdateModalOpen}
        onClose={() => {
          setIsBalanceUpdateModalOpen(false)
          setEditingTransaction(null)
        }}
        onSuccess={handleBalanceUpdateSuccess}
        account={account}
        currencies={currencies}
        currentBalance={balance}
        currencyCode={actualCurrencyCode}
        editingTransaction={editingTransaction}
      />

      {/* 删除确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={t('account.delete')}
        message={t('confirm.delete.account.message', { name: account.name })}
        confirmLabel={t('common.delete')}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />

      {/* 清空记录确认模态框 */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        title={t('account.clear.balance.records')}
        message={t('confirm.clear.balance.records')}
        confirmLabel={t('common.confirm.clear')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setShowClearConfirm(false)
          handleClearBalanceHistory()
        }}
        onCancel={() => setShowClearConfirm(false)}
        variant="warning"
      />
    </DetailPageLayout>
  )
}
