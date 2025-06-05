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

interface MonthlySummaryChartProps {
  monthlyData?: MonthlyData
  stockMonthlyData?: StockMonthlyData
  baseCurrency: Currency
  title?: string
  height?: number
  showCategories?: boolean
  chartType?: 'flow' | 'stock' // 新增：区分流量和存量图表
}

export default function MonthlySummaryChart({
  monthlyData,
  stockMonthlyData,
  baseCurrency,
  title,
  height = 400,
  showCategories = false,
  chartType = 'flow'
}: MonthlySummaryChartProps) {
  // 根据图表类型设置默认标题
  const defaultTitle = chartType === 'stock' ? '月度账户余额汇总' : '月度收支汇总'
  const chartTitle = title || defaultTitle
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    // 初始化图表
    chartInstance.current = echarts.init(chartRef.current)

    if (chartType === 'stock' && stockMonthlyData) {
      // 存量类图表：账户汇总叠加柱状图
      renderStockChart()
    } else if (chartType === 'flow' && monthlyData) {
      // 流量类图表：收入支出图
      renderFlowChart()
    }

    // 响应式处理
    const handleResize = () => {
      chartInstance.current?.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [monthlyData, stockMonthlyData, baseCurrency, chartType])

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
      return `${year}年${monthNum}月`
    })

    // 配置图表选项
    const option: echarts.EChartsOption = {
      title: {
        text: chartTitle,
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
          let result = `<div style="font-weight: bold; margin-bottom: 5px;">${params[0].axisValue}</div>`
          params.forEach((param: any) => {
            const value = param.value
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
          type: 'bar',
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
          type: 'bar',
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
          type: 'line',
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

  const renderStockChart = () => {
    if (!stockMonthlyData || !chartInstance.current) return

    // 准备数据
    const months = Object.keys(stockMonthlyData).sort()
    const formattedMonths = months.map(month => {
      const [year, monthNum] = month.split('-')
      return `${year}年${monthNum}月`
    })

    // 获取所有账户名称
    const allAccounts = new Set<string>()
    months.forEach(month => {
      const monthData = stockMonthlyData[month]
      const currencyData = monthData[baseCurrency.code]
      if (currencyData?.accounts) {
        Object.keys(currencyData.accounts).forEach(accountId => {
          allAccounts.add(currencyData.accounts[accountId].name)
        })
      }
    })

    const accountNames = Array.from(allAccounts)
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']

    // 为每个账户准备数据
    const series = accountNames.map((accountName, index) => {
      const data = months.map(month => {
        const monthData = stockMonthlyData[month]
        const currencyData = monthData[baseCurrency.code]
        if (currencyData?.accounts) {
          const account = Object.values(currencyData.accounts).find(acc => acc.name === accountName)
          return account?.balance || 0
        }
        return 0
      })

      return {
        name: accountName,
        type: 'bar',
        stack: 'total',
        data,
        itemStyle: {
          color: colors[index % colors.length]
        }
      }
    })

    const option: echarts.EChartsOption = {
      title: {
        text: chartTitle,
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
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${params[0].axisValue}</div>`
          let total = 0

          params.forEach((param: any) => {
            const value = param.value || 0
            total += value

            // 显示所有账户，包括零余额的账户
            result += `
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color}; margin-right: 8px; border-radius: 50%;"></span>
                <span style="margin-right: 8px;">${param.seriesName}:</span>
                <span style="font-weight: bold; color: ${value >= 0 ? '#059669' : '#dc2626'};">
                  ${baseCurrency.symbol}${Math.abs(value).toFixed(2)}${value < 0 ? ' (负)' : ''}
                </span>
              </div>
            `
          })

          result += `<div style="border-top: 1px solid #ccc; margin-top: 8px; padding-top: 4px; font-weight: bold;">
            总计: <span style="color: ${total >= 0 ? '#059669' : '#dc2626'};">
              ${baseCurrency.symbol}${Math.abs(total).toFixed(2)}${total < 0 ? ' (负)' : ''}
            </span>
          </div>`

          return result
        }
      },
      legend: {
        data: accountNames,
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
      series
    }

    // 设置图表选项
    chartInstance.current.setOption(option)
  }

  const renderSummary = () => {
    if (chartType === 'stock' && stockMonthlyData) {
      // 存量类数据摘要
      let totalBalance = 0
      let monthCount = 0
      const accountCount = new Set<string>()
      let latestBalance = 0

      // 计算最新月份的余额和平均余额
      const sortedMonths = Object.keys(stockMonthlyData).sort()

      sortedMonths.forEach(monthKey => {
        const monthData = stockMonthlyData[monthKey]
        const currencyData = monthData[baseCurrency.code]

        if (currencyData && currencyData.totalBalance !== undefined) {
          totalBalance += currencyData.totalBalance
          monthCount++

          // 记录最新月份的余额
          if (monthKey === sortedMonths[sortedMonths.length - 1]) {
            latestBalance = currencyData.totalBalance
          }
        }

        // 统计账户数量
        if (currencyData?.accounts) {
          Object.keys(currencyData.accounts).forEach(accountId => {
            accountCount.add(accountId)
          })
        }
      })

      const averageBalance = monthCount > 0 ? totalBalance / monthCount : 0

      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-gray-500 mb-1">当前总余额</div>
            <div className="text-lg font-semibold text-blue-600">
              {baseCurrency.symbol}{latestBalance.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 mb-1">平均余额</div>
            <div className="text-lg font-semibold text-gray-600">
              {baseCurrency.symbol}{averageBalance.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 mb-1">账户数量</div>
            <div className="text-lg font-semibold text-gray-600">
              {accountCount.size} 个账户
            </div>
          </div>
        </div>
      )
    } else if (chartType === 'flow' && monthlyData) {
      // 流量类数据摘要
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
    return null
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
