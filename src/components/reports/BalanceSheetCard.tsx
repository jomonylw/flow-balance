'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Download, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

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
  const [data, setData] = useState<BalanceSheetResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [asOfDate, setAsOfDate] = useState<Date>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const fetchBalanceSheet = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/balance-sheet?asOfDate=${asOfDate.toISOString()}`)
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('获取资产负债表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalanceSheet()
  }, [asOfDate])

  const formatCurrency = (amount: number, currency: Currency) => {
    return `${currency.symbol}${amount.toLocaleString('zh-CN', { 
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
      <h4 className="font-semibold text-lg mb-3 text-gray-700">{title}</h4>
      {Object.entries(accounts).map(([currencyCode, { accounts: accountList, total }]) => (
        <div key={currencyCode} className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-gray-600">{currencyCode}</span>
            <span className="font-semibold">
              {formatCurrency(total, accountList[0]?.currency || baseCurrency)}
            </span>
          </div>
          <div className="ml-4 space-y-1">
            {accountList.map(account => (
              <div key={account.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{account.name}</span>
                <span>{formatCurrency(account.balance, account.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            个人资产负债表
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBalanceSheet}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            {loading ? '加载中...' : '暂无数据'}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>个人资产负债表</CardTitle>
          <div className="flex gap-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(asOfDate, 'yyyy年MM月dd日', { locale: zhCN })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={asOfDate}
                  onSelect={(date) => {
                    if (date) {
                      setAsOfDate(date)
                      setIsCalendarOpen(false)
                    }
                  }}
                  locale={zhCN}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBalanceSheet}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          截至 {format(new Date(data.asOfDate), 'yyyy年MM月dd日', { locale: zhCN })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 资产部分 */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-blue-600">资产 (Assets)</h3>
            
            {renderAccountSection(
              '流动资产', 
              data.balanceSheet.assets.current, 
              data.baseCurrency
            )}
            
            {renderAccountSection(
              '非流动资产', 
              data.balanceSheet.assets.nonCurrent, 
              data.baseCurrency
            )}
            
            <div className="border-t pt-3">
              <div className="flex justify-between font-bold text-lg">
                <span>资产总计</span>
                <div>
                  {Object.entries(data.balanceSheet.assets.total).map(([currencyCode, total]) => (
                    <div key={currencyCode}>
                      {formatCurrency(total, data.baseCurrency)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 负债和所有者权益部分 */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-red-600">负债 (Liabilities)</h3>
            
            {renderAccountSection(
              '流动负债', 
              data.balanceSheet.liabilities.current, 
              data.baseCurrency
            )}
            
            {renderAccountSection(
              '非流动负债', 
              data.balanceSheet.liabilities.nonCurrent, 
              data.baseCurrency
            )}
            
            <div className="border-t pt-3 mb-6">
              <div className="flex justify-between font-bold">
                <span>负债总计</span>
                <div>
                  {Object.entries(data.balanceSheet.liabilities.total).map(([currencyCode, total]) => (
                    <div key={currencyCode}>
                      {formatCurrency(total, data.baseCurrency)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-4 text-green-600">所有者权益 (Equity)</h3>
            <div className="border-t pt-3">
              <div className="flex justify-between font-bold text-lg">
                <span>净资产</span>
                <div>
                  {Object.entries(data.balanceSheet.equity).map(([currencyCode, equity]) => (
                    <div key={currencyCode} className={equity >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(equity, data.baseCurrency)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 汇总信息 */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">财务状况摘要</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">总资产:</span>
              <div className="font-semibold">
                {Object.entries(data.summary.totalAssets).map(([currencyCode, total]) => (
                  <div key={currencyCode}>
                    {formatCurrency(total, data.baseCurrency)}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-gray-600">总负债:</span>
              <div className="font-semibold">
                {Object.entries(data.summary.totalLiabilities).map(([currencyCode, total]) => (
                  <div key={currencyCode}>
                    {formatCurrency(total, data.baseCurrency)}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-gray-600">净资产:</span>
              <div className="font-semibold">
                {Object.entries(data.summary.netWorth).map(([currencyCode, netWorth]) => (
                  <div key={currencyCode} className={netWorth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(netWorth, data.baseCurrency)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
