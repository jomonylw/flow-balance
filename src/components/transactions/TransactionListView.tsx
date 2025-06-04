'use client'

import { useState, useEffect } from 'react'
import TransactionFormModal from './TransactionFormModal'
import TransactionList from './TransactionList'
import TransactionFilters from './TransactionFilters'
import TransactionStats from './TransactionStats'

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

interface Account {
  id: string
  name: string
  category: {
    name: string
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
  account: Account
  category: Category
  currency: Currency
  tags: { tag: Tag }[]
}

interface TransactionListViewProps {
  accounts: Account[]
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}

interface Filters {
  accountId: string
  categoryId: string
  type: string
  dateFrom: string
  dateTo: string
  search: string
}

export default function TransactionListView({
  accounts,
  categories,
  currencies,
  tags,
  user
}: TransactionListViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState<Filters>({
    accountId: '',
    categoryId: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  })

  const currencySymbol = user.settings?.baseCurrency?.symbol || '$'

  // 加载交易数据
  const loadTransactions = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      // 添加过滤条件
      if (filters.accountId) params.append('accountId', filters.accountId)
      if (filters.categoryId) params.append('categoryId', filters.categoryId)
      if (filters.type) params.append('type', filters.type)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.search) params.append('search', filters.search)

      const response = await fetch(`/api/transactions?${params}`)
      const result = await response.json()

      if (result.success) {
        setTransactions(result.data.transactions)
        setPagination(result.data.pagination)
      } else {
        console.error('Failed to load transactions:', result.error)
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 初始加载和过滤条件变化时重新加载
  useEffect(() => {
    loadTransactions()
  }, [pagination.page, filters])

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setIsTransactionModalOpen(true)
  }

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction)
    setIsTransactionModalOpen(true)
  }

  const handleTransactionSuccess = () => {
    loadTransactions()
  }

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, page: 1 })) // 重置到第一页
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
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
        loadTransactions()
      } else {
        alert('删除失败：' + result.error)
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert('删除失败，请稍后重试')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">交易管理</h1>
          <p className="mt-2 text-gray-600">
            管理您的所有交易记录
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

      {/* 统计卡片 */}
      <div className="mb-8">
        <TransactionStats
          transactions={transactions}
          currencySymbol={currencySymbol}
        />
      </div>

      {/* 过滤器 */}
      <div className="bg-white shadow rounded-lg mb-6">
        <TransactionFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          accounts={accounts}
          categories={categories}
        />
      </div>

      {/* 交易列表 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              交易记录
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                共 {pagination.total} 笔交易
              </span>
              {pagination.totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-gray-500">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        ) : (
          <TransactionList
            transactions={transactions}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            currencySymbol={currencySymbol}
            showAccount={true}
          />
        )}
      </div>

      {/* 交易表单模态框 */}
      <TransactionFormModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={handleTransactionSuccess}
        transaction={editingTransaction}
        accounts={accounts}
        categories={categories}
        currencies={currencies}
        tags={tags}
      />
    </div>
  )
}
