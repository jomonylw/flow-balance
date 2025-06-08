'use client'

import { useState, useEffect } from 'react'
import TransactionFormModal from '@/components/transactions/TransactionFormModal'
import QuickBalanceUpdateModal from '@/components/dashboard/QuickBalanceUpdateModal'
import NetWorthChart from './NetWorthChart'
import CashFlowChart from './CashFlowChart'
import SmartAccountSummary from './SmartAccountSummary'
import ExchangeRateAlert from './ExchangeRateAlert'
import PageContainer from '../ui/PageContainer'
import TranslationLoader from '../ui/TranslationLoader'
import { calculateAccountBalance } from '@/lib/account-balance'
import { validateAccountData, validateAccountDataWithI18n, validateChartData } from '@/lib/data-validation'
import { useLanguage } from '@/contexts/LanguageContext'

interface User {
  id: string
  email: string
}

interface Account {
  id: string
  name: string
  category: {
    id?: string
    name: string
    type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
  transactions?: Array<{
    type: 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT'
    amount: number
    currency: {
      code: string
      symbol: string
      name: string
    }
  }>
}

interface Category {
  id: string
  name: string
}

interface Currency {
  code: string
  name: string
  symbol: string
}

interface Tag {
  id: string
  name: string
  color?: string
}

interface Stats {
  accountCount: number
  transactionCount: number
  categoryCount: number
}

interface DashboardContentProps {
  user: User
  stats: Stats
  accounts: Account[]
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  baseCurrency: Currency
}

export default function DashboardContent({
  user,
  stats,
  accounts,
  categories,
  currencies,
  tags,
  baseCurrency
}: DashboardContentProps) {
  const { t } = useLanguage()
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [isBalanceUpdateModalOpen, setIsBalanceUpdateModalOpen] = useState(false)
  const [defaultTransactionType, setDefaultTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [chartData, setChartData] = useState<any>(null)
  const [isLoadingCharts, setIsLoadingCharts] = useState(true)
  const [chartError, setChartError] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [summaryData, setSummaryData] = useState<any>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)

  const handleQuickTransaction = (type: 'INCOME' | 'EXPENSE') => {
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
            console.warn('Chart data validation failed:', chartValidation.errors)
            setChartError(t('dashboard.chart.data.validation.failed', { errors: chartValidation.errors.join(', ') }))
          }
        } else {
          const errorData = await response.json()
          setChartError(errorData.error || t('dashboard.chart.data.fetch.failed'))
        }
      } catch (error) {
        console.error('Error fetching chart data:', error)
        setChartError(t('dashboard.network.error.charts'))
      } finally {
        setIsLoadingCharts(false)
      }
    }

    fetchChartData()
  }, [])

  // 验证账户数据
  useEffect(() => {
    const accountsForValidation = accounts.map(account => ({
      id: account.id,
      name: account.name,
      category: {
        id: account.id, // 使用账户 ID 作为分类 ID 的占位符
        name: account.category.name,
        type: account.category.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
      },
      transactions: (account.transactions || []).map((t, index) => ({
        id: `${account.id}-${index}`, // 生成假的交易 ID
        type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT',
        amount: t.amount,
        date: new Date().toISOString(), // 使用当前日期作为占位符
        description: '交易记录', // 使用默认描述
        currency: {
          code: t.currency.code,
          symbol: t.currency.symbol
        }
      }))
    }))

    const validation = validateAccountDataWithI18n(accountsForValidation, t)
    setValidationResult(validation)

    if (!validation.isValid) {
      console.warn('Account data validation failed:', validation.errors)
    }
  }, [accounts, t])

  // 计算账户余额
  const accountsWithBalances = accounts.map(account => {
    const accountData = {
      id: account.id,
      name: account.name,
      category: {
        name: account.category.name,
        type: account.category.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
      },
      transactions: (account.transactions || []).map(t => ({
        type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT',
        amount: t.amount, // amount已经是number类型了
        currency: t.currency
      }))
    }

    const balances = calculateAccountBalance(accountData)

    // 转换为原有格式
    const balancesRecord: Record<string, number> = {}
    Object.values(balances).forEach(balance => {
      balancesRecord[balance.currencyCode] = balance.amount
    })

    return {
      id: account.id,
      name: account.name,
      category: {
        id: account.category.id || account.id, // 使用账户 ID 作为分类 ID 的占位符
        name: account.category.name,
        type: account.category.type
      },
      balances: balancesRecord
    }
  })

  return (
    <TranslationLoader
      fallback={
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <PageContainer
        title={t('dashboard.title')}
        subtitle={t('dashboard.welcome', { email: user.email })}
      >

      {/* 汇率设置提醒 */}
      <ExchangeRateAlert className="mb-4 sm:mb-6" />

      {/* 数据质量评分 */}
      {validationResult && validationResult.score !== undefined && (
        <div className="mb-4 sm:mb-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{t('dashboard.data.quality.score')}</h3>
              <div className="flex items-center">
                <div className={`text-2xl font-bold ${
                  validationResult.score >= 90 ? 'text-green-600' :
                  validationResult.score >= 70 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {validationResult.score}
                </div>
                <span className="text-gray-500 ml-1">/100</span>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  validationResult.score >= 90 ? 'bg-green-500' :
                  validationResult.score >= 70 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${validationResult.score}%` }}
              ></div>
            </div>

            {validationResult.details && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold text-gray-900">{validationResult.details.accountsChecked}</div>
                  <div className="text-xs sm:text-sm text-gray-500">{t('dashboard.accounts.checked')}</div>
                </div>
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold text-gray-900">{validationResult.details.transactionsChecked}</div>
                  <div className="text-xs sm:text-sm text-gray-500">{t('dashboard.transactions.checked')}</div>
                </div>
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold text-red-600">{validationResult.details.categoriesWithoutType}</div>
                  <div className="text-xs sm:text-sm text-gray-500">{t('dashboard.categories.without.type')}</div>
                </div>
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold text-red-600">{validationResult.details.invalidTransactions}</div>
                  <div className="text-xs sm:text-sm text-gray-500">{t('dashboard.invalid.transactions')}</div>
                </div>
                <div className="text-center col-span-2 sm:col-span-1">
                  <div className="text-base sm:text-lg font-semibold text-yellow-600">{validationResult.details.businessLogicViolations}</div>
                  <div className="text-xs sm:text-sm text-gray-500">{t('dashboard.business.logic.violations')}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 数据验证提示 */}
      {validationResult && (!validationResult.isValid || validationResult.warnings.length > 0) && (
        <div className="mb-6">
          {!validationResult.isValid && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{t('dashboard.validation.errors')}</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {validationResult.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">{t('dashboard.validation.warnings')}</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {validationResult.warnings.map((warning: string, index: number) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {validationResult.suggestions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">{t('validation.optimization.suggestions')}</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {validationResult.suggestions.map((suggestion: string, index: number) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 智能财务统计 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t('dashboard.financial.overview')}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({t('dashboard.api.data.note')})
          </span>
        </h2>
        {isLoadingSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : summaryData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 总资产 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">{t('dashboard.total.assets.card')}</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {summaryData.netWorth.currency.symbol}
                    {(() => {
                      const assetAccounts = summaryData.accountBalances.filter((acc: any) => acc.category.type === 'ASSET')
                      const totalAssets = assetAccounts.reduce((sum: number, acc: any) => {
                        const balance = acc.balances[summaryData.netWorth.currency.code] || 0
                        return sum + Math.max(0, balance) // 只计算正余额
                      }, 0)
                      return totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    })()}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {summaryData.accountBalances.filter((acc: any) =>
                      acc.category.type === 'ASSET' &&
                      Object.values(acc.balances).some((balance: any) => Math.abs(balance) > 0.01)
                    ).length} {t('dashboard.accounts.count', { count: summaryData.accountBalances.filter((acc: any) =>
                      acc.category.type === 'ASSET' &&
                      Object.values(acc.balances).some((balance: any) => Math.abs(balance) > 0.01)
                    ).length }).replace(/\d+\s*/, '')}
                  </p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 总负债 */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">{t('dashboard.total.liabilities.card')}</p>
                  <p className="text-2xl font-bold text-red-900">
                    {summaryData.netWorth.currency.symbol}
                    {(() => {
                      const liabilityAccounts = summaryData.accountBalances.filter((acc: any) => acc.category.type === 'LIABILITY')
                      const totalLiabilities = liabilityAccounts.reduce((sum: number, acc: any) => {
                        const balance = acc.balances[summaryData.netWorth.currency.code] || 0
                        // 负债账户的余额：正数表示欠债，负数表示多付了
                        // 总负债应该显示所有正余额的总和（实际欠债金额）
                        return sum + Math.max(0, balance)
                      }, 0)
                      return totalLiabilities.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    })()}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {summaryData.accountBalances.filter((acc: any) =>
                      acc.category.type === 'LIABILITY' &&
                      Object.values(acc.balances).some((balance: any) => Math.abs(balance) > 0.01)
                    ).length} {t('dashboard.accounts.count', { count: summaryData.accountBalances.filter((acc: any) =>
                      acc.category.type === 'LIABILITY' &&
                      Object.values(acc.balances).some((balance: any) => Math.abs(balance) > 0.01)
                    ).length }).replace(/\d+\s*/, '')}
                  </p>
                </div>
                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 净资产 */}
            <div className={`${summaryData.netWorth.amount >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${summaryData.netWorth.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>{t('dashboard.net.worth.card')}</p>
                  <p className={`text-2xl font-bold ${summaryData.netWorth.amount >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    {summaryData.netWorth.amount >= 0 ? '+' : '-'}
                    {summaryData.netWorth.currency.symbol}
                    {Math.abs(summaryData.netWorth.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className={`text-xs mt-1 ${summaryData.netWorth.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {t('dashboard.assets.minus.liabilities')}
                  </p>
                </div>
                <div className={`h-8 w-8 ${summaryData.netWorth.amount >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                  <svg className={`h-5 w-5 ${summaryData.netWorth.amount >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 本月现金流 */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">{t('dashboard.monthly.net.income')}</p>
                  <p className={`text-2xl font-bold ${summaryData.recentActivity.summaryInBaseCurrency.net >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    {summaryData.recentActivity.summaryInBaseCurrency.net >= 0 ? '+' : ''}
                    {summaryData.recentActivity.baseCurrency.symbol}
                    {Math.abs(summaryData.recentActivity.summaryInBaseCurrency.net).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    {summaryData.recentActivity.period}
                  </p>
                </div>
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-600">{t('dashboard.income.label')}</span>
                  <span className="text-green-800 font-medium">
                    +{summaryData.recentActivity.baseCurrency.symbol}
                    {summaryData.recentActivity.summaryInBaseCurrency.income.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">{t('dashboard.expense.label')}</span>
                  <span className="text-red-800 font-medium">
                    -{summaryData.recentActivity.baseCurrency.symbol}
                    {summaryData.recentActivity.summaryInBaseCurrency.expense.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <SmartAccountSummary
            accounts={accountsWithBalances}
            baseCurrency={baseCurrency}
          />
        )}
      </div>

      {/* 基础统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* 账户数量 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {t('dashboard.account.count')}
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats.accountCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* 交易数量 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {t('dashboard.transaction.records')}
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats.transactionCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* 分类数量 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {t('dashboard.category.count')}
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats.categoryCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
          {t('dashboard.quick.actions')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => handleQuickTransaction('INCOME')}
            className="flex items-center justify-center px-4 py-3 border border-green-200 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors touch-manipulation"
          >
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('dashboard.record.income')}
          </button>
          <button
            onClick={() => handleQuickTransaction('EXPENSE')}
            className="flex items-center justify-center px-4 py-3 border border-red-200 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors touch-manipulation"
          >
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            {t('dashboard.record.expense')}
          </button>
          <button
            onClick={handleQuickBalanceUpdate}
            className="flex items-center justify-center px-4 py-3 border border-blue-200 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors touch-manipulation"
          >
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('dashboard.update.balance')}
          </button>
        </div>
      </div>

      {/* 图表展示区域 */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">
          📊 {t('dashboard.financial.trend.analysis')}
        </h2>

        {isLoadingCharts ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ) : chartData ? (
          <div className="space-y-6">
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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="mt-2">{t('dashboard.no.chart.data')}</p>
              <p className="text-sm">{t('dashboard.add.accounts.transactions.first')}</p>
            </div>
          </div>
        )}
      </div>

      {/* 功能状态 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          🎉 Flow Balance 功能状态
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-green-700 mb-2">✅ 已完成功能</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ 认证系统 - 登录、注册、登出</p>
              <p>✅ 主界面布局 - 顶部状态栏、侧边导航、主内容区</p>
              <p>✅ 数据库设计 - 完整的 Prisma Schema</p>
              <p>✅ API 路由 - 分类、账户、交易管理</p>
              <p>✅ 交易表单模态框 - 添加/编辑交易</p>
              <p>✅ <strong>存量流量概念区分</strong> - 正确的财务统计</p>
              <p>✅ <strong>分类设置功能</strong> - 账户类型管理</p>
              <p>✅ <strong>专业财务报表</strong> - 资产负债表、现金流量表</p>
              <p>✅ <strong>智能统计面板</strong> - 区分存量和流量数据</p>
              <p>✅ <strong>账户详情页面</strong> - 存量/流量差异化展示</p>
              <p>✅ <strong>分类汇总页面</strong> - 层级聚合统计</p>
              <p>✅ <strong>交易列表页面</strong> - 完整的交易管理</p>
              <p>✅ <strong>图表可视化</strong> - ECharts 集成完成</p>
              <p>✅ <strong>多币种汇率转换</strong> - 手动汇率设置</p>
              <p>✅ <strong>货币管理系统</strong> - 用户自定义可用货币</p>
              <p>✅ <strong>余额更新功能</strong> - 存量类账户专用</p>
              <p>✅ <strong>响应式设计</strong> - PC/移动端适配</p>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-blue-700 mb-2">🚧 开发中功能</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>🚧 数据导出功能 - PDF/Excel 报表导出</p>
              <p>🚧 预算管理 - 预算 vs 实际对比</p>
              <p>🚧 财务指标分析 - 关键指标计算</p>
              <p>🚧 数据备份恢复 - 云端同步</p>
              <p>🚧 高级图表 - 更多可视化选项</p>
              <p>🚧 自动分类 - AI 智能分类建议</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 新功能亮点</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• <strong>存量 vs 流量</strong>：正确区分资产负债（存量）和收入支出（流量）的统计方法</p>
            <p>• <strong>分类设置</strong>：可以为大类设置账户类型，子分类自动继承</p>
            <p>• <strong>专业报表</strong>：标准的个人资产负债表和现金流量表</p>
            <p>• <strong>智能面板</strong>：根据账户类型显示不同的统计信息和录入选项</p>
            <p>• <strong>多币种支持</strong>：完整的货币管理和汇率转换系统</p>
            <p>• <strong>差异化操作</strong>：存量类账户"更新余额"，流量类账户"添加交易"</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">🎯 最新完成功能</h4>
          <div className="text-sm text-green-800 space-y-1">
            <p>• <strong>业务流程优化</strong>：全面审查并优化存量流量处理逻辑</p>
            <p>• <strong>数据一致性</strong>：统一余额计算，确保图表数据准确性</p>
            <p>• <strong>用户体验提升</strong>：智能化操作界面，类型特定的视觉反馈</p>
            <p>• <strong>货币管理完善</strong>：用户可自定义货币，支持手动汇率设置</p>
            <p>• <strong>专业财务工具</strong>：企业级个人财务管理功能</p>
          </div>
        </div>
      </div>

      {/* 交易表单模态框 */}
      <TransactionFormModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={handleTransactionSuccess}
        accounts={accounts.map(account => ({
          ...account,
          category: {
            id: account.category.id || account.id, // 使用账户 ID 作为分类 ID 的占位符
            name: account.category.name,
            type: account.category.type
          }
        }))}
        categories={categories}
        currencies={currencies}
        tags={tags}
        defaultType={defaultTransactionType}
      />

      {/* 快速余额更新模态框 */}
      <QuickBalanceUpdateModal
        isOpen={isBalanceUpdateModalOpen}
        onClose={() => setIsBalanceUpdateModalOpen(false)}
        onSuccess={handleTransactionSuccess}
        accounts={accountsWithBalances}
        currencies={currencies}
        baseCurrency={baseCurrency}
      />
    </PageContainer>
    </TranslationLoader>
  )
}
