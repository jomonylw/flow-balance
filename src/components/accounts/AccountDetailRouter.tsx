import StockAccountDetailView from './StockAccountDetailView'
import FlowAccountDetailView from './FlowAccountDetailView'

interface User {
  id: string
  email: string
  settings?: {
    baseCurrency?: {
      code: string
      name: string
      symbol: string
    }
  }
}

interface Category {
  id: string
  name: string
  type?: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
}

interface Currency {
  code: string
  name: string
  symbol: string
}

interface Tag {
  id: string
  name: string
  color?: string
}

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'BALANCE'
  amount: number
  description: string
  notes?: string
  date: string
  category: Category
  currency: Currency
  tags: { tag: Tag }[]
}

interface Account {
  id: string
  name: string
  description?: string
  category: Category
  transactions: Transaction[]
}

interface AccountDetailRouterProps {
  account: Account
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}

export default function AccountDetailRouter({
  account,
  categories,
  currencies,
  tags,
  user
}: AccountDetailRouterProps) {
  const accountType = account.category.type

  // 存量类账户（资产/负债）
  if (accountType === 'ASSET' || accountType === 'LIABILITY') {
    return (
      <StockAccountDetailView
        account={account as any}
        currencies={currencies}
        user={user}
      />
    )
  }

  // 流量类账户（收入/支出）
  if (accountType === 'INCOME' || accountType === 'EXPENSE') {
    return (
      <FlowAccountDetailView
        account={account as any}
        categories={categories as any}
        currencies={currencies}
        tags={tags}
        user={user}
      />
    )
  }

  // 未设置账户类型的兜底处理
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white shadow rounded-lg p-8">
        <div className="text-center">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-medium text-gray-900 mb-2">账户类型未设置</h2>
            <p className="text-sm text-gray-600 mb-4">
              请为该账户的分类设置正确的账户类型以获得专业的管理功能
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>资产类</strong>：银行存款、投资账户、现金等</p>
              <p><strong>负债类</strong>：信用卡、贷款、应付款等</p>
              <p><strong>收入类</strong>：工资、投资收益、其他收入等</p>
              <p><strong>支出类</strong>：生活费、娱乐、交通等支出</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
