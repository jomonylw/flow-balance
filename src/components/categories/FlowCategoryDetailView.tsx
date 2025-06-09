'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import TransactionFormModal from '@/components/transactions/TransactionFormModal'
import TransactionList from '@/components/transactions/TransactionList'
import CategorySummaryCard from './CategorySummaryCard'
import CategoryChart from './CategoryChart'
import SmartCategorySummaryCard from './SmartCategorySummaryCard'
import SmartCategoryChart from './SmartCategoryChart'
import MonthlySummaryChart from '@/components/charts/MonthlySummaryChart'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Account,
  Category,
  Currency,
  Tag,
  Transaction,
  TransactionFormData,
  User
} from '@/types/transaction'

// 定义图表组件期望的数据格式
interface MonthlyDataForChart {
  [monthKey: string]: {
    [currencyCode: string]: {
      income: number
      expense: number
      balance: number
      transactionCount: number
      categories: Record<string, { income: number; expense: number; balance: number }>
    }
  }
}

interface SummaryData {
  transactionSummary: {
    [currency: string]: {
      net: number
      income: number
      expense: number
    }
  }
  children: { id: string; name: string }[]
  accounts: {
    id: string
    name: string
    balances?: { [currency: string]: number }
    transactionCount: number
  }[]
}

interface MonthlyData {
  monthlyData: { month: string; income: number; expense: number; net: number }[]
  baseCurrency: string
}

interface FlowCategoryDetailViewProps {
  category: Category
  accounts: Account[]
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}

export default function FlowCategoryDetailView({
  category,
  accounts,
  categories,
  currencies,
  tags,
  user
}: FlowCategoryDetailViewProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionFormData | null>(null)
  const [timeRange, setTimeRange] = useState('thisMonth')
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  })
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)

  // 获取分类汇总数据
  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        // 并行获取汇总数据和月度数据
        const [summaryRes, monthlyRes] = await Promise.all([
          fetch(`/api/categories/${category.id}/summary`),
          fetch(`/api/analytics/monthly-summary?categoryId=${category.id}&months=12`)
        ])

        if (summaryRes.ok) {
          const summaryResult = await summaryRes.json()
          setSummaryData(summaryResult.data)
        }

        if (monthlyRes.ok) {
          const monthlyResult = await monthlyRes.json()
          setMonthlyData(monthlyResult.data)
        }
      } catch (error) {
        console.error('Error fetching summary data:', error)
      }
    }

    fetchSummaryData()
  }, [category.id])

  // 获取交易记录
  const loadTransactions = async (page = 1) => {
    setIsLoadingTransactions(true)
    try {
      const params = new URLSearchParams({
        categoryId: category.id,
        page: page.toString(),
        limit: pagination.itemsPerPage.toString()
      })
      const response = await fetch(`/api/transactions?${params}`)
      const result = await response.json()
      if (result.success) {
        setTransactions(result.data.transactions)
        setPagination(prev => ({
          ...prev,
          currentPage: result.data.pagination.page,
          totalPages: result.data.pagination.totalPages,
          totalItems: result.data.pagination.total
        }))
      } else {
        showError('加载交易记录失败', result.error)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      showError('加载交易记录失败', '网络错误')
    } finally {
      setIsLoadingTransactions(false)
    }
  }

  useEffect(() => {
    loadTransactions(pagination.currentPage)
  }, [pagination.currentPage, category.id])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
  }

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setIsTransactionModalOpen(true)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    if (!transaction.account) {
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
        // 重新获取数据，但不重载页面
        handleTransactionSuccess()
      } else {
        showError(t('common.delete.failed'), result.error || t('error.unknown'))
      }
    } catch (error) {
      console.error('Delete transaction error:', error)
      showError(t('common.delete.failed'), t('error.network'))
    } finally {
      setShowDeleteConfirm(false)
      setDeletingTransactionId(null)
    }
  }

  const handleTransactionSuccess = () => {
    // 重新获取汇总数据
    const fetchSummaryData = async () => {
      try {
        const [summaryRes, monthlyRes] = await Promise.all([
          fetch(`/api/categories/${category.id}/summary`),
          fetch(`/api/analytics/monthly-summary?categoryId=${category.id}&months=12`)
        ])

        if (summaryRes.ok) {
          const summaryResult = await summaryRes.json()
          setSummaryData(summaryResult.data)
        }

        if (monthlyRes.ok) {
          const monthlyResult = await monthlyRes.json()
          setMonthlyData(monthlyResult.data)
        }
      } catch (error) {
        console.error('Error fetching summary data:', error)
      }
    }

    fetchSummaryData()
    loadTransactions(pagination.currentPage)
  }

  // 计算分类统计
  const calculateStats = () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)

    let totalIncome = 0
    let totalExpense = 0
    let thisMonthIncome = 0
    let thisMonthExpense = 0
    let lastMonthIncome = 0
    let lastMonthExpense = 0
    let thisYearIncome = 0
    let thisYearExpense = 0
    let incomeCount = 0
    let expenseCount = 0

    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      const amount = transaction.amount

      if (transaction.type === 'INCOME') {
        incomeCount++
        totalIncome += amount

        if (transactionDate >= thisMonth) {
          thisMonthIncome += amount
        }

        if (transactionDate >= lastMonth && transactionDate < thisMonth) {
          lastMonthIncome += amount
        }

        if (transactionDate >= thisYear) {
          thisYearIncome += amount
        }
      } else if (transaction.type === 'EXPENSE') {
        expenseCount++
        totalExpense += amount

        if (transactionDate >= thisMonth) {
          thisMonthExpense += amount
        }

        if (transactionDate >= lastMonth && transactionDate < thisMonth) {
          lastMonthExpense += amount
        }

        if (transactionDate >= thisYear) {
          thisYearExpense += amount
        }
      }
    })

    const totalAmount = totalIncome - totalExpense
    const thisMonthAmount = thisMonthIncome - thisMonthExpense
    const lastMonthAmount = lastMonthIncome - lastMonthExpense
    const thisYearAmount = thisYearIncome - thisYearExpense

    const monthlyChange = lastMonthAmount !== 0
      ? ((thisMonthAmount - lastMonthAmount) / Math.abs(lastMonthAmount)) * 100
      : 0

    return {
      totalAmount,
      totalIncome,
      totalExpense,
      thisMonthAmount,
      thisMonthIncome,
      thisMonthExpense,
      lastMonthAmount,
      lastMonthIncome,
      lastMonthExpense,
      thisYearAmount,
      thisYearIncome,
      thisYearExpense,
      monthlyChange,
      incomeCount,
      expenseCount,
      totalCount: transactions.length,
      averageAmount: transactions.length > 0 ? totalAmount / transactions.length : 0
    }
  }

  const stats = calculateStats()
  const currencySymbol = user.settings?.baseCurrency?.symbol || '$'

  return (
    <div className="p-6 max-w-7xl mx-auto">
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
                {category.name}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* 分类标题和操作 */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center">
          {category.icon && (
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center mr-4"
              style={{ backgroundColor: category.color + '20' || '#f3f4f6' }}
            >
              <span className="text-2xl">{category.icon}</span>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
            {category.description && (
              <p className="mt-2 text-gray-600">{category.description}</p>
            )}
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                category.type === 'INCOME'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {category.type === 'INCOME' ? t('category.type.income') : t('category.type.expense')} • {t('category.type.flow.data')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAddTransaction}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('transaction.create')}
          </button>
        </div>
      </div>

      {/* 智能分类摘要卡片 */}
      <div className="mb-8">
        {category.type ? (
          <SmartCategorySummaryCard
            category={{ ...category, transactions: category.transactions || [] }}
            currencySymbol={currencySymbol}
            summaryData={summaryData}
          />
        ) : (
          <CategorySummaryCard
            category={{ ...category, transactions: category.transactions || [] }}
            stats={stats}
            currencySymbol={currencySymbol}
          />
        )}
      </div>

      {/* 汇总数据展示 */}
      {summaryData && (
        <div className="mb-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('category.summary')}
            </h2>

            {/* 总余额/净收支 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {summaryData.transactionSummary && Object.entries(summaryData.transactionSummary).map(([currency, data]) => (
                <div key={currency} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">
                    {currency} {t('category.net.cash.flow')}
                  </div>
                  <div className={`text-xl font-semibold ${
                    data.net >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currencySymbol}{Math.abs(data.net).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {t('category.income')}: {currencySymbol}{data.income.toFixed(2)} | {t('category.expense')}: {currencySymbol}{data.expense.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* 子分类汇总 */}
            {summaryData.children && summaryData.children.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-800 mb-3">{t('category.subcategories')}</h3>
                <div className="space-y-2">
                  {summaryData.children.map((child) => (
                    <div key={child.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <Link
                        href={`/categories/${child.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {child.name}
                      </Link>
                      <div className="text-sm text-gray-600">
                        <span className="text-gray-500">
                          {t('category.subcategory')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 直属账户汇总 */}
            {summaryData.accounts && summaryData.accounts.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-3">{t('category.accounts')}</h3>
                <div className="space-y-2">
                  {summaryData.accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <Link
                        href={`/accounts/${account.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {account.name}
                      </Link>
                      <div className="text-sm text-gray-600">
                        {account.balances && Object.entries(account.balances).map(([currency, balance]) => (
                          <span key={currency} className={`ml-2 ${
                            balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {currencySymbol}{Math.abs(balance).toFixed(2)}
                          </span>
                        ))}
                        {(!account.balances || Object.keys(account.balances).length === 0) && (
                          <span className="text-gray-500">
                            {t('account.transaction.count.value', { count: account.transactionCount })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 月度汇总图表 */}
      {monthlyData && (() => {
        const baseCurrencyForChart = currencies.find(c => c.code === monthlyData.baseCurrency)
        if (!baseCurrencyForChart) return null

        const transformDataForChart = (data: { month: string; income: number; expense: number; net: number }[], currencyCode: string): MonthlyDataForChart => {
          const transformed: MonthlyDataForChart = {}
          data.forEach(item => {
            const monthKey = item.month
            transformed[monthKey] = {
              [currencyCode]: {
                income: item.income,
                expense: item.expense,
                balance: item.net,
                transactionCount: 0, // API doesn't provide this, default to 0
                categories: {} // API doesn't provide this, default to empty object
              }
            }
          })
          return transformed
        }

        const chartData = transformDataForChart(monthlyData.monthlyData, monthlyData.baseCurrency)

        return (
          <div className="mb-8">
            <MonthlySummaryChart
              monthlyData={chartData}
              baseCurrency={baseCurrencyForChart}
              title={`${category.name} - ${t('category.monthly.cash.flow.summary')}`}
              height={400}
              chartType="flow"
            />
          </div>
        )
      })()}

      {/* 图表和时间范围选择 */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('category.trend.analysis')}
            </h2>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="thisMonth">{t('time.this.month')}</option>
              <option value="last3Months">{t('time.last.3.months')}</option>
              <option value="last6Months">{t('time.last.6.months')}</option>
              <option value="thisYear">{t('time.this.year')}</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          {category.type ? (
            <SmartCategoryChart
              category={{ ...category, transactions: category.transactions || [] }}
              timeRange={timeRange}
              currencySymbol={currencySymbol}
            />
          ) : (
            <CategoryChart
              transactions={transactions}
              timeRange={timeRange}
              currencySymbol={currencySymbol}
            />
          )}
        </div>
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('account.transactions.change.description')}
          </p>
        </div>

        {isLoadingTransactions ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">{t('common.loading')}</p>
          </div>
        ) : (
          <TransactionList
            transactions={transactions}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            currencySymbol={currencySymbol}
            showAccount={true}
            readOnly={false}
            pagination={{
              ...pagination,
              onPageChange: handlePageChange
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
        defaultCategoryId={category.id}
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
    </div>
  )
}
