'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SimpleFlowTransactionModal from '@/components/transactions/SimpleFlowTransactionModal'
import TransactionList from '@/components/transactions/TransactionList'
import FlowAccountSummaryCard from './FlowAccountSummaryCard'
import FlowAccountTrendChart from '@/components/charts/FlowAccountTrendChart'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import { calculateAccountBalance } from '@/lib/account-balance'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTransactionListener } from '@/hooks/useDataUpdateListener'


import {
  Account,
  Category,
  Currency,
  Tag,
  Transaction,
  TransactionFormData,
  User,
  TrendDataPoint
} from '@/types/transaction'

type TimeRange = 'lastMonth' | 'lastYear' | 'all'

interface FlowAccountDetailViewProps {
  account: Account
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}

export default function FlowAccountDetailView({
  account,
  categories,
  currencies,
  tags,
  user
}: FlowAccountDetailViewProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
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

  // 监听交易相关事件
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

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setIsTransactionModalOpen(true)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    // 转换为SimpleFlowTransactionModal期望的格式
    const formTransaction = {
      id: transaction.id,
      accountId: account.id,
      amount: transaction.amount,
      description: transaction.description,
      notes: transaction.notes,
      date: transaction.date,
      tagIds: transaction.tags ? transaction.tags.map(tt => tt.tag.id) : []
    }
    setEditingTransaction(formTransaction)
    setIsTransactionModalOpen(true)
  }

  const loadTransactions = async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString()
      })
      // 使用账户专用的交易API，确保数据一致性
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

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        showSuccess('删除成功', '交易记录已删除')
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

  // 使用专业的余额计算服务（流量类账户）
  const accountBalances = calculateAccountBalance({ ...account, transactions: account.transactions || [] })
  const baseCurrencyCode = user.settings?.baseCurrency?.code || 'USD'
  const flowTotal = accountBalances[baseCurrencyCode]?.amount || 0
  const currencySymbol = user.settings?.baseCurrency?.symbol || '$'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 账户类型提示横幅 */}
      <div className={`mb-6 p-4 rounded-lg border-l-4 ${
        (account.category.type === 'INCOME')
          ? 'bg-green-50 border-green-400'
          : 'bg-red-50 border-red-400'
      }`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${
              (account.category.type === 'INCOME') ? 'text-green-400' : 'text-red-400'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${
              (account.category.type === 'INCOME') ? 'text-green-800' : 'text-red-800'
            }`}>
              📊 {t('account.flow.operation.tips')}
            </p>
            <p className={`text-sm ${
              (account.category.type === 'INCOME') ? 'text-green-700' : 'text-red-700'
            }`}>
              {t('account.flow.operation.description', {
                type: account.category.type === 'INCOME' ? t('type.income') : t('type.expense')
              })}
            </p>
          </div>
        </div>
      </div>

      {/* 面包屑导航 */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-3a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              {t('nav.dashboard')}
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                {account.name}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* 账户标题和操作 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{account.name}</h1>
          <p className="mt-2 text-gray-600">
            {account.category.name}
            {account.description && ` • ${account.description}`}
          </p>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              (account.category.type === 'INCOME')
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {account.category.type === 'INCOME' ? t('type.income.account') : t('type.expense.account')} • {t('type.flow.data')}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleAddTransaction}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('account.add.transaction')}
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('account.delete')}
          </button>
        </div>
      </div>

      {/* 账户摘要卡片 */}
      <div className="mb-8">
        <FlowAccountSummaryCard
          account={{ ...account, transactions: account.transactions || [] }}
          balance={flowTotal}
          currencySymbol={currencySymbol}
        />
      </div>

      {/* 账户趋势图表 */}
      <div className="mb-8">
        <FlowAccountTrendChart
          trendData={trendData}
          account={{
            id: account.id,
            name: account.name,
            type: account.category.type || 'INCOME'
          }}
          displayCurrency={account.currency || user.settings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }}
          height={400}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          isLoading={isTrendLoading}
        />
      </div>

      {/* 交易列表 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('account.transactions')}
            </h2>
            <span className="text-sm text-gray-500">
              {t('account.total.transactions', { count: pagination.totalItems })}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {t('account.transaction.description', {
              type: account.category.type === 'INCOME' ? t('type.income') : t('type.expense')
            })}
          </p>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">{t('common.loading')}</p>
          </div>
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
              onPageChange: handlePageChange
            }}
          />
        )}
      </div>

      {/* 简化的交易表单模态框 */}
      <SimpleFlowTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={handleTransactionSuccess}
        transaction={editingTransaction || undefined}
        account={account}
        currencies={currencies}
        tags={tags}
      />

      {/* 删除确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={t('account.delete')}
        message={t('confirm.delete.account.message', { name: account.name })}
        confirmLabel={t('common.delete')}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
