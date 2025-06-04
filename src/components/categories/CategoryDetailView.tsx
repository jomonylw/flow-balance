'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import TransactionFormModal from '@/components/transactions/TransactionFormModal'
import TransactionList from '@/components/transactions/TransactionList'
import CategorySummaryCard from './CategorySummaryCard'
import CategoryChart from './CategoryChart'
import MonthlySummaryChart from '@/components/charts/MonthlySummaryChart'

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
  description?: string
  category: {
    name: string
  }
  transactions?: Transaction[]
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
  currency: Currency
  tags: { tag: Tag }[]
}

interface Category {
  id: string
  name: string
  parentId?: string | null
  description?: string
  color?: string
  icon?: string
  parent?: Category
  children?: Category[]
  accounts?: Account[]
  transactions: Transaction[]
}

interface CategoryDetailViewProps {
  category: Category
  accounts: Account[]
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}

export default function CategoryDetailView({
  category,
  accounts,
  categories,
  currencies,
  tags,
  user
}: CategoryDetailViewProps) {
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  const [timeRange, setTimeRange] = useState('thisMonth')
  const [summaryData, setSummaryData] = useState<any>(null)
  const [monthlyData, setMonthlyData] = useState<any>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)

  // 获取分类汇总数据
  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setIsLoadingSummary(true)

        // 并行获取汇总数据和月度数据
        const [summaryRes, monthlyRes] = await Promise.all([
          fetch(`/api/categories/${category.id}/summary`),
          fetch(`/api/analytics/monthly-summary?categoryId=${category.id}&months=12`)
        ])

        if (summaryRes.ok) {
          const summaryResult = await summaryRes.json()
          setSummaryData(summaryResult.data)
        }

        if (monthlyRes.ok) {
          const monthlyResult = await monthlyRes.json()
          setMonthlyData(monthlyResult.data)
        }
      } catch (error) {
        console.error('Error fetching summary data:', error)
      } finally {
        setIsLoadingSummary(false)
      }
    }

    fetchSummaryData()
  }, [category.id])

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setIsTransactionModalOpen(true)
  }

  const handleEditTransaction = (transaction: any) => {
    // 转换为TransactionFormModal期望的格式
    const formTransaction = {
      id: transaction.id,
      accountId: transaction.account.id,
      categoryId: category.id, // 使用当前分类的ID
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
    // 重新获取汇总数据
    const fetchSummaryData = async () => {
      try {
        const [summaryRes, monthlyRes] = await Promise.all([
          fetch(`/api/categories/${category.id}/summary`),
          fetch(`/api/analytics/monthly-summary?categoryId=${category.id}&months=12`)
        ])

        if (summaryRes.ok) {
          const summaryResult = await summaryRes.json()
          setSummaryData(summaryResult.data)
        }

        if (monthlyRes.ok) {
          const monthlyResult = await monthlyRes.json()
          setMonthlyData(monthlyResult.data)
        }
      } catch (error) {
        console.error('Error fetching summary data:', error)
      }
    }

    fetchSummaryData()
    // 刷新页面以更新交易列表
    window.location.reload()
  }

  // 计算分类统计
  const calculateStats = () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)

    let totalIncome = 0
    let totalExpense = 0
    let thisMonthIncome = 0
    let thisMonthExpense = 0
    let lastMonthIncome = 0
    let lastMonthExpense = 0
    let thisYearIncome = 0
    let thisYearExpense = 0
    let incomeCount = 0
    let expenseCount = 0

    category.transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      const amount = transaction.amount

      if (transaction.type === 'INCOME') {
        incomeCount++
        totalIncome += amount

        if (transactionDate >= thisMonth) {
          thisMonthIncome += amount
        }

        if (transactionDate >= lastMonth && transactionDate < thisMonth) {
          lastMonthIncome += amount
        }

        if (transactionDate >= thisYear) {
          thisYearIncome += amount
        }
      } else if (transaction.type === 'EXPENSE') {
        expenseCount++
        totalExpense += amount

        if (transactionDate >= thisMonth) {
          thisMonthExpense += amount
        }

        if (transactionDate >= lastMonth && transactionDate < thisMonth) {
          lastMonthExpense += amount
        }

        if (transactionDate >= thisYear) {
          thisYearExpense += amount
        }
      }
    })

    const totalAmount = totalIncome - totalExpense
    const thisMonthAmount = thisMonthIncome - thisMonthExpense
    const lastMonthAmount = lastMonthIncome - lastMonthExpense
    const thisYearAmount = thisYearIncome - thisYearExpense

    const monthlyChange = lastMonthAmount !== 0
      ? ((thisMonthAmount - lastMonthAmount) / Math.abs(lastMonthAmount)) * 100
      : 0

    return {
      totalAmount,
      totalIncome,
      totalExpense,
      thisMonthAmount,
      thisMonthIncome,
      thisMonthExpense,
      lastMonthAmount,
      lastMonthIncome,
      lastMonthExpense,
      thisYearAmount,
      thisYearIncome,
      thisYearExpense,
      monthlyChange,
      incomeCount,
      expenseCount,
      totalCount: category.transactions.length,
      averageAmount: category.transactions.length > 0 ? totalAmount / category.transactions.length : 0
    }
  }

  const stats = calculateStats()
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
                {category.name}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* 分类标题和操作 */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center">
          {category.icon && (
            <div 
              className="h-12 w-12 rounded-lg flex items-center justify-center mr-4"
              style={{ backgroundColor: category.color + '20' || '#f3f4f6' }}
            >
              <span className="text-2xl">{category.icon}</span>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
            {category.description && (
              <p className="mt-2 text-gray-600">{category.description}</p>
            )}
          </div>
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

      {/* 分类摘要卡片 */}
      <div className="mb-8">
        <CategorySummaryCard
          category={category}
          stats={stats}
          currencySymbol={currencySymbol}
        />
      </div>

      {/* 汇总数据展示 */}
      {summaryData && (
        <div className="mb-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              分类汇总
            </h2>

            {/* 总余额 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {summaryData.transactionSummary && Object.entries(summaryData.transactionSummary).map(([currency, data]: [string, any]) => (
                <div key={currency} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">{currency} 净收支</div>
                  <div className={`text-xl font-semibold ${
                    data.net >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currencySymbol}{Math.abs(data.net).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    收入: {currencySymbol}{data.income.toFixed(2)} | 支出: {currencySymbol}{data.expense.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* 子分类汇总 */}
            {summaryData.children && summaryData.children.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-800 mb-3">子分类</h3>
                <div className="space-y-2">
                  {summaryData.children.map((child: any) => (
                    <div key={child.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <Link
                        href={`/categories/${child.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {child.name}
                      </Link>
                      <div className="text-sm text-gray-600">
                        <span className="text-gray-500">
                          子分类
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 直属账户汇总 */}
            {summaryData.accounts && summaryData.accounts.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-800 mb-3">账户</h3>
                <div className="space-y-2">
                  {summaryData.accounts.map((account: any) => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <Link
                        href={`/accounts/${account.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {account.name}
                      </Link>
                      <div className="text-sm text-gray-600">
                        {account.balances && Object.entries(account.balances).map(([currency, balance]: [string, any]) => (
                          <span key={currency} className={`ml-2 ${
                            balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {currencySymbol}{Math.abs(balance).toFixed(2)}
                          </span>
                        ))}
                        {(!account.balances || Object.keys(account.balances).length === 0) && (
                          <span className="text-gray-500">
                            {account.transactionCount} 笔交易
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 月度汇总图表 */}
      {monthlyData && (
        <div className="mb-8">
          <MonthlySummaryChart
            monthlyData={monthlyData.monthlyData}
            baseCurrency={monthlyData.baseCurrency}
            title={`${category.name} - 月度收支汇总`}
            height={400}
          />
        </div>
      )}

      {/* 图表和时间范围选择 */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              趋势分析
            </h2>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="thisMonth">本月</option>
              <option value="last3Months">近3个月</option>
              <option value="last6Months">近6个月</option>
              <option value="thisYear">今年</option>
            </select>
          </div>
        </div>
        
        <div className="p-6">
          <CategoryChart
            transactions={category.transactions}
            timeRange={timeRange}
            currencySymbol={currencySymbol}
          />
        </div>
      </div>

      {/* 交易列表 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              交易记录
            </h2>
            <span className="text-sm text-gray-500">
              共 {category.transactions.length} 笔交易
            </span>
          </div>
        </div>
        
        <TransactionList
          transactions={category.transactions}
          onEdit={handleEditTransaction}
          currencySymbol={currencySymbol}
          showAccount={true}
        />
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
        defaultCategoryId={category.id}
      />
    </div>
  )
}
