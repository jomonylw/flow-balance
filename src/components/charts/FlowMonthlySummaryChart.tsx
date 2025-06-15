'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'

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
  title,
  height = 400
}: FlowMonthlySummaryChartProps) {
  const { t, isLoading } = useLanguage()
  const { resolvedTheme } = useTheme()

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || !monthlyData) {
      return
    }

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, resolvedTheme === 'dark' ? 'dark' : null)
    }

    renderFlowChart()

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
  }, [monthlyData, baseCurrency, resolvedTheme, isLoading])

  const renderFlowChart = () => {
    if (!monthlyData || !chartInstance.current || isLoading) {
      return
    }

    const months = Object.keys(monthlyData).sort()

    // 格式化月份显示
    const formattedMonths = months.map(month => {
      const [year, monthNum] = month.split('-')
      return `${year}/${monthNum.padStart(2, '0')}`
    })

    // 获取所有子分类/账户名称
    const allCategories = new Set<string>()
    months.forEach(month => {
      const monthData = monthlyData[month]
      const currencyData = monthData[baseCurrency.code]
      if (currencyData?.categories) {
        Object.keys(currencyData.categories).forEach(categoryName => {
          allCategories.add(categoryName)
        })
      }
    })

    const categoryNames = Array.from(allCategories)
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']

    // 判断是收入类还是支出类（基于第一个月的数据）
    let isIncomeCategory = true
    if (months.length > 0) {
      const firstMonthData = monthlyData[months[0]]
      const currencyData = firstMonthData[baseCurrency.code]
      if (currencyData) {
        // 如果支出大于收入，则认为是支出类分类
        isIncomeCategory = currencyData.income >= currencyData.expense
      }
    }

    // 为每个子分类/账户准备柱状图数据
    const barSeries = categoryNames.map((categoryName, index) => {
      const data = months.map(month => {
        const monthData = monthlyData[month]
        const currencyData = monthData[baseCurrency.code]
        if (currencyData?.categories) {
          const category = currencyData.categories[categoryName]
          if (category) {
            // 根据分类类型返回相应的数据
            return isIncomeCategory ? category.income : category.expense
          }
        }
        return 0
      })

      return {
        name: categoryName,
        type: 'bar' as const,
        stack: 'total',
        data,
        itemStyle: {
          color: colors[index % colors.length]
        }
      }
    })

    // 准备总流量线图数据
    const totalFlowData = months.map(month => {
      const monthData = monthlyData[month]
      const currencyData = monthData[baseCurrency.code]
      if (currencyData) {
        return isIncomeCategory ? currencyData.income : currencyData.expense
      }
      return 0
    })

    const lineSeries = {
      name: isIncomeCategory ? t('category.total.income') : t('category.total.expense'),
      type: 'line' as const,
      yAxisIndex: 1,
      smooth: true,
      data: totalFlowData,
      lineStyle: {
        color: isIncomeCategory ? '#10b981' : '#ef4444',
        width: 3
      },
      itemStyle: {
        color: isIncomeCategory ? '#10b981' : '#ef4444'
      },
      symbol: 'circle',
      symbolSize: 6
    }

    const series = [...barSeries, lineSeries]

    const chartTitle = title || (isIncomeCategory ? `${t('category.income')} - ${t('category.monthly.cash.flow.summary')}` : `${t('category.expense')} - ${t('category.monthly.cash.flow.summary')}`)

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      title: {
        text: chartTitle,
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
          type: 'shadow'
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (params: any) {
          const paramsArray = Array.isArray(params) ? params : [params]
          if (!paramsArray.length) {
            return ''
          }
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${
            paramsArray[0]?.axisValue ?? ''
          }</div>`
          let total = 0

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          paramsArray.forEach((param: any) => {
            const value = (param?.value as number) || 0
            if (param?.seriesType === 'bar') {
              total += value
            }

            // 显示所有子分类/账户，包括零金额的
            result += `
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: ${
                  param?.color ?? '#ccc'
                }; margin-right: 8px; border-radius: 50%;"></span>
                <span style="margin-right: 8px;">${param?.seriesName ?? 'N/A'}:</span>
                <span style="font-weight: bold; color: ${isIncomeCategory ? '#059669' : '#dc2626'};">
                  ${baseCurrency.symbol}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            `
          })

          result += `<div style="border-top: 1px solid #ccc; margin-top: 8px; padding-top: 4px; font-weight: bold;">
            ${isIncomeCategory ? t('category.total.income') : t('category.total.expense')}: <span style="color: ${isIncomeCategory ? '#059669' : '#dc2626'};">
              ${baseCurrency.symbol}${Math.abs(total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>`

          return result
        }
      },
      legend: {
        data: [...categoryNames, isIncomeCategory ? t('category.total.income') : t('category.total.expense')],
        top: 30,
        type: 'scroll',
        textStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
        }
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
          fontSize: 12,
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
        }
      },
      yAxis: [
        {
          type: 'value',
          name: isIncomeCategory ? t('category.income') : t('category.expense'),
          position: 'left',
          axisLabel: {
            formatter: function (value: number) {
              if (Math.abs(value) >= 1000) {
                return `${baseCurrency.symbol}${(value / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
              }
              return `${baseCurrency.symbol}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
            },
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
          },
          nameTextStyle: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
          }
        },
        {
          type: 'value',
          name: isIncomeCategory ? t('category.income') + t('chart.balance.trend') : t('category.expense') + t('chart.balance.trend'),
          position: 'right',
          axisLabel: {
            formatter: function (value: number) {
              if (Math.abs(value) >= 1000) {
                return `${baseCurrency.symbol}${(value / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
              }
              return `${baseCurrency.symbol}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
            },
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
          },
          nameTextStyle: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
          }
        }
      ],
      series
    }

    // 设置图表选项
    chartInstance.current.setOption(option)
  }

  if (isLoading) {
    return (
      <div className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <div className="text-gray-500">{t('chart.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      <div
        ref={chartRef}
        style={{ width: '100%', height: `${height}px` }}
      />
    </div>
  )
}
