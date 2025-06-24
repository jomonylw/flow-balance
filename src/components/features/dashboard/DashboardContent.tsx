'use client'

import { useState, useEffect } from 'react'
import QuickFlowTransactionModal from './QuickFlowTransactionModal'
import QuickBalanceUpdateModal from '@/components/features/dashboard/QuickBalanceUpdateModal'
import NetWorthChart from './NetWorthChart'
import CashFlowChart from './CashFlowChart'
import ExchangeRateAlert from './ExchangeRateAlert'
import SystemUpdateCard from './SystemUpdateCard'
import PageContainer from '@/components/ui/layout/PageContainer'
import TranslationLoader from '@/components/ui/data-display/TranslationLoader'
import { DashboardSkeleton } from '@/components/ui/data-display/page-skeletons'

import {
  validateAccountDataWithI18n,
  validateChartData,
} from '@/lib/utils/validation'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useAllDataListener } from '@/hooks/business/useDataUpdateListener'
import { AccountType, TransactionType } from '@/types/core/constants'
import type {
  DashboardContentProps,
  ChartData,
  ValidationResult,
  DashboardSummary,
} from '@/types/components'

// 本地类型定义已移除，现在使用统一的类型定义

export default function DashboardContent({
  user,
  stats,
  accounts,
}: DashboardContentProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const { formatCurrencyById, findCurrencyByCode } = useUserCurrencyFormatter()
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [isBalanceUpdateModalOpen, setIsBalanceUpdateModalOpen] =
    useState(false)
  const [defaultTransactionType, setDefaultTransactionType] = useState<
    TransactionType.INCOME | TransactionType.EXPENSE
  >(TransactionType.EXPENSE)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [isLoadingCharts, setIsLoadingCharts] = useState(true)
  const [chartError, setChartError] = useState<string | null>(null)
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null)
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)

  // 监听所有数据更新事件
  useAllDataListener(async () => {
    // 重新获取仪表板数据
    await handleTransactionSuccess()
  })

  // 辅助函数：智能格式化货币
  const formatCurrencyAmount = (
    amount: number,
    currency: { code: string; id?: string }
  ) => {
    if (currency.id) {
      return formatCurrencyById(amount, currency.id)
    } else {
      // 回退到基于代码的查找
      const currencyInfo = findCurrencyByCode(currency.code)
      return currencyInfo?.id
        ? formatCurrencyById(amount, currencyInfo.id)
        : `${amount} ${currency.code}`
    }
  }

  const handleQuickTransaction = (
    type: TransactionType.INCOME | TransactionType.EXPENSE
  ) => {
    setDefaultTransactionType(type)
    setIsTransactionModalOpen(true)
  }

  const handleQuickBalanceUpdate = () => {
    setIsBalanceUpdateModalOpen(true)
  }

  const handleTransactionSuccess = async () => {
    // 重新获取数据，但不重载页面
    try {
      // 重新获取概览数据
      const summaryResponse = await fetch('/api/dashboard/summary')
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        setSummaryData(summaryData.data)
      }

      // 重新获取图表数据
      const chartResponse = await fetch('/api/dashboard/charts?months=12')
      if (chartResponse.ok) {
        const chartData = await chartResponse.json()
        setChartData(chartData.data)
      }
    } catch (error) {
      console.error('Error refreshing dashboard data:', error)
    }
  }

  // 获取财务概览数据
  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setIsLoadingSummary(true)
        const response = await fetch('/api/dashboard/summary')
        if (response.ok) {
          const data = await response.json()
          setSummaryData(data.data)
        } else {
          console.error('Failed to fetch summary data')
        }
      } catch (error) {
        console.error('Error fetching summary data:', error)
      } finally {
        setIsLoadingSummary(false)
      }
    }

    fetchSummaryData()
  }, [])

  // 获取图表数据
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setIsLoadingCharts(true)
        setChartError(null)

        const response = await fetch('/api/dashboard/charts?months=12')
        if (response.ok) {
          const data = await response.json()
          setChartData(data.data)

          // 验证图表数据
          const chartValidation = validateChartData(data.data)
          if (!chartValidation.isValid) {
            console.warn(
              'Chart data validation failed:',
              chartValidation.errors
            )
            setChartError(
              t('dashboard.chart.data.validation.failed', {
                errors: chartValidation.errors.join(', '),
              })
            )
          }
        } else {
          const errorData = await response.json()
          setChartError(
            errorData.error || t('dashboard.chart.data.fetch.failed')
          )
        }
      } catch (error) {
        console.error('Error fetching chart data:', error)
        setChartError(t('dashboard.network.error.charts'))
      } finally {
        setIsLoadingCharts(false)
      }
    }

    fetchChartData()
  }, [t])

  // 验证账户数据
  useEffect(() => {
    const accountsForValidation = accounts.map(account => ({
      id: account.id,
      name: account.name,
      category: {
        id: account.id, // 使用账户 ID 作为分类 ID 的占位符
        name: account.category.name,
        type: account.category.type as AccountType,
      },
      transactions: (account.transactions || []).map((t, index) => ({
        id: `${account.id}-${index}`, // 生成假的交易 ID
        type: t.type as TransactionType,
        amount: t.amount,
        date: new Date().toISOString(), // 使用当前日期作为占位符
        description: '交易记录', // 使用默认描述
        currency: {
          code: t.currency.code,
          symbol: t.currency.symbol,
        },
      })),
    }))

    const validation = validateAccountDataWithI18n(accountsForValidation, t)
    setValidationResult(validation)

    if (!validation.isValid) {
      console.warn('Account data validation failed:', validation.errors)
    }
  }, [accounts, t])

  return (
    <TranslationLoader fallback={<DashboardSkeleton />}>
      <PageContainer
        title={t('dashboard.title')}
        subtitle={t('dashboard.welcome', {
          name: user.name || user.email,
          days: stats.accountingDays,
        })}
      >
        {/* 汇率设置提醒 */}
        <ExchangeRateAlert className='mb-4 sm:mb-6' />

        {/* 系统更新状态卡片 */}
        <SystemUpdateCard />

        {/* 数据验证提示 */}
        {validationResult &&
          (!validationResult.isValid ||
            validationResult.warnings.length > 0) && (
            <div className='mb-6'>
              {!validationResult.isValid && (
                <div className='bg-red-50 border border-red-200 rounded-md p-4 mb-4'>
                  <div className='flex'>
                    <div className='flex-shrink-0'>
                      <svg
                        className='h-5 w-5 text-red-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                        />
                      </svg>
                    </div>
                    <div className='ml-3'>
                      <h3 className='text-sm font-medium text-red-800'>
                        {t('dashboard.validation.errors')}
                      </h3>
                      <div className='mt-2 text-sm text-red-700'>
                        <ul className='list-disc pl-5 space-y-1'>
                          {validationResult.errors.map(
                            (error: string, index: number) => (
                              <li key={index}>{error}</li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className='bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4'>
                  <div className='flex'>
                    <div className='flex-shrink-0'>
                      <svg
                        className='h-5 w-5 text-yellow-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                        />
                      </svg>
                    </div>
                    <div className='ml-3'>
                      <h3 className='text-sm font-medium text-yellow-800'>
                        {t('dashboard.validation.warnings')}
                      </h3>
                      <div className='mt-2 text-sm text-yellow-700'>
                        <ul className='list-disc pl-5 space-y-1'>
                          {validationResult.warnings.map(
                            (warning: string, index: number) => (
                              <li key={index}>{warning}</li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {validationResult.suggestions.length > 0 && (
                <div className='bg-blue-50 border border-blue-200 rounded-md p-4'>
                  <div className='flex'>
                    <div className='flex-shrink-0'>
                      <svg
                        className='h-5 w-5 text-blue-400'
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
                      <h3 className='text-sm font-medium text-blue-800'>
                        {t('validation.optimization.suggestions')}
                      </h3>
                      <div className='mt-2 text-sm text-blue-700'>
                        <ul className='list-disc pl-5 space-y-1'>
                          {validationResult.suggestions.map(
                            (suggestion: string, index: number) => (
                              <li key={index}>{suggestion}</li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* 智能财务统计 */}
        <div className='mb-8'>
          <h2
            className={`text-xl font-semibold mb-4 ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
          >
            {t('dashboard.financial.overview')}
            {/* <span
              className={`ml-2 text-sm font-normal ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            >
              ({t('dashboard.api.data.note')})
            </span> */}
          </h2>
          {isLoadingSummary ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
                >
                  <div className='animate-pulse'>
                    <div
                      className={`h-4 rounded w-1/2 mb-2 ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}
                    ></div>
                    <div
                      className={`h-8 rounded w-3/4 mb-2 ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}
                    ></div>
                    <div
                      className={`h-3 rounded w-1/3 ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : summaryData ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
              {/* 总资产 */}
              <div
                className={`border rounded-lg p-6 ${resolvedTheme === 'dark' ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}
              >
                <div className='flex items-center mb-3'>
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${resolvedTheme === 'dark' ? 'bg-blue-800' : 'bg-blue-100'}`}
                  >
                    <svg
                      className='h-5 w-5 text-blue-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
                      />
                    </svg>
                  </div>
                  <h3
                    className={`text-lg font-semibold ${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}
                  >
                    {t('dashboard.total.assets.card')}
                  </h3>
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${resolvedTheme === 'dark' ? 'text-blue-100' : 'text-blue-900'}`}
                  >
                    {summaryData.totalAssets
                      ? formatCurrencyAmount(
                          summaryData.totalAssets.amount,
                          summaryData.totalAssets.currency
                        )
                      : formatCurrencyAmount(0, summaryData.netWorth.currency)}
                  </p>
                  <p
                    className={`text-xs mt-1 ${resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
                  >
                    {summaryData.totalAssets
                      ? summaryData.totalAssets.accountCount
                      : 0}{' '}
                    {t('dashboard.accounts.count', {
                      count: summaryData.totalAssets
                        ? summaryData.totalAssets.accountCount
                        : 0,
                    }).replace(/\d+\s*/, '')}
                  </p>
                </div>
              </div>

              {/* 总负债 */}
              <div
                className={`border rounded-lg p-6 ${resolvedTheme === 'dark' ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'}`}
              >
                <div className='flex items-center mb-3'>
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${resolvedTheme === 'dark' ? 'bg-red-800' : 'bg-red-100'}`}
                  >
                    <svg
                      className='h-5 w-5 text-red-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                      />
                    </svg>
                  </div>
                  <h3
                    className={`text-lg font-semibold ${resolvedTheme === 'dark' ? 'text-red-300' : 'text-red-700'}`}
                  >
                    {t('dashboard.total.liabilities.card')}
                  </h3>
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${resolvedTheme === 'dark' ? 'text-red-100' : 'text-red-900'}`}
                  >
                    {summaryData.totalLiabilities
                      ? formatCurrencyAmount(
                          summaryData.totalLiabilities.amount,
                          summaryData.totalLiabilities.currency
                        )
                      : formatCurrencyAmount(0, summaryData.netWorth.currency)}
                  </p>
                  <p
                    className={`text-xs mt-1 ${resolvedTheme === 'dark' ? 'text-red-400' : 'text-red-600'}`}
                  >
                    {summaryData.totalLiabilities
                      ? summaryData.totalLiabilities.accountCount
                      : 0}{' '}
                    {t('dashboard.accounts.count', {
                      count: summaryData.totalLiabilities
                        ? summaryData.totalLiabilities.accountCount
                        : 0,
                    }).replace(/\d+\s*/, '')}
                  </p>
                </div>
              </div>

              {/* 净资产 */}
              <div
                className={`border rounded-lg p-6 ${
                  summaryData.netWorth.amount >= 0
                    ? resolvedTheme === 'dark'
                      ? 'bg-green-900/20 border-green-700'
                      : 'bg-green-50 border-green-200'
                    : resolvedTheme === 'dark'
                      ? 'bg-red-900/20 border-red-700'
                      : 'bg-red-50 border-red-200'
                }`}
              >
                <div className='flex items-center mb-3'>
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                      summaryData.netWorth.amount >= 0
                        ? resolvedTheme === 'dark'
                          ? 'bg-green-800'
                          : 'bg-green-100'
                        : resolvedTheme === 'dark'
                          ? 'bg-red-800'
                          : 'bg-red-100'
                    }`}
                  >
                    <svg
                      className={`h-5 w-5 ${summaryData.netWorth.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                      />
                    </svg>
                  </div>
                  <h3
                    className={`text-lg font-semibold ${
                      summaryData.netWorth.amount >= 0
                        ? resolvedTheme === 'dark'
                          ? 'text-green-300'
                          : 'text-green-700'
                        : resolvedTheme === 'dark'
                          ? 'text-red-300'
                          : 'text-red-700'
                    }`}
                  >
                    {t('dashboard.net.worth.card')}
                  </h3>
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${
                      summaryData.netWorth.amount >= 0
                        ? resolvedTheme === 'dark'
                          ? 'text-green-100'
                          : 'text-green-900'
                        : resolvedTheme === 'dark'
                          ? 'text-red-100'
                          : 'text-red-900'
                    }`}
                  >
                    {summaryData.netWorth.amount >= 0 ? '+' : '-'}
                    {formatCurrencyAmount(
                      Math.abs(summaryData.netWorth.amount),
                      summaryData.netWorth.currency
                    )}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      summaryData.netWorth.amount >= 0
                        ? resolvedTheme === 'dark'
                          ? 'text-green-400'
                          : 'text-green-600'
                        : resolvedTheme === 'dark'
                          ? 'text-red-400'
                          : 'text-red-600'
                    }`}
                  >
                    {t('dashboard.assets.minus.liabilities')}
                  </p>
                </div>
              </div>

              {/* 本月现金流 */}
              <div
                className={`border rounded-lg p-6 ${resolvedTheme === 'dark' ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'}`}
              >
                <div className='flex items-center mb-3'>
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${resolvedTheme === 'dark' ? 'bg-purple-800' : 'bg-purple-100'}`}
                  >
                    <svg
                      className='h-5 w-5 text-purple-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                      />
                    </svg>
                  </div>
                  <h3
                    className={`text-lg font-semibold ${resolvedTheme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}
                  >
                    {t('dashboard.monthly.net.income')}
                  </h3>
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${
                      summaryData.recentActivity.summaryInBaseCurrency.net >= 0
                        ? resolvedTheme === 'dark'
                          ? 'text-green-100'
                          : 'text-green-900'
                        : resolvedTheme === 'dark'
                          ? 'text-red-100'
                          : 'text-red-900'
                    }`}
                  >
                    {summaryData.recentActivity.summaryInBaseCurrency.net >= 0
                      ? '+'
                      : '-'}
                    {formatCurrencyAmount(
                      Math.abs(
                        summaryData.recentActivity.summaryInBaseCurrency.net
                      ),
                      summaryData.recentActivity.baseCurrency
                    )}
                  </p>
                  <p
                    className={`text-xs mt-1 ${resolvedTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}
                  >
                    {t('time.last.days', {
                      days: summaryData.recentActivity.period,
                    })}
                  </p>
                </div>
                <div className='mt-3 space-y-1 text-xs'>
                  <div className='flex justify-between'>
                    <span
                      className={`${resolvedTheme === 'dark' ? 'text-green-400' : 'text-green-600'}`}
                    >
                      {t('dashboard.income.label')}
                    </span>
                    <span
                      className={`font-medium ${resolvedTheme === 'dark' ? 'text-green-300' : 'text-green-800'}`}
                    >
                      +
                      {formatCurrencyAmount(
                        summaryData.recentActivity.summaryInBaseCurrency.income,
                        summaryData.recentActivity.baseCurrency
                      )}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span
                      className={`${resolvedTheme === 'dark' ? 'text-red-400' : 'text-red-600'}`}
                    >
                      {t('dashboard.expense.label')}
                    </span>
                    <span
                      className={`font-medium ${resolvedTheme === 'dark' ? 'text-red-300' : 'text-red-800'}`}
                    >
                      -
                      {formatCurrencyAmount(
                        summaryData.recentActivity.summaryInBaseCurrency
                          .expense,
                        summaryData.recentActivity.baseCurrency
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div
                className={`text-center ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                <svg
                  className={`mx-auto h-12 w-12 ${resolvedTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                  />
                </svg>
                <p className='mt-2'>{t('dashboard.no.summary.data')}</p>
                <p className='text-sm'>
                  {t('dashboard.add.accounts.transactions.first')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 基础统计卡片 */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
          {/* 账户数量 */}
          <div
            className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
          >
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${resolvedTheme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}
                >
                  <svg
                    className='h-5 w-5 text-blue-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
                    />
                  </svg>
                </div>
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt
                    className={`text-sm font-medium truncate ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {t('dashboard.account.count')}
                  </dt>
                  <dd
                    className={`text-2xl font-semibold ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
                  >
                    {stats.accountCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* 交易数量 */}
          <div
            className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
          >
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${resolvedTheme === 'dark' ? 'bg-green-900' : 'bg-green-100'}`}
                >
                  <svg
                    className='h-5 w-5 text-green-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                    />
                  </svg>
                </div>
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt
                    className={`text-sm font-medium truncate ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {t('dashboard.transaction.records')}
                  </dt>
                  <dd
                    className={`text-2xl font-semibold ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
                  >
                    {stats.transactionCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* 分类数量 */}
          <div
            className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
          >
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${resolvedTheme === 'dark' ? 'bg-purple-900' : 'bg-purple-100'}`}
                >
                  <svg
                    className='h-5 w-5 text-purple-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z'
                    />
                  </svg>
                </div>
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt
                    className={`text-sm font-medium truncate ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {t('dashboard.category.count')}
                  </dt>
                  <dd
                    className={`text-2xl font-semibold ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
                  >
                    {stats.categoryCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div
          className={`rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
        >
          <h2
            className={`text-base sm:text-lg font-semibold mb-4 ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
          >
            {t('dashboard.quick.actions')}
          </h2>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
            <button
              onClick={() => handleQuickTransaction(TransactionType.INCOME)}
              className={`flex items-center justify-center px-4 py-3 border rounded-md text-sm font-medium transition-colors touch-manipulation ${
                resolvedTheme === 'dark'
                  ? 'border-green-700 text-green-300 bg-green-900/20 hover:bg-green-900/30'
                  : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
              }`}
            >
              <svg
                className='mr-2 h-5 w-5'
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
              {t('dashboard.record.income')}
            </button>
            <button
              onClick={() => handleQuickTransaction(TransactionType.EXPENSE)}
              className={`flex items-center justify-center px-4 py-3 border rounded-md text-sm font-medium transition-colors touch-manipulation ${
                resolvedTheme === 'dark'
                  ? 'border-red-700 text-red-300 bg-red-900/20 hover:bg-red-900/30'
                  : 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
              }`}
            >
              <svg
                className='mr-2 h-5 w-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M20 12H4'
                />
              </svg>
              {t('dashboard.record.expense')}
            </button>
            <button
              onClick={handleQuickBalanceUpdate}
              className={`flex items-center justify-center px-4 py-3 border rounded-md text-sm font-medium transition-colors touch-manipulation ${
                resolvedTheme === 'dark'
                  ? 'border-blue-700 text-blue-300 bg-blue-900/20 hover:bg-blue-900/30'
                  : 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100'
              }`}
            >
              <svg
                className='mr-2 h-5 w-5'
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
              {t('dashboard.update.balance')}
            </button>
          </div>
        </div>

        {/* 图表展示区域 */}
        <div className='space-y-6'>
          <h2
            className={`text-xl font-semibold mb-4 ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
          >
            {t('dashboard.financial.trend.analysis')}
          </h2>

          {isLoadingCharts ? (
            <div className='space-y-6'>
              <div
                className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
              >
                <div className='animate-pulse'>
                  <div
                    className={`h-4 rounded w-1/3 mb-4 ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}
                  ></div>
                  <div
                    className={`h-64 rounded ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}
                  ></div>
                </div>
              </div>
              <div
                className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
              >
                <div className='animate-pulse'>
                  <div
                    className={`h-4 rounded w-1/3 mb-4 ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}
                  ></div>
                  <div
                    className={`h-64 rounded ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}
                  ></div>
                </div>
              </div>
            </div>
          ) : chartData ? (
            <div className='space-y-6'>
              <NetWorthChart
                data={chartData.netWorthChart}
                currency={chartData.currency}
                loading={isLoadingCharts}
                error={chartError || undefined}
              />
              <CashFlowChart
                data={chartData.cashFlowChart}
                currency={chartData.currency}
              />
            </div>
          ) : (
            <div
              className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div
                className={`text-center ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                <svg
                  className={`mx-auto h-12 w-12 ${resolvedTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                  />
                </svg>
                <p className='mt-2'>{t('dashboard.no.chart.data')}</p>
                <p className='text-sm'>
                  {t('dashboard.add.accounts.transactions.first')}
                </p>
              </div>
            </div>
          )}

          {/* 数据质量评分 */}
          {validationResult && validationResult.score !== undefined && (
            <div className='mb-4 sm:mb-6'>
              <div
                className={`rounded-lg shadow p-4 sm:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
              >
                <div className='flex items-center justify-between mb-4'>
                  <h2
                    className={`text-xl font-semibold ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
                  >
                    {t('dashboard.data.quality.score')}
                  </h2>
                  <div className='flex items-center'>
                    <div
                      className={`text-2xl font-bold ${
                        validationResult.score >= 90
                          ? 'text-green-600'
                          : validationResult.score >= 70
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {validationResult.score}
                    </div>
                    <span
                      className={`ml-1 ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      /100
                    </span>
                  </div>
                </div>

                <div
                  className={`w-full rounded-full h-2 mb-4 ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}
                >
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      validationResult.score >= 90
                        ? 'bg-green-500'
                        : validationResult.score >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${validationResult.score}%` }}
                  ></div>
                </div>

                {validationResult.details && (
                  <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm'>
                    <div className='text-center'>
                      <div
                        className={`text-base sm:text-lg font-semibold ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
                      >
                        {validationResult.details.accountsChecked}
                      </div>
                      <div
                        className={`text-xs sm:text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        {t('dashboard.accounts.checked')}
                      </div>
                    </div>
                    <div className='text-center'>
                      <div
                        className={`text-base sm:text-lg font-semibold ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
                      >
                        {validationResult.details.transactionsChecked}
                      </div>
                      <div
                        className={`text-xs sm:text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        {t('dashboard.transactions.checked')}
                      </div>
                    </div>
                    <div className='text-center'>
                      <div className='text-base sm:text-lg font-semibold text-red-600'>
                        {validationResult.details.categoriesWithoutType}
                      </div>
                      <div
                        className={`text-xs sm:text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        {t('dashboard.categories.without.type')}
                      </div>
                    </div>
                    <div className='text-center'>
                      <div className='text-base sm:text-lg font-semibold text-red-600'>
                        {validationResult.details.invalidTransactions}
                      </div>
                      <div
                        className={`text-xs sm:text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        {t('dashboard.invalid.transactions')}
                      </div>
                    </div>
                    <div className='text-center col-span-2 sm:col-span-1'>
                      <div className='text-base sm:text-lg font-semibold text-yellow-600'>
                        {validationResult.details.businessLogicViolations}
                      </div>
                      <div
                        className={`text-xs sm:text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        {t('dashboard.business.logic.violations')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 快速交易表单模态框 */}
        <QuickFlowTransactionModal
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          onSuccess={handleTransactionSuccess}
          defaultType={defaultTransactionType}
        />

        {/* 快速余额更新模态框 */}
        <QuickBalanceUpdateModal
          isOpen={isBalanceUpdateModalOpen}
          onClose={() => setIsBalanceUpdateModalOpen(false)}
          onSuccess={handleTransactionSuccess}
        />
      </PageContainer>
    </TranslationLoader>
  )
}
