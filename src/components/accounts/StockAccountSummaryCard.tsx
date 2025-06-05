interface Category {
  name: string
  type: 'ASSET' | 'LIABILITY'
}

interface Transaction {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
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
  const accountType = account.category.type

  // 存量类账户统计（资产/负债）
  const calculateStockStats = () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)
    
    // 计算各时点的余额
    let thisMonthBalance = 0
    let lastMonthBalance = 0
    let yearStartBalance = 0
    
    account.transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      const amount = transaction.amount
      
      // 根据账户类型计算余额变化
      let balanceChange = 0
      if (accountType === 'ASSET') {
        balanceChange = transaction.type === 'INCOME' ? amount : -amount
      } else if (accountType === 'LIABILITY') {
        balanceChange = transaction.type === 'EXPENSE' ? amount : -amount
      }
      
      // 累计到各时点
      if (transactionDate < thisMonth) {
        thisMonthBalance += balanceChange
        if (transactionDate < lastMonth) {
          lastMonthBalance += balanceChange
          if (transactionDate < thisYear) {
            yearStartBalance += balanceChange
          }
        }
      }
    })
    
    thisMonthBalance = balance // 当前余额
    lastMonthBalance = thisMonthBalance - account.transactions
      .filter(t => new Date(t.date) >= thisMonth)
      .reduce((sum, t) => {
        const amount = t.amount
        if (accountType === 'ASSET') {
          return sum + (t.type === 'INCOME' ? amount : -amount)
        } else {
          return sum + (t.type === 'EXPENSE' ? amount : -amount)
        }
      }, 0)
    
    const monthlyChange = lastMonthBalance !== 0 ? 
      ((thisMonthBalance - lastMonthBalance) / Math.abs(lastMonthBalance)) * 100 : 0
    
    return {
      currentBalance: balance,
      lastMonthBalance,
      monthlyChange,
      yearStartBalance,
      yearToDateChange: yearStartBalance !== 0 ? 
        ((balance - yearStartBalance) / Math.abs(yearStartBalance)) * 100 : 0
    }
  }

  const stockStats = calculateStockStats()

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* 账户类型标识 */}
      <div className="mb-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          accountType === 'ASSET' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-orange-100 text-orange-800'
        }`}>
          {accountType === 'ASSET' ? '资产账户' : '负债账户'} • 存量数据
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 当前余额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 mb-1">
            当前余额
          </div>
          <div className={`text-3xl font-bold ${
            stockStats.currentBalance >= 0 ? 'text-gray-900' : 'text-red-600'
          }`}>
            {currencySymbol}{Math.abs(stockStats.currentBalance).toFixed(2)}
          </div>
        </div>

        {/* 上月余额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 mb-1">
            上月余额
          </div>
          <div className="text-2xl font-semibold text-gray-600">
            {currencySymbol}{Math.abs(stockStats.lastMonthBalance).toFixed(2)}
          </div>
        </div>

        {/* 月度变化 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 mb-1">
            月度变化
          </div>
          <div className={`text-2xl font-semibold ${
            stockStats.monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {stockStats.monthlyChange >= 0 ? '+' : ''}{stockStats.monthlyChange.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {currencySymbol}{Math.abs(stockStats.currentBalance - stockStats.lastMonthBalance).toFixed(2)}
          </div>
        </div>

        {/* 年度变化 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 mb-1">
            年度变化
          </div>
          <div className={`text-2xl font-semibold ${
            stockStats.yearToDateChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {stockStats.yearToDateChange >= 0 ? '+' : ''}{stockStats.yearToDateChange.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            年初: {currencySymbol}{Math.abs(stockStats.yearStartBalance).toFixed(2)}
          </div>
        </div>
      </div>

      {/* 存量账户底部统计 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">账户性质</span>
            <div className="font-medium text-gray-900">
              {accountType === 'ASSET' ? '资产类' : '负债类'}
            </div>
          </div>
          <div>
            <span className="text-gray-500">交易笔数</span>
            <div className="font-medium text-gray-900">
              {account.transactions.length}
            </div>
          </div>
          <div>
            <span className="text-gray-500">账户分类</span>
            <div className="font-medium text-gray-900">
              {account.category.name}
            </div>
          </div>
          <div>
            <span className="text-gray-500">数据类型</span>
            <div className="font-medium text-blue-600">
              时点余额
            </div>
          </div>
        </div>
      </div>

      {/* 存量特有信息 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          💡 存量数据反映特定时点的资产/负债状况，关注净值变化趋势
        </div>
      </div>
    </div>
  )
}
