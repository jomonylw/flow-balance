import { useLanguage } from '@/contexts/LanguageContext'

interface Currency {
  code: string
  name: string
  symbol: string
}

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: number // 已序列化的数字
  description: string
  date: Date
  currency: Currency
}

interface RecentActivityCardProps {
  transactions: Transaction[]
  baseCurrency?: Currency
}

export default function RecentActivityCard({ transactions, baseCurrency }: RecentActivityCardProps) {
  const { t } = useLanguage()
  // 计算最近7天的收支情况
  const calculateRecentActivity = () => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentTransactions = transactions.filter(
      transaction => new Date(transaction.date) >= sevenDaysAgo
    )

    let totalIncome = 0
    let totalExpense = 0

    recentTransactions.forEach(transaction => {
      if (transaction.type === 'INCOME') {
        totalIncome += transaction.amount
      } else if (transaction.type === 'EXPENSE') {
        totalExpense += transaction.amount
      }
    })

    return {
      income: totalIncome,
      expense: totalExpense,
      net: totalIncome - totalExpense,
      count: recentTransactions.length
    }
  }

  const { income, expense, net, count } = calculateRecentActivity()
  const currencySymbol = baseCurrency?.symbol || '$'

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {t('dashboard.recent.activity.card')}
            </dt>
            <dd className="flex items-baseline">
              <div className={`text-2xl font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {net >= 0 ? '+' : ''}{currencySymbol}{net.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="ml-2 flex items-baseline text-sm font-medium text-gray-500">
                {t('dashboard.transactions.count', { count })}
              </div>
            </dd>
          </dl>
        </div>
      </div>

      {/* 详细信息 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">{t('dashboard.income')}</span>
            <div className="font-medium text-green-600">
              +{currencySymbol}{income.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <span className="text-gray-500">{t('dashboard.expense')}</span>
            <div className="font-medium text-red-600">
              -{currencySymbol}{expense.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
