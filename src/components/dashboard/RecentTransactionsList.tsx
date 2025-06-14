'use client'

import Link from 'next/link'
import { useUserData } from '@/contexts/UserDataContext'

interface Currency {
  code: string
  name: string
  symbol: string
}

interface Account {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

interface Tag {
  id: string
  name: string
  color?: string
}

interface TransactionTag {
  tag: Tag
}

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT'
  amount: number // 已序列化的数字
  description: string
  date: Date
  account: Account
  category: Category
  currency: Currency
  tags: TransactionTag[]
}

interface RecentTransactionsListProps {
  transactions: Transaction[]
  baseCurrency?: Currency
}

export default function RecentTransactionsList({
  transactions,
  baseCurrency
}: RecentTransactionsListProps) {
  const { tags: userTags } = useUserData()
  const currencySymbol = baseCurrency?.symbol || '$'

  // 获取标签颜色信息
  const getTagColor = (tagId: string): string | undefined => {
    const userTag = userTags.find(tag => tag.id === tagId)
    return userTag?.color
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INCOME':
        return (
          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        )
      case 'EXPENSE':
        return (
          <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </div>
        )
      case 'BALANCE_ADJUSTMENT':
        return (
          <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  const getAmountDisplay = (transaction: Transaction) => {
    const amount = transaction.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const symbol = transaction.currency.symbol || currencySymbol

    switch (transaction.type) {
      case 'INCOME':
        return <span className="text-green-600 font-medium">+{symbol}{amount}</span>
      case 'EXPENSE':
        return <span className="text-red-600 font-medium">-{symbol}{amount}</span>
      case 'BALANCE_ADJUSTMENT':
        return <span className="text-purple-600 font-medium">{symbol}{amount}</span>
      default:
        return <span className="text-gray-600 font-medium">{symbol}{amount}</span>
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const transactionDate = new Date(date)
    const diffTime = Math.abs(now.getTime() - transactionDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return '今天'
    } else if (diffDays === 2) {
      return '昨天'
    } else if (diffDays <= 7) {
      return `${diffDays - 1}天前`
    } else {
      return transactionDate.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>暂无交易记录</p>
        <p className="text-sm mt-1">开始记录您的第一笔交易吧！</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {transactions.map(transaction => (
        <Link
          key={transaction.id}
          href={`/transactions/${transaction.id}`}
          className="block p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-4">
            {/* 交易类型图标 */}
            <div className="flex-shrink-0">
              {getTypeIcon(transaction.type)}
            </div>

            {/* 交易信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {transaction.description}
                </p>
                <div className="text-sm">
                  {getAmountDisplay(transaction)}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{transaction.account.name}</span>
                  <span>•</span>
                  <span>{transaction.category.name}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(transaction.date)}
                </span>
              </div>

              {/* 标签 */}
              {transaction.tags && transaction.tags.length > 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  {transaction.tags.slice(0, 3).map(({ tag }) => {
                    // 安全检查：确保tag对象存在
                    if (!tag) return null

                    // 从 UserDataContext 获取标签颜色信息
                    const currentColor = getTagColor(tag.id)

                    return (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        style={currentColor ? { backgroundColor: currentColor + '20', color: currentColor } : {}}
                      >
                        {tag.name}
                      </span>
                    )
                  })}
                  {transaction.tags.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{transaction.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
