'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useTransactionListener } from '@/hooks/business/useDataUpdateListener'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import AnimatedNumber from '@/components/ui/data-display/AnimatedNumber'
import { TransactionType } from '@/types/core/constants'
import { ApiEndpoints } from '@/lib/constants/api-endpoints'

import type {
  SimpleCategory,
  SimpleTransaction,
  CategoryType,
} from '@/types/core'
import type { ApiTransaction } from '@/types/api'
interface FlowAccountSummaryCardProps {
  account: {
    id: string
    name: string
    description?: string | null
    category: SimpleCategory & { type?: CategoryType }
    transactions: SimpleTransaction[]
  }
  balance: number
  currencyCode: string
}
export default function FlowAccountSummaryCard({
  account,
  balance: _balance,
  currencyCode,
}: FlowAccountSummaryCardProps) {
  const { t } = useLanguage()
  const { formatCurrency, formatNumber, findCurrencyByCode } =
    useUserCurrencyFormatter()
  const accountType = account.category.type || 'EXPENSE'
  // 本地状态管理最新的交易数据
  const [transactions, setTransactions] = useState<SimpleTransaction[]>(
    account.transactions
  )
  const [isLoading, setIsLoading] = useState(false)
  // 获取最新的交易数据
  const fetchLatestTransactions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        ApiEndpoints.buildUrl(ApiEndpoints.account.TRANSACTIONS(account.id), {
          limit: 1000,
        })
      )
      const result = await response.json()
      if (result.success) {
        setTransactions(
          result.data.transactions.map((t: ApiTransaction) => ({
            type: t.type as TransactionType,
            amount: parseFloat(t.amount.toString()),
            date: t.date,
          }))
        )
      }
    } catch (error) {
      console.error('Error fetching latest transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }
  // 监听交易相关事件
  useTransactionListener(
    async event => {
      // 检查是否是当前账户的交易
      if (event.accountId === account.id) {
        await fetchLatestTransactions()
      }
    },
    [account.id]
  )
  // 初始化时如果没有交易数据，获取一次
  useEffect(() => {
    if (transactions.length === 0) {
      fetchLatestTransactions()
    }
  }, [account.id])
  // 流量类账户统计（收入/支出）
  const calculateFlowStats = () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)
    const lastYear = new Date(now.getFullYear() - 1, 0, 1)
    const _lastYearEnd = new Date(
      now.getFullYear() - 1,
      11,
      31,
      23,
      59,
      59,
      999
    )
    let thisMonthAmount = 0
    let lastMonthAmount = 0
    let thisYearAmount = 0
    let lastYearSamePeriodAmount = 0
    let totalAmount = 0
    // 计算最近12个月的月度数据
    const monthlyData: { [key: string]: number } = {}
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      const amount = transaction.amount
      // 流量类账户只关注对应类型的交易
      const isRelevantTransaction =
        (accountType === 'INCOME' &&
          transaction.type === TransactionType.INCOME) ||
        (accountType === 'EXPENSE' &&
          transaction.type === TransactionType.EXPENSE)
      if (isRelevantTransaction) {
        // 只统计截止当前日期的交易，排除未来交易
        if (transactionDate <= now) {
          totalAmount += amount
          // 本月金额（本月1日到当前日期）
          if (transactionDate >= thisMonth) {
            thisMonthAmount += amount
          }
          // 上月金额（上月1日到上月最后一天）
          if (transactionDate >= lastMonth && transactionDate < thisMonth) {
            lastMonthAmount += amount
          }
          // 今年累计（今年1月1日到当前日期）
          if (transactionDate >= thisYear) {
            thisYearAmount += amount
          }
          // 去年同期累计（去年1月1日到去年同期的当前日期）
          const currentDayOfYear = Math.floor(
            (now.getTime() - thisYear.getTime()) / (1000 * 60 * 60 * 24)
          )
          const lastYearSamePeriodEnd = new Date(
            lastYear.getFullYear(),
            0,
            1 + currentDayOfYear
          )
          if (
            transactionDate >= lastYear &&
            transactionDate <= lastYearSamePeriodEnd
          ) {
            lastYearSamePeriodAmount += amount
          }
          // 收集最近12个月的数据（排除未来月份）
          const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`
          const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 11, 1) // 12个月前
          if (transactionDate >= cutoffDate) {
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + amount
          }
        }
      }
    })
    // 计算月度变化
    const monthlyChange =
      lastMonthAmount !== 0
        ? ((thisMonthAmount - lastMonthAmount) / Math.abs(lastMonthAmount)) *
          100
        : thisMonthAmount !== 0
          ? thisMonthAmount > 0
            ? 100
            : -100
          : 0
    // 计算年度对比
    const yearlyComparison =
      lastYearSamePeriodAmount !== 0
        ? ((thisYearAmount - lastYearSamePeriodAmount) /
            Math.abs(lastYearSamePeriodAmount)) *
          100
        : thisYearAmount !== 0
          ? thisYearAmount > 0
            ? 100
            : -100
          : 0
    // 计算最近12个月平均值
    const monthlyValues = Object.values(monthlyData)
    const average12Months =
      monthlyValues.length > 0
        ? monthlyValues.reduce((sum, val) => sum + val, 0) /
          monthlyValues.length
        : 0
    return {
      totalAmount,
      thisMonthAmount,
      lastMonthAmount,
      thisYearAmount,
      monthlyChange,
      yearlyComparison,
      average12Months,
      averageMonthly: thisYearAmount / (new Date().getMonth() + 1), // 保留原有计算以防其他地方使用
    }
  }
  const flowStats = calculateFlowStats()

  // 获取货币信息用于AnimatedNumber
  const currency = findCurrencyByCode(currencyCode)

  return (
    <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6 relative'>
      {/* 加载指示器 */}
      {isLoading && (
        <div className='absolute top-2 right-2'>
          <LoadingSpinner size='sm' color='primary' />
        </div>
      )}
      {/* 账户类型标识 */}
      {/* <div className='mb-4'>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            accountType === 'INCOME'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          {accountType === 'INCOME'
            ? t('account.type.income')
            : t('account.type.expense')}{' '}
          • {t('account.data.type.flow')}
        </span>
      </div> */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        {/* 本月金额 */}
        <div className='text-center md:text-left'>
          <div className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
            {t('account.amount.this.month')}
          </div>
          <div
            className={`text-3xl font-bold ${
              accountType === 'INCOME'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            <AnimatedNumber
              value={flowStats.thisMonthAmount}
              currency={{
                code: currencyCode,
                symbol: currency?.symbol || '',
                name: currency?.name || '',
                id: currency?.id,
              }}
              duration={200}
              enableAnimation={true}
              formatOptions={{
                showSymbol: true,
                // 不设置 precision，让 AnimatedNumber 使用货币的 decimalPlaces
              }}
            />
          </div>
        </div>
        {/* 上月金额 */}
        <div className='text-center md:text-left'>
          <div className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
            {t('account.amount.last.month')}
          </div>
          <div className='text-2xl font-semibold text-gray-600 dark:text-gray-300'>
            {formatCurrency(flowStats.lastMonthAmount, currencyCode)}
          </div>
        </div>
        {/* 月度变化 + 绝对变化 */}
        <div className='text-center md:text-left'>
          <div className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
            {t('account.change.monthly')}
          </div>
          <div
            className={`text-2xl font-semibold ${
              flowStats.monthlyChange >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {flowStats.monthlyChange >= 0 ? '+' : ''}
            {formatNumber(flowStats.monthlyChange, 1)}%
          </div>
          <div
            className={`text-xs mt-1 ${
              flowStats.thisMonthAmount - flowStats.lastMonthAmount >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {flowStats.thisMonthAmount - flowStats.lastMonthAmount >= 0
              ? '+'
              : '-'}
            {formatCurrency(
              Math.abs(flowStats.thisMonthAmount - flowStats.lastMonthAmount),
              currencyCode
            )}
          </div>
        </div>
        {/* 年度对比 + 12月均值 */}
        <div className='text-center md:text-left'>
          <div className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
            {t('account.comparison.yearly')}
          </div>
          <div
            className={`text-2xl font-semibold ${
              flowStats.yearlyComparison >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {flowStats.yearlyComparison >= 0 ? '+' : ''}
            {formatNumber(flowStats.yearlyComparison, 1)}%
          </div>
          <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            {t('account.average.12months')}:{' '}
            {formatCurrency(flowStats.average12Months, currencyCode)}
          </div>
        </div>
      </div>
      {/* 流量账户底部统计 */}
      <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
          <div>
            <span className='text-gray-500 dark:text-gray-400'>
              {t('account.nature')}
            </span>
            <div className='font-medium text-gray-900 dark:text-gray-100'>
              {accountType === 'INCOME'
                ? t('account.type.income.category')
                : t('account.type.expense.category')}
            </div>
          </div>
          <div>
            <span className='text-gray-500 dark:text-gray-400'>
              {t('account.transaction.count')}
            </span>
            <div className='font-medium text-gray-900 dark:text-gray-100'>
              {transactions.length}
            </div>
          </div>
          <div>
            <span className='text-gray-500 dark:text-gray-400'>
              {t('account.category')}
            </span>
            <div className='font-medium text-gray-900 dark:text-gray-100'>
              {account.category.name}
            </div>
          </div>
          <div>
            <span className='text-gray-500 dark:text-gray-400'>
              {t('account.data.type')}
            </span>
            <div className='font-medium text-purple-600 dark:text-purple-400'>
              {t('account.data.type.period.flow')}
            </div>
          </div>
        </div>
      </div>
      {/* 流量特有信息 */}
      {/* <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'>
        <div className='text-xs text-gray-500 dark:text-gray-400 text-center'>
          📊 {t('account.flow.data.description')}
        </div>
      </div> */}
    </div>
  )
}
