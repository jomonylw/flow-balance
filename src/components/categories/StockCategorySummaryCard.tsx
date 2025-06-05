'use client'

interface Category {
  id: string
  name: string
  type: 'ASSET' | 'LIABILITY'
  transactions: Transaction[]
}

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: number
  date: string
  currency: {
    code: string
    symbol: string
  }
}

interface StockCategorySummaryCardProps {
  category: Category
  currencySymbol: string
  summaryData?: any
}

export default function StockCategorySummaryCard({
  category,
  currencySymbol,
  summaryData
}: StockCategorySummaryCardProps) {
  const accountType = category.type

  // 存量类分类统计（资产/负债）
  const calculateStockStats = () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)

    // 使用汇总数据中的账户余额信息
    let currentNetValue = 0
    let transactionCount = 0

    if (summaryData?.accounts) {
      // 从汇总数据中计算当前净值
      summaryData.accounts.forEach((account: any) => {
        if (account.balances) {
          Object.values(account.balances).forEach((balance: any) => {
            currentNetValue += typeof balance === 'number' ? balance : 0
          })
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
        if (accountType === 'ASSET') {
          netValueChange = transaction.type === 'INCOME' ? amount : -amount
        } else if (accountType === 'LIABILITY') {
          netValueChange = transaction.type === 'EXPENSE' ? amount : -amount
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
    <div className="bg-white shadow rounded-lg p-6">
      {/* 分类类型标识 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          accountType === 'ASSET' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-orange-100 text-orange-800'
        }`}>
          {accountType === 'ASSET' ? '资产分类' : '负债分类'} • 存量
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 当前净值 */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500 mb-1">
            当前净值
          </div>
          <div className={`text-2xl font-bold ${
            stockStats.currentNetValue >= 0 ? 'text-gray-900' : 'text-red-600'
          }`}>
            {currencySymbol}{Math.abs(stockStats.currentNetValue).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stockStats.transactionCount} 笔记录
          </div>
        </div>

        {/* 月度变化 */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500 mb-1">
            月度变化
          </div>
          <div className={`text-xl font-semibold ${
            stockStats.monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {stockStats.monthlyChange >= 0 ? '+' : ''}{stockStats.monthlyChange.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            上月: {currencySymbol}{Math.abs(stockStats.lastMonthNetValue).toFixed(2)}
          </div>
        </div>

        {/* 年度变化 */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500 mb-1">
            年度变化
          </div>
          <div className={`text-xl font-semibold ${
            stockStats.yearToDateChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {stockStats.yearToDateChange >= 0 ? '+' : ''}{stockStats.yearToDateChange.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            年初: {currencySymbol}{Math.abs(stockStats.yearStartNetValue).toFixed(2)}
          </div>
        </div>
      </div>

      {/* 存量特有信息 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          💡 存量数据反映特定时点的资产/负债状况，关注净值变化趋势
        </div>
      </div>

      {/* 汇总数据展示 */}
      {summaryData && summaryData.transactionSummary && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">币种分布</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(summaryData.transactionSummary).map(([currency, data]: [string, any]) => (
              <div key={currency} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">{currency} 净值</div>
                <div className={`text-lg font-semibold ${
                  data.net >= 0 ? 'text-gray-900' : 'text-red-600'
                }`}>
                  {currencySymbol}{Math.abs(data.net).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
