'use client'

import { useState, useEffect, useRef } from 'react'
import * as echarts from 'echarts'

// Mock data for testing
const mockStockMonthlyData = {
  '2024-01': {
    'USD': {
      accounts: {
        '1': { balance: 1000, name: '现金账户' },
        '2': { balance: 5000, name: '储蓄账户' },
        '3': { balance: 10000, name: '投资账户' }
      },
      totalBalance: 16000
    }
  },
  '2024-02': {
    'USD': {
      accounts: {
        '1': { balance: 1200, name: '现金账户' },
        '2': { balance: 5200, name: '储蓄账户' },
        '3': { balance: 10500, name: '投资账户' }
      },
      totalBalance: 16900
    }
  },
  '2024-03': {
    'USD': {
      accounts: {
        '1': { balance: 1100, name: '现金账户' },
        '2': { balance: 5300, name: '储蓄账户' },
        '3': { balance: 11000, name: '投资账户' }
      },
      totalBalance: 17400
    }
  }
}

const mockBaseCurrency = {
  code: 'USD',
  symbol: '$',
  name: 'US Dollar'
}

function SimpleStockChart() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) {
      console.log('No chart ref')
      return
    }

    console.log('Initializing simple chart...')
    
    // 初始化图表
    chartInstance.current = echarts.init(chartRef.current)
    
    // 准备数据
    const months = Object.keys(mockStockMonthlyData).sort()
    const formattedMonths = months.map(month => {
      const [year, monthNum] = month.split('-')
      return `${year}/${monthNum.padStart(2, '0')}`
    })

    console.log('Months:', formattedMonths)

    // 获取所有账户名称
    const allAccounts = new Set<string>()
    months.forEach(month => {
      const monthData = mockStockMonthlyData[month as keyof typeof mockStockMonthlyData]
      const currencyData = monthData[mockBaseCurrency.code as keyof typeof monthData]
      if (currencyData?.accounts) {
        Object.keys(currencyData.accounts).forEach(accountId => {
          allAccounts.add((currencyData.accounts as any)[accountId].name)
        })
      }
    })

    const accountNames = Array.from(allAccounts)
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']

    console.log('Account names:', accountNames)

    // 为每个账户准备柱状图数据
    const barSeries = accountNames.map((accountName, index) => {
      const data = months.map(month => {
        const monthData = mockStockMonthlyData[month as keyof typeof mockStockMonthlyData]
        const currencyData = monthData[mockBaseCurrency.code as keyof typeof monthData]
        if (currencyData?.accounts) {
          const account = Object.values(currencyData.accounts).find(acc => acc.name === accountName)
          return account?.balance || 0
        }
        return 0
      })

      return {
        name: accountName,
        type: 'bar' as const,
        stack: 'total',
        data,
        itemStyle: {
          color: colors[index % colors.length]
        }
      }
    })

    // 准备总余额线图数据
    const totalBalanceData = months.map(month => {
      const monthData = mockStockMonthlyData[month as keyof typeof mockStockMonthlyData]
      const currencyData = monthData[mockBaseCurrency.code as keyof typeof monthData]
      return currencyData?.totalBalance || 0
    })

    const lineSeries = {
      name: '总余额',
      type: 'line' as const,
      yAxisIndex: 1,
      data: totalBalanceData,
      lineStyle: {
        color: '#ef4444',
        width: 3
      },
      itemStyle: {
        color: '#ef4444'
      },
      symbol: 'circle',
      symbolSize: 6
    }

    const series = [...barSeries, lineSeries]

    console.log('Series data:', series)

    const option: echarts.EChartsOption = {
      title: {
        text: '月度账户余额汇总',
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
        }
      },
      legend: {
        data: [...accountNames, '总余额'],
        top: 30,
        type: 'scroll'
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
          fontSize: 12
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '账户余额',
          position: 'left',
          axisLabel: {
            formatter: function (value: number) {
              if (Math.abs(value) >= 10000) {
                return `${mockBaseCurrency.symbol}${(value / 10000).toFixed(1)}万`
              } else if (Math.abs(value) >= 1000) {
                return `${mockBaseCurrency.symbol}${(value / 1000).toFixed(1)}k`
              }
              return `${mockBaseCurrency.symbol}${value.toFixed(0)}`
            }
          }
        },
        {
          type: 'value',
          name: '余额趋势',
          position: 'right',
          axisLabel: {
            formatter: function (value: number) {
              if (Math.abs(value) >= 10000) {
                return `${mockBaseCurrency.symbol}${(value / 10000).toFixed(1)}万`
              } else if (Math.abs(value) >= 1000) {
                return `${mockBaseCurrency.symbol}${(value / 1000).toFixed(1)}k`
              }
              return `${mockBaseCurrency.symbol}${value.toFixed(0)}`
            }
          }
        }
      ],
      series
    }

    console.log('Setting chart options...')
    chartInstance.current.setOption(option)
    console.log('Chart options set successfully')

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
  }, [])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">简单图表测试</h2>
      <div
        ref={chartRef}
        style={{ width: '100%', height: '500px' }}
      />
    </div>
  )
}

export default function TestSimpleChart() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          简单图表测试页面
        </h1>
        
        <div className="space-y-8">
          <SimpleStockChart />
          
          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="text-lg font-semibold mb-4">
              调试信息
            </h3>
            <p>这是一个简化版本的图表，不依赖翻译系统和主题系统。</p>
            <p>如果这个图表能正常显示，说明基础的 ECharts 功能是正常的。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
