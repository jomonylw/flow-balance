'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import AnimatedNumber from '@/components/ui/data-display/AnimatedNumber'
import type { SimpleTransaction, SimpleCurrency } from '@/types/core'
import type { StockSummaryData } from '@/types/components'

// 本地类型定义（用于这个组件的特定需求）
interface LocalStockCategory {
  id: string
  name: string
  type: 'ASSET' | 'LIABILITY'
  transactions: SimpleTransaction[]
}

interface StockCategorySummaryCardProps {
  category: LocalStockCategory
  currencyCode: string
  summaryData?: StockSummaryData | null
  baseCurrency?: SimpleCurrency
  currencies?: SimpleCurrency[]
}

export default function StockCategorySummaryCard({
  category,
  currencyCode,
  summaryData,
  baseCurrency,
  currencies = [],
}: StockCategorySummaryCardProps) {
  const { t } = useLanguage()
  const { formatCurrency, formatNumber } = useUserCurrencyFormatter()
  // const accountType = category.type

  // 存量类分类统计（资产/负债）
  const calculateStockStats = () => {
    // 使用实际的历史余额数据计算净值
    let currentNetValue = 0
    let lastMonthNetValue = 0
    let yearStartNetValue = 0
    let transactionCount = 0
    let hasLastMonthData = false
    let hasYearStartData = false

    if (summaryData?.monthlyData && summaryData.monthlyData.length > 0) {
      // 当前月数据（数组第一个元素）
      const currentMonth = summaryData.monthlyData[0]
      if (currentMonth) {
        // 计算子分类余额 - 汇总所有币种折算成本币的金额
        currentMonth.childCategories.forEach(child => {
          // 遍历所有币种的converted值并累加
          Object.values(child.balances.converted).forEach(amount => {
            currentNetValue += amount as number
          })
          // 注意：子分类的accountCount表示该子分类下的账户数量，不是交易数量
          // 我们需要从实际的账户数据中获取交易数量
        })

        // 计算直属账户余额 - 汇总所有币种折算成本币的金额
        currentMonth.directAccounts.forEach(account => {
          // 遍历所有币种的converted值并累加
          Object.values(account.balances.converted).forEach(amount => {
            currentNetValue += amount as number
          })
          // 累加直属账户的交易数量
          transactionCount += account.transactionCount || 0
        })

        // 注意：子分类的交易数量暂时无法从API获取，因为MonthlyChildCategorySummary
        // 只包含accountCount（账户数量），不包含transactionCount（交易数量）
        // 如果需要完整的交易数量统计，需要修改后端API返回更多信息
      }

      // 上月数据（如果存在）
      const lastMonth = summaryData.monthlyData[1]
      if (lastMonth) {
        hasLastMonthData = true
        // 计算上月子分类余额 - 汇总所有币种折算成本币的金额
        lastMonth.childCategories.forEach(child => {
          Object.values(child.balances.converted).forEach(amount => {
            lastMonthNetValue += amount as number
          })
        })

        // 计算上月直属账户余额 - 汇总所有币种折算成本币的金额
        lastMonth.directAccounts.forEach(account => {
          Object.values(account.balances.converted).forEach(amount => {
            lastMonthNetValue += amount as number
          })
        })
      }

      // 年初数据（查找1月份数据）
      const currentYear = new Date().getFullYear()
      const yearStartMonth = summaryData.monthlyData.find(month =>
        month.month.startsWith(`${currentYear}-01`)
      )

      if (yearStartMonth) {
        hasYearStartData = true
        // 计算年初子分类余额 - 汇总所有币种折算成本币的金额
        yearStartMonth.childCategories.forEach(child => {
          Object.values(child.balances.converted).forEach(amount => {
            yearStartNetValue += amount as number
          })
        })

        // 计算年初直属账户余额 - 汇总所有币种折算成本币的金额
        yearStartMonth.directAccounts.forEach(account => {
          Object.values(account.balances.converted).forEach(amount => {
            yearStartNetValue += amount as number
          })
        })
      }
    } else {
      // 回退到使用分类的交易数据
      const transactions = category.transactions || []

      transactions.forEach((transaction: SimpleTransaction) => {
        if (transaction.type === 'BALANCE') {
          const amount = parseFloat(transaction.amount.toString())
          if (transaction.currency?.code === baseCurrency?.code) {
            currentNetValue += amount
          } else {
            // TODO: 需要汇率转换
            currentNetValue += amount
          }
          transactionCount++
        }
      })
    }

    // 计算变化百分比
    const monthlyChange =
      hasLastMonthData && lastMonthNetValue !== 0
        ? ((currentNetValue - lastMonthNetValue) /
            Math.abs(lastMonthNetValue)) *
          100
        : 0

    const yearToDateChange =
      hasYearStartData && yearStartNetValue !== 0
        ? ((currentNetValue - yearStartNetValue) /
            Math.abs(yearStartNetValue)) *
          100
        : 0

    return {
      currentNetValue,
      lastMonthNetValue,
      yearStartNetValue,
      monthlyChange,
      yearToDateChange,
      transactionCount,
      hasLastMonthData,
      hasYearStartData,
    }
  }

  const stockStats = calculateStockStats()

  return (
    <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
      {/* 分类类型标识 */}
      {/* <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
          {category.name}
        </h3>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            accountType === 'ASSET'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
          }`}
        >
          {accountType === 'ASSET'
            ? t('category.type.asset')
            : t('category.type.liability')}{' '}
          • {t('category.type.stock')}
        </span>
      </div> */}

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* 当前净值 */}
        <div className='text-center'>
          <div className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
            {t('category.current.net.value')}
          </div>
          <div
            className={`text-2xl font-bold ${
              stockStats.currentNetValue >= 0
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            <AnimatedNumber
              value={Math.abs(stockStats.currentNetValue)}
              currency={{
                code: baseCurrency?.code || currencyCode,
                symbol: baseCurrency?.symbol || '',
                name: baseCurrency?.name || '',
                id: baseCurrency?.id,
              }}
              duration={200}
              enableAnimation={true}
              formatOptions={{
                showSymbol: true,
                // 不设置 precision，让 AnimatedNumber 使用货币的 decimalPlaces
              }}
            />
          </div>
          {/* <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            {stockStats.transactionCount} {t('category.transaction.count')}
          </div> */}
        </div>

        {/* 月度变化 */}
        <div className='text-center'>
          <div className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
            {t('category.monthly.change')}
          </div>
          <div
            className={`text-xl font-semibold ${
              stockStats.hasLastMonthData
                ? stockStats.monthlyChange >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {stockStats.hasLastMonthData ? (
              <>
                {stockStats.monthlyChange >= 0 ? '+' : ''}
                {formatNumber(stockStats.monthlyChange, 1)}%
              </>
            ) : (
              '0.0%'
            )}
          </div>
          <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            {t('category.last.month')}:{' '}
            {formatCurrency(
              Math.abs(stockStats.lastMonthNetValue),
              baseCurrency?.code || currencyCode
            )}
          </div>
        </div>

        {/* 年度变化 */}
        <div className='text-center'>
          <div className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
            {t('category.yearly.change')}
          </div>
          <div
            className={`text-xl font-semibold ${
              stockStats.hasYearStartData
                ? stockStats.yearToDateChange >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {stockStats.hasYearStartData ? (
              <>
                {stockStats.yearToDateChange >= 0 ? '+' : ''}
                {formatNumber(stockStats.yearToDateChange, 1)}%
              </>
            ) : (
              '0.0%'
            )}
          </div>
          <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            {t('category.year.start')}:{' '}
            {formatCurrency(
              Math.abs(stockStats.yearStartNetValue),
              baseCurrency?.code || currencyCode
            )}
          </div>
        </div>
      </div>

      {/* 币种分布 */}
      {summaryData &&
        summaryData.monthlyData &&
        summaryData.monthlyData.length > 0 && (
          <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
              {t('category.currency.distribution')}
            </h4>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {(() => {
                // 汇总所有币种的当月和上月余额
                const currencyTotals: Record<
                  string,
                  { current: number; lastMonth: number; symbol: string }
                > = {}

                // 当前月数据
                const currentMonth = summaryData.monthlyData[0]
                const lastMonth = summaryData.monthlyData[1]

                if (currentMonth) {
                  // 处理子分类
                  currentMonth.childCategories.forEach(child => {
                    Object.entries(child.balances.original).forEach(
                      ([currencyCode, amount]) => {
                        if (!currencyTotals[currencyCode]) {
                          const currencyInfo = currencies.find(
                            c => c.code === currencyCode
                          )
                          currencyTotals[currencyCode] = {
                            current: 0,
                            lastMonth: 0,
                            symbol: currencyInfo?.symbol || currencyCode,
                          }
                        }
                        currencyTotals[currencyCode].current += amount as number
                      }
                    )
                  })

                  // 处理直属账户
                  currentMonth.directAccounts.forEach(account => {
                    Object.entries(account.balances.original).forEach(
                      ([currencyCode, amount]) => {
                        if (!currencyTotals[currencyCode]) {
                          const currencyInfo = currencies.find(
                            c => c.code === currencyCode
                          )
                          currencyTotals[currencyCode] = {
                            current: 0,
                            lastMonth: 0,
                            symbol: currencyInfo?.symbol || currencyCode,
                          }
                        }
                        currencyTotals[currencyCode].current += amount as number
                      }
                    )
                  })
                }

                // 上月数据
                if (lastMonth) {
                  lastMonth.childCategories.forEach(child => {
                    Object.entries(child.balances.original).forEach(
                      ([currencyCode, amount]) => {
                        if (!currencyTotals[currencyCode]) {
                          const currencyInfo = currencies.find(
                            c => c.code === currencyCode
                          )
                          currencyTotals[currencyCode] = {
                            current: 0,
                            lastMonth: 0,
                            symbol: currencyInfo?.symbol || currencyCode,
                          }
                        }
                        currencyTotals[currencyCode].lastMonth +=
                          amount as number
                      }
                    )
                  })

                  lastMonth.directAccounts.forEach(account => {
                    Object.entries(account.balances.original).forEach(
                      ([currencyCode, amount]) => {
                        if (!currencyTotals[currencyCode]) {
                          const currencyInfo = currencies.find(
                            c => c.code === currencyCode
                          )
                          currencyTotals[currencyCode] = {
                            current: 0,
                            lastMonth: 0,
                            symbol: currencyInfo?.symbol || currencyCode,
                          }
                        }
                        currencyTotals[currencyCode].lastMonth +=
                          amount as number
                      }
                    )
                  })
                } else {
                  // 如果没有上月数据，显示 0
                  Object.keys(currencyTotals).forEach(currencyCode => {
                    currencyTotals[currencyCode].lastMonth = 0
                  })
                }

                return Object.entries(currencyTotals).map(
                  ([currencyCode, data]) => {
                    // 检查是否有真实的上月数据（通过检查lastMonth是否存在于原始数据中）
                    const hasRealLastMonthData = lastMonth !== undefined
                    const changePercent =
                      hasRealLastMonthData && data.lastMonth !== 0
                        ? ((data.current - data.lastMonth) /
                            Math.abs(data.lastMonth)) *
                          100
                        : 0

                    // 检查是否为非本币
                    const isBaseCurrency = currencyCode === baseCurrency?.code

                    // 获取折算后的本币金额（从converted数据中）
                    let convertedCurrentAmount = 0

                    if (!isBaseCurrency && currentMonth) {
                      // 计算当前月折算金额
                      currentMonth.childCategories.forEach(child => {
                        if (child.balances.converted[currencyCode]) {
                          convertedCurrentAmount += child.balances.converted[
                            currencyCode
                          ] as number
                        }
                      })
                      currentMonth.directAccounts.forEach(account => {
                        if (account.balances.converted[currencyCode]) {
                          convertedCurrentAmount += account.balances.converted[
                            currencyCode
                          ] as number
                        }
                      })
                    }

                    return (
                      <div
                        key={currencyCode}
                        className='text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'
                      >
                        <div className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
                          {currencyCode} {t('category.net.balance')}
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            data.current >= 0
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatCurrency(Math.abs(data.current), currencyCode)}
                        </div>

                        {/* 非本币显示折算本币金额 */}
                        {!isBaseCurrency && baseCurrency && (
                          <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                            ≈{' '}
                            {formatCurrency(
                              Math.abs(convertedCurrentAmount),
                              baseCurrency.code
                            )}
                          </div>
                        )}

                        <div className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
                          {t('category.last.month')}:{' '}
                          {formatCurrency(
                            Math.abs(data.lastMonth),
                            currencyCode
                          )}
                          <span
                            className={`ml-2 ${
                              hasRealLastMonthData
                                ? changePercent >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                                : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {hasRealLastMonthData ? (
                              <>
                                {changePercent >= 0 ? '+' : ''}
                                {formatNumber(changePercent, 1)}%
                              </>
                            ) : (
                              '0.0%'
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  }
                )
              })()}
            </div>
          </div>
        )}
    </div>
  )
}
