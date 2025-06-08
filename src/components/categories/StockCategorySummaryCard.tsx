'use client'

import { useLanguage } from '@/contexts/LanguageContext'

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
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)

    // 优先使用分类总余额数据，计算折算到本位币的总净值
    let currentNetValue = 0
    let transactionCount = 0

    // 优先使用分类总余额数据
    if (summaryData?.categoryBalances) {
      Object.entries(summaryData.categoryBalances).forEach(([currencyCode, balance]: [string, any]) => {
        // 简化处理：如果是本位币直接累加，否则需要汇率转换（这里暂时按1:1处理）
        if (currencyCode === baseCurrency?.code) {
          currentNetValue += balance
        } else {
          // TODO: 实际应该根据汇率转换
          currentNetValue += balance
        }
      })

      // 计算总交易数量
      if (summaryData.allAccounts) {
        summaryData.allAccounts.forEach((account: any) => {
          transactionCount += account.transactionCount || 0
        })
      }
    } else if (summaryData?.accounts) {
      // 回退到账户余额汇总
      summaryData.accounts.forEach((account: any) => {
        if (account.balances) {
          // 如果有本位币余额，优先使用；否则累加所有币种余额（需要后续转换）
          if (baseCurrency && account.balances[baseCurrency.code] !== undefined) {
            currentNetValue += account.balances[baseCurrency.code] || 0
          } else {
            // 如果没有本位币余额，累加所有币种（这里需要汇率转换，暂时直接累加）
            Object.values(account.balances).forEach((balance: any) => {
              currentNetValue += typeof balance === 'number' ? balance : 0
            })
          }
        }
        transactionCount += account.transactionCount || 0
      })
    } else {
      // 如果没有汇总数据，使用交易记录计算（备用方法）
      const transactions = category.transactions.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      transactions.forEach(transaction => {
        const amount = transaction.amount

        // 根据分类类型和交易类型计算净值变化
        let netValueChange = 0
        if (transaction.type === 'BALANCE_ADJUSTMENT') {
          // 余额调整：从备注中提取实际变化金额
          const changeAmount = extractBalanceChangeFromNotes(transaction.notes || '')
          netValueChange = changeAmount || amount
        } else if (accountType === 'ASSET') {
          netValueChange = transaction.type === 'INCOME' ? amount : -amount
        } else if (accountType === 'LIABILITY') {
          netValueChange = transaction.type === 'INCOME' ? amount : -amount
        }

        currentNetValue += netValueChange
      })

      transactionCount = transactions.length
    }

    // 计算历史时点的净值（简化计算，基于当前值的估算）
    // 注意：这里是简化的计算方法，实际应该基于时点余额
    const lastMonthNetValue = currentNetValue * 0.95 // 假设上月为当前的95%
    const yearStartNetValue = currentNetValue * 0.85 // 假设年初为当前的85%

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

      {/* 汇总数据展示 */}
      {summaryData && (summaryData.categoryBalances || summaryData.transactionSummary) && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('category.currency.distribution')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 优先显示分类总余额数据 */}
            {summaryData.categoryBalances ? (
              Object.entries(summaryData.categoryBalances).map(([currencyCode, balance]: [string, any]) => {
                // 查找对应的货币信息以获取正确的符号
                const currencyInfo = summaryData.currencies?.find((c: any) => c.code === currencyCode)
                const symbol = currencyInfo?.symbol || currencyCode

                // 获取对应的交易统计数据（用于显示增减信息）
                const transactionData = summaryData.transactionSummary?.[currencyCode]

                return (
                  <div key={currencyCode} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {currencyCode} {t('category.net.balance')}
                    </div>
                    <div className={`text-lg font-semibold ${
                      balance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {symbol}{Math.abs(balance).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {transactionData ? (
                        `${t('category.increase')}: ${symbol}${transactionData.income?.toFixed(2) || '0.00'} | ${t('category.decrease')}: ${symbol}${transactionData.expense?.toFixed(2) || '0.00'}`
                      ) : (
                        `${t('category.current.balance')}: ${symbol}${Math.abs(balance).toFixed(2)}`
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              // 回退到交易汇总数据
              Object.entries(summaryData.transactionSummary).map(([currencyCode, data]: [string, any]) => {
                // 查找对应的货币信息以获取正确的符号
                const currencyInfo = summaryData.currencies?.find((c: any) => c.code === currencyCode)
                const symbol = currencyInfo?.symbol || currencyCode

                return (
                  <div key={currencyCode} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {currencyCode} {t('category.net.balance')}
                    </div>
                    <div className={`text-lg font-semibold ${
                      data.net >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {symbol}{Math.abs(data.net).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {t('category.increase')}: {symbol}{data.income?.toFixed(2) || '0.00'} | {t('category.decrease')}: {symbol}{data.expense?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
