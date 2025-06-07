import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

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

interface Category {
  name: string
}

interface Account {
  id: string
  name: string
  category: Category
  transactions: Transaction[]
}

interface AccountBalancesCardProps {
  accounts: Account[]
  baseCurrency?: Currency
}

export default function AccountBalancesCard({ accounts, baseCurrency }: AccountBalancesCardProps) {
  const { t } = useLanguage()

  // 计算每个账户的余额
  const accountsWithBalances = accounts.map(account => {
    let balance = 0

    account.transactions.forEach(transaction => {
      if (transaction.type === 'INCOME') {
        balance += transaction.amount
      } else if (transaction.type === 'EXPENSE') {
        balance -= transaction.amount
      }
    })

    return {
      ...account,
      balance
    }
  }).sort((a, b) => b.balance - a.balance) // 按余额降序排列

  const currencySymbol = baseCurrency?.symbol || '$'

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-500">
              {t('dashboard.account.balances.card')}
            </h3>
          </div>
        </div>
        <Link
          href="/accounts"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          {t('dashboard.view.all')}
        </Link>
      </div>

      {/* 账户列表 */}
      <div className="space-y-3">
        {accountsWithBalances.slice(0, 5).map(account => (
          <Link
            key={account.id}
            href={`/accounts/${account.id}`}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center min-w-0 flex-1">
              <div className="flex-shrink-0">
                <div className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {account.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {account.category.name}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <span className={`text-sm font-medium ${
                account.balance >= 0
                  ? 'text-gray-900'
                  : 'text-red-600'
              }`}>
                {currencySymbol}{account.balance.toFixed(2)}
              </span>
            </div>
          </Link>
        ))}
        
        {accountsWithBalances.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            {t('dashboard.no.account.data')}
          </div>
        )}

        {accountsWithBalances.length > 5 && (
          <div className="text-center pt-2">
            <Link
              href="/accounts"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {t('dashboard.view.other.accounts', { count: accountsWithBalances.length - 5 })}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
