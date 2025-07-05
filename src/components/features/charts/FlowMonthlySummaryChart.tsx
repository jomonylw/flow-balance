'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as echarts from 'echarts'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import { useTheme } from '@/contexts/providers/ThemeContext'
import ColorManager from '@/lib/utils/color'
import type { SimpleCurrency, CategoryType } from '@/types/core'
import type { TooltipParam } from '@/types/ui'
import type { FlowMonthlyData } from '@/types/components'
import { CHART } from '@/lib/constants/app-config'

interface LocalFlowAccount {
  id: string
  name: string
  color?: string | null
  type?: string
}

interface FlowMonthlySummaryChartProps {
  monthlyData: FlowMonthlyData
  baseCurrency: SimpleCurrency
  title?: string
  height?: number
  accounts?: LocalFlowAccount[]
  showPieChart?: boolean
}

export default function FlowMonthlySummaryChart({
  monthlyData,
  baseCurrency,
  title,
  height = CHART.DEFAULT_HEIGHT,
  accounts = [],
  showPieChart = false,
}: FlowMonthlySummaryChartProps) {
  const { t, isLoading } = useLanguage()
  const { formatCurrency } = useUserCurrencyFormatter()
  const { formatChartDate } = useUserDateFormatter()
  const { resolvedTheme } = useTheme()

  const chartRef = useRef<HTMLDivElement>(null)
  const pieChartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const pieChartInstance = useRef<echarts.ECharts | null>(null)

  // 状态管理：当前选中的月份（用于饼状图显示）
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  // 获取最新月份
  const getLatestMonth = useCallback(() => {
    if (!monthlyData || Object.keys(monthlyData).length === 0) return ''
    const months = Object.keys(monthlyData).sort()
    return months[months.length - 1]
  }, [monthlyData])

  // 初始化选中月份为最新月份
  useEffect(() => {
    if (!selectedMonth && monthlyData) {
      const latestMonth = getLatestMonth()
      if (latestMonth) {
        setSelectedMonth(latestMonth)
      }
    }
  }, [monthlyData, selectedMonth, getLatestMonth])

  // 获取指定月份的饼状图数据
  const getPieChartData = useCallback(
    (month: string) => {
      if (!monthlyData || !monthlyData[month]) return []

      const monthData = monthlyData[month]
      const currencyData = monthData[baseCurrency.code]
      if (!currencyData?.categories) return []

      // 判断是收入类还是支出类
      const isIncomeCategory = currencyData.income >= currencyData.expense

      return Object.entries(currencyData.categories)
        .map(([categoryName, category]) => ({
          name: categoryName,
          value: isIncomeCategory ? category.income : category.expense,
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
    },
    [monthlyData, baseCurrency.code]
  )

  // 柱状图渲染函数
  const renderBarChart = useCallback(
    (chart: echarts.ECharts) => {
      if (!chart || chart.isDisposed()) {
        return
      }

      if (!monthlyData || Object.keys(monthlyData).length === 0) {
        try {
          chart.clear()
        } catch (error) {
          console.warn('Error clearing chart:', error)
        }
        return
      }

      const months = Object.keys(monthlyData).sort()
      const formattedMonths = months.map(month => {
        const date = new Date(month + '-01')
        return formatChartDate(date, 'month')
      })

      // 根据数据点数量动态设置X轴显示
      const dataPointCount = formattedMonths.length
      const shouldRotateLabels = dataPointCount > 12 || window.innerWidth < 768
      const labelInterval = dataPointCount > 24 ? 'auto' : 0

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

      // 使用ColorManager智能生成颜色
      const categoryColors = ColorManager.generateSmartChartColors(
        categoryNames.map(name => ({ name })),
        item => {
          const account = accounts.find(acc => acc.name === item.name)
          if (account && account.color) {
            return ColorManager.getAccountColor(
              account.id,
              account.color,
              account.type as CategoryType
            )
          }
          return null
        }
      )

      // 判断是收入类还是支出类
      let isIncomeCategory = true
      if (months.length > 0) {
        const firstMonthData = monthlyData[months[0]]
        const currencyData = firstMonthData[baseCurrency.code]
        if (currencyData) {
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
            color: categoryColors[index],
            borderRadius: 4,
          },
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

      const lineColor = isIncomeCategory
        ? ColorManager.getDefaultColors().INCOME
        : ColorManager.getDefaultColors().EXPENSE

      const lineSeries = {
        name: isIncomeCategory
          ? t('category.total.income')
          : t('category.total.expense'),
        type: 'line' as const,
        smooth: true,
        data: totalFlowData,
        lineStyle: {
          color: lineColor,
          width: 3,
        },
        itemStyle: {
          color: lineColor,
        },
        symbol: 'circle',
        symbolSize: 6,
      }

      const series = [...barSeries, lineSeries]

      const chartTitle =
        title ||
        (isIncomeCategory
          ? `${t('category.income')} - ${t('category.monthly.cash.flow.summary')}`
          : `${t('category.expense')} - ${t('category.monthly.cash.flow.summary')}`)

      const option: echarts.EChartsOption = {
        backgroundColor: 'transparent',
        title: {
          text: chartTitle,
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          },
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
          backgroundColor: resolvedTheme === 'dark' ? '#374151' : '#ffffff',
          borderColor: resolvedTheme === 'dark' ? '#4b5563' : '#e5e7eb',
          textStyle: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          },
          formatter: function (params: unknown) {
            const paramsArray = Array.isArray(params) ? params : [params]
            if (!paramsArray.length) {
              return ''
            }

            const firstParam = paramsArray[0] as TooltipParam
            const date = new Date((firstParam?.axisValue ?? '') + '-01')
            const formattedDate = formatChartDate(date, 'month')
            let result = `<div style="font-weight: bold; margin-bottom: 8px;">${formattedDate}</div>`
            let total = 0

            paramsArray.forEach((param: unknown) => {
              const typedParam = param as TooltipParam
              const value = typedParam?.value || 0
              if (typedParam?.seriesType === 'bar') {
                total += value
              }

              result += `
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="display: inline-block; width: 10px; height: 10px; background-color: ${
                typedParam?.color ?? '#ccc'
              }; margin-right: 8px; border-radius: 50%;"></span>
              <span style="margin-right: 8px;">${typedParam?.seriesName ?? 'N/A'}:</span>
              <span style="font-weight: bold; color: ${isIncomeCategory ? '#059669' : '#dc2626'};">
                ${formatCurrency(Math.abs(value), baseCurrency.code)}
              </span>
            </div>
          `
            })

            result += `<div style="border-top: 1px solid #ccc; margin-top: 8px; padding-top: 4px; font-weight: bold;">
          ${isIncomeCategory ? t('category.total.income') : t('category.total.expense')}: <span style="color: ${isIncomeCategory ? '#059669' : '#dc2626'};">
            ${formatCurrency(Math.abs(total), baseCurrency.code)}
          </span>
        </div>`

            return result
          },
        },
        legend: {
          data: [
            ...categoryNames,
            isIncomeCategory
              ? t('category.total.income')
              : t('category.total.expense'),
          ],
          top: 30,
          type: 'scroll',
          textStyle: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '20%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: formattedMonths,
          axisLabel: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            rotate: shouldRotateLabels ? 45 : 0,
            fontSize: window.innerWidth < 768 ? 10 : 12,
            interval: labelInterval,
          },
        },
        yAxis: [
          {
            type: 'value',
            name: isIncomeCategory
              ? t('category.income')
              : t('category.expense'),
            position: 'left',
            axisLabel: {
              formatter: function (value: number) {
                if (Math.abs(value) >= 1000) {
                  return `${formatCurrency(value / 1000, baseCurrency.code)}k`
                }
                return formatCurrency(value, baseCurrency.code)
              },
              color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            },
            nameTextStyle: {
              color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            },
          },
        ],
        series,
      }

      // 设置图表选项
      try {
        if (chart && !chart.isDisposed()) {
          chart.setOption(option)

          // 添加柱状图点击事件 - 优化为响应整个 x 轴区域
          chart.off('click')
          chart.on('click', (params: echarts.ECElementEvent) => {
            let monthIndex = -1

            // 处理不同的点击区域
            if (
              params.componentType === 'series' &&
              typeof params.dataIndex === 'number'
            ) {
              // 点击柱状图或线图
              monthIndex = params.dataIndex
            } else if (
              params.componentType === 'xAxis' &&
              typeof params.dataIndex === 'number'
            ) {
              // 点击 x 轴标签
              monthIndex = params.dataIndex
            }

            if (monthIndex >= 0) {
              const clickedMonth = Object.keys(monthlyData).sort()[monthIndex]
              if (clickedMonth) {
                setSelectedMonth(clickedMonth)
              }
            }
          })

          // 添加图表区域点击事件，通过坐标计算月份
          chart.getZr().off('click')
          chart
            .getZr()
            .on('click', (event: { offsetX: number; offsetY: number }) => {
              try {
                const canvasPosition = chart.convertFromPixel('grid', [
                  event.offsetX,
                  event.offsetY,
                ])

                if (canvasPosition && Array.isArray(canvasPosition)) {
                  // 计算点击位置对应的月份索引
                  const monthCount = formattedMonths.length
                  const xValue = canvasPosition[0]

                  // 将 x 坐标转换为月份索引
                  const monthIndex = Math.round(xValue)

                  // 确保索引在有效范围内
                  if (monthIndex >= 0 && monthIndex < monthCount) {
                    const clickedMonth =
                      Object.keys(monthlyData).sort()[monthIndex]
                    if (clickedMonth) {
                      setSelectedMonth(clickedMonth)
                    }
                  }
                }
              } catch {
                // 如果坐标转换失败，忽略错误
              }
            })
        }
      } catch (error) {
        console.error('Error setting chart option:', error)
      }
    },
    [
      monthlyData,
      baseCurrency,
      resolvedTheme,
      t,
      title,
      accounts,
      formatChartDate,
      formatCurrency,
    ]
  )

  // 饼状图渲染函数
  const renderPieChart = useCallback(
    (chart: echarts.ECharts) => {
      if (!chart || chart.isDisposed() || !selectedMonth) {
        return
      }

      const pieData = getPieChartData(selectedMonth)
      if (pieData.length === 0) {
        try {
          chart.clear()
        } catch (error) {
          console.warn('Error clearing pie chart:', error)
        }
        return
      }

      // 获取与柱状图相同的颜色
      const categoryNames = pieData.map(item => item.name)
      const categoryColors = ColorManager.generateSmartChartColors(
        categoryNames.map(name => ({ name })),
        item => {
          const account = accounts.find(acc => acc.name === item.name)
          if (account && account.color) {
            return ColorManager.getAccountColor(
              account.id,
              account.color,
              account.type as CategoryType
            )
          }
          return null
        }
      )

      // 判断是收入类还是支出类
      const monthData = monthlyData[selectedMonth]
      const currencyData = monthData[baseCurrency.code]
      const isIncomeCategory = currencyData
        ? currencyData.income >= currencyData.expense
        : true

      const option: echarts.EChartsOption = {
        backgroundColor: 'transparent',
        title: {
          text: `${formatChartDate(new Date(selectedMonth + '-01'), 'month')} ${isIncomeCategory ? t('category.income') : t('category.expense')} ${t('chart.category.breakdown')}`,
          left: 'center',
          top: '5%',
          textStyle: {
            fontSize: 15,
            fontWeight: 'bold',
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          },
        },
        tooltip: {
          trigger: 'item',
          backgroundColor: resolvedTheme === 'dark' ? '#374151' : '#ffffff',
          borderColor: resolvedTheme === 'dark' ? '#4b5563' : '#e5e7eb',
          textStyle: {
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: function (params: any) {
            const percentage = params.percent || 0
            const value = Number(params.value) || 0
            return `
            <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
            <div style="color: ${isIncomeCategory ? '#059669' : '#dc2626'};">
              ${formatCurrency(Math.abs(value), baseCurrency.code)} (${percentage}%)
            </div>
          `
          },
        },
        legend: {
          show: false, // 去掉图例显示
        },
        series: [
          {
            name: isIncomeCategory
              ? t('category.income')
              : t('category.expense'),
            type: 'pie',
            radius: ['20%', '55%'],
            center: ['50%', '60%'],
            data: pieData.map((item, index) => ({
              ...item,
              itemStyle: {
                color: categoryColors[index],
                emphasis: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)',
                },
              },
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
            label: {
              show: true,
              formatter: '{b}: {d}%',
              fontSize: 11,
              color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
              position: 'outside',
              distanceToLabelLine: 5,
            },
            labelLine: {
              show: true,
              length: 15,
              length2: 10,
              smooth: 0.2,
            },
          },
        ],
      }

      try {
        if (chart && !chart.isDisposed()) {
          chart.setOption(option)
          chart.off('click')
        }
      } catch (error) {
        console.error('Error setting pie chart option:', error)
      }
    },
    [
      selectedMonth,
      monthlyData,
      baseCurrency,
      resolvedTheme,
      t,
      accounts,
      formatChartDate,
      formatCurrency,
      getPieChartData,
    ]
  )

  // 柱状图渲染 useEffect
  useEffect(() => {
    if (!chartRef.current || isLoading || !monthlyData) {
      return
    }

    try {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(
          chartRef.current,
          resolvedTheme === 'dark' ? 'dark' : null
        )
      }

      renderBarChart(chartInstance.current)

      const handleResize = () => {
        if (chartInstance.current && !chartInstance.current.isDisposed()) {
          chartInstance.current.resize()
        }
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        if (chartInstance.current && !chartInstance.current.isDisposed()) {
          chartInstance.current.dispose()
          chartInstance.current = null
        }
      }
    } catch (error) {
      console.error('Error with chart:', error)
      return undefined
    }
  }, [
    monthlyData,
    baseCurrency,
    resolvedTheme,
    t,
    isLoading,
    title,
    accounts,
    formatChartDate,
    formatCurrency,
    renderBarChart,
  ])

  // 饼状图渲染 useEffect
  useEffect(() => {
    if (!showPieChart || !pieChartRef.current || !selectedMonth) {
      return
    }

    try {
      if (!pieChartInstance.current) {
        pieChartInstance.current = echarts.init(
          pieChartRef.current,
          resolvedTheme === 'dark' ? 'dark' : null
        )
      }

      renderPieChart(pieChartInstance.current)

      const handleResize = () => {
        if (
          pieChartInstance.current &&
          !pieChartInstance.current.isDisposed()
        ) {
          pieChartInstance.current.resize()
        }
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        if (
          pieChartInstance.current &&
          !pieChartInstance.current.isDisposed()
        ) {
          pieChartInstance.current.dispose()
          pieChartInstance.current = null
        }
      }
    } catch (error) {
      console.error('Error with pie chart:', error)
      return undefined
    }
  }, [
    showPieChart,
    selectedMonth,
    monthlyData,
    baseCurrency,
    resolvedTheme,
    t,
    accounts,
    formatChartDate,
    formatCurrency,
    renderPieChart,
  ])

  if (isLoading) {
    return (
      <div
        className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
      >
        <div
          className='flex items-center justify-center'
          style={{ height: `${height}px` }}
        >
          <div className='text-gray-500'>{t('chart.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg shadow p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
    >
      {/* 柱状图 */}
      <div
        key={`bar-${resolvedTheme}-${isLoading}`}
        ref={chartRef}
        style={{
          width: '100%',
          height: showPieChart
            ? `${Math.floor(height * 0.6)}px`
            : `${height}px`,
        }}
      />

      {/* 饼状图 */}
      {showPieChart && (
        <div
          key={`pie-${resolvedTheme}-${isLoading}-${selectedMonth}`}
          ref={pieChartRef}
          style={{
            width: '100%',
            height: `${Math.floor(height * 0.4)}px`,
            marginTop: '16px',
          }}
        />
      )}
    </div>
  )
}
