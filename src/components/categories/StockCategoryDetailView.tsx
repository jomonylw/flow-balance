'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import TransactionList from '@/components/transactions/TransactionList'
import StockCategorySummaryCard from './StockCategorySummaryCard'
import MonthlySummaryChart from '@/components/charts/MonthlySummaryChart'
import { useLanguage } from '@/contexts/LanguageContext'

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
  type: 'INCOME' | 'EXPENSE' | 'BALANCE_ADJUSTMENT'
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
  const { t } = useLanguage()
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
          // 添加货币信息到汇总数据中
          setSummaryData({
            ...summaryResult.data,
            currencies: currencies
          })
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
  }, [category.id, currencies])

  const baseCurrency = user.settings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }
  const currencySymbol = baseCurrency.symbol

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 面包屑导航 */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-3a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              {t('nav.dashboard')}
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400 md:ml-2">
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{category.name}</h1>
            {category.description && (
              <p className="mt-2 text-gray-600 dark:text-gray-400">{category.description}</p>
            )}
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                category.type === 'ASSET'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
              }`}>
                {category.type === 'ASSET' ? t('category.type.asset') : t('category.type.liability')} • {t('category.type.stock.data')}
              </span>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          💡 {t('category.stock.update.tip')}
        </div>
      </div>

      {/* 分类摘要卡片 */}
      <div className="mb-8">
        <StockCategorySummaryCard
          category={category}
          currencySymbol={currencySymbol}
          summaryData={summaryData}
          baseCurrency={baseCurrency}
        />
      </div>

      {/* 汇总数据展示 */}
      {summaryData && (
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('category.summary')}
            </h2>

            {/* 子分类汇总 */}
            {summaryData.children && summaryData.children.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">{t('category.subcategories')}</h3>
                <div className="space-y-2">
                  {summaryData.children.map((child: any) => {
                    // 使用子分类的实际余额汇总
                    const childBalances = child.balances || {}
                    const hasBalances = Object.keys(childBalances).length > 0

                    return (
                      <div key={child.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <Link
                          href={`/categories/${child.id}`}
                          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {child.name}
                        </Link>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-col items-end">
                          {hasBalances ? (
                            Object.entries(childBalances).map(([currencyCode, balance]: [string, any]) => {
                              // 查找对应的货币信息
                              const currencyInfo = currencies.find(c => c.code === currencyCode)
                              const symbol = currencyInfo?.symbol || currencyCode

                              return (
                                <div key={currencyCode} className="flex items-center space-x-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                                    {currencyCode}
                                  </span>
                                  <span className={`${
                                    balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {symbol}{Math.abs(balance).toFixed(2)}
                                  </span>
                                </div>
                              )
                            })
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">
                              {child.accountCount || 0} {t('category.accounts')}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 直属账户汇总 */}
            {summaryData.accounts && summaryData.accounts.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">{t('category.accounts')}</h3>
                <div className="space-y-2">
                  {summaryData.accounts.map((account: any) => {
                    // 获取账户的货币信息
                    const accountCurrencies = Object.keys(account.balances || {})

                    return (
                      <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <Link
                          href={`/accounts/${account.id}`}
                          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {account.name}
                        </Link>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-col items-end">
                          {account.balances && Object.entries(account.balances).map(([currencyCode, balance]: [string, any]) => {
                            // 查找对应的货币信息
                            const currencyInfo = currencies.find(c => c.code === currencyCode)
                            const originalSymbol = currencyInfo?.symbol || currencyCode

                            // 计算折算后金额（这里简化处理，实际应该使用汇率）
                            const convertedAmount = currencyCode === baseCurrency.code ? balance : balance

                            return (
                              <div key={currencyCode} className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                                  {currencyCode}
                                </span>
                                <span className={`${
                                  balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {originalSymbol}{Math.abs(balance).toFixed(2)}
                                </span>
                                {currencyCode !== baseCurrency.code && (
                                  <span className="text-gray-400 text-xs">
                                    ≈ {baseCurrency.symbol}{Math.abs(convertedAmount).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                          {(!account.balances || Object.keys(account.balances).length === 0) && (
                            <span className="text-gray-500 dark:text-gray-400">
                              {account.transactionCount} {t('category.transaction.count')}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
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
            title={`${category.name} - ${t('category.monthly.balance.summary')}`}
            height={400}
            chartType="stock"
          />
        </div>
      )}

      {/* 余额变化记录 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('category.balance.change.records')}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('common.total')} {category.transactions.length} {t('category.transaction.count')}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('category.balance.change.description')}
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
