'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface Category {
  name: string
  type?: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY'
}

interface Transaction {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'BALANCE_ADJUSTMENT'
  amount: number
  date: string
}

interface Account {
  id: string
  name: string
  description?: string
  category: Category
  transactions: Transaction[]
}

interface FlowAccountSummaryCardProps {
  account: Account
  balance: number
  currencySymbol: string
}

export default function FlowAccountSummaryCard({
  account,
  balance,
  currencySymbol
}: FlowAccountSummaryCardProps) {
  const { t } = useLanguage()
  const accountType = account.category.type || 'EXPENSE'

  // 流量类账户统计（收入/支出）
  const calculateFlowStats = () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)
    
    let thisMonthAmount = 0
    let lastMonthAmount = 0
    let thisYearAmount = 0
    let totalAmount = 0

    account.transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      const amount = transaction.amount
      
      // 流量类账户只关注对应类型的交易
      const isRelevantTransaction = 
        (accountType === 'INCOME' && transaction.type === 'INCOME') ||
        (accountType === 'EXPENSE' && transaction.type === 'EXPENSE')
      
      if (isRelevantTransaction) {
        totalAmount += amount
        
        if (transactionDate >= thisMonth) {
          thisMonthAmount += amount
        } else if (transactionDate >= lastMonth && transactionDate < thisMonth) {
          lastMonthAmount += amount
        }
        
        if (transactionDate >= thisYear) {
          thisYearAmount += amount
        }
      }
    })

    const monthlyChange = lastMonthAmount !== 0 ? 
      ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100 : 0

    return {
      totalAmount,
      thisMonthAmount,
      lastMonthAmount,
      thisYearAmount,
      monthlyChange,
      averageMonthly: thisYearAmount / (new Date().getMonth() + 1)
    }
  }

  const flowStats = calculateFlowStats()

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      {/* 账户类型标识 */}
      <div className="mb-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          accountType === 'INCOME'
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {accountType === 'INCOME' ? t('account.type.income') : t('account.type.expense')} • {t('account.data.type.flow')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 累计总额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('account.total.amount')}
          </div>
          <div className={`text-3xl font-bold ${
            accountType === 'INCOME'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {currencySymbol}{flowStats.totalAmount.toFixed(2)}
          </div>
        </div>

        {/* 本月金额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('account.amount.this.month')}
          </div>
          <div className={`text-2xl font-semibold ${
            accountType === 'INCOME'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {currencySymbol}{flowStats.thisMonthAmount.toFixed(2)}
          </div>
        </div>

        {/* 上月金额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('account.amount.last.month')}
          </div>
          <div className="text-2xl font-semibold text-gray-600 dark:text-gray-300">
            {currencySymbol}{flowStats.lastMonthAmount.toFixed(2)}
          </div>
        </div>

        {/* 月度变化 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('account.change.monthly')}
          </div>
          <div className={`text-2xl font-semibold ${
            flowStats.monthlyChange >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {flowStats.monthlyChange >= 0 ? '+' : ''}{flowStats.monthlyChange.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('account.average.monthly')}: {currencySymbol}{flowStats.averageMonthly.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 流量账户底部统计 */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('account.nature')}</span>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {accountType === 'INCOME' ? t('account.type.income.category') : t('account.type.expense.category')}
            </div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('account.year.total')}</span>
            <div className={`font-medium ${
              accountType === 'INCOME'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {currencySymbol}{flowStats.thisYearAmount.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('account.category')}</span>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {account.category.name}
            </div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('account.data.type')}</span>
            <div className="font-medium text-purple-600 dark:text-purple-400">
              {t('account.data.type.period.flow')}
            </div>
          </div>
        </div>
      </div>

      {/* 流量特有信息 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          📊 {t('account.flow.data.description')}
        </div>
      </div>
    </div>
  )
}
