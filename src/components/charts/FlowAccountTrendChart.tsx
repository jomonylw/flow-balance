'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as echarts from 'echarts'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'
import ColorManager from '@/lib/colorManager'

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
  color?: string
}

type TimeRange = 'lastMonth' | 'lastYear' | 'all'

interface FlowAccountTrendChartProps {
  trendData: TrendDataPoint[]
  account: Account
  displayCurrency: Currency
  height?: number
  timeRange: TimeRange
  setTimeRange: (range: TimeRange) => void
  isLoading: boolean
}

export default function FlowAccountTrendChart({
  trendData,
  account,
  displayCurrency,
  height = 400,
  timeRange,
  setTimeRange,
  isLoading
}: FlowAccountTrendChartProps) {
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

    console.log('Rendering flow chart with data:', trendData)
    const dates = trendData.map(item => item.date)
    const amounts = trendData.map(item => item.originalAmount || 0)
    console.log('Flow chart dates:', dates)
    console.log('Flow chart amounts:', amounts)

    // 计算累计金额（用于面积图）
    const cumulativeAmounts: number[] = []
    let cumulative = 0
    for (const amount of amounts) {
      cumulative += amount
      cumulativeAmounts.push(cumulative)
    }

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      title: {
        text: t('chart.transaction.flow.trend'),
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
          const cumulativeData = Array.isArray(params) ? params[1] : null

          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${param.axisValue}</div>
              <div style="color: #10b981;">
                ${t('chart.transaction.amount')}: ${displayCurrency.symbol}${(param.value as number).toLocaleString()}
              </div>
              ${cumulativeData ? `
                <div style="color: #3b82f6;">
                  ${t('chart.cumulative.amount')}: ${displayCurrency.symbol}${(cumulativeData.value as number).toLocaleString()}
                </div>
              ` : ''}
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
      legend: {
        data: [t('chart.transaction.amount'), t('chart.cumulative.amount')],
        top: 30,
        textStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
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
      yAxis: [
        {
          type: 'value',
          name: `${t('chart.transaction.amount')} (${displayCurrency.code})`,
          position: 'left',
          nameTextStyle: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
          },
          axisLabel: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            formatter: function (value: number) {
              if (Math.abs(value) >= 1000) {
                return `${displayCurrency.symbol}${(value / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
              }
              return `${displayCurrency.symbol}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
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
        {
          type: 'value',
          name: `${t('chart.cumulative.amount')} (${displayCurrency.code})`,
          position: 'right',
          nameTextStyle: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
          },
          axisLabel: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            formatter: function (value: number) {
              if (Math.abs(value) >= 1000) {
                return `${displayCurrency.symbol}${(value / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
              }
              return `${displayCurrency.symbol}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
            }
          }
        }
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
              account.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
            ),
            borderRadius: [4, 4, 0, 0] // 流量账户交易金额都是正数，圆角在顶部
          },
          emphasis: {
            itemStyle: {
              color: ColorManager.adjustColorAlpha(
                ColorManager.getAccountColor(
                  account.id,
                  account.color,
                  account.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
                ),
                0.8
              )
            }
          }
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
                account.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
              )
            ),
            width: 3
          },
          itemStyle: {
            color: ColorManager.generateComplementaryColor(
              ColorManager.getAccountColor(
                account.id,
                account.color,
                account.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
              )
            )
          },
          symbol: 'circle',
          symbolSize: 6,
          emphasis: {
            itemStyle: {
              borderColor: ColorManager.generateComplementaryColor(
                ColorManager.getAccountColor(
                  account.id,
                  account.color,
                  account.type as 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
                )
              ),
              borderWidth: 2
            }
          }
        }
      ]
    }

    chartInstance.current.setOption(option)
  }, [trendData, displayCurrency, resolvedTheme, t, timeRange, account.type, account.id, account.color, langLoading])

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
              {t('chart.flow.account.trend.description')}
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
            <p className="text-gray-500 dark:text-gray-400">{t('chart.no.transaction.data')}</p>
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
