'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUserData } from '@/contexts/UserDataContext'
import WithTranslation from '@/components/ui/WithTranslation'

// 个人现金流量表数据类型
interface Currency {
  code: string
  symbol: string
  name: string
}

interface Transaction {
  id: string
  amount: number
  description: string
  date: string
  type: 'INCOME' | 'EXPENSE'
}

interface AccountSummary {
  id: string
  name: string
  currency: Currency
  totalAmount: number
  totalAmountInBaseCurrency?: number
  conversionRate?: number
  conversionSuccess?: boolean
  conversionError?: string
  transactionCount: number
  transactions: Transaction[]
}

interface CategorySummary {
  categoryId: string
  categoryName: string
  accounts: AccountSummary[]
  totalByCurrency: Record<string, number>
  totalInBaseCurrency?: number
}

// 扩展的分类接口，支持层级结构
interface CategoryWithAccounts {
  id: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  parentId?: string | null
  order: number
  children?: CategoryWithAccounts[]
  accounts: AccountSummary[]
  totalByCurrency: Record<string, number>
  totalInBaseCurrency?: number
}

interface CurrencyTotal {
  currency: Currency
  totalIncome: number
  totalExpense: number
  netCashFlow: number
}

interface PersonalCashFlowResponse {
  period: {
    start: string
    end: string
  }
  baseCurrency: Currency
  cashFlow: {
    income: {
      categories: Record<string, CategorySummary>
    }
    expense: {
      categories: Record<string, CategorySummary>
    }
  }
  summary: {
    currencyTotals: Record<string, CurrencyTotal>
    baseCurrencyTotals?: {
      totalIncome: number
      totalExpense: number
      netCashFlow: number
    }
    totalTransactions: number
  }
}

export default function CashFlowCard() {
  const { t, language } = useLanguage()
  const { categories, accounts, getBaseCurrency } = useUserData()
  const [data, setData] = useState<PersonalCashFlowResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    // 创建当月1号的日期字符串，然后解析为Date对象
    const firstDayString = `${year}-${String(month + 1).padStart(2, '0')}-01`
    return new Date(firstDayString)
  })
  const [endDate, setEndDate] = useState<Date>(new Date())

  // Get the appropriate locale for date formatting
  const dateLocale = language === 'zh' ? zhCN : enUS
  const baseCurrency = getBaseCurrency() || { code: 'CNY', symbol: '¥', name: '人民币' }

  const fetchCashFlow = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/reports/personal-cash-flow?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error(t('reports.cash.flow.fetch.error'), error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, t])

  useEffect(() => {
    fetchCashFlow()
  }, [fetchCashFlow])

  // 构建分类树并汇总余额数据
  const enrichedCategoryTree = useMemo(() => {
    if (!data || !categories || !accounts) return null

    const buildCategoryTree = (type: 'INCOME' | 'EXPENSE') => {
      // 获取该类型的原始分类数据
      const rawCategories = data.cashFlow[type.toLowerCase() as 'income' | 'expense'].categories

      // 构建分类映射
      const categoryMap = new Map<string, CategoryWithAccounts>()
      const rootCategories: CategoryWithAccounts[] = []

      // 初始化所有分类
      categories
        .filter(cat => cat.type === type)
        .forEach(category => {
          categoryMap.set(category.id, {
            id: category.id,
            name: category.name,
            type: category.type,
            parentId: category.parentId,
            order: category.order,
            children: [],
            accounts: [],
            totalByCurrency: {},
            totalInBaseCurrency: 0
          })
        })

      // 构建层级关系
      categories
        .filter(cat => cat.type === type)
        .forEach(category => {
          const categoryNode = categoryMap.get(category.id)
          if (!categoryNode) return

          if (category.parentId) {
            const parent = categoryMap.get(category.parentId)
            if (parent) {
              parent.children!.push(categoryNode)
            }
          } else {
            rootCategories.push(categoryNode)
          }
        })

      // 填充账户数据和余额
      Object.entries(rawCategories).forEach(([categoryId, categoryData]) => {
        const categoryNode = categoryMap.get(categoryId)
        if (categoryNode) {
          categoryNode.accounts = categoryData.accounts
          categoryNode.totalByCurrency = categoryData.totalByCurrency
          categoryNode.totalInBaseCurrency = categoryData.totalInBaseCurrency
        }
      })

      // 递归计算父分类的汇总余额
      const calculateParentTotals = (category: CategoryWithAccounts) => {
        // 先计算子分类
        category.children?.forEach(calculateParentTotals)

        // 汇总子分类的余额到父分类
        category.children?.forEach(child => {
          Object.entries(child.totalByCurrency).forEach(([currency, amount]) => {
            category.totalByCurrency[currency] = (category.totalByCurrency[currency] || 0) + amount
          })
          category.totalInBaseCurrency = (category.totalInBaseCurrency || 0) + (child.totalInBaseCurrency || 0)
        })

        // 确保每个分类都有本币汇总金额（如果还没有的话）
        if (category.totalInBaseCurrency === undefined || category.totalInBaseCurrency === 0) {
          // 如果没有子分类的汇总，则计算自己账户的本币汇总
          if (category.accounts.length > 0) {
            category.totalInBaseCurrency = category.accounts.reduce((sum, account) => {
              return sum + (account.totalAmountInBaseCurrency || 0)
            }, 0)
          } else {
            category.totalInBaseCurrency = 0
          }
        }
      }

      rootCategories.forEach(calculateParentTotals)

      // 排序
      const sortCategories = (cats: CategoryWithAccounts[]) => {
        cats.sort((a, b) => a.order - b.order)
        cats.forEach(cat => {
          if (cat.children) {
            sortCategories(cat.children)
          }
        })
      }

      sortCategories(rootCategories)
      return rootCategories
    }

    return {
      income: buildCategoryTree('INCOME'),
      expense: buildCategoryTree('EXPENSE')
    }
  }, [data, categories, accounts])

  const formatCurrency = (amount: number, currency: Currency) => {
    const locale = language === 'zh' ? 'zh-CN' : 'en-US'
    return `${currency.symbol}${amount.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  const formatCurrencyWithCode = (amount: number, currencyCode: string) => {
    const locale = language === 'zh' ? 'zh-CN' : 'en-US'
    const symbol = getCurrencySymbol(currencyCode)
    return `${symbol}${amount.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  // 货币符号映射函数（与BalanceSheetCard保持一致）
  const getCurrencySymbol = (currencyCode: string) => {
    const symbolMap: Record<string, string> = {
      'CNY': '¥',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'HKD': 'HK$',
      'TWD': 'NT$',
      'SGD': 'S$',
      'AUD': 'A$',
      'CAD': 'C$',
      'CHF': 'CHF',
      'SEK': 'kr',
      'NOK': 'kr',
      'DKK': 'kr',
      'RUB': '₽',
      'INR': '₹',
      'KRW': '₩',
      'THB': '฿',
      'MYR': 'RM',
      'IDR': 'Rp',
      'PHP': '₱',
      'VND': '₫'
    }
    return symbolMap[currencyCode] || currencyCode
  }

  // 新的层级渲染函数
  const renderHierarchicalCategories = (
    categories: CategoryWithAccounts[],
    isExpense: boolean = false,
    level: number = 0
  ) => {
    return categories.map(category => (
      <div key={category.id} className="mb-4">
        {/* 分类标题和汇总 */}
        <div
          className="flex justify-between items-center mb-2"
          style={{ paddingLeft: `${level * 16}px` }}
        >
          <div className="flex items-center">
            <Link
              href={`/categories/${category.id}`}
              className="font-medium text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 hover:underline"
            >
              {category.name}
            </Link>
            {level === 0 && (
              <span className="ml-2 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                {t(`type.${category.type.toLowerCase()}`)}
              </span>
            )}
          </div>

          {/* 分类汇总金额 - 使用特殊样式显示本币汇总 */}
          {category.totalInBaseCurrency !== undefined && category.totalInBaseCurrency !== 0 && (
            <div className="text-right">
              <span className={`inline-block px-2 py-1 rounded text-sm font-bold border ${
                level === 0
                  ? isExpense
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
              }`}>
                {isExpense ? '-' : '+'}{baseCurrency.symbol}{Math.abs(category.totalInBaseCurrency).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
          )}
        </div>

        {/* 如果有直接账户，显示账户详情 */}
        {category.accounts.length > 0 && (
          <div style={{ paddingLeft: `${(level + 1) * 16}px` }} className="mt-2">
            {/* 按币种分组显示账户 */}
            {Object.entries(category.totalByCurrency || {}).map(([currencyCode, total]) => {
              const currencyAccounts = category.accounts.filter(account => account.currency?.code === currencyCode)
              if (currencyAccounts.length === 0) return null

              return (
                <div key={currencyCode} className="mb-3">
                  {/* 币种小计 */}
                  <div className="flex justify-between items-start mb-2 py-1 px-0 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex-1 min-w-0 pr-2">
                      {currencyCode}
                    </span>
                    <div className="text-right min-w-0 flex-shrink-0">
                      <div className={`text-sm font-semibold whitespace-nowrap ${
                        isExpense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {isExpense ? '-' : '+'}{formatCurrencyWithCode(total, currencyCode)}
                      </div>
                      {currencyCode !== baseCurrency.code && (
                        <div className="text-xs text-gray-400 whitespace-nowrap">
                          ≈ {isExpense ? '-' : '+'}{baseCurrency.symbol}{currencyAccounts.reduce((sum, account) =>
                            sum + (account.totalAmountInBaseCurrency || 0), 0
                          ).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 显示该币种下的账户明细 */}
                  <div className="ml-4 space-y-1">
                    {currencyAccounts.map(account => (
                      <div key={account.id} className="flex justify-between items-start text-sm py-1">
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="text-gray-600 dark:text-gray-400">• </span>
                          <Link
                            href={`/accounts/${account.id}`}
                            className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 hover:underline"
                          >
                            {account.name}
                          </Link>
                        </div>
                        <div className="text-right min-w-0 flex-shrink-0">
                          <div className={`whitespace-nowrap ${
                            isExpense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                          }`}>
                            {formatCurrency(account.totalAmount, account.currency)}
                          </div>
                          {account.totalAmountInBaseCurrency !== undefined &&
                           account.currency.code !== baseCurrency.code && (
                            <div className="text-xs text-gray-400 whitespace-nowrap">
                              ≈ {baseCurrency.symbol}{Math.abs(account.totalAmountInBaseCurrency).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 递归渲染子分类 */}
        {category.children && category.children.length > 0 && (
          <div className="mt-2">
            {renderHierarchicalCategories(category.children, isExpense, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  const renderCategorySection = (
    title: string,
    categories: Record<string, CategorySummary>,
    baseCurrency: Currency,
    isExpense: boolean = false
  ) => {
    if (!categories || Object.keys(categories).length === 0) {
      return (
        <div className="mb-6">
          {title && <h4 className="font-semibold text-lg mb-3 text-gray-700 dark:text-gray-300">{title}</h4>}
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            {t('reports.cash.flow.no.data')}
          </div>
        </div>
      )
    }

    return (
      <div className="mb-6">
        {title && <h4 className="font-semibold text-lg mb-3 text-gray-700 dark:text-gray-300">{title}</h4>}
        {Object.entries(categories).map(([categoryId, category]) => (
          <div key={categoryId} className="mb-4">
            <div className="font-medium text-gray-800 dark:text-gray-200 mb-2">
              {category.categoryName}
            </div>

            {/* 按币种显示该类别的总计 */}
            {Object.entries(category.totalByCurrency || {}).map(([currencyCode, total]) => (
              <div key={currencyCode} className="mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-600 dark:text-gray-400">{currencyCode}</span>
                  <div className="flex flex-col items-end">
                    <span className={`font-semibold ${isExpense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {isExpense ? '-' : '+'}{formatCurrencyWithCode(total, currencyCode)}
                    </span>
                    {category.totalInBaseCurrency !== undefined &&
                     currencyCode !== baseCurrency.code && (
                      <span className="text-xs text-gray-400">
                        ≈ {isExpense ? '-' : '+'}{baseCurrency.symbol}{Math.abs(category.totalInBaseCurrency).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>

                {/* 显示该币种下的账户 */}
                <div className="ml-4 space-y-1">
                  {(category.accounts || [])
                    .filter(account => account.currency?.code === currencyCode)
                    .map(account => (
                      <div key={account.id} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{account.name}</span>
                        <div className="flex flex-col items-end">
                          <span className={`${isExpense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {formatCurrency(account.totalAmount, account.currency)}
                          </span>
                          {account.totalAmountInBaseCurrency !== undefined &&
                           account.currency.code !== baseCurrency.code && (
                            <span className="text-xs text-gray-400">
                              ≈ {baseCurrency.symbol}{Math.abs(account.totalAmountInBaseCurrency).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }



  if (!data) {
    return (
      <WithTranslation>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t('reports.cash.flow.title')}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCashFlow}
                disabled={loading}
                title={t('reports.cash.flow.refresh')}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {loading ? t('reports.cash.flow.loading') : t('reports.cash.flow.no.data')}
            </div>
          </CardContent>
        </Card>
      </WithTranslation>
    )
  }

  return (
    <WithTranslation>
      <Card className='mt-4'>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('reports.cash.flow.title')}</CardTitle>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <span className="text-gray-500 dark:text-gray-400">{t('reports.cash.flow.to')}</span>
              <input
                type="date"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCashFlow}
                disabled={loading}
                title={t('reports.cash.flow.refresh')}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="sm" title={t('reports.cash.flow.download')}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('reports.cash.flow.period')}: {format(new Date(data.period.start), language === 'zh' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy', { locale: dateLocale })} {t('reports.cash.flow.to')}{' '}
            {format(new Date(data.period.end), language === 'zh' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy', { locale: dateLocale })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Income Categories Section */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-green-600 dark:text-green-400">
                {t('reports.cash.flow.income')}
              </h3>

              <div className="mb-6">
                {enrichedCategoryTree?.income && enrichedCategoryTree.income.length > 0 ? (
                  renderHierarchicalCategories(enrichedCategoryTree.income, false)
                ) : (
                  renderCategorySection(
                    '',
                    data.cashFlow.income.categories,
                    data.baseCurrency,
                    false
                  )
                )}
              </div>

              {/* Income Total */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-6">
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-gray-900 dark:text-gray-100">{t('reports.cash.flow.total.income')}</span>
                  <div>
                    {Object.entries(data.summary.currencyTotals)
                      .filter(([, currencyTotal]) => currencyTotal.totalIncome > 0)
                      .map(([currencyCode, currencyTotal]) => {
                      // 计算该币种的收入本币折算金额
                      const incomeBaseCurrencyAmount = Object.values(data.cashFlow.income.categories)
                        .flatMap(category => category.accounts)
                        .filter(account => account.currency.code === currencyCode)
                        .reduce((sum, account) => sum + (account.totalAmountInBaseCurrency || 0), 0)

                      return (
                        <div key={currencyCode} className="flex flex-col items-end">
                          <div className="text-green-600 dark:text-green-400">
                            +{formatCurrency(currencyTotal.totalIncome, currencyTotal.currency)}
                          </div>
                          {currencyCode !== data.baseCurrency.code && incomeBaseCurrencyAmount > 0 && (
                            <div className="text-xs text-gray-400">
                              ≈ +{data.baseCurrency.symbol}{Math.abs(incomeBaseCurrencyAmount).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Base Currency Total Income */}
                {data.summary.baseCurrencyTotals && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600">
                    <div className="flex justify-between font-semibold text-base">
                      <span className="text-gray-700 dark:text-gray-300">
                        {t('reports.cash.flow.base.currency.total')} ({data.baseCurrency.code})
                      </span>
                      <div className="text-green-600 dark:text-green-400">
                        +{formatCurrency(data.summary.baseCurrencyTotals.totalIncome, data.baseCurrency)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expense Categories Section */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">
                {t('reports.cash.flow.expense')}
              </h3>

              <div className="mb-6">
                {enrichedCategoryTree?.expense && enrichedCategoryTree.expense.length > 0 ? (
                  renderHierarchicalCategories(enrichedCategoryTree.expense, true)
                ) : (
                  renderCategorySection(
                    '',
                    data.cashFlow.expense.categories,
                    data.baseCurrency,
                    true
                  )
                )}
              </div>

              {/* Expense Total */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-6">
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-gray-900 dark:text-gray-100">{t('reports.cash.flow.total.expense')}</span>
                  <div>
                    {Object.entries(data.summary.currencyTotals)
                      .filter(([, currencyTotal]) => currencyTotal.totalExpense > 0)
                      .map(([currencyCode, currencyTotal]) => {
                      // 计算该币种的支出本币折算金额
                      const expenseBaseCurrencyAmount = Object.values(data.cashFlow.expense.categories)
                        .flatMap(category => category.accounts)
                        .filter(account => account.currency.code === currencyCode)
                        .reduce((sum, account) => sum + (account.totalAmountInBaseCurrency || 0), 0)

                      return (
                        <div key={currencyCode} className="flex flex-col items-end">
                          <div className="text-red-600 dark:text-red-400">
                            -{formatCurrency(currencyTotal.totalExpense, currencyTotal.currency)}
                          </div>
                          {currencyCode !== data.baseCurrency.code && expenseBaseCurrencyAmount > 0 && (
                            <div className="text-xs text-gray-400">
                              ≈ -{data.baseCurrency.symbol}{Math.abs(expenseBaseCurrencyAmount).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Base Currency Total Expense */}
                {data.summary.baseCurrencyTotals && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600">
                    <div className="flex justify-between font-semibold text-base">
                      <span className="text-gray-700 dark:text-gray-300">
                        {t('reports.cash.flow.base.currency.total')} ({data.baseCurrency.code})
                      </span>
                      <div className="text-red-600 dark:text-red-400">
                        -{formatCurrency(data.summary.baseCurrencyTotals.totalExpense, data.baseCurrency)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Net Cash Flow for the Period */}
          <div className="mt-8 border-t-2 border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between font-bold text-lg">
              <span className="text-gray-900 dark:text-gray-100">{t('reports.cash.flow.net.cash.flow')}</span>
              <div>
                {Object.entries(data.summary.currencyTotals)
                  .filter(([, currencyTotal]) => Math.abs(currencyTotal.netCashFlow) > 0.01)
                  .map(([currencyCode, currencyTotal]) => {
                  // 计算该币种的本币折算金额
                  const incomeBaseCurrencyAmount = Object.values(data.cashFlow.income.categories)
                    .flatMap(category => category.accounts)
                    .filter(account => account.currency.code === currencyCode)
                    .reduce((sum, account) => sum + (account.totalAmountInBaseCurrency || 0), 0)

                  const expenseBaseCurrencyAmount = Object.values(data.cashFlow.expense.categories)
                    .flatMap(category => category.accounts)
                    .filter(account => account.currency.code === currencyCode)
                    .reduce((sum, account) => sum + (account.totalAmountInBaseCurrency || 0), 0)

                  const netBaseCurrencyAmount = incomeBaseCurrencyAmount - expenseBaseCurrencyAmount

                  return (
                    <div key={currencyCode} className="flex flex-col items-end">
                      <div className={currencyTotal.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {currencyTotal.netCashFlow >= 0 ? '+' : ''}{formatCurrency(currencyTotal.netCashFlow, currencyTotal.currency)}
                      </div>
                      {currencyCode !== data.baseCurrency.code && Math.abs(netBaseCurrencyAmount) > 0.01 && (
                        <div className="text-xs text-gray-400">
                          ≈ {netBaseCurrencyAmount >= 0 ? '+' : '-'}{data.baseCurrency.symbol}{Math.abs(netBaseCurrencyAmount).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Base Currency Summary */}
            {data.summary.baseCurrencyTotals && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
                <div className="flex justify-between font-semibold text-base">
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('reports.cash.flow.base.currency.total')} ({data.baseCurrency.code})
                  </span>
                  <div className={data.summary.baseCurrencyTotals.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {data.summary.baseCurrencyTotals.netCashFlow >= 0 ? '+' : ''}{formatCurrency(data.summary.baseCurrencyTotals.netCashFlow, data.baseCurrency)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">{t('reports.cash.flow.financial.summary')}</h4>

            {/* Original Currency Breakdown */}
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('reports.cash.flow.total.income')}</span>
                <div className="font-semibold">
                  {Object.entries(data.summary.currencyTotals)
                    .filter(([, currencyTotal]) => currencyTotal.totalIncome > 0)
                    .map(([currencyCode, currencyTotal]) => {
                    // 计算该币种的收入本币折算金额
                    const incomeBaseCurrencyAmount = Object.values(data.cashFlow.income.categories)
                      .flatMap(category => category.accounts)
                      .filter(account => account.currency.code === currencyCode)
                      .reduce((sum, account) => sum + (account.totalAmountInBaseCurrency || 0), 0)

                    return (
                      <div key={currencyCode} className="text-green-600 dark:text-green-400">
                        <div>+{formatCurrency(currencyTotal.totalIncome, currencyTotal.currency)}</div>
                        {currencyCode !== data.baseCurrency.code && incomeBaseCurrencyAmount > 0 && (
                          <div className="text-xs text-gray-400">
                            ≈ +{data.baseCurrency.symbol}{Math.abs(incomeBaseCurrencyAmount).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('reports.cash.flow.total.expense')}</span>
                <div className="font-semibold">
                  {Object.entries(data.summary.currencyTotals)
                    .filter(([, currencyTotal]) => currencyTotal.totalExpense > 0)
                    .map(([currencyCode, currencyTotal]) => {
                    // 计算该币种的支出本币折算金额
                    const expenseBaseCurrencyAmount = Object.values(data.cashFlow.expense.categories)
                      .flatMap(category => category.accounts)
                      .filter(account => account.currency.code === currencyCode)
                      .reduce((sum, account) => sum + (account.totalAmountInBaseCurrency || 0), 0)

                    return (
                      <div key={currencyCode} className="text-red-600 dark:text-red-400">
                        <div>-{formatCurrency(currencyTotal.totalExpense, currencyTotal.currency)}</div>
                        {currencyCode !== data.baseCurrency.code && expenseBaseCurrencyAmount > 0 && (
                          <div className="text-xs text-gray-400">
                            ≈ -{data.baseCurrency.symbol}{Math.abs(expenseBaseCurrencyAmount).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('reports.cash.flow.net.summary')}</span>
                <div className="font-semibold">
                  {Object.entries(data.summary.currencyTotals)
                    .filter(([, currencyTotal]) => Math.abs(currencyTotal.netCashFlow) > 0.01)
                    .map(([currencyCode, currencyTotal]) => {
                    // 计算该币种的净现金流本币折算金额
                    const incomeBaseCurrencyAmount = Object.values(data.cashFlow.income.categories)
                      .flatMap(category => category.accounts)
                      .filter(account => account.currency.code === currencyCode)
                      .reduce((sum, account) => sum + (account.totalAmountInBaseCurrency || 0), 0)

                    const expenseBaseCurrencyAmount = Object.values(data.cashFlow.expense.categories)
                      .flatMap(category => category.accounts)
                      .filter(account => account.currency.code === currencyCode)
                      .reduce((sum, account) => sum + (account.totalAmountInBaseCurrency || 0), 0)

                    const netBaseCurrencyAmount = incomeBaseCurrencyAmount - expenseBaseCurrencyAmount

                    return (
                      <div key={currencyCode} className={currencyTotal.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        <div>{currencyTotal.netCashFlow >= 0 ? '+' : ''}{formatCurrency(currencyTotal.netCashFlow, currencyTotal.currency)}</div>
                        {currencyCode !== data.baseCurrency.code && Math.abs(netBaseCurrencyAmount) > 0.01 && (
                          <div className="text-xs text-gray-400">
                            ≈ {netBaseCurrencyAmount >= 0 ? '+' : '-'}{data.baseCurrency.symbol}{Math.abs(netBaseCurrencyAmount).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Base Currency Summary */}
            {data.summary.baseCurrencyTotals && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('reports.cash.flow.total.income')} ({data.baseCurrency.code})
                    </span>
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      +{formatCurrency(data.summary.baseCurrencyTotals.totalIncome, data.baseCurrency)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('reports.cash.flow.total.expense')} ({data.baseCurrency.code})
                    </span>
                    <div className="font-semibold text-red-600 dark:text-red-400">
                      -{formatCurrency(data.summary.baseCurrencyTotals.totalExpense, data.baseCurrency)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('reports.cash.flow.net.summary')} ({data.baseCurrency.code})
                    </span>
                    <div className={`font-semibold ${data.summary.baseCurrencyTotals.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {data.summary.baseCurrencyTotals.netCashFlow >= 0 ? '+' : ''}{formatCurrency(data.summary.baseCurrencyTotals.netCashFlow, data.baseCurrency)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </WithTranslation>
  )
}
