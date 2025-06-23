'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as echarts from 'echarts'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import { useTheme } from '@/contexts/providers/ThemeContext'
import ColorManager from '@/lib/utils/color'
import { CHART } from '@/lib/constants/app-config'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import { AccountType } from '@/types/core/constants'

import type {
  TrendDataPoint,
  SimpleCurrency,
  SimpleAccount,
  TimeRange,
} from '@/types/core'

interface StockAccountTrendChartProps {
  trendData: TrendDataPoint[]
  account: SimpleAccount & {
    type: string
    color?: string | null
  }
  displayCurrency: SimpleCurrency
  height?: number
  timeRange: TimeRange
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>
  isLoading: boolean
}

export default function StockAccountTrendChart({
  trendData,
  account,
  displayCurrency,
  height = CHART.DEFAULT_HEIGHT,
  timeRange,
  setTimeRange,
  isLoading,
}: StockAccountTrendChartProps) {
  const { t, isLoading: langLoading } = useLanguage()
  const { getCurrencySymbol, getUserLocale, formatCurrency } =
    useUserCurrencyFormatter()
  const { formatChartDate } = useUserDateFormatter()
  const { resolvedTheme } = useTheme()

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || langLoading) {
      return
    }

    const chart = echarts.init(
      chartRef.current,
      resolvedTheme === 'dark' ? 'dark' : null
    )
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

    // 获取原币种信息，优先使用第一个数据点的原币种
    const originalCurrency =
      trendData.length > 0
        ? trendData[0].originalCurrency
        : displayCurrency.code

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: CHART.ANIMATION_DURATION,
      title: {
        text: t('chart.balance.change.trend'),
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
        },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          // ECharts tooltip formatter params can be array or single object
          const paramArray = Array.isArray(params) ? params : [params]
          const param = paramArray[0] as
            | { dataIndex: number; axisValue: string; value: number }
            | undefined
          if (!param) {
            return ''
          }
          const dataIndex = param.dataIndex
          const item = trendData[dataIndex]
          const itemCurrency = item?.originalCurrency || originalCurrency

          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${param.axisValue}</div>
              <div style="color: #3b82f6;">
                ${t('chart.balance.amount')}: ${formatCurrency(param.value as number, itemCurrency)}
              </div>
              <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">
                ${t('account.transactions')}: ${item?.transactionCount ?? 0}
              </div>
              ${
                item?.hasConversionError
                  ? `<div style="color: #ef4444; font-size: 12px;">${t('currency.conversion.error')}</div>`
                  : ''
              }
            </div>
          `
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          formatter: function (value: string) {
            const date = new Date(value)
            if (timeRange === 'lastMonth') {
              // 日期格式：显示月-日，遵循用户日期格式偏好
              return formatChartDate(date, 'day')
            } else {
              // 月份格式：显示年/月，遵循用户日期格式偏好
              return formatChartDate(date, 'month')
            }
          },
        },
        axisLine: {
          lineStyle: {
            color: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: t('chart.balance.amount.original.currency'),
        nameTextStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
        },
        axisLabel: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          formatter: function (value: number) {
            if (Math.abs(value) >= 1000) {
              return `${formatCurrency(value / 1000, originalCurrency)}k`
            }
            return formatCurrency(value, originalCurrency)
          },
        },
        axisLine: {
          lineStyle: {
            color: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb',
          },
        },
        splitLine: {
          lineStyle: {
            color: resolvedTheme === 'dark' ? '#374151' : '#f3f4f6',
          },
        },
      },
      series: [
        {
          name: t('chart.balance.amount'),
          type: 'line',
          smooth: true,
          data: balances,
          lineStyle: {
            color: ColorManager.getAccountColor(
              account.id,
              account.color,
              account.type as AccountType
            ),
            width: 3,
          },
          itemStyle: {
            color: ColorManager.getAccountColor(
              account.id,
              account.color,
              account.type as AccountType
            ),
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: ColorManager.adjustColorAlpha(
                    ColorManager.getAccountColor(
                      account.id,
                      account.color,
                      account.type as AccountType
                    ),
                    0.3
                  ),
                },
                {
                  offset: 1,
                  color: ColorManager.adjustColorAlpha(
                    ColorManager.getAccountColor(
                      account.id,
                      account.color,
                      account.type as AccountType
                    ),
                    0.05
                  ),
                },
              ],
            },
          },
          symbol: 'circle',
          symbolSize: 6,
          emphasis: {
            itemStyle: {
              borderColor: ColorManager.getAccountColor(
                account.id,
                account.color,
                account.type as AccountType
              ),
              borderWidth: 2,
            },
          },
        },
      ],
    }

    chartInstance.current.setOption(option)
  }, [
    trendData,
    displayCurrency,
    resolvedTheme,
    t,
    timeRange,
    account.id,
    account.color,
    account.type,
    langLoading,
    getCurrencySymbol,
    getUserLocale,
    formatChartDate,
  ])

  useEffect(() => {
    if (chartInstance.current && !isLoading) {
      renderChart()
    }
  }, [isLoading, renderChart, trendData, resolvedTheme])

  if (langLoading) {
    return (
      <div
        className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'
        style={{ height }}
      >
        <div className='flex items-center justify-center h-full'>
          <LoadingSpinner size='lg' showText />
        </div>
      </div>
    )
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
      <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
              {account.name}
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              {t('chart.stock.account.trend.description')}
            </p>
          </div>
          <div className='flex space-x-2'>
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
                {t(
                  `chart.range.${range.replace(/([A-Z])/g, '.$1').toLowerCase()}`
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='p-4 relative' style={{ height: `${height - 100}px` }}>
        {isLoading && (
          <div className='absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 z-10'>
            <LoadingSpinner size='lg' showText text={t('chart.loading')} />
          </div>
        )}
        {!isLoading && (!trendData || trendData.length === 0) && (
          <div className='absolute inset-0 flex items-center justify-center z-10'>
            <p className='text-gray-500 dark:text-gray-400'>
              {t('chart.no.balance.data')}
            </p>
          </div>
        )}
        <div
          ref={chartRef}
          style={{
            width: '100%',
            height: '100%',
            visibility: isLoading ? 'hidden' : 'visible',
          }}
        />
      </div>
    </div>
  )
}
