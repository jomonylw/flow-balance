'use client'

import { useState } from 'react'
import Link from 'next/link'
import BalanceUpdateModal from './BalanceUpdateModal'
import TransactionList from '@/components/transactions/TransactionList'
import StockAccountSummaryCard from './StockAccountSummaryCard'

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
  type: 'ASSET' | 'LIABILITY'
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
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
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

interface StockAccountDetailViewProps {
  account: Account
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}

export default function StockAccountDetailView({
  account,
  categories,
  currencies,
  tags,
  user
}: StockAccountDetailViewProps) {
  const [isBalanceUpdateModalOpen, setIsBalanceUpdateModalOpen] = useState(false)

  const handleUpdateBalance = () => {
    setIsBalanceUpdateModalOpen(true)
  }

  const handleBalanceUpdateSuccess = () => {
    // 刷新页面以更新数据
    window.location.reload()
  }

  // 计算账户余额
  const calculateBalance = () => {
    return account.transactions.reduce((balance, transaction) => {
      const amount = transaction.amount
      if (account.category.type === 'ASSET') {
        return balance + (transaction.type === 'INCOME' ? amount : -amount)
      } else {
        return balance + (transaction.type === 'EXPENSE' ? amount : -amount)
      }
    }, 0)
  }

  const balance = calculateBalance()
  const currencySymbol = user.settings?.baseCurrency?.symbol || '$'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 面包屑导航 */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-3a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Dashboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                {account.name}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* 账户标题和操作 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{account.name}</h1>
          <p className="mt-2 text-gray-600">
            {account.category.name}
            {account.description && ` • ${account.description}`}
          </p>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              account.category.type === 'ASSET' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              {account.category.type === 'ASSET' ? '资产账户' : '负债账户'} • 存量数据
            </span>
          </div>
        </div>
        
        <button
          onClick={handleUpdateBalance}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          更新余额
        </button>
      </div>

      {/* 账户摘要卡片 */}
      <div className="mb-8">
        <StockAccountSummaryCard
          account={account}
          balance={balance}
          currencySymbol={currencySymbol}
        />
      </div>

      {/* 余额变化记录 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              余额变化记录
            </h2>
            <span className="text-sm text-gray-500">
              共 {account.transactions.length} 笔记录
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            记录账户余额的历史变化，包括余额更新和相关交易
          </p>
        </div>
        
        <TransactionList
          transactions={account.transactions}
          onEdit={() => {}} // 存量类账户不支持编辑交易
          onDelete={undefined} // 存量类账户不支持删除交易
          currencySymbol={currencySymbol}
          showAccount={false}
          readOnly={true} // 只读模式
        />
      </div>

      {/* 余额更新模态框 */}
      <BalanceUpdateModal
        isOpen={isBalanceUpdateModalOpen}
        onClose={() => setIsBalanceUpdateModalOpen(false)}
        onSuccess={handleBalanceUpdateSuccess}
        account={account}
        currencies={currencies}
        currentBalance={balance}
        currencyCode={user.settings?.baseCurrency?.code || 'USD'}
      />
    </div>
  )
}
