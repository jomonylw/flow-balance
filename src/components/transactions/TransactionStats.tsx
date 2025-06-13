'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface Transaction {
  type: 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT'
  amount: number
  date: string
}

interface TransactionStatsProps {
  transactions: Transaction[]
  currencySymbol: string
}

export default function TransactionStats({
  transactions,
  currencySymbol
}: TransactionStatsProps) {
  const { t } = useLanguage()
  // 计算统计数据
  const calculateStats = () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    let totalIncome = 0
    let totalExpense = 0
    let thisMonthIncome = 0
    let thisMonthExpense = 0
    let lastMonthIncome = 0
    let lastMonthExpense = 0
    let incomeCount = 0
    let expenseCount = 0
    let balanceAdjustmentCount = 0

    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      const amount = parseFloat(String(transaction.amount)) || 0

      if (transaction.type === 'INCOME') {
        totalIncome += amount
        incomeCount++
        if (transactionDate >= thisMonth) {
          thisMonthIncome += amount
        } else if (transactionDate >= lastMonth && transactionDate < thisMonth) {
          lastMonthIncome += amount
        }
      } else if (transaction.type === 'EXPENSE') {
        totalExpense += amount
        expenseCount++
        if (transactionDate >= thisMonth) {
          thisMonthExpense += amount
        } else if (transactionDate >= lastMonth && transactionDate < thisMonth) {
          lastMonthExpense += amount
        }
      } else if (transaction.type === 'BALANCE_ADJUSTMENT') {
        // 余额调整不计入收支统计，只计数
        balanceAdjustmentCount++
      }
    })

    const totalNet = totalIncome - totalExpense
    const thisMonthNet = thisMonthIncome - thisMonthExpense
    const lastMonthNet = lastMonthIncome - lastMonthExpense
    const monthlyChange = lastMonthNet !== 0 
      ? ((thisMonthNet - lastMonthNet) / Math.abs(lastMonthNet)) * 100 
      : 0

    return {
      totalIncome,
      totalExpense,
      totalNet,
      thisMonthIncome,
      thisMonthExpense,
      thisMonthNet,
      monthlyChange,
      incomeCount,
      expenseCount,
      totalCount: transactions.length,
      balanceAdjustmentCount
    }
  }

  const stats = calculateStats()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 总收入 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {t('transaction.stats.total.income')}
              </dt>
              <dd className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {currencySymbol}{stats.totalIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400">
                {t('transaction.stats.count.transactions', { count: stats.incomeCount })}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 总支出 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {t('transaction.stats.total.expense')}
              </dt>
              <dd className="text-2xl font-semibold text-red-600 dark:text-red-400">
                {currencySymbol}{stats.totalExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400">
                {t('transaction.stats.count.transactions', { count: stats.expenseCount })}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 净收支 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              stats.totalNet >= 0 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-orange-100 dark:bg-orange-900'
            }`}>
              <svg className={`h-5 w-5 ${
                stats.totalNet >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {t('transaction.stats.net.flow')}
              </dt>
              <dd className={`text-2xl font-semibold ${
                stats.totalNet >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
              }`}>
                {stats.totalNet >= 0 ? '+' : ''}{currencySymbol}{stats.totalNet.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400">
                {t('transaction.stats.total.records', { count: stats.totalCount })}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 本月净额 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              stats.thisMonthNet >= 0 ? 'bg-purple-100 dark:bg-purple-900' : 'bg-yellow-100 dark:bg-yellow-900'
            }`}>
              <svg className={`h-5 w-5 ${
                stats.thisMonthNet >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-yellow-600 dark:text-yellow-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0h6m-6 0a1 1 0 00-1 1v10a1 1 0 001 1h6a1 1 0 001-1V8a1 1 0 00-1-1" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {t('transaction.stats.this.month.net')}
              </dt>
              <dd className={`text-2xl font-semibold ${
                stats.thisMonthNet >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {stats.thisMonthNet >= 0 ? '+' : ''}{currencySymbol}{stats.thisMonthNet.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </dd>
              {stats.monthlyChange !== 0 && (
                <dd className={`text-xs ${
                  stats.monthlyChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {stats.monthlyChange > 0 ? '↗' : '↘'} {Math.abs(stats.monthlyChange).toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% {t('transaction.stats.vs.last.month')}
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
