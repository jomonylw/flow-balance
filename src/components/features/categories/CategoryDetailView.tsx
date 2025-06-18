'use client'

import StockCategoryDetailView from './StockCategoryDetailView'
import FlowCategoryDetailView from './FlowCategoryDetailView'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import type { SerializedCategoryDetailViewProps, SerializedCategoryWithTransactions } from './types'
import type {
  LegacyCategory,
  LegacyCurrency,
  LegacyTransaction,
  LegacyAccount,
} from '@/types/business/transaction'

// 序列化的账户类型
interface SerializedAccount {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  category: {
    id: string
    name: string
    type: string
  }
  currency: {
    code: string
    symbol: string
    name: string
  }
  transactions?: unknown[]
}

// 序列化的交易类型
interface SerializedTransaction {
  id: string
  date: string
  createdAt: string
  updatedAt: string
  amount: number
  notes?: string | null
  tags: Array<{
    tag: {
      id: string
      name: string
    }
  }>
}

export default function CategoryDetailView({
  category,
  accounts: _accounts,
  categories: _categories,
  currencies,
  tags: _tags,
  user,
}: SerializedCategoryDetailViewProps) {
  const { t } = useLanguage()

  // 判断分类类型
  const categoryType = category.type
  const isStockCategory =
    categoryType === 'ASSET' || categoryType === 'LIABILITY'
  const isFlowCategory = categoryType === 'INCOME' || categoryType === 'EXPENSE'

  // 递归转换 SerializedCategory 为 LegacyCategory
  const convertToLegacyCategory = (cat: SerializedCategoryWithTransactions): LegacyCategory => ({
    ...cat,
    createdAt: new Date(cat.createdAt),
    updatedAt: new Date(cat.updatedAt),
    parent: cat.parent ? convertToLegacyCategory(cat.parent) : null,
    children: cat.children?.map((child: SerializedCategoryWithTransactions) => convertToLegacyCategory(child)),
    accounts: cat.accounts?.map((account: SerializedAccount) => ({
      ...account,
      createdAt: new Date(account.createdAt),
      updatedAt: new Date(account.updatedAt),
      category: {
        id: account.category.id,
        name: account.category.name,
        type: account.category.type,
      },
      currency: account.currency,
      transactions: account.transactions || [],
    })) as LegacyAccount[],
    transactions: cat.transactions.map((transaction: SerializedTransaction) => ({
      ...transaction,
      date: transaction.date, // 已经是 string 类型，无需转换
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      amount: transaction.amount,
      notes: transaction.notes || undefined,
      tags: transaction.tags.map(tt => ({
        tag: {
          id: tt.tag.id,
          name: tt.tag.name,
        },
      })),
    })) as LegacyTransaction[],
  })

  // 转换 category 数据为 Legacy 格式
  const legacyCategory: LegacyCategory = convertToLegacyCategory(category)

  // 转换 currencies 数据为 Legacy 格式
  const legacyCurrencies: LegacyCurrency[] = currencies.map(currency => ({
    ...currency,
    isActive: true, // 添加 isActive 字段
  }))

  // 根据分类类型渲染不同的组件
  if (
    isStockCategory &&
    (categoryType === 'ASSET' || categoryType === 'LIABILITY')
  ) {
    return (
      <StockCategoryDetailView
        category={legacyCategory}
        currencies={legacyCurrencies}
        user={user}
      />
    )
  }

  if (
    isFlowCategory &&
    (categoryType === 'INCOME' || categoryType === 'EXPENSE')
  ) {
    return <FlowCategoryDetailView category={legacyCategory} user={user} />
  }

  // 未设置类型的分类显示提示信息
  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <div className='bg-white shadow rounded-lg p-8 text-center'>
        <div className='mb-4'>
          <svg
            className='mx-auto h-12 w-12 text-gray-400'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        </div>
        <h3 className='text-lg font-medium text-gray-900 mb-2'>
          {t('category.type.not.set')}
        </h3>
        <p className='text-gray-500 mb-4'>
          {t('category.type.not.set.description')}
        </p>
        <div className='text-sm text-gray-400'>
          {t('category.name')}: {category.name}
        </div>
      </div>
    </div>
  )
}
