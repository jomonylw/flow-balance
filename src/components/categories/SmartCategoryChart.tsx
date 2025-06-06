'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

/**
 * 从交易备注中提取余额变化金额
 * @param notes 交易备注
 * @returns 变化金额，如果无法提取则返回null
 */
function extractBalanceChangeFromNotes(notes: string): number | null {
  if (!notes) return null

  // 匹配模式：变化金额：+123.45 或 变化金额：-123.45
  const match = notes.match(/变化金额：([+-]?\d+\.?\d*)/)
  if (match && match[1]) {
    return parseFloat(match[1])
  }

  return null
}

interface Transaction {
  type: 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT'
  amount: number
  date: string
  notes?: string
}

interface Category {
  id: string
  name: string
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  transactions: Transaction[]
}

interface SmartCategoryChartProps {
  category: Category
  timeRange: string
  currencySymbol: string
}

export default function SmartCategoryChart({
  category,
  timeRange,
  currencySymbol
}: SmartCategoryChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  const accountType = category.type || 'ASSET'
  const isStockCategory = accountType === 'ASSET' || accountType === 'LIABILITY'
  const isFlowCategory = accountType === 'INCOME' || accountType === 'EXPENSE'

  useEffect(() => {
    if (!chartRef.current) return

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    // 根据分类类型处理不同的数据
    if (isStockCategory) {
      const chartData = processStockChartData(category.transactions, timeRange)
      renderStockChart(chartData)
    } else if (isFlowCategory) {
      const chartData = processFlowChartData(category.transactions, timeRange, accountType)
      renderFlowChart(chartData)
    }

    // 响应式处理
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [category.transactions, timeRange, accountType])

  // 处理存量类数据（资产/负债）
  const processStockChartData = (transactions: Transaction[], timeRange: string) => {
    const now = new Date()
    let startDate: Date
    let dateFormat: 'day' | 'week' | 'month' = 'month'

    // 根据时间范围确定起始日期和格式
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
    }

    // 按时间排序交易
    const sortedTransactions = transactions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // 计算累计余额变化
    const dates: string[] = []
    const balances: number[] = []
    let cumulativeBalance = 0

    if (dateFormat === 'day') {
      // 按天统计余额变化
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        dates.push(dateStr)
        
        // 计算当天的余额变化
        const dayTransactions = sortedTransactions.filter(t => 
          t.date.split('T')[0] === dateStr
        )
        
        dayTransactions.forEach(transaction => {
          const amount = transaction.amount
          if (transaction.type === 'BALANCE_ADJUSTMENT') {
            // 余额调整：从备注中提取实际变化金额
            const changeAmount = extractBalanceChangeFromNotes(transaction.notes || '')
            cumulativeBalance += changeAmount || amount
          } else if (accountType === 'ASSET') {
            cumulativeBalance += transaction.type === 'INCOME' ? amount : -amount
          } else if (accountType === 'LIABILITY') {
            cumulativeBalance += transaction.type === 'INCOME' ? amount : -amount
          }
        })
        
        balances.push(cumulativeBalance)
      }
    } else if (dateFormat === 'month') {
      // 按月统计余额变化
      const months = getMonthsInRange(startDate, now)
      months.forEach(month => {
        dates.push(month.toISOString().split('T')[0])
        
        const monthTransactions = sortedTransactions.filter(t => {
          const tDate = new Date(t.date)
          return tDate.getFullYear() === month.getFullYear() && 
                 tDate.getMonth() === month.getMonth()
        })
        
        monthTransactions.forEach(transaction => {
          const amount = transaction.amount
          if (transaction.type === 'BALANCE_ADJUSTMENT') {
            // 余额调整：从备注中提取实际变化金额
            const changeAmount = extractBalanceChangeFromNotes(transaction.notes || '')
            cumulativeBalance += changeAmount || amount
          } else if (accountType === 'ASSET') {
            cumulativeBalance += transaction.type === 'INCOME' ? amount : -amount
          } else if (accountType === 'LIABILITY') {
            cumulativeBalance += transaction.type === 'INCOME' ? amount : -amount
          }
        })
        
        balances.push(cumulativeBalance)
      })
    }

    return { dates, balances }
  }

  // 处理流量类数据（收入/支出）
  const processFlowChartData = (transactions: Transaction[], timeRange: string, accountType: string) => {
    const now = new Date()
    let startDate: Date
    let dateFormat: 'day' | 'week' | 'month' = 'month'

    // 根据时间范围确定起始日期和格式
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
    }

    // 过滤相关交易（流量类账户不应该有余额调整）
    const relevantTransactions = transactions.filter(t => {
      if (t.type === 'BALANCE_ADJUSTMENT') {
        console.warn(`流量类分类 ${category.name} 不应该有余额调整交易`)
        return false
      }
      return (accountType === 'INCOME' && t.type === 'INCOME') ||
             (accountType === 'EXPENSE' && t.type === 'EXPENSE')
    })

    const dates: string[] = []
    const amounts: number[] = []

    if (dateFormat === 'day') {
      // 按天统计流量
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        dates.push(dateStr)
        
        const dayAmount = relevantTransactions
          .filter(t => t.date.split('T')[0] === dateStr)
          .reduce((sum, t) => sum + t.amount, 0)
        
        amounts.push(dayAmount)
      }
    } else if (dateFormat === 'month') {
      // 按月统计流量
      const months = getMonthsInRange(startDate, now)
      months.forEach(month => {
        dates.push(month.toISOString().split('T')[0])
        
        const monthAmount = relevantTransactions
          .filter(t => {
            const tDate = new Date(t.date)
            return tDate.getFullYear() === month.getFullYear() && 
                   tDate.getMonth() === month.getMonth()
          })
          .reduce((sum, t) => sum + t.amount, 0)
        
        amounts.push(monthAmount)
      })
    }

    return { dates, amounts }
  }

  // 渲染存量类图表（余额趋势线）
  const renderStockChart = (data: { dates: string[], balances: number[] }) => {
    const option = {
      title: {
        text: `${category.name} - 余额趋势`,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const date = params[0].axisValue
          const balance = params[0].value
          return `${date}<br/>余额: ${currencySymbol}${balance.toFixed(2)}`
        }
      },
      xAxis: {
        type: 'category',
        data: data.dates,
        axisLabel: {
          formatter: (value: string) => {
            const date = new Date(value)
            return `${date.getMonth() + 1}/${date.getDate()}`
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `${currencySymbol}${value.toFixed(0)}`
        }
      },
      series: [{
        name: '余额',
        type: 'line',
        data: data.balances,
        smooth: true,
        lineStyle: {
          color: accountType === 'ASSET' ? '#3B82F6' : '#F59E0B',
          width: 3
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{
              offset: 0,
              color: accountType === 'ASSET' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'
            }, {
              offset: 1,
              color: accountType === 'ASSET' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)'
            }]
          }
        }
      }],
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      }
    }

    chartInstance.current?.setOption(option)
  }

  // 渲染流量类图表（柱状图）
  const renderFlowChart = (data: { dates: string[], amounts: number[] }) => {
    const option = {
      title: {
        text: `${category.name} - ${accountType === 'INCOME' ? '收入' : '支出'}趋势`,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const date = params[0].axisValue
          const amount = params[0].value
          return `${date}<br/>${accountType === 'INCOME' ? '收入' : '支出'}: ${currencySymbol}${amount.toFixed(2)}`
        }
      },
      xAxis: {
        type: 'category',
        data: data.dates,
        axisLabel: {
          formatter: (value: string) => {
            const date = new Date(value)
            return `${date.getMonth() + 1}/${date.getDate()}`
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `${currencySymbol}${value.toFixed(0)}`
        }
      },
      series: [{
        name: accountType === 'INCOME' ? '收入' : '支出',
        type: 'bar',
        data: data.amounts,
        itemStyle: {
          color: accountType === 'INCOME' ? '#10B981' : '#EF4444'
        }
      }],
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      }
    }

    chartInstance.current?.setOption(option)
  }

  // 辅助函数：获取月份范围
  const getMonthsInRange = (startDate: Date, endDate: Date): Date[] => {
    const months: Date[] = []
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    
    while (current <= endDate) {
      months.push(new Date(current))
      current.setMonth(current.getMonth() + 1)
    }
    
    return months
  }

  if (category.transactions.length === 0) {
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
