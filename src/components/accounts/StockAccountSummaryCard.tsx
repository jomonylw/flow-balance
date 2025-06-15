'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDataUpdateListener } from '@/hooks/useDataUpdateListener'
 
interface Category {
  name: string
  type: 'ASSET' | 'LIABILITY'
}

interface Transaction {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'BALANCE'
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

  // 本地状态管理最新的交易数据和余额
  const [transactions, setTransactions] = useState<Transaction[]>(account.transactions)
  const [currentBalance, setCurrentBalance] = useState<number>(balance)
  const [isLoading, setIsLoading] = useState(false)

  // 获取最新的交易数据和余额
  const fetchLatestData = async () => {
    console.log(`[StockAccountSummaryCard] Fetching latest data for account ${account.id}`)
    setIsLoading(true)
    try {
      // 获取交易数据
      const transactionsResponse = await fetch(`/api/accounts/${account.id}/transactions?limit=1000`)
      const transactionsResult = await transactionsResponse.json()

      console.log(`[StockAccountSummaryCard] Transactions result:`, transactionsResult)

      if (transactionsResult.success) {
        const newTransactions = transactionsResult.data.transactions.map((t: any) => ({
          type: t.type,
          amount: parseFloat(t.amount.toString()),
          date: t.date,
          notes: t.notes
        }))
        console.log(`[StockAccountSummaryCard] Setting ${newTransactions.length} transactions`)
        setTransactions(newTransactions)

        // 基于最新的交易数据计算当前余额
        const latestBalanceTransaction = newTransactions
          .filter((t: Transaction) => t.type === 'BALANCE')
          .sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

        if (latestBalanceTransaction) {
          console.log(`[StockAccountSummaryCard] Using latest balance from transaction: ${latestBalanceTransaction.amount}`)
          setCurrentBalance(latestBalanceTransaction.amount)
        } else {
          console.log(`[StockAccountSummaryCard] No balance adjustment found, keeping current balance: ${currentBalance}`)
        }
      }
    } catch (error) {
      console.error('[StockAccountSummaryCard] Error fetching latest data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 监听交易和余额更新事件
  useDataUpdateListener(
    ['transaction-create', 'transaction-update', 'transaction-delete', 'balance-update'],
    async (event) => {
      console.log(`[StockAccountSummaryCard] Data update event received:`, event)
      // 检查是否是当前账户的事件
      if (event.accountId === account.id) {
        console.log(`[StockAccountSummaryCard] Event for current account ${account.id}, fetching latest data`)
        await fetchLatestData()
      } else {
        console.log(`[StockAccountSummaryCard] Event for different account ${event.accountId}, ignoring`)
      }
    },
    [account.id]
  )
 
  // 初始化时如果没有交易数据，获取一次
  useEffect(() => {
    if (transactions.length === 0) {
      console.log(`[StockAccountSummaryCard] Component mounted for account ${account.id}, fetching latest data`)
      fetchLatestData()
    }
  }, [account.id])

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
    console.log(`[StockAccountSummaryCard] Calculating stats with currentBalance: ${currentBalance}, transactions: ${transactions.length}`)

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)

    // 使用本地状态的当前余额
    const accountCurrentBalance = currentBalance
    console.log(`[StockAccountSummaryCard] Using accountCurrentBalance: ${accountCurrentBalance}`)

    // 计算本月的所有余额变化
    const thisMonthChanges = transactions
      .filter(t => new Date(t.date) >= thisMonth)
      .reduce((sum, t) => {
        if (t.type === 'BALANCE') {
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

    const lastMonthBalance = accountCurrentBalance - thisMonthChanges
    console.log(`[StockAccountSummaryCard] thisMonthChanges: ${thisMonthChanges}, lastMonthBalance: ${lastMonthBalance}`)

    // 计算今年的所有余额变化
    const thisYearChanges = transactions
      .filter(t => new Date(t.date) >= thisYear)
      .reduce((sum, t) => {
        if (t.type === 'BALANCE') {
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

    const yearStartBalance = accountCurrentBalance - thisYearChanges
    console.log(`[StockAccountSummaryCard] thisYearChanges: ${thisYearChanges}, yearStartBalance: ${yearStartBalance}`)

    // 计算变化百分比
    const monthlyChange = lastMonthBalance !== 0 ?
      ((accountCurrentBalance - lastMonthBalance) / Math.abs(lastMonthBalance)) * 100 :
      (accountCurrentBalance !== 0 ? (accountCurrentBalance > 0 ? 100 : -100) : 0)

    const yearToDateChange = yearStartBalance !== 0 ?
      ((accountCurrentBalance - yearStartBalance) / Math.abs(yearStartBalance)) * 100 :
      (accountCurrentBalance !== 0 ? (accountCurrentBalance > 0 ? 100 : -100) : 0)

    const result = {
      currentBalance: accountCurrentBalance,
      lastMonthBalance,
      monthlyChange,
      yearStartBalance,
      yearToDateChange
    }

    console.log(`[StockAccountSummaryCard] Final stats:`, result)
    return result
  }

  const stockStats = calculateStockStats()

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 relative">
      {/* 加载指示器 */}
      {isLoading && (
        <div className="absolute top-2 right-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
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
            {currencySymbol}{Math.abs(stockStats.currentBalance).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* 上月余额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('account.balance.last.month')}
          </div>
          <div className="text-2xl font-semibold text-gray-600 dark:text-gray-300">
            {currencySymbol}{Math.abs(stockStats.lastMonthBalance).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            {stockStats.monthlyChange >= 0 ? '+' : ''}{stockStats.monthlyChange.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {currencySymbol}{Math.abs(stockStats.currentBalance - stockStats.lastMonthBalance).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            {stockStats.yearToDateChange >= 0 ? '+' : ''}{stockStats.yearToDateChange.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('account.balance.year.start')}: {currencySymbol}{Math.abs(stockStats.yearStartBalance).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              {transactions.length}
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
