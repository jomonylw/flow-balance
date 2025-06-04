interface Currency {
  code: string
  name: string
  symbol: string
}

interface Transaction {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: number // 已序列化的数字
  currency: Currency
}

interface Account {
  id: string
  name: string
  transactions: Transaction[]
}

interface NetWorthCardProps {
  accounts: Account[]
  baseCurrency?: Currency
}

export default function NetWorthCard({ accounts, baseCurrency }: NetWorthCardProps) {
  // 计算净资产（简化版本，实际应用中需要考虑汇率转换）
  const calculateNetWorth = () => {
    let totalAssets = 0
    let totalLiabilities = 0

    accounts.forEach(account => {
      let accountBalance = 0

      account.transactions.forEach(transaction => {
        if (transaction.type === 'INCOME') {
          accountBalance += transaction.amount
        } else if (transaction.type === 'EXPENSE') {
          accountBalance -= transaction.amount
        }
        // TRANSFER 需要更复杂的逻辑，暂时忽略
      })

      if (accountBalance > 0) {
        totalAssets += accountBalance
      } else {
        totalLiabilities += Math.abs(accountBalance)
      }
    })

    return {
      assets: totalAssets,
      liabilities: totalLiabilities,
      netWorth: totalAssets - totalLiabilities
    }
  }

  const { assets, liabilities, netWorth } = calculateNetWorth()
  const currencySymbol = baseCurrency?.symbol || '$'

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              净资产
            </dt>
            <dd className="flex items-baseline">
              <div className={`text-2xl font-semibold ${netWorth >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {currencySymbol}{netWorth.toFixed(2)}
              </div>
              <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                {/* 这里可以添加变化百分比 */}
              </div>
            </dd>
          </dl>
        </div>
      </div>
      
      {/* 详细信息 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">总资产</span>
            <div className="font-medium text-green-600">
              {currencySymbol}{assets.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">总负债</span>
            <div className="font-medium text-red-600">
              {currencySymbol}{liabilities.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
