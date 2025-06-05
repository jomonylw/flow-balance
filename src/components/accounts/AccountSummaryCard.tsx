interface Category {
  name: string
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
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

interface AccountSummaryCardProps {
  account: Account
  balance: number
  currencySymbol: string
}

export default function AccountSummaryCard({
  account,
  balance,
  currencySymbol
}: AccountSummaryCardProps) {
  const accountType = account.category.type || 'ASSET'
  const isStockAccount = accountType === 'ASSET' || accountType === 'LIABILITY'
  const isFlowAccount = accountType === 'INCOME' || accountType === 'EXPENSE'

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

  const stockStats = isStockAccount ? calculateStockStats() : null
  const flowStats = isFlowAccount ? calculateFlowStats() : null

  // 存量类账户展示
  if (isStockAccount && stockStats) {
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
      </div>
    )
  }

  // 流量类账户展示
  if (isFlowAccount && flowStats) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        {/* 账户类型标识 */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            accountType === 'INCOME'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {accountType === 'INCOME' ? '收入账户' : '支出账户'} • 流量数据
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 累计总额 */}
          <div className="text-center md:text-left">
            <div className="text-sm font-medium text-gray-500 mb-1">
              累计总额
            </div>
            <div className={`text-3xl font-bold ${
              accountType === 'INCOME' ? 'text-green-600' : 'text-red-600'
            }`}>
              {currencySymbol}{flowStats.totalAmount.toFixed(2)}
            </div>
          </div>

          {/* 本月金额 */}
          <div className="text-center md:text-left">
            <div className="text-sm font-medium text-gray-500 mb-1">
              本月金额
            </div>
            <div className={`text-2xl font-semibold ${
              accountType === 'INCOME' ? 'text-green-600' : 'text-red-600'
            }`}>
              {currencySymbol}{flowStats.thisMonthAmount.toFixed(2)}
            </div>
          </div>

          {/* 上月金额 */}
          <div className="text-center md:text-left">
            <div className="text-sm font-medium text-gray-500 mb-1">
              上月金额
            </div>
            <div className="text-2xl font-semibold text-gray-600">
              {currencySymbol}{flowStats.lastMonthAmount.toFixed(2)}
            </div>
          </div>

          {/* 月度变化 */}
          <div className="text-center md:text-left">
            <div className="text-sm font-medium text-gray-500 mb-1">
              月度变化
            </div>
            <div className={`text-2xl font-semibold ${
              flowStats.monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {flowStats.monthlyChange >= 0 ? '+' : ''}{flowStats.monthlyChange.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              月均: {currencySymbol}{flowStats.averageMonthly.toFixed(2)}
            </div>
          </div>
        </div>

        {/* 流量账户底部统计 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">账户性质</span>
              <div className="font-medium text-gray-900">
                {accountType === 'INCOME' ? '收入类' : '支出类'}
              </div>
            </div>
            <div>
              <span className="text-gray-500">今年累计</span>
              <div className={`font-medium ${
                accountType === 'INCOME' ? 'text-green-600' : 'text-red-600'
              }`}>
                {currencySymbol}{flowStats.thisYearAmount.toFixed(2)}
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
              <div className="font-medium text-purple-600">
                期间流量
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 兜底：使用原有逻辑（向后兼容）
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="text-center p-8">
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">账户类型未设置</p>
          <p className="text-sm mt-1">请为该账户的分类设置正确的账户类型以获得更准确的统计信息</p>
        </div>
      </div>
    </div>
  )
}
