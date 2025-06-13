'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Download, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'
import WithTranslation from '@/components/ui/WithTranslation'

interface Currency {
  code: string
  symbol: string
  name: string
}

interface AccountInfo {
  id: string
  name: string
  category: string
  balance: number
  currency: Currency
}

interface BalanceSheetData {
  assets: {
    current: Record<string, { accounts: AccountInfo[], total: number }>
    nonCurrent: Record<string, { accounts: AccountInfo[], total: number }>
    total: Record<string, number>
  }
  liabilities: {
    current: Record<string, { accounts: AccountInfo[], total: number }>
    nonCurrent: Record<string, { accounts: AccountInfo[], total: number }>
    total: Record<string, number>
  }
  equity: Record<string, number>
}

interface BalanceSheetResponse {
  balanceSheet: BalanceSheetData
  asOfDate: string
  baseCurrency: Currency
  summary: {
    totalAssets: Record<string, number>
    totalLiabilities: Record<string, number>
    netWorth: Record<string, number>
  }
}

export default function BalanceSheetCard() {
  const { t, language } = useLanguage()
  const [data, setData] = useState<BalanceSheetResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [asOfDate, setAsOfDate] = useState<Date>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Get the appropriate locale for date formatting
  const dateLocale = language === 'zh' ? zhCN : enUS

  const fetchBalanceSheet = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/balance-sheet?asOfDate=${asOfDate.toISOString()}`)
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error(t('reports.balance.sheet.fetch.error'), error)
    } finally {
      setLoading(false)
    }
  }, [asOfDate, t])

  useEffect(() => {
    fetchBalanceSheet()
  }, [asOfDate, fetchBalanceSheet])

  const formatCurrency = (amount: number, currency: Currency) => {
    const locale = language === 'zh' ? 'zh-CN' : 'en-US'
    return `${currency.symbol}${amount.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  const renderAccountSection = (
    title: string,
    accounts: Record<string, { accounts: AccountInfo[], total: number }>,
    baseCurrency: Currency
  ) => (
    <div className="mb-6">
      <h4 className="font-semibold text-lg mb-3 text-gray-700 dark:text-gray-300">{title}</h4>
      {Object.entries(accounts).map(([currencyCode, { accounts: accountList, total }]) => (
        <div key={currencyCode} className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-gray-600 dark:text-gray-400">{currencyCode}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(total, accountList[0]?.currency || baseCurrency)}
            </span>
          </div>
          <div className="ml-4 space-y-1">
            {accountList.map(account => (
              <div key={account.id} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{account.name}</span>
                <span className="text-gray-900 dark:text-gray-100">{formatCurrency(account.balance, account.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  if (!data) {
    return (
      <WithTranslation>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t('reports.balance.sheet.title')}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBalanceSheet}
                disabled={loading}
                title={t('reports.balance.sheet.refresh')}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {loading ? t('reports.balance.sheet.loading') : t('reports.balance.sheet.no.data')}
            </div>
          </CardContent>
        </Card>
      </WithTranslation>
    )
  }

  return (
    <WithTranslation>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('reports.balance.sheet.title')}</CardTitle>
            <div className="flex gap-2">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(asOfDate, language === 'zh' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy', { locale: dateLocale })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={asOfDate}
                    onSelect={(date) => {
                      if (date) {
                        setAsOfDate(Array.isArray(date) ? date[0] : date)
                        setIsCalendarOpen(false)
                      }
                    }}
                    locale={dateLocale}
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBalanceSheet}
                disabled={loading}
                title={t('reports.balance.sheet.refresh')}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" title={t('reports.balance.sheet.download')}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('reports.balance.sheet.as.of')} {format(new Date(data.asOfDate), language === 'zh' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy', { locale: dateLocale })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Assets Section */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">
                {t('reports.assets')}
              </h3>

              {renderAccountSection(
                t('reports.balance.sheet.current.assets'),
                data.balanceSheet.assets.current,
                data.baseCurrency
              )}

              {renderAccountSection(
                t('reports.balance.sheet.non.current.assets'),
                data.balanceSheet.assets.nonCurrent,
                data.baseCurrency
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-gray-900 dark:text-gray-100">{t('reports.balance.sheet.total.assets')}</span>
                  <div>
                    {Object.entries(data.balanceSheet.assets.total).map(([currencyCode, total]) => (
                      <div key={currencyCode} className="text-gray-900 dark:text-gray-100">
                        {formatCurrency(total, data.baseCurrency)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Liabilities and Equity Section */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">
                {t('reports.liabilities')}
              </h3>

              {renderAccountSection(
                t('reports.balance.sheet.current.liabilities'),
                data.balanceSheet.liabilities.current,
                data.baseCurrency
              )}

              {renderAccountSection(
                t('reports.balance.sheet.non.current.liabilities'),
                data.balanceSheet.liabilities.nonCurrent,
                data.baseCurrency
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-6">
                <div className="flex justify-between font-bold">
                  <span className="text-gray-900 dark:text-gray-100">{t('reports.balance.sheet.total.liabilities')}</span>
                  <div>
                    {Object.entries(data.balanceSheet.liabilities.total).map(([currencyCode, total]) => (
                      <div key={currencyCode} className="text-red-600 dark:text-red-400">
                        {formatCurrency(total, data.baseCurrency)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-4 text-green-600 dark:text-green-400">
                {t('reports.balance.sheet.equity')}
              </h3>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-gray-900 dark:text-gray-100">{t('reports.balance.sheet.net.assets')}</span>
                  <div>
                    {Object.entries(data.balanceSheet.equity).map(([currencyCode, equity]) => (
                      <div key={currencyCode} className={equity >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {formatCurrency(equity, data.baseCurrency)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">{t('reports.balance.sheet.financial.summary')}</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('reports.balance.sheet.total.assets.summary')}</span>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {Object.entries(data.summary.totalAssets).map(([currencyCode, total]) => (
                    <div key={currencyCode}>
                      {formatCurrency(total, data.baseCurrency)}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('reports.balance.sheet.total.liabilities.summary')}</span>
                <div className="font-semibold text-red-600 dark:text-red-400">
                  {Object.entries(data.summary.totalLiabilities).map(([currencyCode, total]) => (
                    <div key={currencyCode}>
                      {formatCurrency(total, data.baseCurrency)}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('reports.balance.sheet.net.worth.summary')}</span>
                <div className="font-semibold">
                  {Object.entries(data.summary.netWorth).map(([currencyCode, netWorth]) => (
                    <div key={currencyCode} className={netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {formatCurrency(netWorth, data.baseCurrency)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </WithTranslation>
  )
}
