interface Category {
  name: string
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

    account.transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      
      if (transaction.type === 'INCOME') {
        totalIncome += transaction.amount
        if (transactionDate >= thisMonth) {
          thisMonthIncome += transaction.amount
        } else if (transactionDate >= lastMonth && transactionDate < thisMonth) {
          lastMonthIncome += transaction.amount
        }
      } else if (transaction.type === 'EXPENSE') {
        totalExpense += transaction.amount
        if (transactionDate >= thisMonth) {
          thisMonthExpense += transaction.amount
        } else if (transactionDate >= lastMonth && transactionDate < thisMonth) {
          lastMonthExpense += transaction.amount
        }
      }
    })

    const thisMonthNet = thisMonthIncome - thisMonthExpense
    const lastMonthNet = lastMonthIncome - lastMonthExpense
    const netChange = lastMonthNet !== 0 ? ((thisMonthNet - lastMonthNet) / Math.abs(lastMonthNet)) * 100 : 0

    return {
      totalIncome,
      totalExpense,
      thisMonthIncome,
      thisMonthExpense,
      thisMonthNet,
      netChange
    }
  }

  const stats = calculateStats()

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 当前余额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 mb-1">
            当前余额
          </div>
          <div className={`text-3xl font-bold ${
            balance >= 0 ? 'text-gray-900' : 'text-red-600'
          }`}>
            {currencySymbol}{balance.toFixed(2)}
          </div>
        </div>

        {/* 本月收入 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 mb-1">
            本月收入
          </div>
          <div className="text-2xl font-semibold text-green-600">
            +{currencySymbol}{stats.thisMonthIncome.toFixed(2)}
          </div>
        </div>

        {/* 本月支出 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 mb-1">
            本月支出
          </div>
          <div className="text-2xl font-semibold text-red-600">
            -{currencySymbol}{stats.thisMonthExpense.toFixed(2)}
          </div>
        </div>

        {/* 本月净额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 mb-1">
            本月净额
          </div>
          <div className={`text-2xl font-semibold ${
            stats.thisMonthNet >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {stats.thisMonthNet >= 0 ? '+' : ''}{currencySymbol}{stats.thisMonthNet.toFixed(2)}
          </div>
          {stats.netChange !== 0 && (
            <div className={`text-xs ${
              stats.netChange > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.netChange > 0 ? '↗' : '↘'} {Math.abs(stats.netChange).toFixed(1)}% vs 上月
            </div>
          )}
        </div>
      </div>

      {/* 总计统计 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">总收入</span>
            <div className="font-medium text-green-600">
              {currencySymbol}{stats.totalIncome.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">总支出</span>
            <div className="font-medium text-red-600">
              {currencySymbol}{stats.totalExpense.toFixed(2)}
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
        </div>
      </div>
    </div>
  )
}
