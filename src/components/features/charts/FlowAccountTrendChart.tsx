'use client'

import { useEffect, useRef, useCallback } from 'react'
import echarts, { safeEChartsInit } from '@/lib/utils/echarts-config'
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

interface FlowAccountTrendChartProps {
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

export default function FlowAccountTrendChart({
  trendData,
  account,
  displayCurrency,
  height = CHART.DEFAULT_HEIGHT,
  timeRange,
  setTimeRange,
  isLoading,
}: FlowAccountTrendChartProps) {
  const { t, isLoading: langLoading } = useLanguage()
  const { formatCurrency, getUserLocale: _getUserLocale } =
    useUserCurrencyFormatter()
  const { formatChartDate } = useUserDateFormatter()
  const { resolvedTheme } = useTheme()

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || langLoading) {
      return
    }

    const chart = safeEChartsInit(
      chartRef.current,
      resolvedTheme === 'dark' ? 'dark' : null
    )

    if (!chart) {
      console.error('Failed to initialize ECharts instance')
      return
    }

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
    const amounts = trendData.map(item => item.originalAmount || 0)

    // 计算累计金额（用于面积图）
    const cumulativeAmounts: number[] = []
    let cumulative = 0
    for (const amount of amounts) {
      cumulative += amount
      cumulativeAmounts.push(cumulative)
    }

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: CHART.ANIMATION_DURATION,
      title: {
        text: t('chart.transaction.flow.trend'),
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: resolvedTheme === 'dark' ? '#374151' : '#ffffff',
        borderColor: resolvedTheme === 'dark' ? '#4b5563' : '#e5e7eb',
        textStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
        },
        formatter: (params: unknown) => {
          const param = Array.isArray(params) ? params[0] : params
          if (!param) {
            return ''
          }
          const dataIndex = param.dataIndex
          const item = trendData[dataIndex]
          const cumulativeData = Array.isArray(params) ? params[1] : null

          // 使用统一的日期格式化
          const date = new Date(param.axisValue)
          const formattedDate =
            timeRange === 'lastMonth'
              ? formatChartDate(date, 'day')
              : formatChartDate(date, 'month')

          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${formattedDate}</div>
              <div style="color: #10b981;">
                ${t('chart.transaction.amount')}: ${formatCurrency(param.value as number, displayCurrency.code)}
              </div>
              ${
                cumulativeData
                  ? `
                <div style="color: #3b82f6;">
                  ${t('chart.cumulative.amount')}: ${formatCurrency(cumulativeData.value as number, displayCurrency.code)}
                </div>
              `
                  : ''
              }
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
      legend: {
        data: [t('chart.transaction.amount'), t('chart.cumulative.amount')],
        top: 30,
        textStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          rotate: window.innerWidth < 768 ? 45 : 0,
          fontSize: window.innerWidth < 768 ? 10 : 12,
          interval: window.innerWidth < 768 ? 'auto' : 0,
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
      yAxis: [
        {
          type: 'value',
          name: `${t('chart.transaction.amount')} (${displayCurrency.code})`,
          position: 'left',
          nameTextStyle: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          },
          axisLabel: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            formatter: function (value: number) {
              if (Math.abs(value) >= 1000) {
                return `${formatCurrency(value / 1000, displayCurrency.code)}k`
              }
              return formatCurrency(value, displayCurrency.code)
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
        {
          type: 'value',
          name: `${t('chart.cumulative.amount')} (${displayCurrency.code})`,
          position: 'right',
          nameTextStyle: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          },
          axisLabel: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            formatter: function (value: number) {
              if (Math.abs(value) >= 1000) {
                return `${formatCurrency(value / 1000, displayCurrency.code)}k`
              }
              return formatCurrency(value, displayCurrency.code)
            },
          },
        },
      ],
      series: [
        {
          name: t('chart.transaction.amount'),
          type: 'bar',
          yAxisIndex: 0,
          data: amounts,
          itemStyle: {
            color: ColorManager.getAccountColor(
              account.id,
              account.color,
              account.type as AccountType
            ),
            borderRadius: [4, 4, 0, 0], // 流量账户交易金额都是正数，圆角在顶部
          },
          emphasis: {
            itemStyle: {
              color: ColorManager.adjustColorAlpha(
                ColorManager.getAccountColor(
                  account.id,
                  account.color,
                  account.type as AccountType
                ),
                0.8
              ),
            },
          },
        },
        {
          name: t('chart.cumulative.amount'),
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: cumulativeAmounts,
          lineStyle: {
            color: ColorManager.generateComplementaryColor(
              ColorManager.getAccountColor(
                account.id,
                account.color,
                account.type as AccountType
              )
            ),
            width: 3,
          },
          itemStyle: {
            color: ColorManager.generateComplementaryColor(
              ColorManager.getAccountColor(
                account.id,
                account.color,
                account.type as AccountType
              )
            ),
          },
          symbol: 'circle',
          symbolSize: 6,
          emphasis: {
            itemStyle: {
              borderColor: ColorManager.generateComplementaryColor(
                ColorManager.getAccountColor(
                  account.id,
                  account.color,
                  account.type as AccountType
                )
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
    account.type,
    account.id,
    account.color,
    langLoading,
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
              {t('chart.flow.account.trend.description')}
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
              {t('chart.no.transaction.data')}
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
