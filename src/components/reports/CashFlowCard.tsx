'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'
import WithTranslation from '@/components/ui/WithTranslation'

// 个人现金流量表数据类型
interface Currency {
  code: string
  symbol: string
  name: string
}

interface Transaction {
  id: string
  amount: number
  description: string
  date: string
  type: 'INCOME' | 'EXPENSE'
}

interface AccountSummary {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  categoryName: string
  currency: Currency
  totalAmount: number
  transactionCount: number
  transactions: Transaction[]
}

interface CurrencyTotal {
  currency: Currency
  totalIncome: number
  totalExpense: number
  netCashFlow: number
}

interface PersonalCashFlowResponse {
  period: {
    start: string
    end: string
  }
  baseCurrency: Currency
  cashFlow: {
    incomeAccounts: AccountSummary[]
    expenseAccounts: AccountSummary[]
  }
  summary: {
    currencyTotals: Record<string, CurrencyTotal>
    baseCurrencyTotals?: {
      totalIncome: number
      totalExpense: number
      netCashFlow: number
    }
    totalTransactions: number
  }
}

export default function CashFlowCard() {
  const { t, language } = useLanguage()
  const [data, setData] = useState<PersonalCashFlowResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    // 创建当月1号的日期字符串，然后解析为Date对象
    const firstDayString = `${year}-${String(month + 1).padStart(2, '0')}-01`
    return new Date(firstDayString)
  })
  const [endDate, setEndDate] = useState<Date>(new Date())

  // Get the appropriate locale for date formatting
  const dateLocale = language === 'zh' ? zhCN : enUS

  const fetchCashFlow = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/reports/personal-cash-flow?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error(t('reports.cash.flow.fetch.error'), error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, t])

  useEffect(() => {
    fetchCashFlow()
  }, [fetchCashFlow])

  const formatCurrency = (amount: number, currency: Currency) => {
    const locale = language === 'zh' ? 'zh-CN' : 'en-US'
    return `${currency.symbol}${amount.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  const renderAccountSection = (
    title: string,
    accounts: AccountSummary[],
    titleColor: string
  ) => (
    <div className="mb-6">
      <h4 className={`font-semibold text-lg mb-4 ${titleColor} dark:opacity-90`}>{title}</h4>

      {accounts.length === 0 ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          {t('reports.cash.flow.no.data')}
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map(account => (
            <div key={account.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-gray-100">{account.name}</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{account.categoryName}</p>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${account.type === 'INCOME' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(account.totalAmount, account.currency)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {account.transactionCount} {language === 'zh' ? '笔交易' : 'transactions'}
                  </div>
                </div>
              </div>

              {/* 显示最近的几笔交易 */}
              {account.transactions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
                  <div className="space-y-1">
                    {account.transactions.slice(0, 3).map(transaction => (
                      <div key={transaction.id} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
                          {transaction.description}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs mr-2">
                          {format(new Date(transaction.date), language === 'zh' ? 'MM/dd' : 'MM/dd')}
                        </span>
                        <span className={`font-medium ${account.type === 'INCOME' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(transaction.amount, account.currency)}
                        </span>
                      </div>
                    ))}
                    {account.transactions.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                        {language === 'zh' ? `还有 ${account.transactions.length - 3} 笔交易...` : `${account.transactions.length - 3} more transactions...`}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (!data) {
    return (
      <WithTranslation>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t('reports.cash.flow.title')}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCashFlow}
                disabled={loading}
                title={t('reports.cash.flow.refresh')}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {loading ? t('reports.cash.flow.loading') : t('reports.cash.flow.no.data')}
            </div>
          </CardContent>
        </Card>
      </WithTranslation>
    )
  }

  return (
    <WithTranslation>
      <Card className='mt-4'>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('reports.cash.flow.title')}</CardTitle>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <span className="text-gray-500 dark:text-gray-400">{t('reports.cash.flow.to')}</span>
              <input
                type="date"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCashFlow}
                disabled={loading}
                title={t('reports.cash.flow.refresh')}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" title={t('reports.cash.flow.download')}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('reports.cash.flow.period')}: {format(new Date(data.period.start), language === 'zh' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy', { locale: dateLocale })} {t('reports.cash.flow.to')}{' '}
            {format(new Date(data.period.end), language === 'zh' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy', { locale: dateLocale })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Income Accounts */}
            {renderAccountSection(
              t('reports.cash.flow.income'),
              data.cashFlow.incomeAccounts,
              'text-green-600 dark:text-green-400'
            )}

            {/* Expense Accounts */}
            {renderAccountSection(
              t('reports.cash.flow.expense'),
              data.cashFlow.expenseAccounts,
              'text-red-600 dark:text-red-400'
            )}

            {/* Net Cash Flow for the Period */}
            <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between font-bold text-lg">
                <span className="text-gray-900 dark:text-gray-100">{t('reports.cash.flow.net.cash.flow')}</span>
                <div>
                  {Object.entries(data.summary.currencyTotals).map(([currencyCode, currencyTotal]) => (
                    <div key={currencyCode} className={currencyTotal.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {currencyTotal.netCashFlow >= 0 ? '+' : ''}{formatCurrency(currencyTotal.netCashFlow, currencyTotal.currency)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Base Currency Summary */}
              {data.summary.baseCurrencyTotals && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
                  <div className="flex justify-between font-semibold text-base">
                    <span className="text-gray-700 dark:text-gray-300">
                      {t('reports.cash.flow.base.currency.total')} ({data.baseCurrency.code})
                    </span>
                    <div className={data.summary.baseCurrencyTotals.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {data.summary.baseCurrencyTotals.netCashFlow >= 0 ? '+' : ''}{formatCurrency(data.summary.baseCurrencyTotals.netCashFlow, data.baseCurrency)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary Information */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">{t('reports.cash.flow.summary')}</h4>

            {/* Original Currency Breakdown */}
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('reports.cash.flow.total.income')}</span>
                <div className="font-semibold">
                  {Object.entries(data.summary.currencyTotals).map(([currencyCode, currencyTotal]) => (
                    <div key={currencyCode} className="text-green-600 dark:text-green-400">
                      +{formatCurrency(currencyTotal.totalIncome, currencyTotal.currency)}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('reports.cash.flow.total.expense')}</span>
                <div className="font-semibold">
                  {Object.entries(data.summary.currencyTotals).map(([currencyCode, currencyTotal]) => (
                    <div key={currencyCode} className="text-red-600 dark:text-red-400">
                      -{formatCurrency(currencyTotal.totalExpense, currencyTotal.currency)}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('reports.cash.flow.net.summary')}</span>
                <div className="font-semibold">
                  {Object.entries(data.summary.currencyTotals).map(([currencyCode, currencyTotal]) => (
                    <div key={currencyCode} className={currencyTotal.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {currencyTotal.netCashFlow >= 0 ? '+' : ''}{formatCurrency(currencyTotal.netCashFlow, currencyTotal.currency)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Base Currency Summary */}
            {data.summary.baseCurrencyTotals && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('reports.cash.flow.total.income')} ({data.baseCurrency.code})
                    </span>
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      +{formatCurrency(data.summary.baseCurrencyTotals.totalIncome, data.baseCurrency)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('reports.cash.flow.total.expense')} ({data.baseCurrency.code})
                    </span>
                    <div className="font-semibold text-red-600 dark:text-red-400">
                      -{formatCurrency(data.summary.baseCurrencyTotals.totalExpense, data.baseCurrency)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('reports.cash.flow.net.summary')} ({data.baseCurrency.code})
                    </span>
                    <div className={`font-semibold ${data.summary.baseCurrencyTotals.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {data.summary.baseCurrencyTotals.netCashFlow >= 0 ? '+' : ''}{formatCurrency(data.summary.baseCurrencyTotals.netCashFlow, data.baseCurrency)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </WithTranslation>
  )
}
