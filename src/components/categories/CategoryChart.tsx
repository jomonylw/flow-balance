'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface Transaction {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'BALANCE'
  amount: number
  date: string
}

interface CategoryChartProps {
  transactions: Transaction[]
  timeRange: string
  currencySymbol: string
}

export default function CategoryChart({
  transactions,
  timeRange,
  currencySymbol
}: CategoryChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    // 处理数据
    const chartData = processChartData(transactions, timeRange)
    
    // 配置图表选项
    const option = {
      title: {
        text: '交易趋势',
        left: 'left',
        textStyle: {
          fontSize: 16,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function(params: any) {
          let result = `${params[0].axisValue}<br/>`
          params.forEach((param: any) => {
            const value = param.value >= 0
              ? `+${currencySymbol}${param.value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `-${currencySymbol}${Math.abs(param.value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            result += `${param.marker}${param.seriesName}: ${value}<br/>`
          })
          return result
        }
      },
      legend: {
        data: ['收入', '支出', '净额'],
        top: 30
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
        boundaryGap: false,
        data: chartData.dates,
        axisLabel: {
          formatter: function(value: string) {
            return formatDateLabel(value, timeRange)
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: function(value: number) {
            return `${currencySymbol}${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
          }
        }
      },
      series: [
        {
          name: '收入',
          type: 'line',
          data: chartData.income,
          smooth: true,
          lineStyle: {
            color: '#10b981'
          },
          itemStyle: {
            color: '#10b981'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.1)' }
            ])
          }
        },
        {
          name: '支出',
          type: 'line',
          data: chartData.expense,
          smooth: true,
          lineStyle: {
            color: '#ef4444'
          },
          itemStyle: {
            color: '#ef4444'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0.1)' }
            ])
          }
        },
        {
          name: '净额',
          type: 'line',
          data: chartData.net,
          smooth: true,
          lineStyle: {
            color: '#3b82f6',
            width: 3
          },
          itemStyle: {
            color: '#3b82f6'
          }
        }
      ]
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
  }, [transactions, timeRange, currencySymbol])

  // 清理图表实例
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  const processChartData = (transactions: Transaction[], timeRange: string) => {
    const now = new Date()
    let startDate: Date
    let dateFormat: string

    // 根据时间范围确定开始日期和日期格式
    switch (timeRange) {
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        dateFormat = 'day'
        break
      case 'last3Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        dateFormat = 'week'
        break
      case 'last6Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        dateFormat = 'month'
        break
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1)
        dateFormat = 'month'
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        dateFormat = 'day'
    }

    // 生成日期数组
    const dates: string[] = []
    const income: number[] = []
    const expense: number[] = []
    const net: number[] = []

    if (dateFormat === 'day') {
      // 按天统计
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        dates.push(dateStr)
        
        const dayTransactions = transactions.filter(t => 
          t.date.split('T')[0] === dateStr
        )
        
        const dayIncome = dayTransactions
          .filter(t => t.type === 'INCOME')
          .reduce((sum, t) => sum + t.amount, 0)
        
        const dayExpense = dayTransactions
          .filter(t => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + t.amount, 0)
        
        income.push(dayIncome)
        expense.push(-dayExpense) // 支出显示为负数
        net.push(dayIncome - dayExpense)
      }
    } else if (dateFormat === 'week') {
      // 按周统计
      const weeks = getWeeksInRange(startDate, now)
      weeks.forEach(week => {
        dates.push(week.start.toISOString().split('T')[0])
        
        const weekTransactions = transactions.filter(t => {
          const tDate = new Date(t.date)
          return tDate >= week.start && tDate <= week.end
        })
        
        const weekIncome = weekTransactions
          .filter(t => t.type === 'INCOME')
          .reduce((sum, t) => sum + t.amount, 0)
        
        const weekExpense = weekTransactions
          .filter(t => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + t.amount, 0)
        
        income.push(weekIncome)
        expense.push(-weekExpense)
        net.push(weekIncome - weekExpense)
      })
    } else {
      // 按月统计
      const months = getMonthsInRange(startDate, now)
      months.forEach(month => {
        dates.push(month.toISOString().split('T')[0])
        
        const monthTransactions = transactions.filter(t => {
          const tDate = new Date(t.date)
          return tDate.getFullYear() === month.getFullYear() && 
                 tDate.getMonth() === month.getMonth()
        })
        
        const monthIncome = monthTransactions
          .filter(t => t.type === 'INCOME')
          .reduce((sum, t) => sum + t.amount, 0)
        
        const monthExpense = monthTransactions
          .filter(t => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + t.amount, 0)
        
        income.push(monthIncome)
        expense.push(-monthExpense)
        net.push(monthIncome - monthExpense)
      })
    }

    return { dates, income, expense, net }
  }

  const getWeeksInRange = (start: Date, end: Date) => {
    const weeks = []
    const current = new Date(start)
    
    while (current <= end) {
      const weekStart = new Date(current)
      const weekEnd = new Date(current)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      weeks.push({ start: new Date(weekStart), end: new Date(weekEnd) })
      current.setDate(current.getDate() + 7)
    }
    
    return weeks
  }

  const getMonthsInRange = (start: Date, end: Date) => {
    const months = []
    const current = new Date(start.getFullYear(), start.getMonth(), 1)
    
    while (current <= end) {
      months.push(new Date(current))
      current.setMonth(current.getMonth() + 1)
    }
    
    return months
  }

  const formatDateLabel = (dateStr: string, timeRange: string) => {
    const date = new Date(dateStr)

    switch (timeRange) {
      case 'thisMonth':
        return date.getDate().toString()
      case 'last3Months':
      case 'last6Months':
        return `${date.getMonth() + 1}/${date.getDate()}`
      case 'thisYear':
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
      default:
        return date.getDate().toString()
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-lg font-medium">暂无数据</p>
          <p className="text-sm mt-1">该分类下还没有交易记录</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={chartRef} 
      className="w-full h-64"
      style={{ minHeight: '400px' }}
    />
  )
}
