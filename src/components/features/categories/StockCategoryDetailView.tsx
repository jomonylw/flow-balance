'use client'

import { useState, useEffect, useCallback } from 'react'
import TransactionList from '@/components/features/transactions/TransactionList'
import StockCategorySummaryCard from './StockCategorySummaryCard'
import StockMonthlySummaryChart from '@/components/features/charts/StockMonthlySummaryChart'
import CategorySummaryItem from './CategorySummaryItem'
import QuickBalanceUpdateModal from '@/components/features/dashboard/QuickBalanceUpdateModal'
import BalanceUpdateModal from '@/components/features/accounts/BalanceUpdateModal'
import DetailPageLayout from '@/components/ui/layout/DetailPageLayout'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import { useToast } from '@/contexts/providers/ToastContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import {
  useBalanceUpdateListener,
  useTransactionListener,
} from '@/hooks/business/useDataUpdateListener'
import { Transaction } from '@/types/business/transaction'
import type {
  MonthlyDataItem,
  StockCategoryMonthlyData,
  CategoryTransaction,
} from '@/types/core'
import type { StockMonthlyData, StockSummaryData } from '@/types/components'

// 新的 API 数据格式 - 使用统一的 MonthlyDataItem 类型

// 使用统一的类型定义
type MonthlyData = StockCategoryMonthlyData

// 分类交易数据类型 - 使用统一定义

import type { StockCategoryDetailViewProps } from './types'

export default function StockCategoryDetailView({
  category,
  currencies,
  user,
}: StockCategoryDetailViewProps) {
  const { t } = useLanguage()
  const { showSuccess, showError } = useToast()
  const { accounts, categories } = useUserData()
  const { formatInputDate } = useUserDateFormatter()
  const [summaryData, setSummaryData] = useState<StockSummaryData | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null)
  const [isBalanceUpdateModalOpen, setIsBalanceUpdateModalOpen] =
    useState(false)
  const [isEditBalanceModalOpen, setIsEditBalanceModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null)

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

  // 监听余额更新事件
  useBalanceUpdateListener(
    event => {
      // 检查是否是当前分类相关的账户
      if (
        event.accountId &&
        categoryAccounts.some(account => account.id === event.accountId)
      ) {
        handleBalanceUpdateSuccess()
      }
    },
    categoryAccounts.map(account => account.id)
  )

  // 监听交易相关事件
  useTransactionListener(
    () => {
      // 重新加载交易列表和汇总数据
      handleBalanceUpdateSuccess()
    },
    categoryAccounts.map(account => account.id),
    [category.id]
  )

  // 获取分类汇总数据
  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        const summaryRes = await fetch(`/api/categories/${category.id}/summary`)

        if (summaryRes.ok) {
          const summaryResult = await summaryRes.json()
          setSummaryData({
            monthlyData: summaryResult.data,
          })

          // 根据新的数据格式生成图表数据
          const chartData = generateChartData(
            summaryResult.data,
            user.settings?.baseCurrency?.code || 'CNY'
          )
          setMonthlyData({
            monthlyData: chartData,
            baseCurrency: user.settings?.baseCurrency?.code || 'CNY',
          })
        }
      } catch (error) {
        console.error('Error fetching summary data:', error)
      }
    }

    fetchSummaryData()
  }, [category.id, user.settings?.baseCurrency?.code])

  // 根据新的 API 数据格式生成图表所需的数据
  const generateChartData = (
    monthlyData: MonthlyDataItem[],
    baseCurrencyCode: string
  ): StockMonthlyData => {
    const chartData: StockMonthlyData = {}

    monthlyData.forEach(monthItem => {
      const monthKey = monthItem.month
      chartData[monthKey] = {
        [baseCurrencyCode]: {
          accounts: {},
          totalBalance: 0,
        },
      }

      let totalBalance = 0

      // 处理子分类账户 - 汇总所有币种折算成本币的金额
      monthItem.childCategories.forEach(childCategory => {
        // 计算该子分类的总余额（所有币种折算成本币）
        let categoryTotalBalance = 0
        Object.values(childCategory.balances.converted).forEach(balance => {
          categoryTotalBalance += balance as number
        })

        if (categoryTotalBalance !== 0) {
          chartData[monthKey][baseCurrencyCode].accounts[
            `category_${childCategory.id}`
          ] = {
            balance: categoryTotalBalance,
            name: childCategory.name,
          }
          totalBalance += categoryTotalBalance
        }
      })

      // 处理直属账户 - 汇总所有币种折算成本币的金额
      monthItem.directAccounts.forEach(account => {
        // 计算该账户的总余额（所有币种折算成本币）
        let accountTotalBalance = 0
        Object.values(account.balances.converted).forEach(balance => {
          accountTotalBalance += balance as number
        })

        if (accountTotalBalance !== 0) {
          chartData[monthKey][baseCurrencyCode].accounts[account.id] = {
            balance: accountTotalBalance,
            name: account.name,
          }
          totalBalance += accountTotalBalance
        }
      })

      chartData[monthKey][baseCurrencyCode].totalBalance = totalBalance
    })

    return chartData
  }

  // 获取交易记录
  const loadTransactions = useCallback(
    async (page = 1) => {
      setIsLoadingTransactions(true)
      try {
        const params = new URLSearchParams({
          categoryId: category.id,
          page: page.toString(),
          limit: pagination.itemsPerPage.toString(),
          // 存量账户类别页面默认包含余额调整记录，不需要特殊参数
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

  // 处理编辑余额记录
  const handleEditTransaction = (transaction: Transaction) => {
    // 检查是否为余额调整记录
    if (transaction.type === 'BALANCE') {
      // 设置编辑状态并打开编辑模态框
      setEditingTransaction(transaction)
      setIsEditBalanceModalOpen(true)
    } else {
      showError(t('common.error'), t('error.stock.category.edit.only.balance'))
    }
  }

  // 处理删除交易
  const handleDeleteTransaction = (transactionId: string) => {
    setDeletingTransactionId(transactionId)
    setShowDeleteConfirm(true)
  }

  // 处理批量删除交易
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

      // 重新获取数据
      handleBalanceUpdateSuccess()
    } catch (error) {
      console.error('Error batch deleting transactions:', error)
      showError(t('common.delete.failed'), t('error.network'))
    }
  }

  // 确认删除交易
  const handleConfirmDelete = async () => {
    if (!deletingTransactionId) return

    try {
      const response = await fetch(
        `/api/transactions/${deletingTransactionId}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        showSuccess(t('success.deleted'), t('transaction.record.deleted'))
        // 重新获取数据
        loadTransactions(pagination.currentPage)
      } else {
        const error = await response.json()
        showError(
          t('common.delete.failed'),
          error.message || t('error.unknown')
        )
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      showError(t('common.delete.failed'), t('error.network'))
    } finally {
      setShowDeleteConfirm(false)
      setDeletingTransactionId(null)
    }
  }

  // 处理余额更新成功
  const handleBalanceUpdateSuccess = () => {
    // 重新获取汇总数据和交易记录
    const fetchSummaryData = async () => {
      try {
        const summaryRes = await fetch(`/api/categories/${category.id}/summary`)
        if (summaryRes.ok) {
          const summaryResult = await summaryRes.json()
          setSummaryData({
            monthlyData: summaryResult.data,
          })
          const chartData = generateChartData(
            summaryResult.data,
            user.settings?.baseCurrency?.code || 'CNY'
          )
          setMonthlyData({
            monthlyData: chartData,
            baseCurrency: user.settings?.baseCurrency?.code || 'CNY',
          })
        }
      } catch (error) {
        console.error('Error fetching summary data:', error)
      }
    }

    fetchSummaryData()
    loadTransactions(pagination.currentPage)
  }

  // 处理编辑余额记录成功
  const handleEditBalanceSuccess = () => {
    // 重新获取汇总数据和交易记录
    handleBalanceUpdateSuccess()
  }

  // 处理余额更新按钮点击
  const handleBalanceUpdate = () => {
    setIsBalanceUpdateModalOpen(true)
  }

  const baseCurrency = user.settings?.baseCurrency || {
    id: 'default-usd',
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
  }

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
            category.type === 'ASSET'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
          }`}
        >
          {category.type === 'ASSET'
            ? t('category.type.asset')
            : t('category.type.liability')}{' '}
          • {t('category.type.stock.data')}
        </span>
      }
      actions={
        <button
          onClick={handleBalanceUpdate}
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
              d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
            />
          </svg>
          {t('balance.update.button') || '更新余额'}
        </button>
      }
      // actionsTip={t('category.stock.update.tip') || '点击更新该分类下账户的余额'}
    >
      {/* 分类摘要卡片 */}
      <div className='mb-8'>
        {(category.type === 'ASSET' || category.type === 'LIABILITY') && (
          <StockCategorySummaryCard
            category={{
              ...category,
              type: category.type,
              transactions: (category.transactions || []).map(
                (t: CategoryTransaction) => ({
                  ...t,
                  type: t.type,
                  date: t.date,
                  amount: Number(t.amount),
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
            currencyCode={baseCurrency?.code || 'USD'}
            summaryData={summaryData}
            baseCurrency={baseCurrency}
            currencies={currencies}
          />
        )}
      </div>

      {/* 汇总数据展示 */}
      {summaryData && summaryData.monthlyData.length > 0 && (
        <div className='mb-8'>
          <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
              {t('category.summary')}
            </h2>

            {(() => {
              // 使用最新月份的数据（数组第一个元素）
              const latestMonthData = summaryData.monthlyData[0]
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
                                currencies={currencies}
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
                                currencies={currencies}
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
      {monthlyData &&
        (() => {
          const baseCurrencyForChart = currencies.find(
            c => c.code === monthlyData.baseCurrency
          )
          if (!baseCurrencyForChart) return null

          return (
            <div className='mb-8'>
              <StockMonthlySummaryChart
                stockMonthlyData={monthlyData.monthlyData}
                baseCurrency={baseCurrencyForChart}
                title={`${category.name} - ${t('category.monthly.balance.summary')}`}
                height={400}
                accounts={categoryAccounts.map(account => ({
                  id: account.id,
                  name: account.name,
                  color: account.color,
                  type: account.category?.type,
                }))}
              />
            </div>
          )
        })()}

      {/* 余额变化记录 */}
      <div className='bg-white dark:bg-gray-800 shadow rounded-lg'>
        <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              {t('category.balance.change.records')}
            </h2>
            <span className='text-sm text-gray-500 dark:text-gray-400'>
              {t('common.total')} {pagination.totalItems}{' '}
              {t('category.transaction.count')}
            </span>
          </div>
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
            {t('category.balance.change.description')}
          </p>
        </div>

        {isLoadingTransactions ? (
          <div className='p-8 text-center'>
            <LoadingSpinner size='lg' showText text={t('common.loading')} />
          </div>
        ) : (
          <TransactionList
            transactions={transactions}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            onBatchDelete={handleBatchDelete}
            currencySymbol={baseCurrency?.symbol || '$'}
            showAccount={true}
            readOnly={false}
            pagination={{
              ...pagination,
              onPageChange: handlePageChange,
            }}
          />
        )}
      </div>

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

      {/* 快速余额更新模态框 */}
      <QuickBalanceUpdateModal
        isOpen={isBalanceUpdateModalOpen}
        onClose={() => setIsBalanceUpdateModalOpen(false)}
        onSuccess={handleBalanceUpdateSuccess}
        accountType={category.type as 'ASSET' | 'LIABILITY'}
      />

      {/* 编辑余额记录模态框 */}
      {editingTransaction && editingTransaction.account && (
        <BalanceUpdateModal
          isOpen={isEditBalanceModalOpen}
          onClose={() => {
            setIsEditBalanceModalOpen(false)
            setEditingTransaction(null)
          }}
          onSuccess={handleEditBalanceSuccess}
          account={editingTransaction.account}
          currencies={currencies}
          currentBalance={0} // 编辑模式下不需要当前余额
          currencyCode={
            editingTransaction.currency?.code ||
            user.settings?.baseCurrency?.code ||
            'CNY'
          }
          editingTransaction={
            editingTransaction
              ? {
                  ...editingTransaction,
                  currencyCode: editingTransaction.currency?.code || 'USD',
                  date:
                    editingTransaction.date instanceof Date
                      ? formatInputDate(editingTransaction.date)
                      : editingTransaction.date,
                  notes: editingTransaction.notes || undefined,
                }
              : undefined
          }
        />
      )}
    </DetailPageLayout>
  )
}
