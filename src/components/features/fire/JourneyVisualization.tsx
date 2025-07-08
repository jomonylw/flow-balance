'use client'

import { useEffect, useRef } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useIsMobile } from '@/hooks/ui/useResponsive'
import echarts, { safeEChartsInit } from '@/lib/utils/echarts-config'
import type { SimpleCurrency, FireParams } from '@/types/core'
import type { TooltipParam } from '@/types/ui'

interface JourneyVisualizationProps {
  params: FireParams
  currency: SimpleCurrency
}

export default function JourneyVisualization({
  params,
  currency,
}: JourneyVisualizationProps) {
  const { t } = useLanguage()
  const { formatCurrency } = useUserCurrencyFormatter()
  const { formatChartDate } = useUserDateFormatter()
  const { resolvedTheme } = useTheme()
  const isMobile = useIsMobile()
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    // 初始化图表或在主题变化时重新初始化
    if (!chartInstance.current || chartInstance.current.isDisposed()) {
      chartInstance.current = safeEChartsInit(
        chartRef.current,
        resolvedTheme === 'dark' ? 'dark' : null
      )

      if (!chartInstance.current) {
        console.error('Failed to initialize ECharts instance')
        return
      }
    } else {
      // 主题变化时重新初始化图表
      chartInstance.current.dispose()
      chartInstance.current = safeEChartsInit(
        chartRef.current,
        resolvedTheme === 'dark' ? 'dark' : null
      )

      if (!chartInstance.current) {
        console.error('Failed to re-initialize ECharts instance')
        return
      }
    }

    // 计算数据
    const fireTargetAmount =
      params.retirementExpenses / (params.safeWithdrawalRate / 100)
    const monthlyRate = params.expectedAnnualReturn / 100 / 12

    // 生成未来120个月的数据点
    const months = 120
    const dates: string[] = []
    const assetValues: number[] = []

    const today = new Date()

    for (let i = 0; i <= months; i++) {
      const futureDate = new Date(today)
      futureDate.setMonth(futureDate.getMonth() + i)
      dates.push(formatChartDate(futureDate, 'month'))

      // 计算未来价值: FV = PV * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
      const pv = params.currentInvestableAssets
      const pmt = params.monthlyInvestment
      const r = monthlyRate
      const n = i

      let fv = pv * Math.pow(1 + r, n)
      if (r > 0) {
        fv += pmt * ((Math.pow(1 + r, n) - 1) / r)
      } else {
        fv += pmt * n
      }

      assetValues.push(Math.max(0, fv))
    }

    // 找到与FIRE目标线的交点
    let firePointIndex = -1
    for (let i = 0; i < assetValues.length; i++) {
      if (assetValues[i] >= fireTargetAmount) {
        firePointIndex = i
        break
      }
    }

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      title: {
        text: t('fire.journey.title'),
        left: 'center',
        textStyle: {
          fontSize: isMobile ? 16 : 18,
          fontWeight: 'bold',
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: resolvedTheme === 'dark' ? '#374151' : '#ffffff',
        borderColor: resolvedTheme === 'dark' ? '#4b5563' : '#e5e7eb',
        textStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
        },
        formatter: (params: unknown) => {
          const paramsArray = Array.isArray(params) ? params : [params]
          const firstParam = paramsArray[0] as TooltipParam
          const dataIndex = firstParam.dataIndex || 0
          const date = dates[dataIndex]
          const amount = assetValues[dataIndex]
          return t('fire.journey.tooltip', {
            date,
            amount: formatCurrency(amount, currency.code),
          })
        },
      },
      legend: {
        data: [
          t('fire.journey.asset.growth'),
          t('fire.journey.fire.target.line'),
        ],
        top: isMobile ? 35 : 40,
        textStyle: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          fontSize: isMobile ? 10 : 12,
        },
        itemWidth: isMobile ? 15 : 25,
        itemHeight: isMobile ? 10 : 14,
      },
      grid: {
        left: isMobile ? '8%' : '3%',
        right: isMobile ? '8%' : '4%',
        bottom: isMobile ? '8%' : '3%',
        top: isMobile ? 90 : 80,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          interval: isMobile ? 'auto' : 11, // 移动端自动间隔，桌面端每12个月显示一次
          rotate: isMobile ? 45 : 30,
          fontSize: isMobile ? 10 : 12,
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
        },
        axisLine: {
          lineStyle: {
            color: resolvedTheme === 'dark' ? '#4b5563' : '#e5e7eb',
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: resolvedTheme === 'dark' ? '#ffffff' : '#000000',
          fontSize: isMobile ? 10 : 12,
          formatter: (value: number) => {
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M`
            } else if (value >= 1000) {
              return `${(value / 1000).toFixed(0)}K`
            }
            return value.toString()
          },
        },
        axisLine: {
          lineStyle: {
            color: resolvedTheme === 'dark' ? '#4b5563' : '#e5e7eb',
          },
        },
        splitLine: {
          lineStyle: {
            color: resolvedTheme === 'dark' ? '#374151' : '#f3f4f6',
          },
        },
      },
      series: [
        {
          name: t('fire.journey.asset.growth'),
          type: 'line',
          data: assetValues,
          smooth: true,
          lineStyle: {
            width: 3,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#3B82F6' },
              { offset: 1, color: '#8B5CF6' },
            ]),
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(139, 92, 246, 0.1)' },
            ]),
          },
          markPoint:
            firePointIndex >= 0
              ? {
                  data: [
                    {
                      name: t('fire.journey.fire.point'),
                      coord: [
                        dates[firePointIndex],
                        assetValues[firePointIndex],
                      ],
                      symbol: 'circle',
                      symbolSize: 15,
                      itemStyle: {
                        color: '#F59E0B',
                        borderColor: '#FBBF24',
                        borderWidth: 3,
                      },
                    },
                  ],
                }
              : undefined,
        },
        {
          name: t('fire.journey.fire.target.line'),
          type: 'line',
          data: new Array(dates.length).fill(fireTargetAmount),
          lineStyle: {
            type: 'dashed',
            width: 2,
            color: '#F59E0B',
          },
          symbol: 'none',
        },
      ],
      animation: true,
      animationDuration: 1500,
      animationEasing: 'cubicOut',
    }

    chartInstance.current.setOption(option, true)

    // 响应式处理
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [
    params,
    currency,
    t,
    formatCurrency,
    formatChartDate,
    resolvedTheme,
    isMobile,
  ])

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  return (
    <div className='bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6'>
      <div className='mb-4'>
        <h2 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
          {t('fire.journey.title')}
        </h2>
        <p className='text-gray-600 dark:text-gray-400'>
          {t('fire.journey.subtitle')}
        </p>
      </div>

      <div
        ref={chartRef}
        className={`w-full ${isMobile ? 'h-80' : 'h-96'}`}
        style={{ minHeight: isMobile ? '320px' : '400px' }}
      />

      {/* <div className='mt-4 text-sm text-gray-500 dark:text-gray-400 text-center'>
        {t('fire.journey.description')}
      </div> */}
    </div>
  )
}
