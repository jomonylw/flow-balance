'use client'

import { useState } from 'react'
import Link from 'next/link'
import TransactionFormModal from '@/components/transactions/TransactionFormModal'
import TransactionList from '@/components/transactions/TransactionList'
import AccountSummaryCard from './AccountSummaryCard'

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

interface AccountDetailViewProps {
  account: Account
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}

export default function AccountDetailView({
  account,
  categories,
  currencies,
  tags,
  user
}: AccountDetailViewProps) {
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setIsTransactionModalOpen(true)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    // 转换为TransactionFormModal期望的格式
    const formTransaction = {
      id: transaction.id,
      accountId: account.id,
      categoryId: transaction.category.id,
      currencyCode: transaction.currency.code,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      notes: transaction.notes,
      date: transaction.date,
      tags: transaction.tags
    }
    setEditingTransaction(formTransaction as any)
    setIsTransactionModalOpen(true)
  }

  const handleTransactionSuccess = () => {
    // 刷新页面以更新数据
    window.location.reload()
  }

  // 计算账户余额
  const calculateBalance = () => {
    return account.transactions.reduce((balance, transaction) => {
      if (transaction.type === 'INCOME') {
        return balance + transaction.amount
      } else if (transaction.type === 'EXPENSE') {
        return balance - transaction.amount
      }
      return balance
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
        </div>
        
        <button
          onClick={handleAddTransaction}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          添加交易
        </button>
      </div>

      {/* 账户摘要卡片 */}
      <div className="mb-8">
        <AccountSummaryCard
          account={account}
          balance={balance}
          currencySymbol={currencySymbol}
        />
      </div>

      {/* 交易列表 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              交易记录
            </h2>
            <span className="text-sm text-gray-500">
              共 {account.transactions.length} 笔交易
            </span>
          </div>
        </div>
        
        <TransactionList
          transactions={account.transactions}
          onEdit={handleEditTransaction}
          currencySymbol={currencySymbol}
          showAccount={false} // 在账户详情页不显示账户列
        />
      </div>

      {/* 交易表单模态框 */}
      <TransactionFormModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={handleTransactionSuccess}
        transaction={editingTransaction}
        accounts={[{ id: account.id, name: account.name, category: account.category }]}
        categories={categories}
        currencies={currencies}
        tags={tags}
        defaultAccountId={account.id}
      />
    </div>
  )
}
