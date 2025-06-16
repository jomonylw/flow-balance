'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as echarts from 'echarts'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'
import ColorManager from '@/lib/colorManager'

interface StockMonthlyData {
  [monthKey: string]: {
    [currencyCode: string]: {
      accounts: Record<string, { balance: number; name: string }>
      totalBalance: number
    }
  }
}

interface Currency {
  code: string
  symbol: string
  name: string
}

type TimeRange = 'last12months' | 'all'

interface StockMonthlySummaryChartProps {
  stockMonthlyData: StockMonthlyData
  baseCurrency: Currency
  title?: string
  height?: number
}

export default function StockMonthlySummaryChart({
  stockMonthlyData,
  baseCurrency,
  title,
  height = 400
}: StockMonthlySummaryChartProps) {
  const { t, isLoading } = useLanguage()
  const { resolvedTheme } = useTheme()

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('last12months')

  // 根据时间范围过滤数据
  const getFilteredData = useCallback(() => {
    if (!stockMonthlyData) return {}

    const allMonths = Object.keys(stockMonthlyData).sort()
    let filteredMonths: string[]

    if (timeRange === 'last12months') {
      // 获取最近12个月的数据
      filteredMonths = allMonths.slice(-12)
    } else {
      // 全部数据
      filteredMonths = allMonths
    }

    const filteredData: StockMonthlyData = {}
    filteredMonths.forEach(month => {
      filteredData[month] = stockMonthlyData[month]
    })

    return filteredData
  }, [stockMonthlyData, timeRange])

  useEffect(() => {
    if (!chartRef.current || !stockMonthlyData) {
      return
    }

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, resolvedTheme === 'dark' ? 'dark' : null)
    }

    // 响应式处理
    const handleResize = () => {
      chartInstance.current?.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [stockMonthlyData, baseCurrency, resolvedTheme, isLoading])

  const renderStockChart = useCallback(() => {
    if (!stockMonthlyData || !chartInstance.current || isLoading) {
      return
    }

    // 使用过滤后的数据
    const filteredData = getFilteredData()
    const months = Object.keys(filteredData).sort()

    const formattedMonths = months.map(month => {
      const [year, monthNum] = month.split('-')
      return `${year}/${monthNum.padStart(2, '0')}`
    })

    // 获取所有账户名称
    const allAccounts = new Set<string>()
    months.forEach(month => {
      const monthData = filteredData[month]
      const currencyData = monthData[baseCurrency.code]
      if (currencyData?.accounts) {
        Object.keys(currencyData.accounts).forEach(accountId => {
          allAccounts.add(currencyData.accounts[accountId].name)
        })
      }
    })

    const accountNames = Array.from(allAccounts)

    // 为每个账户准备柱状图数据
    const barSeries = accountNames.map((accountName) => {
      const data = months.map(month => {
        const monthData = filteredData[month]
        const currencyData = monthData[baseCurrency.code]
        if (currencyData?.accounts) {
          const account = Object.values(currencyData.accounts).find(acc => acc.name === accountName)
          return account?.balance || 0
        }
        return 0
      })

      // 使用默认颜色序列为账户生成颜色
      const accountColor = ColorManager.generateChartColors(
        [{ name: accountName }],
        () => null // 这里的账户数据没有颜色信息，使用默认颜色序列
      )[0]

      return {
        name: accountName,
        type: 'bar' as const,
        stack: 'total',
        data,
        itemStyle: {
          color: accountColor
        }
      }
    })

    // 准备总余额线图数据
    const totalBalanceData = months.map(month => {
      const monthData = filteredData[month]
      const currencyData = monthData[baseCurrency.code]
      return currencyData?.totalBalance || 0
    })

    const lineSeries = {
      name: t('chart.total.balance'),
      type: 'line' as const,
      smooth: true,
      data: totalBalanceData,
      lineStyle: {
        color: ColorManager.getDefaultColors().ASSET,
        width: 3
      },
      itemStyle: {
        color: ColorManager.getDefaultColors().ASSET
      },
      symbol: 'circle',
      symbolSize: 6
    }

    const series = [...barSeries, lineSeries]

    const chartTitle = title || t('chart.stock.monthly.summary')

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      title: {
        text: chartTitle,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (params: any) {
          const paramsArray = Array.isArray(params) ? params : [params]
          if (!paramsArray.length) {
            return ''
          }
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${
            paramsArray[0]?.axisValue ?? ''
          }</div>`
          let total = 0

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          paramsArray.forEach((param: any) => {
            const value = (param?.value as number) || 0
            if (param?.seriesType === 'bar') {
              total += value
            }

            // 显示所有账户，包括零余额的账户
            result += `
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: ${
                  param?.color ?? '#ccc'
                }; margin-right: 8px; border-radius: 50%;"></span>
                <span style="margin-right: 8px;">${param?.seriesName ?? 'N/A'}:</span>
                <span style="font-weight: bold; color: ${value >= 0 ? '#059669' : '#dc2626'};">
                  ${baseCurrency.symbol}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${value < 0 ? ` (${t('common.negative')})` : ''}
                </span>
              </div>
            `
          })

          result += `<div style="border-top: 1px solid #ccc; margin-top: 8px; padding-top: 4px; font-weight: bold;">
            ${t('common.total')}: <span style="color: ${total >= 0 ? '#059669' : '#dc2626'};">
              ${baseCurrency.symbol}${Math.abs(total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${total < 0 ? ` (${t('common.negative')})` : ''}
            </span>
          </div>`

          return result
        }
      },
      legend: {
        data: [...accountNames, t('chart.total.balance')],
        top: 30,
        type: 'scroll',
        textStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: formattedMonths,
        axisLabel: {
          rotate: 45,
          fontSize: 12,
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
        }
      },
      yAxis: {
        type: 'value',
        name: t('chart.account.balance'),
        axisLabel: {
          formatter: function (value: number) {
            if (Math.abs(value) >= 1000) {
              return `${baseCurrency.symbol}${(value / 1000).toLocaleString('en-US', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
              })}k`
            }
            return `${baseCurrency.symbol}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          },
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
        },
        nameTextStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
        }
      },
      series
    }

    // 设置图表选项
    chartInstance.current.setOption(option)
  }, [stockMonthlyData, baseCurrency, resolvedTheme, t, getFilteredData, title, isLoading])

  // 单独的 useEffect 来处理图表渲染
  useEffect(() => {
    if (chartInstance.current && stockMonthlyData) {
      renderStockChart()
    }
  }, [renderStockChart, stockMonthlyData])

  if (isLoading) {
    return (
      <div className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <div className="text-gray-500">{t('chart.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      {/* 时间范围选择器 */}
      <div className="flex justify-end mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('last12months')}
            className={`px-3 py-1 text-sm rounded ${
              timeRange === 'last12months'
                ? resolvedTheme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : resolvedTheme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('time.last.12.months')}
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1 text-sm rounded ${
              timeRange === 'all'
                ? resolvedTheme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-500 text-white'
                : resolvedTheme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('time.all')}
          </button>
        </div>
      </div>

      <div
        ref={chartRef}
        style={{ width: '100%', height: `${height}px` }}
      />
    </div>
  )
}
