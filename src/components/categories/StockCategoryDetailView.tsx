'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import TransactionList from '@/components/transactions/TransactionList'
import StockCategorySummaryCard from './StockCategorySummaryCard'
import MonthlySummaryChart from '@/components/charts/MonthlySummaryChart'
import CategorySummaryItem from './CategorySummaryItem'

import ConfirmationModal from '@/components/ui/ConfirmationModal'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Category,
  Currency,
  Transaction,
  User
} from '@/types/transaction'

// 定义图表组件期望的数据格式
interface StockMonthlyDataForChart {
  [monthKey: string]: {
    [currencyCode: string]: {
      accounts: Record<string, { balance: number; name: string }>
      totalBalance: number
    }
  }
}

interface SummaryData {
  children: {
    id: string
    name: string
    balances: { [currencyCode: string]: number }
    accountCount: number
    historicalBalances?: {
      currentMonth: Record<string, number>
      lastMonth: Record<string, number>
      yearStart: Record<string, number>
      currentMonthInBaseCurrency: Record<string, number>
      lastMonthInBaseCurrency: Record<string, number>
      yearStartInBaseCurrency: Record<string, number>
    }
  }[]
  accounts: {
    id: string
    name: string
    balances: { [currencyCode: string]: number }
    transactionCount: number
    historicalBalances?: {
      currentMonth: Record<string, number>
      lastMonth: Record<string, number>
      yearStart: Record<string, number>
      currentMonthInBaseCurrency: Record<string, number>
      lastMonthInBaseCurrency: Record<string, number>
      yearStartInBaseCurrency: Record<string, number>
    }
  }[]
}

interface MonthlyData {
  monthlyData: StockMonthlyDataForChart
  baseCurrency: string
}

interface StockCategoryDetailViewProps {
  category: Category
  currencies: Currency[]
  user: User
}

export default function StockCategoryDetailView({
  category,
  currencies,
  user
}: StockCategoryDetailViewProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
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
          // 添加货币信息到汇总数据中
          setSummaryData({
            ...summaryResult.data,
            currencies: currencies
          })
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
  }, [category.id, currencies])

  // 获取交易记录
  const loadTransactions = useCallback(async (page = 1) => {
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
  }, [category.id, pagination.itemsPerPage, showError])

  useEffect(() => {
    loadTransactions(pagination.currentPage)
  }, [pagination.currentPage, category.id, loadTransactions])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
  }

  // 处理编辑余额记录
  const handleEditTransaction = (transaction: Transaction) => {
    // 检查是否为余额调整记录
    if (transaction.type === 'BALANCE_ADJUSTMENT') {
      // 跳转到对应的账户页面进行编辑
      if (transaction.account?.id) {
        window.location.href = `/accounts/${transaction.account.id}`
      } else {
        showError('错误', '无法找到对应的账户信息')
      }
    } else {
      showError('错误', '存量分类只能编辑余额调整记录')
    }
  }

  // 处理删除交易
  const handleDeleteTransaction = (transactionId: string) => {
    setDeletingTransactionId(transactionId)
    setShowDeleteConfirm(true)
  }

  // 确认删除交易
  const handleConfirmDelete = async () => {
    if (!deletingTransactionId) return

    try {
      const response = await fetch(`/api/transactions/${deletingTransactionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showSuccess('成功', '记录已删除')
        // 重新获取数据
        loadTransactions(pagination.currentPage)
      } else {
        const error = await response.json()
        showError('删除失败', error.message || '删除记录时发生错误')
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      showError('删除失败', '网络错误，请稍后重试')
    } finally {
      setShowDeleteConfirm(false)
      setDeletingTransactionId(null)
    }
  }



  const baseCurrency = user.settings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }
  const currencySymbol = baseCurrency.symbol

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 面包屑导航 */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
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
              <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400 md:ml-2">
                {category.name}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* 分类标题 */}
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{category.name}</h1>
            {category.description && (
              <p className="mt-2 text-gray-600 dark:text-gray-400">{category.description}</p>
            )}
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                category.type === 'ASSET'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
              }`}>
                {category.type === 'ASSET' ? t('category.type.asset') : t('category.type.liability')} • {t('category.type.stock.data')}
              </span>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          💡 {t('category.stock.update.tip')}
        </div>
      </div>

      {/* 分类摘要卡片 */}
      <div className="mb-8">
        {(category.type === 'ASSET' || category.type === 'LIABILITY') && (
          <StockCategorySummaryCard
            category={{
              ...category,
              type: category.type,
              transactions: category.transactions || []
            }}
            currencySymbol={currencySymbol}
            summaryData={summaryData}
            baseCurrency={baseCurrency}
          />
        )}
      </div>

      {/* 汇总数据展示 */}
      {summaryData && (
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('category.summary')}
            </h2>

            {/* 子分类汇总 */}
            {summaryData.children && summaryData.children.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">{t('category.subcategories')}</h3>
                <div className="space-y-2">
                  {summaryData.children.map((child) => {
                    // 使用子分类的实际余额汇总
                    const childBalances = child.balances || {}
                    const hasBalances = Object.keys(childBalances).length > 0

                    // 转换余额数据为组件需要的格式
                    const balanceInfos = hasBalances
                      ? Object.entries(childBalances).map(([currencyCode, balance]) => {
                          let convertedAmount = balance
                          if (child.historicalBalances?.currentMonthInBaseCurrency?.[currencyCode]) {
                            convertedAmount = child.historicalBalances.currentMonthInBaseCurrency[currencyCode]
                          }
                          return {
                            currencyCode,
                            balance,
                            convertedAmount
                          }
                        })
                      : []

                    return (
                      <CategorySummaryItem
                        key={child.id}
                        id={child.id}
                        name={child.name}
                        href={`/categories/${child.id}`}
                        type="stock"
                        balances={balanceInfos}
                        baseCurrency={baseCurrency}
                        currencies={currencies}
                        accountCount={child.accountCount || 0}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* 直属账户汇总 */}
            {summaryData.accounts && summaryData.accounts.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">{t('category.accounts')}</h3>
                <div className="space-y-2">
                  {summaryData.accounts.map((account) => {
                    // 转换余额数据为组件需要的格式
                    const balanceInfos = account.balances
                      ? Object.entries(account.balances).map(([currencyCode, balance]) => {
                          let convertedAmount = balance
                          if (account.historicalBalances?.currentMonthInBaseCurrency?.[currencyCode]) {
                            convertedAmount = account.historicalBalances.currentMonthInBaseCurrency[currencyCode]
                          }
                          return {
                            currencyCode,
                            balance,
                            convertedAmount
                          }
                        })
                      : []

                    return (
                      <CategorySummaryItem
                        key={account.id}
                        id={account.id}
                        name={account.name}
                        href={`/accounts/${account.id}`}
                        type="stock"
                        balances={balanceInfos}
                        baseCurrency={baseCurrency}
                        currencies={currencies}
                        transactionCount={account.transactionCount}
                      />
                    )
                  })}
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

        return (
          <div className="mb-8">
            <MonthlySummaryChart
              stockMonthlyData={monthlyData.monthlyData}
              baseCurrency={baseCurrencyForChart}
              title={`${category.name} - ${t('category.monthly.balance.summary')}`}
              height={400}
              chartType="stock"
            />
          </div>
        )
      })()}

      {/* 余额变化记录 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('category.balance.change.records')}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('common.total')} {pagination.totalItems} {t('category.transaction.count')}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('category.balance.change.description')}
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
            allowDeleteBalanceAdjustment={true}
            pagination={{
              ...pagination,
              onPageChange: handlePageChange
            }}
          />
        )}
      </div>



      {/* 删除确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={t('transaction.delete')}
        message="确定要删除这条记录吗？此操作不可撤销。"
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
