'use client'

import { useState, useEffect, useCallback } from 'react'
import FlowTransactionModal from '@/components/features/accounts/FlowTransactionModal'
import QuickFlowTransactionModal from '@/components/features/dashboard/QuickFlowTransactionModal'
import TransactionList from '@/components/features/transactions/TransactionList'
import FlowCategorySummaryCard from './FlowCategorySummaryCard'
import CategorySummaryItem from './CategorySummaryItem'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import FlowMonthlySummaryChart from '@/components/features/charts/FlowMonthlySummaryChart'
import DetailPageLayout from '@/components/ui/layout/DetailPageLayout'
import { useToast } from '@/contexts/providers/ToastContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useTransactionListener } from '@/hooks/business/useDataUpdateListener'
import { Transaction, LegacyAccount } from '@/types/business/transaction'
import type { TransactionType } from '@prisma/client'
import type { FlowMonthlyData, FlowSummaryData } from '@/types/components'

// 使用统一的 TimeRange 类型，但限制为此组件支持的值
type LocalTimeRange = 'lastYear' | 'all'

// 简化的编辑交易数据类型，适配 FlowTransactionModal
// 与 FlowTransactionModal 内部的 Transaction 接口保持一致
interface EditingTransactionData {
  id: string
  accountId: string
  amount: number
  description: string
  notes?: string
  date: string
  tagIds?: string[]
}

// 分类交易数据类型
interface CategoryTransaction {
  id: string
  type: TransactionType
  date: string
  amount: number
  notes?: string | null
  currency: {
    code: string
    symbol: string
    name: string
  }
  tags: Array<{
    tag: {
      id: string
      name: string
    }
  }>
}

import type { FlowCategoryDetailViewProps } from './types'

export default function FlowCategoryDetailView({
  category,
  user,
}: FlowCategoryDetailViewProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const { accounts, categories, currencies, tags } = useUserData()
  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] =
    useState(false)
  const [isQuickTransactionModalOpen, setIsQuickTransactionModalOpen] =
    useState(false)
  const [editingTransaction, setEditingTransaction] =
    useState<EditingTransactionData | null>(null)
  const [editingAccount, setEditingAccount] = useState<LegacyAccount | null>(
    null
  )
  const [summaryData, setSummaryData] = useState<FlowSummaryData | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingTransactionId, setDeletingTransactionId] = useState<
    string | null
  >(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  })
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [chartData, setChartData] = useState<FlowMonthlyData | null>(null)
  const [timeRange, setTimeRange] = useState<LocalTimeRange>('lastYear')

  // 过滤出属于当前分类的账户（包括子分类的账户）
  const categoryAccounts = accounts.filter(account => {
    // 直接属于当前分类的账户
    if (account.categoryId === category.id) {
      return true
    }

    // 属于当前分类的子分类的账户
    const accountCategory = categories.find(
      cat => cat.id === account.categoryId
    )
    return accountCategory?.parentId === category.id
  })

  // 监听交易相关事件
  useTransactionListener(
    async () => {
      // 重新加载交易列表和汇总数据
      handleTransactionSuccess()
    },
    undefined,
    [category.id]
  )

  // 数据转换函数：将API返回的数据转换为图表需要的格式
  const transformDataForChart = useCallback(
    (data: FlowSummaryData, baseCurrencyCode: string): FlowMonthlyData => {
      const chartData: FlowMonthlyData = {}

      data.forEach(monthItem => {
        const monthKey = monthItem.month
        chartData[monthKey] = {
          [baseCurrencyCode]: {
            income: 0,
            expense: 0,
            balance: 0,
            transactionCount: 0,
            categories: {},
          },
        }

        let totalIncome = 0
        let totalExpense = 0
        let totalTransactionCount = 0

        // 处理子分类
        monthItem.childCategories.forEach(childCategory => {
          let categoryIncome = 0
          let categoryExpense = 0

          Object.values(childCategory.balances.converted).forEach(balance => {
            const amount = balance as number
            if (amount > 0) {
              categoryIncome += amount
              totalIncome += amount
            } else if (amount < 0) {
              categoryExpense += Math.abs(amount)
              totalExpense += Math.abs(amount)
            }
          })

          if (categoryIncome > 0 || categoryExpense > 0) {
            chartData[monthKey][baseCurrencyCode].categories[
              childCategory.name
            ] = {
              income: categoryIncome,
              expense: categoryExpense,
              balance: categoryIncome - categoryExpense,
            }
          }
        })

        // 处理直属账户
        monthItem.directAccounts.forEach(account => {
          let accountIncome = 0
          let accountExpense = 0

          Object.values(account.balances.converted).forEach(balance => {
            const amount = balance as number
            if (amount > 0) {
              accountIncome += amount
              totalIncome += amount
            } else if (amount < 0) {
              accountExpense += Math.abs(amount)
              totalExpense += Math.abs(amount)
            }
          })

          totalTransactionCount += account.transactionCount

          if (accountIncome > 0 || accountExpense > 0) {
            chartData[monthKey][baseCurrencyCode].categories[account.name] = {
              income: accountIncome,
              expense: accountExpense,
              balance: accountIncome - accountExpense,
            }
          }
        })

        // 设置月度汇总
        chartData[monthKey][baseCurrencyCode].income = totalIncome
        chartData[monthKey][baseCurrencyCode].expense = totalExpense
        chartData[monthKey][baseCurrencyCode].balance =
          totalIncome - totalExpense
        chartData[monthKey][baseCurrencyCode].transactionCount =
          totalTransactionCount
      })

      return chartData
    },
    []
  )

  // 获取分类汇总数据
  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        const summaryRes = await fetch(`/api/categories/${category.id}/summary`)

        if (summaryRes.ok) {
          const summaryResult = await summaryRes.json()
          setSummaryData(summaryResult.data)

          // 转换数据为图表格式
          const baseCurrencyCode = user.settings?.baseCurrency?.code || 'CNY'
          const transformedData = transformDataForChart(
            summaryResult.data,
            baseCurrencyCode
          )
          setChartData(transformedData)
        }
      } catch (error) {
        console.error('Error fetching summary data:', error)
      }
    }

    fetchSummaryData()
  }, [category.id, user.settings?.baseCurrency?.code, transformDataForChart])

  // 获取交易记录
  const loadTransactions = useCallback(
    async (page = 1) => {
      setIsLoadingTransactions(true)
      try {
        const params = new URLSearchParams({
          categoryId: category.id,
          page: page.toString(),
          limit: pagination.itemsPerPage.toString(),
        })
        const response = await fetch(`/api/transactions?${params}`)
        const result = await response.json()
        if (result.success) {
          setTransactions(result.data.transactions)
          setPagination(prev => ({
            ...prev,
            currentPage: result.data.pagination.page,
            totalPages: result.data.pagination.totalPages,
            totalItems: result.data.pagination.total,
          }))
        } else {
          showError(
            t('error.load.transactions'),
            result.error || t('error.unknown')
          )
        }
      } catch (error) {
        console.error('Error fetching transactions:', error)
        const errorMessage =
          error instanceof Error ? error.message : t('error.network')
        showError(t('error.load.transactions'), errorMessage)
      } finally {
        setIsLoadingTransactions(false)
      }
    },
    [category.id, pagination.itemsPerPage, showError, t]
  )

  useEffect(() => {
    loadTransactions(pagination.currentPage)
  }, [pagination.currentPage, category.id, loadTransactions])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
  }

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setIsQuickTransactionModalOpen(true)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    if (!transaction.account) {
      showError('错误', '交易数据不完整，缺少账户信息。')
      return
    }

    // 构建简化的编辑交易数据
    const editingData: EditingTransactionData = {
      id: transaction.id,
      accountId: transaction.account.id,
      amount: transaction.amount,
      description: transaction.description,
      notes: transaction.notes || undefined,
      date:
        transaction.date instanceof Date
          ? transaction.date.toISOString().split('T')[0]
          : transaction.date,
      tagIds: transaction.tags.map(t => t.tag.id),
    }

    // 构建完整的账户信息，包含完整的 category 信息
    const fullAccount: LegacyAccount = {
      id: transaction.account.id,
      name: transaction.account.name,
      description: undefined,
      color: undefined,
      userId: user.id,
      categoryId: transaction.category.id,
      currencyId: transaction.currency.id,
      currencyCode: transaction.currency.code,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: {
        id: transaction.category.id, // 从交易的 category 获取 id
        name: transaction.category.name, // 从交易的 category 获取 name
        type: transaction.category.type, // 从交易的 category 获取 type
      },
      currency: {
        ...transaction.currency,
        isActive: true,
      },
      transactions: [],
    }

    setEditingTransaction(editingData)
    setEditingAccount(fullAccount)
    setIsEditTransactionModalOpen(true)
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

      // 重新获取数据，但不重载页面
      handleTransactionSuccess()
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
        const summaryRes = await fetch(`/api/categories/${category.id}/summary`)

        if (summaryRes.ok) {
          const summaryResult = await summaryRes.json()
          setSummaryData(summaryResult.data)

          // 更新图表数据
          const baseCurrencyCode = user.settings?.baseCurrency?.code || 'CNY'
          const transformedData = transformDataForChart(
            summaryResult.data,
            baseCurrencyCode
          )
          setChartData(transformedData)
        }
      } catch (error) {
        console.error('Error fetching summary data:', error)
      }
    }

    fetchSummaryData()
    loadTransactions(pagination.currentPage)
  }

  // 根据时间范围过滤图表数据
  const getFilteredChartData = useCallback(() => {
    if (!chartData) return {}

    const allMonths = Object.keys(chartData).sort()
    let filteredMonths: string[]

    if (timeRange === 'lastYear') {
      // 获取最近12个月的数据
      filteredMonths = allMonths.slice(-12)
    } else {
      // 全部数据
      filteredMonths = allMonths
    }

    const filteredData: FlowMonthlyData = {}
    filteredMonths.forEach(month => {
      filteredData[month] = chartData[month]
    })

    return filteredData
  }, [chartData, timeRange])

  const baseCurrency = user.settings?.baseCurrency || {
    id: 'default-usd',
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
  }
  const currencyCode = baseCurrency.code

  return (
    <DetailPageLayout
      categoryId={category.id}
      title={category.name}
      subtitle={category.description || undefined}
      icon={category.icon}
      iconBackgroundColor={category.color + '20' || '#f3f4f6'}
      badge={
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            category.type === 'INCOME'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          {category.type === 'INCOME'
            ? t('category.type.income')
            : t('category.type.expense')}{' '}
          • {t('category.type.flow.data')}
        </span>
      }
      actions={
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
          {t('transaction.create')}
        </button>
      }
      // actionsTip={t('category.flow.add.tip')}
    >
      {/* 分类摘要卡片 */}
      <div className='mb-8'>
        {(category.type === 'INCOME' || category.type === 'EXPENSE') && (
          <FlowCategorySummaryCard
            category={{
              ...category,
              type: category.type,
              transactions: (category.transactions || []).map(
                (t: CategoryTransaction) => ({
                  ...t,
                  type: t.type,
                  date: t.date,
                  amount: t.amount,
                  notes: t.notes || undefined,
                  currency: {
                    ...t.currency,
                    id: 'default-id',
                    decimalPlaces: 2,
                  },
                  tags: t.tags.map(tt => ({
                    id: tt.tag.id,
                    name: tt.tag.name,
                  })),
                })
              ),
            }}
            currencyCode={currencyCode}
            summaryData={summaryData}
            baseCurrency={baseCurrency}
          />
        )}
      </div>

      {/* 汇总数据展示 */}
      {summaryData && summaryData.length > 0 && (
        <div className='mb-8'>
          <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
              {t('category.summary')}
            </h2>

            {(() => {
              // 使用最新月份的数据（数组第一个元素）
              const latestMonthData = summaryData[0]
              if (!latestMonthData) return null

              return (
                <>
                  {/* 子分类汇总 */}
                  {latestMonthData.childCategories &&
                    latestMonthData.childCategories.length > 0 && (
                      <div className='mb-6'>
                        <h3 className='text-md font-medium text-gray-800 dark:text-gray-200 mb-3'>
                          {t('category.subcategories')}
                        </h3>
                        <div className='space-y-2'>
                          {latestMonthData.childCategories.map(child => {
                            // 转换余额数据为组件需要的格式
                            const balanceInfos = Object.entries(
                              child.balances.original
                            ).map(([currencyCode, balance]) => {
                              const convertedAmount =
                                child.balances.converted[currencyCode] ||
                                balance
                              return {
                                currencyCode,
                                balance: balance as number,
                                convertedAmount: convertedAmount as number,
                              }
                            })

                            return (
                              <CategorySummaryItem
                                key={child.id}
                                name={child.name}
                                href={`/categories/${child.id}`}
                                balances={balanceInfos}
                                baseCurrency={
                                  baseCurrency
                                    ? {
                                        ...baseCurrency,
                                        isActive: true,
                                        isCustom:
                                          'isCustom' in baseCurrency
                                            ? baseCurrency.isCustom
                                            : false,
                                      }
                                    : undefined
                                }
                                currencies={currencies.map(c => ({
                                  ...c,
                                  isActive: true,
                                  isCustom: c.isCustom || false,
                                }))}
                                accountCount={child.accountCount || 0}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )}

                  {/* 直属账户汇总 */}
                  {latestMonthData.directAccounts &&
                    latestMonthData.directAccounts.length > 0 && (
                      <div>
                        <h3 className='text-md font-medium text-gray-800 dark:text-gray-200 mb-3'>
                          {t('category.accounts')}
                        </h3>
                        <div className='space-y-2'>
                          {latestMonthData.directAccounts.map(account => {
                            // 转换余额数据为组件需要的格式
                            const balanceInfos = Object.entries(
                              account.balances.original
                            ).map(([currencyCode, balance]) => {
                              const convertedAmount =
                                account.balances.converted[currencyCode] ||
                                balance
                              return {
                                currencyCode,
                                balance: balance as number,
                                convertedAmount: convertedAmount as number,
                              }
                            })

                            return (
                              <CategorySummaryItem
                                key={account.id}
                                name={account.name}
                                href={`/accounts/${account.id}`}
                                balances={balanceInfos}
                                baseCurrency={
                                  baseCurrency
                                    ? {
                                        ...baseCurrency,
                                        isActive: true,
                                        isCustom:
                                          'isCustom' in baseCurrency
                                            ? baseCurrency.isCustom
                                            : false,
                                      }
                                    : undefined
                                }
                                currencies={currencies.map(c => ({
                                  ...c,
                                  isActive: true,
                                  isCustom: c.isCustom || false,
                                }))}
                                transactionCount={account.transactionCount}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* 月度汇总图表 */}
      {chartData &&
        (() => {
          const baseCurrencyForChart = currencies.find(
            c => c.code === baseCurrency.code
          )
          if (!baseCurrencyForChart) return null

          const filteredData = getFilteredChartData()

          return (
            <div className='mb-8'>
              <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
                <div className='flex justify-between items-center mb-4'>
                  <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                    {`${category.name} - ${t('category.monthly.cash.flow.summary')}`}
                  </h2>

                  {/* 时间范围选择器 */}
                  <div className='flex space-x-2'>
                    <button
                      onClick={() => setTimeRange('lastYear')}
                      className={`px-3 py-1 text-sm rounded ${
                        timeRange === 'lastYear'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t('time.last.12.months')}
                    </button>
                    <button
                      onClick={() => setTimeRange('all')}
                      className={`px-3 py-1 text-sm rounded ${
                        timeRange === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t('time.all')}
                    </button>
                  </div>
                </div>

                <FlowMonthlySummaryChart
                  monthlyData={filteredData}
                  baseCurrency={baseCurrencyForChart}
                  title={`${category.name} - ${t('category.monthly.cash.flow.summary')}`}
                  height={400}
                  accounts={categoryAccounts.map(account => ({
                    id: account.id,
                    name: account.name,
                    color: account.color,
                    type: account.category?.type,
                  }))}
                />
              </div>
            </div>
          )
        })()}

      {/* 交易记录 */}
      <div className='bg-white dark:bg-gray-800 shadow rounded-lg'>
        <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              {t('account.transactions')}
            </h2>
            <span className='text-sm text-gray-500 dark:text-gray-400'>
              {t('common.total')} {pagination.totalItems}{' '}
              {t('category.transaction.count')}
            </span>
          </div>
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
            {t('account.transactions.change.description')}
          </p>
        </div>

        {isLoadingTransactions ? (
          <div className='p-8 text-center'>
            <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            <p className='mt-2 text-gray-500'>{t('common.loading')}</p>
          </div>
        ) : (
          <TransactionList
            transactions={transactions}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            onBatchDelete={handleBatchDelete}
            currencySymbol={baseCurrency.symbol}
            showAccount={true}
            readOnly={false}
            pagination={{
              ...pagination,
              onPageChange: handlePageChange,
            }}
          />
        )}
      </div>

      {/* 快速交易表单模态框 - 用于新增交易 */}
      <QuickFlowTransactionModal
        isOpen={isQuickTransactionModalOpen}
        onClose={() => setIsQuickTransactionModalOpen(false)}
        onSuccess={handleTransactionSuccess}
        defaultType={category.type as 'INCOME' | 'EXPENSE'}
      />

      {/* 简化交易表单模态框 - 用于编辑交易 */}
      {editingAccount && (
        <FlowTransactionModal
          isOpen={isEditTransactionModalOpen}
          onClose={() => {
            setIsEditTransactionModalOpen(false)
            setEditingTransaction(null)
            setEditingAccount(null)
          }}
          onSuccess={handleTransactionSuccess}
          transaction={editingTransaction || undefined}
          account={editingAccount}
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
    </DetailPageLayout>
  )
}
