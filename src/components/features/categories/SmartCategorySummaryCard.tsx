'use client'

import { calculateAccountBalance } from '@/lib/services/account.service'
import type {
  SimpleTransaction,
  CategoryType,
  SmartCategorySummaryData,
} from '@/types/core'

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

// 本地类型定义（用于这个组件的特定需求）
interface SmartCategory {
  id: string
  name: string
  type?: CategoryType
  transactions: SimpleTransaction[]
  accounts?: SmartAccount[]
}

interface SmartAccount {
  id: string
  name: string
  category?: {
    id?: string
    name?: string
    type?: CategoryType
  } | null
  transactions: SimpleTransaction[]
}

interface SmartCategorySummaryCardProps {
  category: SmartCategory
  currencySymbol: string
  summaryData?: SmartCategorySummaryData
}

export default function SmartCategorySummaryCard({
  category,
  currencySymbol,
  summaryData: _summaryData,
}: SmartCategorySummaryCardProps) {
  const accountType = category.type || 'ASSET'
  const isStockCategory = accountType === 'ASSET' || accountType === 'LIABILITY'
  const isFlowCategory = accountType === 'INCOME' || accountType === 'EXPENSE'

  // 从交易数据计算存量统计（备用方法）
  const _calculateStockStatsFromTransactions = () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const _lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)

    let currentNetValue = 0
    let lastMonthNetValue = 0
    let yearStartNetValue = 0

    // 按时间点计算净值变化
    const transactions = (category.transactions || []).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      const amount = parseFloat(transaction.amount.toString())

      // 根据分类类型和交易类型计算净值变化
      let netValueChange = 0
      if (transaction.type === 'BALANCE') {
        // 余额调整：从备注中提取实际变化金额
        const changeAmount = extractBalanceChangeFromNotes(
          transaction.notes || '',
        )
        netValueChange = changeAmount || amount
      } else if (accountType === 'ASSET') {
        netValueChange = transaction.type === 'INCOME' ? amount : -amount
      } else if (accountType === 'LIABILITY') {
        netValueChange = transaction.type === 'INCOME' ? amount : -amount
      }

      currentNetValue += netValueChange

      if (transactionDate < thisMonth) {
        lastMonthNetValue += netValueChange
      }
      if (transactionDate < thisYear) {
        yearStartNetValue += netValueChange
      }
    })

    const monthlyChange =
      lastMonthNetValue !== 0
        ? ((currentNetValue - lastMonthNetValue) /
            Math.abs(lastMonthNetValue)) *
          100
        : 0

    const yearToDateChange =
      yearStartNetValue !== 0
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
      transactionCount: transactions.length,
    }
  }

  // 存量类分类统计（资产/负债）
  const calculateStockStats = () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const _lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)

    // 统一使用账户数据源进行计算
    const accountsToCalculate = category.accounts || []

    if (accountsToCalculate.length === 0) {
      return {
        currentNetValue: 0,
        lastMonthNetValue: 0,
        yearStartNetValue: 0,
        monthlyChange: 0,
        yearToDateChange: 0,
        transactionCount: 0,
      }
    }

    // 使用专业的余额计算服务统一计算
    let currentNetValue = 0
    let lastMonthNetValue = 0
    let yearStartNetValue = 0
    let totalTransactions = 0

    // 安全检查：确保 accounts 存在
    if (!category.accounts) {
      return {
        currentNetValue: 0,
        lastMonthNetValue: 0,
        yearStartNetValue: 0,
        monthlyChange: 0,
        yearToDateChange: 0,
        transactionCount: 0,
      }
    }

    category.accounts.forEach(account => {
      // 验证账户数据完整性
      if (!account) {
        console.warn(`Invalid account in category ${category.name}`)
        return
      }

      // 验证账户类型匹配 - 更安全的检查
      if (
        !account.category ||
        !account.category.type ||
        account.category.type !== accountType
      ) {
        console.warn(
          `Account ${account.name} type mismatch with category ${category.name}. Account type: ${account.category?.type}, Expected: ${accountType}`,
        )
        return
      }

      // 确保账户有交易数组
      if (!account.transactions) {
        console.warn(`Account ${account.name} has no transactions array`)
        account.transactions = []
      }

      try {
        // 确保账户符合 calculateAccountBalance 的类型要求
        if (!account.category?.name) {
          console.warn(`Account ${account.name} has invalid category`)
          return
        }

        // 构造符合 calculateAccountBalance 要求的账户对象
        const accountForCalculation = {
          ...account,
          category: {
            id: account.category.id,
            name: account.category.name,
            type: account.category.type,
          },
          transactions: account.transactions.map(transaction => ({
            ...transaction,
            currency: {
              code: transaction.currency.code,
              symbol: transaction.currency.symbol,
              name: transaction.currency.name || transaction.currency.code, // 如果没有 name，使用 code 作为 fallback
            },
          })),
        }

        // 计算当前余额
        const currentBalances = calculateAccountBalance(accountForCalculation)
        const currentBalance = Object.values(currentBalances)[0]?.amount || 0

        // 计算上月末余额
        const lastMonthBalances = calculateAccountBalance(
          accountForCalculation,
          { asOfDate: new Date(thisMonth.getTime() - 1) },
        )
        const lastMonthBalance =
          Object.values(lastMonthBalances)[0]?.amount || 0

        // 计算年初余额
        const yearStartBalances = calculateAccountBalance(
          accountForCalculation,
          { asOfDate: new Date(thisYear.getTime() - 1) },
        )
        const yearStartBalance =
          Object.values(yearStartBalances)[0]?.amount || 0

        // 对于负债账户，取绝对值
        if (accountType === 'LIABILITY') {
          currentNetValue += Math.abs(currentBalance)
          lastMonthNetValue += Math.abs(lastMonthBalance)
          yearStartNetValue += Math.abs(yearStartBalance)
        } else {
          currentNetValue += currentBalance
          lastMonthNetValue += lastMonthBalance
          yearStartNetValue += yearStartBalance
        }

        totalTransactions += account.transactions.length
      } catch (error) {
        console.error(
          `Error calculating balance for account ${account.name}:`,
          error,
        )
      }
    })

    // 计算变化率
    const monthlyChange =
      lastMonthNetValue !== 0
        ? ((currentNetValue - lastMonthNetValue) /
            Math.abs(lastMonthNetValue)) *
          100
        : 0

    const yearToDateChange =
      yearStartNetValue !== 0
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
      transactionCount: totalTransactions,
    }
  }

  // 流量类分类统计（收入/支出）
  const calculateFlowStats = () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)

    let totalFlow = 0
    let thisMonthFlow = 0
    let lastMonthFlow = 0
    let thisYearFlow = 0
    let transactionCount = 0

    // 统一使用账户数据源进行计算
    const accountsToCalculate = category.accounts || []

    if (accountsToCalculate.length === 0) {
      return {
        totalFlow: 0,
        thisMonthFlow: 0,
        lastMonthFlow: 0,
        thisYearFlow: 0,
        monthlyChange: 0,
        averageMonthly: 0,
        transactionCount: 0,
      }
    }

    // 遍历分类下的所有账户，统计流量数据
    accountsToCalculate.forEach(account => {
      // 验证账户数据完整性
      if (!account || !account.transactions) {
        console.warn(
          `Invalid account or missing transactions in category ${category.name}`,
        )
        return
      }

      // 验证账户类型匹配
      if (account.category?.type !== accountType) {
        console.warn(
          `Account ${account.name} type mismatch with category ${category.name}`,
        )
        return
      }

      account.transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.date)
        const amount = parseFloat(transaction.amount.toString())

        // 数据验证：确保金额为正数
        if (amount <= 0) {
          console.warn(
            `Invalid transaction amount: ${amount} for account ${account.name}`,
          )
          return
        }

        // 流量类账户只关注对应类型的交易，不应该有余额调整
        const isRelevantTransaction =
          (accountType === 'INCOME' && transaction.type === 'INCOME') ||
          (accountType === 'EXPENSE' && transaction.type === 'EXPENSE')

        // 检查是否有不应该存在的余额调整交易
        if (transaction.type === 'BALANCE') {
          console.warn(`流量类账户 ${account.name} 不应该有余额调整交易`)
          return
        }

        if (isRelevantTransaction) {
          totalFlow += amount
          transactionCount++

          if (transactionDate >= thisMonth) {
            thisMonthFlow += amount
          } else if (
            transactionDate >= lastMonth &&
            transactionDate < thisMonth
          ) {
            lastMonthFlow += amount
          }

          if (transactionDate >= thisYear) {
            thisYearFlow += amount
          }
        }
      })
    })

    // 计算变化率（避免除零错误）
    const monthlyChange =
      lastMonthFlow > 0
        ? ((thisMonthFlow - lastMonthFlow) / lastMonthFlow) * 100
        : thisMonthFlow > 0
          ? 100
          : 0

    // 计算月均值（避免除零错误）
    const currentMonth = new Date().getMonth() + 1
    const averageMonthly = currentMonth > 0 ? thisYearFlow / currentMonth : 0

    return {
      totalFlow,
      thisMonthFlow,
      lastMonthFlow,
      thisYearFlow,
      monthlyChange,
      averageMonthly,
      transactionCount,
    }
  }

  const stockStats = isStockCategory ? calculateStockStats() : null
  const flowStats = isFlowCategory ? calculateFlowStats() : null

  // 存量类分类展示
  if (isStockCategory && stockStats) {
    return (
      <div className='bg-white shadow rounded-lg p-6'>
        {/* 分类类型标识 */}
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-gray-900'>
            {category.name}
          </h3>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              accountType === 'ASSET'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-orange-100 text-orange-800'
            }`}
          >
            {accountType === 'ASSET' ? '资产分类' : '负债分类'} • 存量
          </span>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* 当前净值 */}
          <div className='text-center'>
            <div className='text-sm font-medium text-gray-500 mb-1'>
              当前净值
            </div>
            <div
              className={`text-2xl font-bold ${
                stockStats.currentNetValue >= 0
                  ? 'text-gray-900'
                  : 'text-red-600'
              }`}
            >
              {currencySymbol}
              {Math.abs(stockStats.currentNetValue).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              {stockStats.transactionCount} 笔交易
            </div>
          </div>

          {/* 月度变化 */}
          <div className='text-center'>
            <div className='text-sm font-medium text-gray-500 mb-1'>
              月度变化
            </div>
            <div
              className={`text-xl font-semibold ${
                stockStats.monthlyChange >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {stockStats.monthlyChange >= 0 ? '+' : ''}
              {stockStats.monthlyChange.toLocaleString('zh-CN', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              %
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              上月: {currencySymbol}
              {Math.abs(stockStats.lastMonthNetValue).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          {/* 年度变化 */}
          <div className='text-center'>
            <div className='text-sm font-medium text-gray-500 mb-1'>
              年度变化
            </div>
            <div
              className={`text-xl font-semibold ${
                stockStats.yearToDateChange >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {stockStats.yearToDateChange >= 0 ? '+' : ''}
              {stockStats.yearToDateChange.toLocaleString('zh-CN', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              %
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              年初: {currencySymbol}
              {Math.abs(stockStats.yearStartNetValue).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        {/* 存量特有信息 */}
        <div className='mt-4 pt-4 border-t border-gray-200'>
          <div className='text-xs text-gray-500 text-center'>
            💡 存量数据反映特定时点的资产/负债状况，关注净值变化趋势
          </div>
        </div>
      </div>
    )
  }

  // 流量类分类展示
  if (isFlowCategory && flowStats) {
    return (
      <div className='bg-white shadow rounded-lg p-6'>
        {/* 分类类型标识 */}
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-gray-900'>
            {category.name}
          </h3>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              accountType === 'INCOME'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {accountType === 'INCOME' ? '收入分类' : '支出分类'} • 流量
          </span>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* 本月流量 */}
          <div className='text-center'>
            <div className='text-sm font-medium text-gray-500 mb-1'>
              本月{accountType === 'INCOME' ? '收入' : '支出'}
            </div>
            <div
              className={`text-2xl font-bold ${
                accountType === 'INCOME' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {currencySymbol}
              {flowStats.thisMonthFlow.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              {flowStats.transactionCount} 笔交易
            </div>
          </div>

          {/* 月度变化 */}
          <div className='text-center'>
            <div className='text-sm font-medium text-gray-500 mb-1'>
              月度变化
            </div>
            <div
              className={`text-xl font-semibold ${
                flowStats.monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {flowStats.monthlyChange >= 0 ? '+' : ''}
              {flowStats.monthlyChange.toLocaleString('zh-CN', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              %
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              上月: {currencySymbol}
              {flowStats.lastMonthFlow.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          {/* 年度累计 */}
          <div className='text-center'>
            <div className='text-sm font-medium text-gray-500 mb-1'>
              年度累计
            </div>
            <div
              className={`text-xl font-semibold ${
                accountType === 'INCOME' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {currencySymbol}
              {flowStats.thisYearFlow.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              月均: {currencySymbol}
              {flowStats.averageMonthly.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        {/* 流量特有信息 */}
        <div className='mt-4 pt-4 border-t border-gray-200'>
          <div className='text-xs text-gray-500 text-center'>
            📊 流量数据反映特定期间的现金流动，关注收支规律和趋势
          </div>
        </div>
      </div>
    )
  }

  // 兜底展示
  return (
    <div className='bg-white shadow rounded-lg p-6'>
      <div className='text-center p-4'>
        <div className='text-gray-500'>
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            {category.name}
          </h3>
          <p className='text-sm'>
            请为该分类设置正确的账户类型以获得专业的统计分析
          </p>
        </div>
      </div>
    </div>
  )
}
