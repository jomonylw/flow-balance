'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import TransactionList from '@/components/transactions/TransactionList'
import StockCategorySummaryCard from './StockCategorySummaryCard'
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
  category: {
    id: string
    name: string
    type: 'ASSET' | 'LIABILITY'
  }
}

interface Category {
  id: string
  name: string
  type: 'ASSET' | 'LIABILITY'
  parentId?: string | null
  description?: string
  color?: string
  icon?: string
  parent?: Category
  children?: Category[]
  accounts?: Account[]
  transactions: Transaction[]
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
  category: {
    id: string
    name: string
    type?: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY'
  }
  currency: Currency
  tags: { tag: Tag }[]
  account?: {
    id: string
    name: string
  }
}

interface StockCategoryDetailViewProps {
  category: Category
  accounts: Account[]
  categories: Category[]
  currencies: Currency[]
  tags: Tag[]
  user: User
}

export default function StockCategoryDetailView({
  category,
  accounts,
  categories,
  currencies,
  tags,
  user
}: StockCategoryDetailViewProps) {
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

      {/* 分类标题 */}
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
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                category.type === 'ASSET' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {category.type === 'ASSET' ? '资产分类' : '负债分类'} • 存量数据
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          💡 存量类分类建议在账户页面进行余额更新
        </div>
      </div>

      {/* 分类摘要卡片 */}
      <div className="mb-8">
        <StockCategorySummaryCard
          category={category}
          currencySymbol={currencySymbol}
          summaryData={summaryData}
        />
      </div>

      {/* 汇总数据展示 */}
      {summaryData && (
        <div className="mb-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              分类汇总
            </h2>

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
                            {account.transactionCount} 笔记录
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
            stockMonthlyData={monthlyData.monthlyData}
            baseCurrency={monthlyData.baseCurrency}
            title={`${category.name} - 月度账户余额汇总`}
            height={400}
            chartType="stock"
          />
        </div>
      )}

      {/* 余额变化记录 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              余额变化记录
            </h2>
            <span className="text-sm text-gray-500">
              共 {category.transactions.length} 笔记录
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            记录该分类下所有账户的余额变化历史
          </p>
        </div>
        
        <TransactionList
          transactions={category.transactions}
          onEdit={() => {}} // 存量类分类不支持编辑交易
          onDelete={undefined} // 存量类分类不支持删除交易
          currencySymbol={currencySymbol}
          showAccount={true}
          readOnly={true} // 只读模式
        />
      </div>
    </div>
  )
}
