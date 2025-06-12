'use client'

import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { useIsMobile, useResponsive } from '@/hooks/useResponsive'
import { useLanguage } from '@/contexts/LanguageContext'
import { getChartHeight } from '@/lib/responsive'

interface NetWorthChartProps {
  data: {
    title: string
    xAxis: string[]
    series: Array<{
      name: string
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

export default function NetWorthChart({ data, currency, loading = false, error }: NetWorthChartProps) {
  const { t } = useLanguage()
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [chartError, setChartError] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const chartHeight = getChartHeight()

  useEffect(() => {
    if (!chartRef.current || !data || loading) return

    try {
      setChartError(null)

      // 数据验证
      if (!data.xAxis || !Array.isArray(data.xAxis) || data.xAxis.length === 0) {
        throw new Error('图表缺少有效的X轴数据')
      }

      if (!data.series || !Array.isArray(data.series) || data.series.length === 0) {
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
            throw new Error(`数据系列 ${index} 第 ${dataIndex} 个数据点无效: ${value}`)
          }
        })
      })

      // 初始化图表
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current)
      }

    const option = {
      title: {
        text: data.title,
        left: 'center',
        textStyle: {
          fontSize: isMobile ? 14 : 16,
          fontWeight: 'bold',
          color: '#374151'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        confine: true, // 限制在图表区域内
        formatter: function(params: any) {
          let result = `<div style="font-weight: bold; margin-bottom: 5px;">${params[0].axisValue}</div>`
          params.forEach((param: any) => {
            const value = param.value >= 0 ?
              `${currency.symbol}${param.value.toLocaleString()}` :
              `-${currency.symbol}${Math.abs(param.value).toLocaleString()}`
            result += `<div style="margin: 2px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color}; border-radius: 50%; margin-right: 5px;"></span>
              ${param.seriesName}: ${value}
            </div>`
          })
          return result
        }
      },
      legend: {
        data: data.series.map(s => s.name),
        top: isMobile ? 25 : 30,
        textStyle: {
          color: '#374151',
          fontSize: isMobile ? 10 : 12
        },
        itemWidth: isMobile ? 15 : 25,
        itemHeight: isMobile ? 10 : 14
      },
      grid: {
        left: isMobile ? '8%' : '3%',
        right: isMobile ? '8%' : '4%',
        bottom: isMobile ? '8%' : '3%',
        top: isMobile ? '20%' : '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.xAxis,
        axisLabel: {
          color: '#6b7280',
          rotate: isMobile ? 45 : 0,
          fontSize: isMobile ? 10 : 12,
          interval: isMobile ? 'auto' : 0
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb'
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#6b7280',
          fontSize: isMobile ? 10 : 12,
          formatter: function(value: number) {
            if (Math.abs(value) >= 10000) {
              return isMobile ?
                `${(value / 10000).toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}万` :
                `${currency.symbol}${(value / 10000).toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}万`
            }
            return isMobile ?
              `${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}` :
              `${currency.symbol}${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
          }
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6'
          }
        }
      },
      series: data.series.map(series => ({
        ...series,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2
        },
        areaStyle: series.type === 'line' ? {
          opacity: 0.1
        } : undefined
      }))
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
      setChartError(error instanceof Error ? error.message : '图表渲染失败')
    }
  }, [data, currency, loading])

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
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center justify-center h-[300px] sm:h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-gray-500">正在加载图表数据...</p>
          </div>
        </div>
      </div>
    )
  }

  // 渲染错误状态
  if (error || chartError) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">图表加载失败</h3>
            <p className="text-sm text-gray-500 mb-4">{error || chartError}</p>
            <button
              onClick={() => {
                setChartError(null)
                // 触发重新获取数据
                if (typeof window !== 'undefined') {
                  window.location.reload()
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 渲染空数据状态
  if (!data || !data.series || data.series.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('chart.no.data')}</h3>
            <p className="text-sm text-gray-500">{t('dashboard.add.accounts.transactions.first')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-medium text-gray-900">{data.title}</h3>
        <p className="text-xs sm:text-sm text-gray-500">{t('chart.net.worth.trend.description')}</p>
      </div>
      <div
        ref={chartRef}
        style={{ width: '100%', height: `${chartHeight}px` }}
        className={`min-h-[${chartHeight}px]`}
      />
    </div>
  )
}
