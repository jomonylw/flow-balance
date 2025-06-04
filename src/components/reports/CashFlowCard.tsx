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

interface TransactionInfo {
  id: string
  date: string
  description: string
  amount: number
  account: string
}

interface CategoryFlow {
  amount: number
  transactions: TransactionInfo[]
}

interface ActivityFlow {
  inflows: Record<string, { categories: Record<string, CategoryFlow>, total: number }>
  outflows: Record<string, { categories: Record<string, CategoryFlow>, total: number }>
  net: Record<string, number>
}

interface CashFlowData {
  operatingActivities: ActivityFlow
  investingActivities: ActivityFlow
  financingActivities: ActivityFlow
  netCashFlow: Record<string, number>
}

interface CashFlowResponse {
  cashFlow: CashFlowData
  period: {
    start: string
    end: string
  }
  baseCurrency: Currency
  summary: {
    operatingCashFlow: Record<string, number>
    investingCashFlow: Record<string, number>
    financingCashFlow: Record<string, number>
    netCashFlow: Record<string, number>
  }
}

export default function CashFlowCard() {
  const [data, setData] = useState<CashFlowResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false)
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false)

  const fetchCashFlow = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/reports/cash-flow?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('获取现金流量表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCashFlow()
  }, [startDate, endDate])

  const formatCurrency = (amount: number, currency: Currency) => {
    return `${currency.symbol}${amount.toLocaleString('zh-CN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  const renderActivitySection = (
    title: string,
    activity: ActivityFlow,
    baseCurrency: Currency,
    color: string
  ) => (
    <div className="mb-8">
      <h4 className={`font-semibold text-lg mb-4 ${color}`}>{title}</h4>
      
      {/* 现金流入 */}
      <div className="mb-4">
        <h5 className="font-medium text-green-600 mb-2">现金流入</h5>
        {Object.entries(activity.inflows).map(([currencyCode, { categories, total }]) => (
          <div key={currencyCode} className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-600">{currencyCode}</span>
              <span className="font-semibold text-green-600">
                +{formatCurrency(total, baseCurrency)}
              </span>
            </div>
            <div className="ml-4 space-y-1">
              {Object.entries(categories).map(([categoryName, categoryFlow]) => (
                <div key={categoryName} className="flex justify-between text-sm">
                  <span className="text-gray-600">{categoryName}</span>
                  <span className="text-green-600">
                    +{formatCurrency(categoryFlow.amount, baseCurrency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 现金流出 */}
      <div className="mb-4">
        <h5 className="font-medium text-red-600 mb-2">现金流出</h5>
        {Object.entries(activity.outflows).map(([currencyCode, { categories, total }]) => (
          <div key={currencyCode} className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-600">{currencyCode}</span>
              <span className="font-semibold text-red-600">
                -{formatCurrency(total, baseCurrency)}
              </span>
            </div>
            <div className="ml-4 space-y-1">
              {Object.entries(categories).map(([categoryName, categoryFlow]) => (
                <div key={categoryName} className="flex justify-between text-sm">
                  <span className="text-gray-600">{categoryName}</span>
                  <span className="text-red-600">
                    -{formatCurrency(categoryFlow.amount, baseCurrency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 净现金流 */}
      <div className="border-t pt-3">
        <div className="flex justify-between font-bold">
          <span>净现金流</span>
          <div>
            {Object.entries(activity.net).map(([currencyCode, net]) => (
              <div key={currencyCode} className={net >= 0 ? 'text-green-600' : 'text-red-600'}>
                {net >= 0 ? '+' : ''}{formatCurrency(net, baseCurrency)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            个人现金流量表
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCashFlow}
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
          <CardTitle>个人现金流量表</CardTitle>
          <div className="flex gap-2">
            <Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(startDate, 'MM/dd', { locale: zhCN })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    if (date) {
                      setStartDate(date)
                      setIsStartCalendarOpen(false)
                    }
                  }}
                  locale={zhCN}
                />
              </PopoverContent>
            </Popover>
            <span className="text-gray-500">至</span>
            <Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(endDate, 'MM/dd', { locale: zhCN })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    if (date) {
                      setEndDate(date)
                      setIsEndCalendarOpen(false)
                    }
                  }}
                  locale={zhCN}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCashFlow}
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
          期间: {format(new Date(data.period.start), 'yyyy年MM月dd日', { locale: zhCN })} 至{' '}
          {format(new Date(data.period.end), 'yyyy年MM月dd日', { locale: zhCN })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 经营活动现金流 */}
          {renderActivitySection(
            '经营活动现金流量',
            data.cashFlow.operatingActivities,
            data.baseCurrency,
            'text-blue-600'
          )}

          {/* 投资活动现金流 */}
          {renderActivitySection(
            '投资活动现金流量',
            data.cashFlow.investingActivities,
            data.baseCurrency,
            'text-purple-600'
          )}

          {/* 筹资活动现金流 */}
          {renderActivitySection(
            '筹资活动现金流量',
            data.cashFlow.financingActivities,
            data.baseCurrency,
            'text-orange-600'
          )}

          {/* 总净现金流 */}
          <div className="border-t-2 pt-4">
            <div className="flex justify-between font-bold text-lg">
              <span>本期净现金流量</span>
              <div>
                {Object.entries(data.cashFlow.netCashFlow).map(([currencyCode, netFlow]) => (
                  <div key={currencyCode} className={netFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow, data.baseCurrency)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 汇总信息 */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">现金流量摘要</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">经营现金流:</span>
              <div className="font-semibold">
                {Object.entries(data.summary.operatingCashFlow).map(([currencyCode, flow]) => (
                  <div key={currencyCode} className={flow >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {flow >= 0 ? '+' : ''}{formatCurrency(flow, data.baseCurrency)}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-gray-600">投资现金流:</span>
              <div className="font-semibold">
                {Object.entries(data.summary.investingCashFlow).map(([currencyCode, flow]) => (
                  <div key={currencyCode} className={flow >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {flow >= 0 ? '+' : ''}{formatCurrency(flow, data.baseCurrency)}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-gray-600">筹资现金流:</span>
              <div className="font-semibold">
                {Object.entries(data.summary.financingCashFlow).map(([currencyCode, flow]) => (
                  <div key={currencyCode} className={flow >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {flow >= 0 ? '+' : ''}{formatCurrency(flow, data.baseCurrency)}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-gray-600">净现金流:</span>
              <div className="font-semibold">
                {Object.entries(data.summary.netCashFlow).map(([currencyCode, flow]) => (
                  <div key={currencyCode} className={flow >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {flow >= 0 ? '+' : ''}{formatCurrency(flow, data.baseCurrency)}
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
