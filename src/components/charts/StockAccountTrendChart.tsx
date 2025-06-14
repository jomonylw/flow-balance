'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as echarts from 'echarts'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'

import { TrendDataPoint } from '@/types/transaction'

interface Currency {
  code: string
  symbol: string
  name: string
}

interface Account {
  id: string
  name: string
  type: string
}

type TimeRange = 'lastMonth' | 'lastYear' | 'all'

interface StockAccountTrendChartProps {
  trendData: TrendDataPoint[]
  account: Account
  displayCurrency: Currency
  height?: number
  timeRange: TimeRange
  setTimeRange: (range: TimeRange) => void
  isLoading: boolean
}

export default function StockAccountTrendChart({
  trendData,
  account,
  displayCurrency,
  height = 400,
  timeRange,
  setTimeRange,
  isLoading
}: StockAccountTrendChartProps) {
  const { t, isLoading: langLoading } = useLanguage()
  const { resolvedTheme } = useTheme()

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || langLoading) {
      return
    }

    const chart = echarts.init(chartRef.current, resolvedTheme === 'dark' ? 'dark' : null)
    chartInstance.current = chart

    const handleResize = () => {
      chart.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [resolvedTheme, langLoading])

  const renderChart = useCallback(() => {
    if (!chartInstance.current || langLoading || !trendData) {
      return
    }

    if (trendData.length === 0) {
      chartInstance.current.clear()
      return
    }
    const dates = trendData.map(item => item.date)
    const balances = trendData.map(item => item.originalAmount || 0)
    console.log('Chart dates:', dates)
    console.log('Chart balances:', balances)

    // 获取原币种信息，优先使用第一个数据点的原币种
    const originalCurrency = trendData.length > 0 ? trendData[0].originalCurrency : displayCurrency.code
    // 创建一个简单的货币符号映射
    const getCurrencySymbol = (currencyCode: string) => {
      const symbolMap: Record<string, string> = {
        'CNY': '¥',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'HKD': 'HK$',
        'TWD': 'NT$',
        'KRW': '₩',
        'SGD': 'S$',
        'AUD': 'A$',
        'CAD': 'C$',
        'CHF': 'CHF',
        'SEK': 'kr',
        'NOK': 'kr',
        'DKK': 'kr',
        'RUB': '₽',
        'INR': '₹',
        'BRL': 'R$',
        'MXN': '$',
        'ZAR': 'R',
        'THB': '฿',
        'MYR': 'RM',
        'IDR': 'Rp',
        'PHP': '₱',
        'VND': '₫'
      }
      return symbolMap[currencyCode] || currencyCode
    }

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      title: {
        text: t('chart.balance.change.trend'),
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
        }
      },
      tooltip: {
        trigger: 'axis',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params
          if (!param) {
            return ''
          }
          const dataIndex = param.dataIndex
          const item = trendData[dataIndex]
          const itemCurrencySymbol = getCurrencySymbol(item?.originalCurrency || originalCurrency)

          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${param.axisValue}</div>
              <div style="color: #3b82f6;">
                ${t('chart.balance.amount')}: ${itemCurrencySymbol}${(param.value as number).toLocaleString()}
              </div>
              <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">
                ${t('account.transactions')}: ${item?.transactionCount ?? 0}
              </div>
              ${item?.hasConversionError
                ? `<div style="color: #ef4444; font-size: 12px;">${t('currency.conversion.error')}</div>`
                : ''
              }
            </div>
          `
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          formatter: function (value: string) {
            if (timeRange === 'lastMonth') {
              // 日期格式：显示月-日
              const date = new Date(value)
              return `${date.getMonth() + 1}/${date.getDate()}`
            } else {
              // 月份格式：显示年/月
              return value.replace('-', '/')
            }
          }
        },
        axisLine: {
          lineStyle: {
            color: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: t('chart.balance.amount.original.currency'),
        nameTextStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
        },
        axisLabel: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          formatter: function (value: number) {
            const currencySymbol = getCurrencySymbol(originalCurrency)
            if (Math.abs(value) >= 10000) {
              return `${currencySymbol}${(value / 10000).toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}万`
            } else if (Math.abs(value) >= 1000) {
              return `${currencySymbol}${(value / 1000).toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
            }
            return `${currencySymbol}${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
          }
        },
        axisLine: {
          lineStyle: {
            color: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb'
          }
        },
        splitLine: {
          lineStyle: {
            color: resolvedTheme === 'dark' ? '#374151' : '#f3f4f6'
          }
        }
      },
      series: [
        {
          name: t('chart.balance.amount'),
          type: 'line',
          smooth: true,
          data: balances,
          lineStyle: {
            color: '#3b82f6',
            width: 3
          },
          itemStyle: {
            color: '#3b82f6'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
              ]
            }
          },
          symbol: 'circle',
          symbolSize: 6,
          emphasis: {
            itemStyle: {
              borderColor: '#3b82f6',
              borderWidth: 2
            }
          }
        }
      ]
    }

    chartInstance.current.setOption(option)
  }, [trendData, displayCurrency, resolvedTheme, t, timeRange, langLoading])

  useEffect(() => {
    if (chartInstance.current && !isLoading) {
      renderChart()
    }
  }, [isLoading, renderChart, trendData, resolvedTheme])

  if (langLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{account.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('chart.stock.account.trend.description')}
            </p>
          </div>
          <div className="flex space-x-2">
            {(['lastMonth', 'lastYear', 'all'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t(`chart.range.${range.replace(/([A-Z])/g, '.$1').toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 relative" style={{ height: `${height - 100}px` }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 z-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">{t('chart.loading')}</p>
            </div>
          </div>
        )}
        {!isLoading && (!trendData || trendData.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <p className="text-gray-500 dark:text-gray-400">{t('chart.no.balance.data')}</p>
          </div>
        )}
        <div
          ref={chartRef}
          style={{
            width: '100%',
            height: '100%',
            visibility: isLoading ? 'hidden' : 'visible'
          }}
        />
      </div>
    </div>
  )
}
