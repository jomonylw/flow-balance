'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TransactionFormModal from '@/components/transactions/TransactionFormModal'
import TransactionList from '@/components/transactions/TransactionList'
import FlowAccountSummaryCard from './FlowAccountSummaryCard'
import ConfirmationModal from '@/components/ui/ConfirmationModal'
import { calculateAccountBalance } from '@/lib/account-balance'

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
  account?: {
    id: string
    name: string
  }
}

interface Account {
  id: string
  name: string
  description?: string
  category: Category
  transactions: Transaction[]
}

interface FlowAccountDetailViewProps {
  account: Account
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}

export default function FlowAccountDetailView({
  account,
  categories,
  currencies,
  tags,
  user
}: FlowAccountDetailViewProps) {
  const router = useRouter()
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('确定要删除这笔交易吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        // 刷新页面以更新数据
        window.location.reload()
      } else {
        alert('删除失败：' + (result.error || '未知错误'))
      }
    } catch (error) {
      console.error('Delete transaction error:', error)
      alert('删除失败：网络错误')
    }
  }

  const handleTransactionSuccess = () => {
    // 刷新页面以更新数据
    window.location.reload()
  }

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // 删除成功，返回到主页面
        router.push('/')
      } else {
        const error = await response.json()
        alert(error.message || '删除失败')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('删除失败')
    }
  }

  // 批量编辑功能（暂时隐藏）
  const handleBatchEdit = (transactionIds: string[]) => {
    alert(`批量编辑功能开发中，选中了 ${transactionIds.length} 条记录`)
    // TODO: 实现批量编辑功能
  }

  const handleBatchDelete = async (transactionIds: string[]) => {
    try {
      const deletePromises = transactionIds.map(id =>
        fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      )

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.ok).length

      if (successCount === transactionIds.length) {
        alert(`成功删除 ${successCount} 条记录`)
        window.location.reload()
      } else {
        alert(`删除了 ${successCount}/${transactionIds.length} 条记录，部分删除失败`)
        window.location.reload()
      }
    } catch (error) {
      console.error('Batch delete error:', error)
      alert('批量删除失败：网络错误')
    }
  }

  // 使用专业的余额计算服务（流量类账户）
  const accountBalances = calculateAccountBalance(account)
  const baseCurrencyCode = user.settings?.baseCurrency?.code || 'USD'
  const flowTotal = accountBalances[baseCurrencyCode]?.amount || 0
  const currencySymbol = user.settings?.baseCurrency?.symbol || '$'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 账户类型提示横幅 */}
      <div className={`mb-6 p-4 rounded-lg border-l-4 ${
        (account.category.type === 'INCOME')
          ? 'bg-green-50 border-green-400'
          : 'bg-red-50 border-red-400'
      }`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${
              (account.category.type === 'INCOME') ? 'text-green-400' : 'text-red-400'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${
              (account.category.type === 'INCOME') ? 'text-green-800' : 'text-red-800'
            }`}>
              📊 流量类账户操作提示
            </p>
            <p className={`text-sm ${
              (account.category.type === 'INCOME') ? 'text-green-700' : 'text-red-700'
            }`}>
              {(account.category.type === 'INCOME') ? '收入' : '支出'}账户通过"添加交易"来记录现金流动，
              每笔交易反映特定期间的资金流入或流出。建议及时记录每笔收支明细。
            </p>
          </div>
        </div>
      </div>

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
              (account.category.type === 'INCOME')
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {(account.category.type === 'INCOME') ? '收入账户' : '支出账户'} • 流量数据
            </span>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleAddTransaction}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加交易
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除账户
          </button>
        </div>
      </div>

      {/* 账户摘要卡片 */}
      <div className="mb-8">
        <FlowAccountSummaryCard
          account={account}
          balance={flowTotal}
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
          <p className="text-sm text-gray-600 mt-1">
            记录{(account.category.type === 'INCOME') ? '收入' : '支出'}的详细流水和现金流动
          </p>
        </div>
        
        <TransactionList
          transactions={account.transactions}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          onBatchDelete={handleBatchDelete} // 批量删除
          currencySymbol={currencySymbol}
          showAccount={false}
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
        defaultType={account.category.type as 'INCOME' | 'EXPENSE' | 'TRANSFER'}
      />

      {/* 删除确认模态框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="删除账户"
        message={`确定要删除账户"${account.name}"吗？此操作不可撤销。`}
        confirmLabel="删除"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
