import StockAccountDetailView from './StockAccountDetailView'
import FlowAccountDetailView from './FlowAccountDetailView'
import type { User, Category, Currency, Tag, Account } from '@/types/core'
import type { SerializedTransactionWithBasic } from '@/types/database'
import type {
  LegacyAccount,
  LegacyCurrency,
  LegacyCategory,
  LegacyTransaction,
} from '@/types/business/transaction'

interface AccountDetailAccount extends Omit<Account, 'transactions'> {
  transactions: SerializedTransactionWithBasic[]
}

interface AccountDetailRouterProps {
  account: AccountDetailAccount
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
  user,
}: AccountDetailRouterProps) {
  const accountType = account.category.type

  // 转换 account 数据为 Legacy 格式
  const legacyAccount: LegacyAccount = {
    ...account,
    currencyCode: account.currency?.code || 'USD',
    category: {
      id: account.category.id,
      name: account.category.name,
      type: account.category.type,
    },
    currency: account.currency
      ? {
          ...account.currency,
          isActive: true, // 添加 isActive 字段
        }
      : undefined,
    transactions: account.transactions.map(transaction => ({
      ...transaction,
      date: transaction.date,
      amount: transaction.amount,
      notes: transaction.notes || undefined,
      tags: transaction.tags.map(tt => ({
        tag: {
          id: tt.tag.id,
          name: tt.tag.name,
        },
      })),
      account: {
        id: account.id,
        name: account.name,
        description: account.description,
        color: account.color,
        currencyId: account.currencyId,
        currencyCode: account.currency?.code || '',
        categoryId: account.categoryId,
        userId: account.userId,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        category: {
          id: account.category.id,
          name: account.category.name,
          type: account.category.type,
        },
        currency: account.currency
          ? {
              ...account.currency,
              isActive: true,
            }
          : undefined,
      },
      category: {
        id: transaction.account.category.id,
        name: transaction.account.category.name,
        type: transaction.account.category.type,
        order: 0, // 默认值
        userId: transaction.userId,
        createdAt: new Date(transaction.createdAt),
        updatedAt: new Date(transaction.updatedAt),
      },
      currency: {
        id: transaction.currency.id,
        code: transaction.currency.code,
        name: transaction.currency.name,
        symbol: transaction.currency.symbol,
        decimalPlaces: transaction.currency.decimalPlaces,
        isCustom: transaction.currency.isCustom,
        createdBy: transaction.currency.createdBy,
      },
    })) as LegacyTransaction[],
  }

  // 转换 currencies 数据为 Legacy 格式
  const legacyCurrencies: LegacyCurrency[] = currencies.map(currency => ({
    ...currency,
    isActive: true, // 添加 isActive 字段
  }))

  // 存量类账户（资产/负债）
  if (accountType === 'ASSET' || accountType === 'LIABILITY') {
    return (
      <StockAccountDetailView
        account={legacyAccount}
        currencies={legacyCurrencies}
        user={user}
      />
    )
  }

  // 流量类账户（收入/支出）
  if (accountType === 'INCOME' || accountType === 'EXPENSE') {
    return (
      <FlowAccountDetailView
        account={legacyAccount}
        categories={categories as LegacyCategory[]}
        currencies={legacyCurrencies}
        tags={tags}
        user={user}
      />
    )
  }

  // 未设置账户类型的兜底处理
  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <div className='bg-white shadow rounded-lg p-8'>
        <div className='text-center'>
          <div className='text-gray-500'>
            <svg
              className='mx-auto h-12 w-12 mb-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <h2 className='text-lg font-medium text-gray-900 mb-2'>
              账户类型未设置
            </h2>
            <p className='text-sm text-gray-600 mb-4'>
              请为该账户的分类设置正确的账户类型以获得专业的管理功能
            </p>
            <div className='text-xs text-gray-500 space-y-1'>
              <p>
                <strong>资产类</strong>：银行存款、投资账户、现金等
              </p>
              <p>
                <strong>负债类</strong>：信用卡、贷款、应付款等
              </p>
              <p>
                <strong>收入类</strong>：工资、投资收益、其他收入等
              </p>
              <p>
                <strong>支出类</strong>：生活费、娱乐、交通等支出
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
