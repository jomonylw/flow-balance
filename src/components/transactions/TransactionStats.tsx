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

      if (transaction.type === 'INCOME') {
        totalIncome += transaction.amount
        incomeCount++
        if (transactionDate >= thisMonth) {
          thisMonthIncome += transaction.amount
        } else if (transactionDate >= lastMonth && transactionDate < thisMonth) {
          lastMonthIncome += transaction.amount
        }
      } else if (transaction.type === 'EXPENSE') {
        totalExpense += transaction.amount
        expenseCount++
        if (transactionDate >= thisMonth) {
          thisMonthExpense += transaction.amount
        } else if (transactionDate >= lastMonth && transactionDate < thisMonth) {
          lastMonthExpense += transaction.amount
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
      totalCount: transactions.length
    }
  }

  const stats = calculateStats()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 总收入 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                总收入
              </dt>
              <dd className="text-2xl font-semibold text-green-600">
                {currencySymbol}{stats.totalIncome.toFixed(2)}
              </dd>
              <dd className="text-xs text-gray-500">
                {stats.incomeCount} 笔交易
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 总支出 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                总支出
              </dt>
              <dd className="text-2xl font-semibold text-red-600">
                {currencySymbol}{stats.totalExpense.toFixed(2)}
              </dd>
              <dd className="text-xs text-gray-500">
                {stats.expenseCount} 笔交易
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 净收支 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              stats.totalNet >= 0 ? 'bg-blue-100' : 'bg-orange-100'
            }`}>
              <svg className={`h-5 w-5 ${
                stats.totalNet >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                净收支
              </dt>
              <dd className={`text-2xl font-semibold ${
                stats.totalNet >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {stats.totalNet >= 0 ? '+' : ''}{currencySymbol}{stats.totalNet.toFixed(2)}
              </dd>
              <dd className="text-xs text-gray-500">
                {stats.totalCount} 笔交易
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 本月净额 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              stats.thisMonthNet >= 0 ? 'bg-purple-100' : 'bg-yellow-100'
            }`}>
              <svg className={`h-5 w-5 ${
                stats.thisMonthNet >= 0 ? 'text-purple-600' : 'text-yellow-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0h6m-6 0a1 1 0 00-1 1v10a1 1 0 001 1h6a1 1 0 001-1V8a1 1 0 00-1-1" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                本月净额
              </dt>
              <dd className={`text-2xl font-semibold ${
                stats.thisMonthNet >= 0 ? 'text-purple-600' : 'text-yellow-600'
              }`}>
                {stats.thisMonthNet >= 0 ? '+' : ''}{currencySymbol}{stats.thisMonthNet.toFixed(2)}
              </dd>
              {stats.monthlyChange !== 0 && (
                <dd className={`text-xs ${
                  stats.monthlyChange > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.monthlyChange > 0 ? '↗' : '↘'} {Math.abs(stats.monthlyChange).toFixed(1)}% vs 上月
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
