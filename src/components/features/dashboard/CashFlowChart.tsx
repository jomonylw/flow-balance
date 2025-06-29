'use client'

import type { TimeRange } from '@/types/core'
import { useEffect, useRef, useState, useCallback } from 'react'
import * as echarts from 'echarts'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import { useTheme } from '@/contexts/providers/ThemeContext'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'

// 时间范围类型定义

interface CashFlowChartProps {
  data: {
    xAxis: string[] // 标准格式 YYYY-MM
    series: Array<{
      name: string // 系列键名，需要翻译
      type: string
      data: number[]
      itemStyle: { color: string }
      yAxisIndex?: number
    }>
  }
  currency: {
    symbol: string
    code: string
  }
  loading?: boolean // 新增：加载状态
  onTimeRangeChange?: (timeRange: TimeRange) => void // 新增：时间范围变化回调
  timeRange?: TimeRange // 新增：外部传入的时间范围
}

export default function CashFlowChart({
  data,
  currency,
  loading = false,
  onTimeRangeChange,
  timeRange: externalTimeRange,
}: CashFlowChartProps) {
  const { t } = useLanguage()
  const {
    formatCurrencyById,
    findCurrencyByCode,
    getUserLocale: _getUserLocale,
  } = useUserCurrencyFormatter()
  const { formatChartDate } = useUserDateFormatter()
  const { resolvedTheme } = useTheme()
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [internalTimeRange, setInternalTimeRange] =
    useState<TimeRange>('last12months')

  // 使用外部传入的timeRange，如果没有则使用内部状态
  const currentTimeRange = externalTimeRange || internalTimeRange

  // 处理时间范围变化
  const handleTimeRangeChange = useCallback(
    (newTimeRange: TimeRange) => {
      setInternalTimeRange(newTimeRange)
      if (onTimeRangeChange) {
        onTimeRangeChange(newTimeRange)
      }
    },
    [onTimeRangeChange]
  )

  // 根据时间范围过滤数据
  const getFilteredData = useCallback(() => {
    if (!data || !data.xAxis || !data.series) return data

    if (currentTimeRange === 'last12months') {
      // 获取最近12个月的数据
      const filteredXAxis = data.xAxis.slice(-12)
      const filteredSeries = data.series.map(series => ({
        ...series,
        data: series.data.slice(-12),
      }))

      return {
        xAxis: filteredXAxis,
        series: filteredSeries,
      }
    }

    // 返回全部数据
    return data
  }, [data, currentTimeRange])

  // 辅助函数：智能格式化货币
  const formatCurrencyAmount = (amount: number) => {
    const currencyInfo = findCurrencyByCode(currency.code)
    return currencyInfo?.id
      ? formatCurrencyById(amount, currencyInfo.id)
      : `${amount} ${currency.code}`
  }

  useEffect(() => {
    if (!chartRef.current || !data || loading) return

    // 使用过滤后的数据
    const filteredData = getFilteredData()
    if (!filteredData) return

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(
        chartRef.current,
        resolvedTheme === 'dark' ? 'dark' : null
      )
    }

    // 根据数据点数量动态设置X轴显示
    const dataPointCount = filteredData.xAxis.length
    const shouldRotateLabels = dataPointCount > 12 || window.innerWidth < 768
    const labelInterval = dataPointCount > 24 ? 'auto' : 0

    const option = {
      backgroundColor: 'transparent',
      title: {
        text: t('chart.monthly.cash.flow'),
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: resolvedTheme === 'dark' ? '#4b5563' : '#6a7985',
          },
        },
        backgroundColor: resolvedTheme === 'dark' ? '#374151' : '#ffffff',
        borderColor: resolvedTheme === 'dark' ? '#4b5563' : '#e5e7eb',
        textStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
        },
        formatter: function (
          params: {
            axisValue: string
            seriesName: string
            value: number
            color: string
          }[]
        ) {
          if (!params || params.length === 0) {
            return ''
          }
          // 使用统一的日期格式化
          const date = new Date(params[0].axisValue + '-01')
          const formattedDate = formatChartDate(date, 'month')
          let result = `<div style="font-weight: bold; margin-bottom: 5px;">${formattedDate}</div>`
          params.forEach(param => {
            const value = param.value
            const formattedValue = `${value < 0 ? '-' : ''}${formatCurrencyAmount(Math.abs(value))}`
            result += `<div style="margin: 2px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color}; border-radius: 50%; margin-right: 5px;"></span>
              ${param.seriesName}: ${formattedValue}
            </div>`
          })
          return result
        },
      },
      legend: {
        data: filteredData.series.map(s => t(`chart.series.${s.name}`)),
        top: window.innerWidth < 768 ? 25 : 30,
        textStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          fontSize: window.innerWidth < 768 ? 10 : 12,
        },
        itemWidth: window.innerWidth < 768 ? 15 : 25,
        itemHeight: window.innerWidth < 768 ? 10 : 14,
      },
      grid: {
        left: window.innerWidth < 768 ? '8%' : '3%',
        right: window.innerWidth < 768 ? '8%' : '4%',
        bottom: window.innerWidth < 768 ? '8%' : '3%',
        top: window.innerWidth < 768 ? '20%' : '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: filteredData.xAxis,
        axisLabel: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          rotate: shouldRotateLabels ? 45 : 0,
          fontSize: window.innerWidth < 768 ? 10 : 12,
          interval: labelInterval,
          formatter: function (value: string) {
            // 使用用户设置的日期格式显示月份
            const date = new Date(value + '-01') // 添加日期部分以创建有效的日期
            return formatChartDate(date, 'month')
          },
        },
        axisLine: {
          lineStyle: {
            color: resolvedTheme === 'dark' ? '#4b5563' : '#e5e7eb',
          },
        },
      },
      yAxis: [
        {
          type: 'value',
          name: t('chart.amount'),
          position: 'left',
          axisLabel: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            formatter: function (value: number) {
              const absValue = Math.abs(value)
              if (absValue >= 1000) {
                return `${value < 0 ? '-' : ''}${formatCurrencyAmount(absValue / 1000)}k`
              }
              return `${value < 0 ? '-' : ''}${formatCurrencyAmount(absValue)}`
            },
          },
          nameTextStyle: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          },
          axisLine: {
            lineStyle: {
              color: resolvedTheme === 'dark' ? '#4b5563' : '#e5e7eb',
            },
          },
          splitLine: {
            lineStyle: {
              color: resolvedTheme === 'dark' ? '#374151' : '#f3f4f6',
            },
          },
        },
      ],
      series: filteredData.series.map(series => {
        const baseSeries = {
          ...series,
          name: t(`chart.series.${series.name}`), // 翻译系列名称
          yAxisIndex: 0,
        }

        if (series.type === 'bar') {
          return {
            ...baseSeries,
            stack: 'cashflow',
            barWidth: '60%',
            itemStyle: {
              ...series.itemStyle,
              borderRadius: 4, // 统一使用4px圆角，堆叠柱状图使用统一圆角
            },
          }
        } else {
          return {
            ...baseSeries,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
              width: 3,
            },
          }
        }
      }),
    }

    chartInstance.current.setOption(option)

    // 响应式处理
    const handleResize = () => {
      chartInstance.current?.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [
    data,
    currency,
    resolvedTheme,
    t,
    formatChartDate,
    getFilteredData,
    currentTimeRange,
    loading,
  ])

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  return (
    <div
      className={`rounded-lg shadow p-4 sm:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
    >
      <div className='mb-4'>
        <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2'>
          <div>
            <h3
              className={`text-base sm:text-lg font-medium ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
            >
              {t('chart.monthly.cash.flow')}
            </h3>
            <p
              className={`text-xs sm:text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {t('chart.transaction.flow.trend')}
            </p>
          </div>

          {/* 时间范围选择器 */}
          <div className='flex space-x-2 mt-2 sm:mt-0'>
            <button
              onClick={() => handleTimeRangeChange('last12months')}
              className={`px-3 py-1 text-sm rounded ${
                currentTimeRange === 'last12months'
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
              onClick={() => handleTimeRangeChange('all')}
              className={`px-3 py-1 text-sm rounded ${
                currentTimeRange === 'all'
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
      </div>
      <div
        ref={chartRef}
        style={{
          width: '100%',
          height: window.innerWidth < 768 ? '300px' : '400px',
        }}
        className='min-h-[300px] sm:min-h-[400px] relative'
      >
        {loading && (
          <div className='absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 z-10'>
            <LoadingSpinner />
          </div>
        )}
      </div>
    </div>
  )
}
