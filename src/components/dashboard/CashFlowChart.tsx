'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'

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
}

export default function CashFlowChart({ data, currency }: CashFlowChartProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || !data) return

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, resolvedTheme === 'dark' ? 'dark' : null)
    }

    const option = {
      backgroundColor: 'transparent',
      title: {
        text: t('chart.monthly.cash.flow'),
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
          type: 'cross',
          label: {
            backgroundColor: resolvedTheme === 'dark' ? '#4b5563' : '#6a7985'
          }
        },
        formatter: function(params: {
          axisValue: string;
          seriesName: string;
          value: number;
          color: string;
        }[]) {
          if (!params || params.length === 0) {
            return ''
          }
          let result = `<div style="font-weight: bold; margin-bottom: 5px;">${params[0].axisValue}</div>`
          params.forEach((param) => {
            const value = param.value
            const formattedValue = `${value < 0 ? '-' : ''}${currency.symbol}${Math.abs(value).toLocaleString()}`
            result += `<div style="margin: 2px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color}; border-radius: 50%; margin-right: 5px;"></span>
              ${param.seriesName}: ${formattedValue}
            </div>`
          })
          return result
        }
      },
      legend: {
        data: data.series.map(s => t(`chart.series.${s.name}`)),
        top: window.innerWidth < 768 ? 25 : 30,
        textStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          fontSize: window.innerWidth < 768 ? 10 : 12
        },
        itemWidth: window.innerWidth < 768 ? 15 : 25,
        itemHeight: window.innerWidth < 768 ? 10 : 14
      },
      grid: {
        left: window.innerWidth < 768 ? '8%' : '3%',
        right: window.innerWidth < 768 ? '8%' : '4%',
        bottom: window.innerWidth < 768 ? '8%' : '3%',
        top: window.innerWidth < 768 ? '20%' : '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.xAxis,
        axisLabel: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          rotate: window.innerWidth < 768 ? 45 : 0,
          fontSize: window.innerWidth < 768 ? 10 : 12,
          interval: window.innerWidth < 768 ? 'auto' : 0,
          formatter: function (value: string) {
            // 将 YYYY-MM 格式转换为 YYYY/MM
            return value.replace('-', '/')
          }
        },
        axisLine: {
          lineStyle: {
            color: resolvedTheme === 'dark' ? '#4b5563' : '#e5e7eb'
          }
        }
      },
      yAxis: [
        {
          type: 'value',
          name: t('chart.amount'),
          position: 'left',
          axisLabel: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            formatter: function(value: number) {
              const absValue = Math.abs(value)
              if (absValue >= 1000) {
                return `${value < 0 ? '-' : ''}${currency.symbol}${(absValue / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
              }
              return `${value < 0 ? '-' : ''}${currency.symbol}${absValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
            }
          },
          nameTextStyle: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
          },
          axisLine: {
            lineStyle: {
              color: resolvedTheme === 'dark' ? '#4b5563' : '#e5e7eb'
            }
          },
          splitLine: {
            lineStyle: {
              color: resolvedTheme === 'dark' ? '#374151' : '#f3f4f6'
            }
          }
        }
      ],
      series: data.series.map(series => {
        const baseSeries = {
          ...series,
          name: t(`chart.series.${series.name}`), // 翻译系列名称
          yAxisIndex: 0
        }

        if (series.type === 'bar') {
          return {
            ...baseSeries,
            stack: 'cashflow',
            barWidth: '60%',
            itemStyle: {
              ...series.itemStyle,
              borderRadius: 4 // 统一使用4px圆角，堆叠柱状图使用统一圆角
            }
          }
        } else {
          return {
            ...baseSeries,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
              width: 3
            }
          }
        }
      })
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
  }, [data, currency, resolvedTheme, t])

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  return (
    <div className={`rounded-lg shadow p-4 sm:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="mb-4">
        <h3 className={`text-base sm:text-lg font-medium ${resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{t('chart.monthly.cash.flow')}</h3>
        <p className={`text-xs sm:text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{t('chart.transaction.flow.trend')}</p>
      </div>
      <div
        ref={chartRef}
        style={{ width: '100%', height: window.innerWidth < 768 ? '300px' : '400px' }}
        className="min-h-[300px] sm:min-h-[400px]"
      />
    </div>
  )
}
