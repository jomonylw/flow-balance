'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface Category {
  name: string
  type: 'ASSET' | 'LIABILITY'
}

interface Transaction {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'BALANCE_ADJUSTMENT'
  amount: number
  date: string
  notes?: string
}

interface Account {
  id: string
  name: string
  description?: string
  category: Category
  transactions: Transaction[]
}

interface StockAccountSummaryCardProps {
  account: Account
  balance: number
  currencySymbol: string
}

export default function StockAccountSummaryCard({
  account,
  balance,
  currencySymbol
}: StockAccountSummaryCardProps) {
  const { t } = useLanguage()
  const accountType = account.category.type

  // 从交易备注中提取余额变化金额
  const extractBalanceChangeFromNotes = (notes: string): number | null => {
    if (!notes) return null
    // 匹配模式：变化金额：+123.45 或 变化金额：-123.45
    const match = notes.match(/变化金额：([+-]?\d+\.?\d*)/)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
    return null
  }

  // 存量类账户统计（资产/负债）
  const calculateStockStats = () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)

    // 当前余额就是传入的balance
    const currentBalance = balance

    // 计算本月的所有余额变化
    const thisMonthChanges = account.transactions
      .filter(t => new Date(t.date) >= thisMonth)
      .reduce((sum, t) => {
        if (t.type === 'BALANCE_ADJUSTMENT') {
          // 从备注中提取实际的变化金额（包含正负号）
          const changeAmount = extractBalanceChangeFromNotes(t.notes || '')
          if (changeAmount !== null) {
            return sum + changeAmount
          }
          // 如果无法提取，使用amount作为正值（不推荐，但作为兜底）
          console.warn('无法从备注中提取余额变化金额，使用amount作为正值:', t)
          return sum + t.amount
        }
        // 对于存量账户，一般不应该有INCOME/EXPENSE交易
        // 但如果有，按照账户类型处理
        if (accountType === 'ASSET') {
          return sum + (t.type === 'INCOME' ? t.amount : -t.amount)
        } else if (accountType === 'LIABILITY') {
          return sum + (t.type === 'EXPENSE' ? t.amount : -t.amount)
        }
        return sum
      }, 0)

    const lastMonthBalance = currentBalance - thisMonthChanges

    // 计算今年的所有余额变化
    const thisYearChanges = account.transactions
      .filter(t => new Date(t.date) >= thisYear)
      .reduce((sum, t) => {
        if (t.type === 'BALANCE_ADJUSTMENT') {
          // 从备注中提取实际的变化金额（包含正负号）
          const changeAmount = extractBalanceChangeFromNotes(t.notes || '')
          if (changeAmount !== null) {
            return sum + changeAmount
          }
          // 如果无法提取，使用amount作为正值（不推荐，但作为兜底）
          return sum + t.amount
        }
        if (accountType === 'ASSET') {
          return sum + (t.type === 'INCOME' ? t.amount : -t.amount)
        } else if (accountType === 'LIABILITY') {
          return sum + (t.type === 'EXPENSE' ? t.amount : -t.amount)
        }
        return sum
      }, 0)

    const yearStartBalance = currentBalance - thisYearChanges

    // 计算变化百分比
    const monthlyChange = lastMonthBalance !== 0 ?
      ((currentBalance - lastMonthBalance) / Math.abs(lastMonthBalance)) * 100 :
      (currentBalance !== 0 ? (currentBalance > 0 ? 100 : -100) : 0)

    const yearToDateChange = yearStartBalance !== 0 ?
      ((currentBalance - yearStartBalance) / Math.abs(yearStartBalance)) * 100 :
      (currentBalance !== 0 ? (currentBalance > 0 ? 100 : -100) : 0)

    return {
      currentBalance,
      lastMonthBalance,
      monthlyChange,
      yearStartBalance,
      yearToDateChange
    }
  }

  const stockStats = calculateStockStats()

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      {/* 账户类型标识 */}
      <div className="mb-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          accountType === 'ASSET'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
        }`}>
          {accountType === 'ASSET' ? t('account.type.asset') : t('account.type.liability')} • {t('account.data.type.stock')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 当前余额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('account.balance.current')}
          </div>
          <div className={`text-3xl font-bold ${
            stockStats.currentBalance >= 0
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {currencySymbol}{Math.abs(stockStats.currentBalance).toFixed(2)}
          </div>
        </div>

        {/* 上月余额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('account.balance.last.month')}
          </div>
          <div className="text-2xl font-semibold text-gray-600 dark:text-gray-300">
            {currencySymbol}{Math.abs(stockStats.lastMonthBalance).toFixed(2)}
          </div>
        </div>

        {/* 月度变化 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('account.change.monthly')}
          </div>
          <div className={`text-2xl font-semibold ${
            stockStats.monthlyChange >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {stockStats.monthlyChange >= 0 ? '+' : ''}{stockStats.monthlyChange.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {currencySymbol}{Math.abs(stockStats.currentBalance - stockStats.lastMonthBalance).toFixed(2)}
          </div>
        </div>

        {/* 年度变化 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('account.change.yearly')}
          </div>
          <div className={`text-2xl font-semibold ${
            stockStats.yearToDateChange >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {stockStats.yearToDateChange >= 0 ? '+' : ''}{stockStats.yearToDateChange.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('account.balance.year.start')}: {currencySymbol}{Math.abs(stockStats.yearStartBalance).toFixed(2)}
          </div>
        </div>
      </div>

      {/* 存量账户底部统计 */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('account.nature')}</span>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {accountType === 'ASSET' ? t('account.type.asset.category') : t('account.type.liability.category')}
            </div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('account.transaction.count')}</span>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {account.transactions.length}
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
            <div className="font-medium text-blue-600 dark:text-blue-400">
              {t('account.data.type.point.balance')}
            </div>
          </div>
        </div>
      </div>

      {/* 存量特有信息 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 {t('account.stock.data.description')}
        </div>
      </div>
    </div>
  )
}
