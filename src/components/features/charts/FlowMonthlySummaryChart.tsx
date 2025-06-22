'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useTheme } from '@/contexts/providers/ThemeContext'
import ColorManager from '@/lib/utils/color'
import type { SimpleCurrency, CategoryType } from '@/types/core'
import type { TooltipParam } from '@/types/ui'
import type { FlowMonthlyData } from '@/types/components'

interface FlowAccount {
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
  accounts?: FlowAccount[] // 新增账户信息，用于获取颜色
}

export default function FlowMonthlySummaryChart({
  monthlyData,
  baseCurrency,
  title,
  height = 400,
  accounts = [],
}: FlowMonthlySummaryChartProps) {
  const { t, isLoading } = useLanguage()
  const { formatCurrency, getUserLocale: _getUserLocale } =
    useUserCurrencyFormatter()
  const { resolvedTheme } = useTheme()

  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current || isLoading || !monthlyData) {
      return
    }

    let chart: echarts.ECharts | null = null

    try {
      // 初始化图表
      chart = echarts.init(
        chartRef.current,
        resolvedTheme === 'dark' ? 'dark' : null
      )

      // 渲染图表
      renderChart(chart)

      // 响应式处理
      const handleResize = () => {
        if (chart && !chart.isDisposed()) {
          chart.resize()
        }
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        if (chart && !chart.isDisposed()) {
          chart.dispose()
        }
      }
    } catch (error) {
      console.error('Error with chart:', error)
      if (chart && !chart.isDisposed()) {
        chart.dispose()
      }
      return undefined
    }

    function renderChart(chart: echarts.ECharts) {
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

      // 使用ColorManager智能生成颜色，优先使用账户的自定义颜色，确保没有自定义颜色的项目使用不同颜色
      const categoryColors = ColorManager.generateSmartChartColors(
        categoryNames.map(name => ({ name })),
        item => {
          // 尝试根据分类名称找到对应的账户
          const account = accounts.find(acc => acc.name === item.name)
          if (account && account.color) {
            return ColorManager.getAccountColor(
              account.id,
              account.color,
              account.type as CategoryType
            )
          }
          return null // 如果没有找到账户或账户没有自定义颜色，使用智能颜色分配
        }
      )

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
            color: categoryColors[index],
            borderRadius: 4, // 堆叠柱状图使用统一圆角
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

      // 获取线图颜色
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
          formatter: function (params: unknown) {
            const paramsArray = Array.isArray(params) ? params : [params]
            if (!paramsArray.length) {
              return ''
            }

            const firstParam = paramsArray[0] as TooltipParam
            let result = `<div style="font-weight: bold; margin-bottom: 8px;">${
              firstParam?.axisValue ?? ''
            }</div>`
            let total = 0

            paramsArray.forEach((param: unknown) => {
              const typedParam = param as TooltipParam
              const value = typedParam?.value || 0
              if (typedParam?.seriesType === 'bar') {
                total += value
              }

              // 显示所有子分类/账户，包括零金额的
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
            rotate: 45,
            fontSize: 12,
            color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
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
        }
      } catch (error) {
        console.error('Error setting chart option:', error)
      }
    }
  }, [monthlyData, baseCurrency, resolvedTheme, t, isLoading, title, accounts])

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
      <div
        key={`${resolvedTheme}-${isLoading}`}
        ref={chartRef}
        style={{ width: '100%', height: `${height}px` }}
      />
    </div>
  )
}
