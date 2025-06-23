'use client'

import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { useIsMobile } from '@/hooks/ui/useResponsive'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { getChartHeight } from '@/lib/utils/responsive'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'

interface NetWorthChartProps {
  data: {
    xAxis: string[] // 标准格式 YYYY-MM
    series: Array<{
      name: string // 系列键名，需要翻译
      type: string
      data: number[]
      smooth?: boolean
      itemStyle: { color: string }
    }>
  }
  currency: {
    symbol: string
    code: string
  }
  loading?: boolean
  error?: string
}

export default function NetWorthChart({
  data,
  currency,
  loading = false,
  error,
}: NetWorthChartProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const { formatCurrencyById, findCurrencyByCode, getUserLocale: _getUserLocale } =
    useUserCurrencyFormatter()
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [chartError, setChartError] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const chartHeight = getChartHeight()

  // 辅助函数：智能格式化货币
  const formatCurrencyAmount = (amount: number) => {
    const currencyInfo = findCurrencyByCode(currency.code)
    return currencyInfo?.id
      ? formatCurrencyById(amount, currencyInfo.id)
      : `${amount} ${currency.code}`
  }

  useEffect(() => {
    if (!chartRef.current || !data || loading) return

    try {
      setChartError(null)

      // 数据验证
      if (
        !data.xAxis ||
        !Array.isArray(data.xAxis) ||
        data.xAxis.length === 0
      ) {
        throw new Error('图表缺少有效的X轴数据')
      }

      if (
        !data.series ||
        !Array.isArray(data.series) ||
        data.series.length === 0
      ) {
        throw new Error('图表缺少有效的数据系列')
      }

      // 验证数据系列
      data.series.forEach((series, index) => {
        if (!series.data || !Array.isArray(series.data)) {
          throw new Error(`数据系列 ${index} 缺少有效数据`)
        }

        if (series.data.length !== data.xAxis.length) {
          throw new Error(`数据系列 ${index} 的数据点数量与X轴不匹配`)
        }

        series.data.forEach((value, dataIndex) => {
          if (typeof value !== 'number' || isNaN(value)) {
            throw new Error(
              `数据系列 ${index} 第 ${dataIndex} 个数据点无效: ${value}`
            )
          }
        })
      })

      // 初始化图表
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(
          chartRef.current,
          resolvedTheme === 'dark' ? 'dark' : null
        )
      }

      const hasBarChart = data.series.some(
        s => s.name === 'total_assets' || s.name === 'total_liabilities'
      )

      const option = {
        backgroundColor: 'transparent',
        title: {
          text: t('chart.net.worth.trend'),
          left: 'center',
          textStyle: {
            fontSize: isMobile ? 14 : 16,
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
          confine: true, // 限制在图表区域内
          formatter: function (
            params: Array<{
              value: number
              name: string
              seriesName: string
              color: string
            }>
          ) {
            if (!params || params.length === 0) {
              return ''
            }
            let result = `<div style="font-weight: bold; margin-bottom: 5px;">${params[0].name}</div>`
            params.forEach(param => {
              const numericValue = param.value as number
              if (typeof numericValue !== 'number' || isNaN(numericValue))
                return

              const value = formatCurrencyAmount(numericValue)
              result += `<div style="margin: 2px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color}; border-radius: 50%; margin-right: 5px;"></span>
              ${param.seriesName}: ${value}
            </div>`
            })
            return result
          },
        },
        legend: {
          data: data.series.map(s => t(`chart.series.${s.name}`)),
          top: isMobile ? 25 : 30,
          textStyle: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            fontSize: isMobile ? 10 : 12,
          },
          itemWidth: isMobile ? 15 : 25,
          itemHeight: isMobile ? 10 : 14,
        },
        grid: {
          left: isMobile ? '8%' : '3%',
          right: isMobile ? '8%' : '4%',
          bottom: isMobile ? '8%' : '3%',
          top: isMobile ? '20%' : '15%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          boundaryGap: hasBarChart,
          data: data.xAxis,
          axisLabel: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            rotate: isMobile ? 45 : 0,
            fontSize: isMobile ? 10 : 12,
            interval: isMobile ? 'auto' : 0,
            formatter: function (value: string) {
              // 将 YYYY-MM 格式转换为 YYYY/MM
              return value.replace('-', '/')
            },
          },
          axisLine: {
            lineStyle: {
              color: resolvedTheme === 'dark' ? '#4b5563' : '#e5e7eb',
            },
          },
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            fontSize: isMobile ? 10 : 12,
            formatter: function (value: number) {
              if (Math.abs(value) >= 1000) {
                return `${formatCurrencyAmount(value / 1000)}k`
              }
              return formatCurrencyAmount(value)
            },
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
        series: data.series.map(s => {
          const isBar =
            s.name === 'total_assets' || s.name === 'total_liabilities'
          const type = isBar ? 'bar' : 'line'

          const seriesData =
            s.name === 'total_liabilities'
              ? s.data.map(value => -value)
              : s.data

          if (type === 'line') {
            return {
              ...s,
              data: seriesData,
              name: t(`chart.series.${s.name}`),
              type: 'line',
              symbol: 'circle',
              symbolSize: 6,
              lineStyle: {
                width: 2,
              },
            }
          } else {
            // bar
            return {
              ...s,
              data: seriesData,
              name: t(`chart.series.${s.name}`),
              type: 'bar',
              stack: 'balance', // 堆叠显示
              itemStyle: {
                ...s.itemStyle,
                borderRadius:
                  s.name === 'total_liabilities' ? [0, 0, 4, 4] : [4, 4, 0, 0], // 负债为负数圆角在底部，资产为正数圆角在顶部
              },
            }
          }
        }),
      }

      chartInstance.current.setOption(option, true) // true表示不合并，完全替换

      // 响应式处理
      const handleResize = () => {
        chartInstance.current?.resize()
      }

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    } catch (error) {
      console.error('图表渲染错误:', error)
      setChartError(error instanceof Error ? error.message : '未知错误')
      return undefined
    }
  }, [data, currency, loading, resolvedTheme, isMobile, chartHeight, t])

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  // 渲染加载状态
  if (loading) {
    return (
      <div
        className={`rounded-lg shadow p-4 sm:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
      >
        <div className='flex items-center justify-center h-[300px] sm:h-[400px]'>
          <LoadingSpinner
            size={isMobile ? 'md' : 'lg'}
            showText
            text={t('chart.loading')}
          />
        </div>
      </div>
    )
  }

  // 渲染错误状态
  if (error || chartError) {
    return (
      <div
        className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
      >
        <div className='flex items-center justify-center h-[400px]'>
          <div className='text-center'>
            <div className='text-red-500 mb-4'>
              <svg
                className='mx-auto h-12 w-12'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <h3
              className={`text-lg font-medium mb-2 ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
            >
              {t('error.chart.load.failed')}
            </h3>
            <p
              className={`text-sm mb-4 ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {error || chartError}
            </p>
            <button
              onClick={() => {
                setChartError(null)
                // 触发重新获取数据
                if (typeof window !== 'undefined') {
                  window.location.reload()
                }
              }}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              {t('common.refresh')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 渲染空数据状态
  if (!data || !data.series || data.series.length === 0) {
    return (
      <div
        className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
      >
        <div className='flex items-center justify-center h-[400px]'>
          <div className='text-center'>
            <div
              className={`mb-4 ${resolvedTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
            >
              <svg
                className='mx-auto h-12 w-12'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                />
              </svg>
            </div>
            <h3
              className={`text-lg font-medium mb-2 ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
            >
              {t('chart.no.data')}
            </h3>
            <p
              className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {t('dashboard.add.accounts.transactions.first')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg shadow p-4 sm:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
    >
      <div className='mb-4'>
        <h3
          className={`text-base sm:text-lg font-medium ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
        >
          {t('chart.net.worth.trend')}
        </h3>
        <p
          className={`text-xs sm:text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {t('chart.net.worth.trend.description')}
        </p>
      </div>
      <div
        ref={chartRef}
        style={{ width: '100%', height: `${chartHeight}px` }}
        className={`min-h-[${chartHeight}px]`}
      />
    </div>
  )
}
