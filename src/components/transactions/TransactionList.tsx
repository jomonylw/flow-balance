'use client'

import { useState } from 'react'

interface Category {
  id: string
  name: string
  type?: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY'
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

interface Account {
  id: string
  name: string
}

interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'BALANCE_ADJUSTMENT'
  amount: number
  description: string
  notes?: string
  date: string
  category: Category
  currency: Currency
  tags: { tag: Tag }[]
  account?: Account
}

interface TransactionListProps {
  transactions: Transaction[]
  onEdit: (transaction: Transaction) => void
  onDelete?: (transactionId: string) => void
  currencySymbol: string
  showAccount?: boolean
  readOnly?: boolean
}

export default function TransactionList({
  transactions,
  onEdit,
  onDelete,
  currencySymbol,
  showAccount = true,
  readOnly = false
}: TransactionListProps) {
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())

  // 判断是否为余额调整记录
  const isBalanceAdjustment = (transaction: Transaction) => {
    return transaction.type === 'BALANCE_ADJUSTMENT' ||
           transaction.description.includes('余额更新') ||
           transaction.description.includes('余额调整') ||
           transaction.notes?.includes('余额更新') ||
           transaction.notes?.includes('余额调整')
  }

  const getTypeIcon = (transaction: Transaction) => {
    const isAdjustment = isBalanceAdjustment(transaction)
    const type = transaction.type

    if (isAdjustment) {
      // 余额调整记录使用特殊图标
      return (
        <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
          <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      )
    }

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
      case 'TRANSFER':
        return (
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
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
    const amount = transaction.amount.toFixed(2)
    const symbol = transaction.currency.symbol || currencySymbol

    switch (transaction.type) {
      case 'INCOME':
        return <span className="text-green-600 font-medium">+{symbol}{amount}</span>
      case 'EXPENSE':
        return <span className="text-red-600 font-medium">-{symbol}{amount}</span>
      case 'TRANSFER':
        return <span className="text-blue-600 font-medium">{symbol}{amount}</span>
      case 'BALANCE_ADJUSTMENT':
        // 余额调整：从备注中提取实际变化金额来显示正负号
        const changeAmount = extractBalanceChangeFromNotes(transaction.notes || '')
        if (changeAmount !== null) {
          const sign = changeAmount >= 0 ? '+' : ''
          return <span className="text-purple-600 font-medium">{sign}{symbol}{Math.abs(changeAmount).toFixed(2)}</span>
        } else {
          return <span className="text-purple-600 font-medium">{symbol}{amount}</span>
        }
      default:
        return <span className="text-gray-600 font-medium">{symbol}{amount}</span>
    }
  }

  // 从交易备注中提取余额变化金额
  const extractBalanceChangeFromNotes = (notes: string): number | null => {
    if (!notes) return null

    // 匹配模式：变化金额：+123.45 或 变化金额：-123.45
    const match = notes.match(/变化金额：([+-]?\d+\.?\d*)/)
    if (match && match[1]) {
      return parseFloat(match[1])
    }

    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return '今天'
    } else if (diffDays === 2) {
      return '昨天'
    } else if (diffDays <= 7) {
      return `${diffDays - 1}天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId)
    } else {
      newSelected.add(transactionId)
    }
    setSelectedTransactions(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t.id)))
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="p-6 sm:p-8 text-center text-gray-500">
        <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-base sm:text-lg font-medium">暂无交易记录</p>
        <p className="text-xs sm:text-sm mt-1">开始记录您的第一笔交易吧！</p>
      </div>
    )
  }

  return (
    <div>
      {/* 批量操作栏 */}
      {!readOnly && selectedTransactions.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <span className="text-xs sm:text-sm text-blue-700">
              已选择 {selectedTransactions.size} 项
            </span>
            <div className="flex space-x-2">
              <button className="text-xs sm:text-sm text-blue-600 hover:text-blue-500 touch-manipulation">
                批量编辑
              </button>
              <button className="text-xs sm:text-sm text-red-600 hover:text-red-500 touch-manipulation">
                批量删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 表头 - 移动端隐藏 */}
      <div className="hidden sm:block bg-gray-50 px-4 sm:px-6 py-3 border-b border-gray-200">
        <div className="flex items-center">
          {!readOnly && (
            <input
              type="checkbox"
              checked={selectedTransactions.size === transactions.length}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          )}
          <span className={`${!readOnly ? 'ml-3' : ''} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
            {readOnly ? '记录详情' : '交易详情'}
          </span>
        </div>
      </div>

      {/* 交易列表 */}
      <div className="divide-y divide-gray-200">
        {transactions.map(transaction => (
          <div
            key={transaction.id}
            className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors ${
              selectedTransactions.has(transaction.id) ? 'bg-blue-50' : ''
            }`}
          >
            {/* 移动端布局 */}
            <div className="sm:hidden">
              <div className="flex items-start space-x-3">
                {/* 选择框和图标 */}
                <div className="flex flex-col items-center space-y-2">
                  {!readOnly && (
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  )}
                  <div className="flex-shrink-0">
                    {getTypeIcon(transaction)}
                  </div>
                </div>

                {/* 交易信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.description}
                        </p>
                        {isBalanceAdjustment(transaction) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            余额调整
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        <div>{transaction.category.name}</div>
                        <div className="flex items-center space-x-1 mt-0.5">
                          {showAccount && transaction.account && (
                            <span>{transaction.account.name} • </span>
                          )}
                          <span>{formatDate(transaction.date)}</span>
                          {!isBalanceAdjustment(transaction) && (
                            <>
                              <span> • </span>
                              <span className="text-blue-600">
                                {transaction.type === 'INCOME' ? '收入' :
                                 transaction.type === 'EXPENSE' ? '支出' : '转账'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      <div className="text-right">
                        {getAmountDisplay(transaction)}
                      </div>
                      {!readOnly && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => onEdit(transaction)}
                            className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none touch-manipulation"
                            title="编辑交易"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {onDelete && (
                            <button
                              onClick={() => onDelete(transaction.id)}
                              className="p-1 text-gray-400 hover:text-red-600 focus:outline-none touch-manipulation"
                              title="删除交易"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 桌面端布局 */}
            <div className="hidden sm:flex items-center space-x-4">
              {/* 选择框 */}
              {!readOnly && (
                <input
                  type="checkbox"
                  checked={selectedTransactions.has(transaction.id)}
                  onChange={() => handleSelectTransaction(transaction.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              )}

              {/* 交易类型图标 */}
              <div className="flex-shrink-0">
                {getTypeIcon(transaction)}
              </div>

              {/* 交易信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {transaction.description}
                      </p>
                      {/* 交易类型标识 */}
                      {isBalanceAdjustment(transaction) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          余额调整
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                      <span>{transaction.category.name}</span>
                      {showAccount && transaction.account && (
                        <>
                          <span>•</span>
                          <span>{transaction.account.name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDate(transaction.date)}</span>
                      {/* 交易类型说明 */}
                      {!isBalanceAdjustment(transaction) && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600">
                            {transaction.type === 'INCOME' ? '收入交易' :
                             transaction.type === 'EXPENSE' ? '支出交易' : '转账交易'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      {getAmountDisplay(transaction)}
                    </div>

                    {!readOnly && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onEdit(transaction)}
                          className="text-gray-400 hover:text-gray-600 focus:outline-none"
                          title="编辑交易"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {onDelete && (
                          <button
                            onClick={() => onDelete(transaction.id)}
                            className="text-gray-400 hover:text-red-600 focus:outline-none"
                            title="删除交易"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

            {/* 标签和备注 - 共享布局 */}
            <div className="mt-2 sm:ml-12">
              {/* 标签 */}
              {transaction.tags.length > 0 && (
                <div className="flex items-center flex-wrap gap-1 mb-2">
                  {transaction.tags.slice(0, 3).map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      style={tag.color ? { backgroundColor: tag.color + '20', color: tag.color } : {}}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {transaction.tags.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{transaction.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* 备注 */}
              {transaction.notes && (
                <p className="text-xs text-gray-500 italic">
                  {transaction.notes}
                </p>
              )}
            </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
