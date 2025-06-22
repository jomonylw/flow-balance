'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import type { SimpleTransaction, SimpleCurrency } from '@/types/core'
import type { FlowSummaryData } from '@/types/components'

// 本地类型定义（用于这个组件的特定需求）
interface LocalFlowCategory {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  transactions: SimpleTransaction[]
}

interface FlowCategorySummaryCardProps {
  category: LocalFlowCategory
  currencyCode: string
  summaryData?: FlowSummaryData | null
  baseCurrency?: SimpleCurrency
}

export default function FlowCategorySummaryCard({
  // category,
  currencyCode,
  summaryData,
  baseCurrency,
}: FlowCategorySummaryCardProps) {
  const { t } = useLanguage()
  const { formatCurrency, getCurrencySymbol } = useUserCurrencyFormatter()
  // const accountType = category.type

  // 流量类分类统计（基于月度数据）
  const calculateFlowStats = () => {
    if (!summaryData || summaryData.length === 0) {
      return {
        thisMonthNet: 0,
        thisMonthTransactionCount: 0,
        thisYearNet: 0,
        thisYearMonthlyAverage: 0,
        lastYearNet: 0,
        lastYearMonthlyAverage: 0,
      }
    }

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const lastYear = currentYear - 1

    // 计算单个月份的净流量
    const calculateMonthlyNet = (monthData: FlowSummaryData[0]) => {
      let monthNet = 0
      let transactionCount = 0

      // 汇总子分类的流量
      monthData.childCategories.forEach(child => {
        Object.values(child.balances.converted).forEach(amount => {
          monthNet += amount as number
        })
      })

      // 汇总直属账户的流量
      monthData.directAccounts.forEach(account => {
        Object.values(account.balances.converted).forEach(amount => {
          monthNet += amount as number
        })
        transactionCount += account.transactionCount
      })

      return { monthNet, transactionCount }
    }

    // 获取最新月份的数据（本月）
    const latestMonthData = summaryData[0]
    const {
      monthNet: thisMonthNet,
      transactionCount: thisMonthTransactionCount,
    } = latestMonthData
      ? calculateMonthlyNet(latestMonthData)
      : { monthNet: 0, transactionCount: 0 }

    // 按年份分组汇总所有月份数据
    let thisYearNet = 0
    let thisYearMonthCount = 0
    let lastYearNet = 0
    let lastYearMonthCount = 0

    summaryData.forEach(monthData => {
      const monthStr = monthData.month // 格式: "YYYY-MM"
      const year = parseInt(monthStr.substring(0, 4))
      const { monthNet } = calculateMonthlyNet(monthData)

      if (year === currentYear) {
        thisYearNet += monthNet
        thisYearMonthCount++
      } else if (year === lastYear) {
        lastYearNet += monthNet
        lastYearMonthCount++
      }
    })

    // 计算月均（基于实际有数据的月份数）
    const thisYearMonthlyAverage =
      thisYearMonthCount > 0 ? thisYearNet / thisYearMonthCount : 0
    const lastYearMonthlyAverage =
      lastYearMonthCount > 0 ? lastYearNet / lastYearMonthCount : 0

    return {
      thisMonthNet,
      thisMonthTransactionCount,
      thisYearNet,
      thisYearMonthlyAverage,
      lastYearNet,
      lastYearMonthlyAverage,
    }
  }

  const flowStats = calculateFlowStats()

  // 计算币种分布统计
  const calculateCurrencyDistribution = () => {
    if (!summaryData || summaryData.length === 0) {
      return {}
    }

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()

    // 存储各币种的本月和今年数据
    const currencyStats: Record<
      string,
      {
        thisMonth: number
        thisYear: number
        symbol: string
      }
    > = {}

    // 遍历所有月份数据
    summaryData.forEach((monthData, index) => {
      const monthStr = monthData.month // 格式: "YYYY-MM"
      const year = parseInt(monthStr.substring(0, 4))
      const isCurrentMonth = index === 0 // 假设数据按时间倒序排列，第一个是最新月份
      const isCurrentYear = year === currentYear

      // 处理子分类数据
      monthData.childCategories.forEach(child => {
        Object.entries(child.balances.original).forEach(
          ([currencyCode, amount]) => {
            if (!currencyStats[currencyCode]) {
              currencyStats[currencyCode] = {
                thisMonth: 0,
                thisYear: 0,
                symbol: getCurrencySymbol(currencyCode),
              }
            }

            if (isCurrentMonth) {
              currencyStats[currencyCode].thisMonth += amount
            }
            if (isCurrentYear) {
              currencyStats[currencyCode].thisYear += amount
            }
          }
        )
      })

      // 处理直属账户数据
      monthData.directAccounts.forEach(account => {
        Object.entries(account.balances.original).forEach(
          ([currencyCode, amount]) => {
            if (!currencyStats[currencyCode]) {
              currencyStats[currencyCode] = {
                thisMonth: 0,
                thisYear: 0,
                symbol: getCurrencySymbol(currencyCode),
              }
            }

            if (isCurrentMonth) {
              currencyStats[currencyCode].thisMonth += amount
            }
            if (isCurrentYear) {
              currencyStats[currencyCode].thisYear += amount
            }
          }
        )
      })
    })

    // 过滤掉金额为0的币种
    const filteredStats = Object.entries(currencyStats).filter(
      ([, data]) =>
        Math.abs(data.thisMonth) > 0.01 || Math.abs(data.thisYear) > 0.01
    )

    return Object.fromEntries(filteredStats)
  }

  const currencyDistribution = calculateCurrencyDistribution()

  return (
    <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
      {/* 分类类型标识 */}
      {/* <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
          {category.name}
        </h3>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            accountType === 'INCOME'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          {accountType === 'INCOME'
            ? t('category.type.income')
            : t('category.type.expense')}{' '}
          • {t('category.type.flow')}
        </span>
      </div> */}

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* 本月总流量（累计） */}
        <div className='text-center'>
          <div className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
            {t('category.this.month.total.flow')}
          </div>
          <div
            className={`text-2xl font-bold ${
              flowStats.thisMonthNet >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatCurrency(
              Math.abs(flowStats.thisMonthNet),
              baseCurrency?.code || currencyCode
            )}
          </div>
          <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            {flowStats.thisMonthTransactionCount}{' '}
            {t('category.transaction.count')}
          </div>
        </div>

        {/* 今年总流量 */}
        <div className='text-center'>
          <div className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
            {t('category.this.year.total.flow')}
          </div>
          <div
            className={`text-xl font-semibold ${
              flowStats.thisYearNet >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatCurrency(
              Math.abs(flowStats.thisYearNet),
              baseCurrency?.code || currencyCode
            )}
          </div>
          <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            {t('category.monthly.average.flow')}:{' '}
            {formatCurrency(
              Math.abs(flowStats.thisYearMonthlyAverage),
              baseCurrency?.code || currencyCode
            )}
          </div>
        </div>

        {/* 上年总流量 */}
        <div className='text-center'>
          <div className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
            {t('category.last.year.total.flow')}
          </div>
          <div
            className={`text-xl font-semibold ${
              flowStats.lastYearNet >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatCurrency(
              Math.abs(flowStats.lastYearNet),
              baseCurrency?.code || currencyCode
            )}
          </div>
          <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            {t('category.monthly.average.flow')}:{' '}
            {formatCurrency(
              Math.abs(flowStats.lastYearMonthlyAverage),
              baseCurrency?.code || currencyCode
            )}
          </div>
        </div>
      </div>

      {/* 币种分布 */}
      {summaryData &&
        summaryData.length > 0 &&
        Object.keys(currencyDistribution).length > 0 && (
          <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
              {t('category.currency.distribution')}
            </h4>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {Object.entries(currencyDistribution).map(
                ([currencyCode, data]) => (
                  <div
                    key={currencyCode}
                    className='text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'
                  >
                    <div className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                      {currencyCode} {t('category.net.cash.flow')}
                    </div>
                    <div
                      className={`text-lg font-semibold ${
                        data.thisMonth >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatCurrency(Math.abs(data.thisMonth), currencyCode)}
                    </div>
                    <div className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
                      {t('common.this.year')}:{' '}
                      {formatCurrency(Math.abs(data.thisYear), currencyCode)}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

      {/* 无币种数据时的提示 */}
      {summaryData &&
        summaryData.length > 0 &&
        Object.keys(currencyDistribution).length === 0 && (
          <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
              {t('category.currency.distribution')}
            </h4>
            <div className='text-center text-gray-500 dark:text-gray-400 py-4'>
              {t('category.no.currency.data')}
            </div>
          </div>
        )}
    </div>
  )
}
