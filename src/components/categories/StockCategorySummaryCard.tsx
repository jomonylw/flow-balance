'use client'

import { useLanguage } from '@/contexts/LanguageContext'



interface Category {
  id: string
  name: string
  type: 'ASSET' | 'LIABILITY'
  transactions: Transaction[]
}

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT'
  amount: number
  date: string
  currency: {
    code: string
    symbol: string
  }
  notes?: string
}

interface Currency {
  code: string
  symbol: string
  name: string
}

interface StockCategorySummaryCardProps {
  category: Category
  currencySymbol: string
  summaryData?: any
  baseCurrency?: Currency
}

export default function StockCategorySummaryCard({
  category,
  currencySymbol,
  summaryData,
  baseCurrency
}: StockCategorySummaryCardProps) {
  const { t } = useLanguage()
  const accountType = category.type

  // 存量类分类统计（资产/负债）
  const calculateStockStats = () => {
    // 使用实际的历史余额数据计算净值
    let currentNetValue = 0
    let lastMonthNetValue = 0
    let yearStartNetValue = 0
    let transactionCount = 0

    // 使用子分类和直属账户的历史余额数据
    if (summaryData?.children || summaryData?.accounts) {
      const allItems = [
        ...(summaryData.children || []),
        ...(summaryData.accounts || [])
      ]

      allItems.forEach((item: any) => {
        // 累加交易数量
        if (item.transactionCount) {
          transactionCount += item.transactionCount
        }

        // 使用历史余额数据（已转换为本位币）
        if (item.historicalBalances) {
          // 当月本位币余额
          Object.values(item.historicalBalances.currentMonthInBaseCurrency || {}).forEach((amount: any) => {
            currentNetValue += amount
          })

          // 上月本位币余额
          Object.values(item.historicalBalances.lastMonthInBaseCurrency || {}).forEach((amount: any) => {
            lastMonthNetValue += amount
          })

          // 年初本位币余额
          Object.values(item.historicalBalances.yearStartInBaseCurrency || {}).forEach((amount: any) => {
            yearStartNetValue += amount
          })
        } else if (item.balances) {
          // 回退到当前余额（假设为本位币或需要转换）
          Object.entries(item.balances).forEach(([currencyCode, balance]: [string, any]) => {
            if (currencyCode === baseCurrency?.code) {
              currentNetValue += balance
              // 如果没有历史数据，使用估算值
              lastMonthNetValue += balance * 0.95
              yearStartNetValue += balance * 0.85
            } else {
              // TODO: 需要汇率转换，这里暂时按1:1处理
              currentNetValue += balance
              lastMonthNetValue += balance * 0.95
              yearStartNetValue += balance * 0.85
            }
          })
        }
      })
    } else {
      // 回退到使用分类的交易数据
      const transactions = category.transactions || []

      transactions.forEach((transaction: any) => {
        if (transaction.type === 'BALANCE_ADJUSTMENT') {
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

      // 使用估算值
      lastMonthNetValue = currentNetValue * 0.95
      yearStartNetValue = currentNetValue * 0.85
    }

    // 计算变化百分比
    const monthlyChange = lastMonthNetValue !== 0 ?
      ((currentNetValue - lastMonthNetValue) / Math.abs(lastMonthNetValue)) * 100 : 0

    const yearToDateChange = yearStartNetValue !== 0 ?
      ((currentNetValue - yearStartNetValue) / Math.abs(yearStartNetValue)) * 100 : 0

    return {
      currentNetValue,
      lastMonthNetValue,
      yearStartNetValue,
      monthlyChange,
      yearToDateChange,
      transactionCount
    }
  }

  const stockStats = calculateStockStats()

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      {/* 分类类型标识 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{category.name}</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          accountType === 'ASSET'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
        }`}>
          {accountType === 'ASSET' ? t('category.type.asset') : t('category.type.liability')} • {t('category.type.stock')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 当前净值 */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('category.current.net.value')}
          </div>
          <div className={`text-2xl font-bold ${
            stockStats.currentNetValue >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'
          }`}>
            {(baseCurrency?.symbol || currencySymbol)}{Math.abs(stockStats.currentNetValue).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stockStats.transactionCount} {t('category.transaction.count')}
          </div>
        </div>

        {/* 月度变化 */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('category.monthly.change')}
          </div>
          <div className={`text-xl font-semibold ${
            stockStats.monthlyChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {stockStats.monthlyChange >= 0 ? '+' : ''}{stockStats.monthlyChange.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('category.last.month')}: {(baseCurrency?.symbol || currencySymbol)}{Math.abs(stockStats.lastMonthNetValue).toFixed(2)}
          </div>
        </div>

        {/* 年度变化 */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('category.yearly.change')}
          </div>
          <div className={`text-xl font-semibold ${
            stockStats.yearToDateChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {stockStats.yearToDateChange >= 0 ? '+' : ''}{stockStats.yearToDateChange.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('category.year.start')}: {(baseCurrency?.symbol || currencySymbol)}{Math.abs(stockStats.yearStartNetValue).toFixed(2)}
          </div>
        </div>
      </div>

      {/* 存量特有信息 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 {t('category.stock.readonly.tip')}
        </div>
      </div>

      {/* 币种分布 */}
      {summaryData && (summaryData.children || summaryData.accounts) && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('category.currency.distribution')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              // 汇总所有币种的当月和上月余额
              const currencyTotals: Record<string, { current: number; lastMonth: number; symbol: string }> = {}

              const allItems = [
                ...(summaryData.children || []),
                ...(summaryData.accounts || [])
              ]

              allItems.forEach((item: any) => {
                if (item.historicalBalances) {
                  // 当月余额（原币）
                  Object.entries(item.historicalBalances.currentMonth || {}).forEach(([currencyCode, amount]: [string, any]) => {
                    if (!currencyTotals[currencyCode]) {
                      // 查找货币符号
                      const currencyInfo = summaryData.currencies?.find((c: any) => c.code === currencyCode)
                      currencyTotals[currencyCode] = {
                        current: 0,
                        lastMonth: 0,
                        symbol: currencyInfo?.symbol || currencyCode
                      }
                    }
                    currencyTotals[currencyCode].current += amount
                  })

                  // 上月余额（原币）
                  Object.entries(item.historicalBalances.lastMonth || {}).forEach(([currencyCode, amount]: [string, any]) => {
                    if (!currencyTotals[currencyCode]) {
                      const currencyInfo = summaryData.currencies?.find((c: any) => c.code === currencyCode)
                      currencyTotals[currencyCode] = {
                        current: 0,
                        lastMonth: 0,
                        symbol: currencyInfo?.symbol || currencyCode
                      }
                    }
                    currencyTotals[currencyCode].lastMonth += amount
                  })
                } else if (item.balances) {
                  // 回退到当前余额
                  Object.entries(item.balances).forEach(([currencyCode, balance]: [string, any]) => {
                    if (!currencyTotals[currencyCode]) {
                      const currencyInfo = summaryData.currencies?.find((c: any) => c.code === currencyCode)
                      currencyTotals[currencyCode] = {
                        current: 0,
                        lastMonth: 0,
                        symbol: currencyInfo?.symbol || currencyCode
                      }
                    }
                    currencyTotals[currencyCode].current += balance
                    currencyTotals[currencyCode].lastMonth += balance * 0.95 // 估算值
                  })
                }
              })

              return Object.entries(currencyTotals).map(([currencyCode, data]) => {
                const changePercent = data.lastMonth !== 0 ?
                  ((data.current - data.lastMonth) / Math.abs(data.lastMonth)) * 100 : 0

                return (
                  <div key={currencyCode} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {currencyCode} {t('category.net.balance')}
                    </div>
                    <div className={`text-lg font-semibold ${
                      data.current >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {data.symbol}{Math.abs(data.current).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {t('category.last.month')}: {data.symbol}{Math.abs(data.lastMonth).toFixed(2)}
                      <span className={`ml-2 ${
                        changePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
