'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface MonthlyData {
  [monthKey: string]: {
    [currencyCode: string]: {
      income: number
      expense: number
      balance: number
      transactionCount: number
      categories: Record<string, { income: number; expense: number; balance: number }>
    }
  }
}

interface Currency {
  code: string
  symbol: string
  name: string
}

interface FlowMonthlySummaryChartProps {
  monthlyData: MonthlyData
  baseCurrency: Currency
  title?: string
  height?: number
}

export default function FlowMonthlySummaryChart({
  monthlyData,
  baseCurrency,
  title = '月度收支汇总',
  height = 400
}: FlowMonthlySummaryChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || !monthlyData) return

    // 初始化图表
    chartInstance.current = echarts.init(chartRef.current)
    renderFlowChart()

    // 响应式处理
    const handleResize = () => {
      chartInstance.current?.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [monthlyData, baseCurrency])

  const renderFlowChart = () => {
    if (!monthlyData || !chartInstance.current) return

    // 准备数据
    const months = Object.keys(monthlyData).sort()
    const incomeData: number[] = []
    const expenseData: number[] = []
    const balanceData: number[] = []

    months.forEach(month => {
      const monthData = monthlyData[month]
      const currencyData = monthData[baseCurrency.code] || { income: 0, expense: 0, balance: 0 }

      incomeData.push(currencyData.income)
      expenseData.push(currencyData.expense)
      balanceData.push(currencyData.balance)
    })

    // 格式化月份显示
    const formattedMonths = months.map(month => {
      const [year, monthNum] = month.split('-')
      return `${year}/${monthNum.padStart(2, '0')}`
    })

    // 配置图表选项
    const option: echarts.EChartsOption = {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function (params: any) {
          const paramsArray = Array.isArray(params) ? params : [params]
          let result = `<div style="font-weight: bold; margin-bottom: 5px;">${paramsArray[0].axisValue}</div>`
          paramsArray.forEach((param: any) => {
            const value = param.value as number
            const formattedValue = value >= 0
              ? `+${baseCurrency.symbol}${Math.abs(value).toFixed(2)}`
              : `-${baseCurrency.symbol}${Math.abs(value).toFixed(2)}`
            result += `<div style="display: flex; align-items: center; margin: 2px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color}; margin-right: 5px;"></span>
              <span style="flex: 1;">${param.seriesName}:</span>
              <span style="font-weight: bold; color: ${value >= 0 ? '#10b981' : '#ef4444'};">${formattedValue}</span>
            </div>`
          })
          return result
        }
      },
      legend: {
        data: ['收入', '支出', '净收支'],
        top: 30,
        itemGap: 20
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
        data: formattedMonths,
        axisLabel: {
          rotate: 45,
          fontSize: 12
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: function (value: number) {
            if (Math.abs(value) >= 10000) {
              return `${baseCurrency.symbol}${(value / 10000).toFixed(1)}万`
            } else if (Math.abs(value) >= 1000) {
              return `${baseCurrency.symbol}${(value / 1000).toFixed(1)}k`
            }
            return `${baseCurrency.symbol}${value.toFixed(0)}`
          }
        }
      },
      series: [
        {
          name: '收入',
          type: 'bar' as const,
          data: incomeData,
          itemStyle: {
            color: '#10b981'
          },
          emphasis: {
            itemStyle: {
              color: '#059669'
            }
          }
        },
        {
          name: '支出',
          type: 'bar' as const,
          data: expenseData.map(val => -val), // 显示为负值
          itemStyle: {
            color: '#ef4444'
          },
          emphasis: {
            itemStyle: {
              color: '#dc2626'
            }
          }
        },
        {
          name: '净收支',
          type: 'line' as const,
          data: balanceData,
          itemStyle: {
            color: '#3b82f6'
          },
          lineStyle: {
            width: 3
          },
          symbol: 'circle',
          symbolSize: 6,
          emphasis: {
            itemStyle: {
              color: '#2563eb'
            }
          }
        }
      ]
    }

    // 设置图表选项
    chartInstance.current.setOption(option)
  }

  const renderSummary = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="text-gray-500 mb-1">总收入</div>
          <div className="text-lg font-semibold text-green-600">
            {baseCurrency.symbol}{Object.values(monthlyData).reduce((sum, monthData) => {
              const currencyData = monthData[baseCurrency.code] || { income: 0 }
              return sum + currencyData.income
            }, 0).toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500 mb-1">总支出</div>
          <div className="text-lg font-semibold text-red-600">
            {baseCurrency.symbol}{Object.values(monthlyData).reduce((sum, monthData) => {
              const currencyData = monthData[baseCurrency.code] || { expense: 0 }
              return sum + currencyData.expense
            }, 0).toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500 mb-1">净收支</div>
          <div className={`text-lg font-semibold ${
            Object.values(monthlyData).reduce((sum, monthData) => {
              const currencyData = monthData[baseCurrency.code] || { balance: 0 }
              return sum + currencyData.balance
            }, 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {baseCurrency.symbol}{Object.values(monthlyData).reduce((sum, monthData) => {
              const currencyData = monthData[baseCurrency.code] || { balance: 0 }
              return sum + currencyData.balance
            }, 0).toFixed(2)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div
        ref={chartRef}
        style={{ width: '100%', height: `${height}px` }}
      />

      {/* 数据摘要 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        {renderSummary()}
      </div>
    </div>
  )
}
