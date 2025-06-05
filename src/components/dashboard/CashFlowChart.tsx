'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface CashFlowChartProps {
  data: {
    title: string
    xAxis: string[]
    series: Array<{
      name: string
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
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || !data) return

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    const option = {
      title: {
        text: data.title,
        left: 'center',
        textStyle: {
          fontSize: 16,
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
        formatter: function(params: any) {
          let result = `<div style="font-weight: bold; margin-bottom: 5px;">${params[0].axisValue}</div>`
          params.forEach((param: any) => {
            const value = Math.abs(param.value)
            const formattedValue = `${currency.symbol}${value.toLocaleString()}`
            result += `<div style="margin: 2px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color}; border-radius: 50%; margin-right: 5px;"></span>
              ${param.seriesName}: ${formattedValue}
            </div>`
          })
          return result
        }
      },
      legend: {
        data: data.series.map(s => s.name),
        top: 30,
        textStyle: {
          color: '#374151'
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
        data: data.xAxis,
        axisLabel: {
          color: '#6b7280',
          rotate: 45
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb'
          }
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '金额',
          position: 'left',
          axisLabel: {
            color: '#6b7280',
            formatter: function(value: number) {
              const absValue = Math.abs(value)
              if (absValue >= 10000) {
                return `${value < 0 ? '-' : ''}${currency.symbol}${(absValue / 10000).toFixed(1)}万`
              }
              return `${value < 0 ? '-' : ''}${currency.symbol}${absValue.toLocaleString()}`
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
        {
          type: 'value',
          name: '净现金流',
          position: 'right',
          axisLabel: {
            color: '#6b7280',
            formatter: function(value: number) {
              if (Math.abs(value) >= 10000) {
                return `${currency.symbol}${(value / 10000).toFixed(1)}万`
              }
              return `${currency.symbol}${value.toLocaleString()}`
            }
          },
          axisLine: {
            lineStyle: {
              color: '#e5e7eb'
            }
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: data.series.map(series => {
        if (series.type === 'bar') {
          return {
            ...series,
            barWidth: '60%',
            itemStyle: {
              ...series.itemStyle,
              borderRadius: [2, 2, 0, 0]
            }
          }
        } else {
          return {
            ...series,
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
  }, [data, currency])

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div 
        ref={chartRef} 
        style={{ width: '100%', height: '400px' }}
        className="min-h-[400px]"
      />
    </div>
  )
}
