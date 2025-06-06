interface Transaction {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'BALANCE_ADJUSTMENT'
  amount: number
  date: string
}

interface Category {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  transactions: Transaction[]
}

interface CategoryStats {
  totalAmount: number
  totalIncome: number
  totalExpense: number
  thisMonthAmount: number
  thisMonthIncome: number
  thisMonthExpense: number
  lastMonthAmount: number
  lastMonthIncome: number
  lastMonthExpense: number
  thisYearAmount: number
  thisYearIncome: number
  thisYearExpense: number
  monthlyChange: number
  incomeCount: number
  expenseCount: number
  totalCount: number
  averageAmount: number
}

interface CategorySummaryCardProps {
  category: Category
  stats: CategoryStats
  currencySymbol: string
}

export default function CategorySummaryCard({
  category,
  stats,
  currencySymbol
}: CategorySummaryCardProps) {
  // 使用已计算的平均金额
  const averageAmount = stats.averageAmount

  // 获取最近一笔交易
  const latestTransaction = category.transactions.length > 0 ? category.transactions[0] : null

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 总金额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 mb-1">
            总金额
          </div>
          <div className={`text-3xl font-bold ${
            stats.totalAmount >= 0 ? 'text-gray-900' : 'text-red-600'
          }`}>
            {currencySymbol}{Math.abs(stats.totalAmount).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.totalCount} 笔交易
          </div>
        </div>

        {/* 本月金额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 mb-1">
            本月金额
          </div>
          <div className={`text-2xl font-semibold ${
            stats.thisMonthAmount >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {stats.thisMonthAmount >= 0 ? '+' : ''}{currencySymbol}{Math.abs(stats.thisMonthAmount).toFixed(2)}
          </div>
          {stats.monthlyChange !== 0 && (
            <div className={`text-xs ${
              stats.monthlyChange > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.monthlyChange > 0 ? '↗' : '↘'} {Math.abs(stats.monthlyChange).toFixed(1)}% vs 上月
            </div>
          )}
        </div>

        {/* 今年金额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 mb-1">
            今年金额
          </div>
          <div className={`text-2xl font-semibold ${
            stats.thisYearAmount >= 0 ? 'text-blue-600' : 'text-red-600'
          }`}>
            {stats.thisYearAmount >= 0 ? '+' : ''}{currencySymbol}{Math.abs(stats.thisYearAmount).toFixed(2)}
          </div>
        </div>

        {/* 平均金额 */}
        <div className="text-center md:text-left">
          <div className="text-sm font-medium text-gray-500 mb-1">
            平均金额
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            {currencySymbol}{averageAmount.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            每笔交易
          </div>
        </div>
      </div>

      {/* 交易类型分布 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">收入交易</span>
            <div className="font-medium text-green-600">
              {stats.incomeCount} 笔
            </div>
          </div>
          <div>
            <span className="text-gray-500">支出交易</span>
            <div className="font-medium text-red-600">
              {stats.expenseCount} 笔
            </div>
          </div>
          <div>
            <span className="text-gray-500">上月金额</span>
            <div className="font-medium text-gray-900">
              {currencySymbol}{Math.abs(stats.lastMonthAmount).toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">最近交易</span>
            <div className="font-medium text-gray-900">
              {latestTransaction 
                ? new Date(latestTransaction.date).toLocaleDateString('zh-CN')
                : '无'
              }
            </div>
          </div>
        </div>
      </div>

      {/* 分类信息 */}
      {(category.description || category.color) && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            {category.color && (
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm text-gray-500">分类颜色</span>
              </div>
            )}
            {category.description && (
              <div className="flex-1">
                <span className="text-sm text-gray-500">描述：</span>
                <span className="text-sm text-gray-900 ml-1">{category.description}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
