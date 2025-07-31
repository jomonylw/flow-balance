'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/data-display/card'
import { Button } from '@/components/ui/forms/button'
import { LoadingSpinnerSVG } from '@/components/ui/feedback/LoadingSpinner'
import DateInput from '@/components/ui/forms/DateInput'
import { RefreshCw } from 'lucide-react'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useAuth } from '@/contexts/providers/AuthContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import ColorManager from '@/lib/utils/color'
import WithTranslation from '@/components/ui/data-display/WithTranslation'
import { AccountType } from '@/types/core/constants'
import type { SimpleCurrency } from '@/types/core'

// 本地类型定义（用于这个组件的特定需求）
interface _CashFlowTransaction {
  id: string
  amount: number
  description: string
  date: string
  type: 'INCOME' | 'EXPENSE'
}

import type {
  CashFlowCategoryWithAccounts,
  CashFlowCategorySummary,
} from '@/types/components'

interface CurrencyTotal {
  currency: SimpleCurrency
  totalIncome: number
  totalExpense: number
  netCashFlow: number
}

interface PersonalCashFlowResponse {
  period: {
    start: string
    end: string
  }
  baseCurrency: SimpleCurrency
  cashFlow: {
    income: {
      categories: Record<string, CashFlowCategorySummary>
    }
    expense: {
      categories: Record<string, CashFlowCategorySummary>
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
  const { t } = useLanguage()
  const { isAuthenticated } = useAuth()
  const { categories, accounts, getBaseCurrency } = useUserData()
  const { formatCurrencyById, findCurrencyByCode } = useUserCurrencyFormatter()
  const { formatDate, formatInputDate } = useUserDateFormatter()
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

  const baseCurrency = getBaseCurrency()

  // 将所有 hooks 移到条件判断之前
  const fetchCashFlow = useCallback(async () => {
    // 只有在用户已认证时才获取数据
    if (!isAuthenticated) return

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
  }, [startDate, endDate, t, isAuthenticated])

  useEffect(() => {
    if (baseCurrency && isAuthenticated) {
      fetchCashFlow()
    }
  }, [fetchCashFlow, baseCurrency, isAuthenticated])

  // 构建分类树并汇总余额数据
  const enrichedCategoryTree = useMemo(() => {
    if (!data || !categories || !accounts) return null

    const buildCategoryTree = (type: 'INCOME' | 'EXPENSE') => {
      // 获取该类型的原始分类数据
      const rawCategories =
        data.cashFlow[type.toLowerCase() as 'income' | 'expense'].categories

      // 构建分类映射
      const categoryMap = new Map<string, CashFlowCategoryWithAccounts>()
      const rootCategories: CashFlowCategoryWithAccounts[] = []

      // 初始化所有分类
      categories
        .filter(cat => cat.type === type)
        .forEach(category => {
          if (!category.type) return
          categoryMap.set(category.id, {
            id: category.id,
            name: category.name,
            type: category.type,
            parentId: category.parentId,
            order: category.order,
            children: [],
            accounts: [],
            totalByCurrency: {},
            totalInBaseCurrency: 0,
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
            if (parent && parent.children) {
              parent.children.push(categoryNode)
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
      const calculateParentTotals = (
        category: CashFlowCategoryWithAccounts
      ) => {
        // 先计算子分类
        category.children?.forEach(calculateParentTotals)

        // 汇总子分类的余额到父分类
        category.children?.forEach(child => {
          Object.entries(child.totalByCurrency).forEach(
            ([currency, amount]) => {
              category.totalByCurrency[currency] =
                (category.totalByCurrency[currency] || 0) + amount
            }
          )
          category.totalInBaseCurrency =
            (category.totalInBaseCurrency || 0) +
            (child.totalInBaseCurrency || 0)
        })

        // 计算自己账户的本币汇总并加到总计中
        if (category.accounts.length > 0) {
          const ownAccountsTotal = category.accounts.reduce((sum, account) => {
            return sum + (account.totalAmountInBaseCurrency || 0)
          }, 0)
          // console.log(`🔍 分类 ${category.name}: 子分类汇总=${category.totalInBaseCurrency || 0}, 自己账户汇总=${ownAccountsTotal}`)
          category.totalInBaseCurrency =
            (category.totalInBaseCurrency || 0) + ownAccountsTotal
          // console.log(`✅ 分类 ${category.name}: 最终汇总=${category.totalInBaseCurrency}`)
        } else if (category.totalInBaseCurrency === undefined) {
          // 如果没有账户也没有子分类汇总，则设为0
          category.totalInBaseCurrency = 0
        }
      }

      rootCategories.forEach(calculateParentTotals)

      // 排序
      const sortCategories = (cats: CashFlowCategoryWithAccounts[]) => {
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
      expense: buildCategoryTree('EXPENSE'),
    }
  }, [data, categories, accounts])

  // 使用基于ID的格式化函数
  const formatCurrencyWithSymbol = (
    amount: number,
    currency: SimpleCurrency
  ) => {
    return currency.id
      ? formatCurrencyById(amount, currency.id)
      : formatCurrencyWithCode(amount, currency.code)
  }

  const formatCurrencyWithCode = (amount: number, currencyCode: string) => {
    const currencyInfo = findCurrencyByCode(currencyCode)
    return currencyInfo?.id
      ? formatCurrencyById(amount, currencyInfo.id)
      : `${amount} ${currencyCode}`
  }

  // 新的层级渲染函数
  const renderHierarchicalCategories = (
    categories: CashFlowCategoryWithAccounts[],
    isExpense: boolean = false,
    level: number = 0
  ) => {
    // 使用 data.baseCurrency 而不是参数中的 baseCurrency
    const currentBaseCurrency = data?.baseCurrency
    if (!currentBaseCurrency) return null
    return categories.map(category => (
      <div key={category.id} className='mb-4'>
        {/* 分类标题和汇总 */}
        <div
          className='flex justify-between items-center mb-2'
          style={{ paddingLeft: `${level * 16}px` }}
        >
          <div className='flex items-center'>
            <Link
              href={`/categories/${category.id}`}
              className={`font-medium transition-colors duration-200 hover:underline ${
                isExpense
                  ? 'text-red-700 dark:text-red-300 hover:text-red-600 dark:hover:text-red-400'
                  : 'text-green-700 dark:text-green-300 hover:text-green-600 dark:hover:text-green-400'
              }`}
            >
              {category.name}
            </Link>
            {level === 0 && (
              <span className='ml-2 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'>
                {t(`type.${category.type.toLowerCase()}`)}
              </span>
            )}
          </div>

          {/* 分类汇总金额 - 使用特殊样式显示本币汇总 */}
          <div className='text-right'>
            <span
              className={`inline-block px-2 py-1 rounded text-sm font-bold border ${
                isExpense
                  ? level === 0
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
                    : 'bg-red-50/50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-700/50'
                  : level === 0
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
                    : 'bg-green-50/50 dark:bg-green-900/10 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-700/50'
              }`}
            >
              {isExpense ? '-' : '+'}
              {formatCurrencyWithCode(
                Math.abs(category.totalInBaseCurrency || 0),
                currentBaseCurrency.code
              )}
            </span>
          </div>
        </div>

        {/* 显示账户详情 - 即使没有账户也显示分类 */}
        <div style={{ paddingLeft: `${(level + 1) * 16}px` }} className='mt-2'>
          {/* 如果有账户，按币种分组显示账户 */}
          {category.accounts.length > 0 ? (
            Object.entries(category.totalByCurrency || {}).map(
              ([currencyCode, total]) => {
                const currencyAccounts = category.accounts.filter(
                  account => account.currency?.code === currencyCode
                )
                if (currencyAccounts.length === 0) return null

                return (
                  <div key={currencyCode} className='mb-3'>
                    {/* 币种小计 */}
                    <div className='flex justify-between items-start mb-2 py-1 px-0 bg-gray-50 dark:bg-gray-800 rounded'>
                      <span className='text-sm font-medium text-gray-600 dark:text-gray-400 flex-1 min-w-0 pr-2'>
                        {currencyCode}
                      </span>
                      <div className='text-right min-w-0 flex-shrink-0'>
                        <div
                          className={`text-sm font-semibold whitespace-nowrap ${
                            isExpense
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {isExpense ? '-' : '+'}
                          {formatCurrencyWithCode(total, currencyCode)}
                        </div>
                        {currencyCode !== currentBaseCurrency.code && (
                          <div className='text-xs text-gray-400 whitespace-nowrap'>
                            ≈ {isExpense ? '-' : '+'}
                            {formatCurrencyWithCode(
                              currencyAccounts.reduce(
                                (sum, account) =>
                                  sum +
                                  (account.totalAmountInBaseCurrency || 0),
                                0
                              ),
                              currentBaseCurrency.code
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 显示该币种下的账户明细 */}
                    <div className='ml-4 space-y-1'>
                      {currencyAccounts.map(account => (
                        <div
                          key={account.id}
                          className='flex justify-between items-start text-sm py-1'
                        >
                          <div className='flex-1 min-w-0 pr-2 flex items-center'>
                            {/* 账户颜色指示器 */}
                            <div
                              className='w-2 h-2 rounded-full mr-2 flex-shrink-0'
                              style={{
                                backgroundColor: (() => {
                                  const fullAccount = accounts.find(
                                    acc => acc.id === account.id
                                  )
                                  const accountType = fullAccount?.category
                                    ?.type as AccountType | undefined
                                  return ColorManager.getAccountColor(
                                    account.id,
                                    fullAccount?.color,
                                    accountType
                                  )
                                })(),
                              }}
                            />
                            <Link
                              href={`/accounts/${account.id}`}
                              className='text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 hover:underline'
                            >
                              {account.name}
                            </Link>
                          </div>
                          <div className='text-right min-w-0 flex-shrink-0'>
                            <div
                              className={`whitespace-nowrap ${
                                isExpense
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`}
                            >
                              {formatCurrencyWithSymbol(
                                account.totalAmount,
                                account.currency
                              )}
                            </div>
                            {account.totalAmountInBaseCurrency !== undefined &&
                              account.currency.code !==
                                currentBaseCurrency.code && (
                                <div className='text-xs text-gray-400 whitespace-nowrap'>
                                  ≈{' '}
                                  {formatCurrencyWithCode(
                                    Math.abs(account.totalAmountInBaseCurrency),
                                    currentBaseCurrency.code
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
            )
          ) : (
            /* 如果没有账户，显示0金额 */
            <div className='mb-3'>
              <div className='flex justify-between items-start mb-2 py-1 px-0 bg-gray-50 dark:bg-gray-800 rounded'>
                <span className='text-sm font-medium text-gray-600 dark:text-gray-400 flex-1 min-w-0 pr-2'>
                  {currentBaseCurrency.code}
                </span>
                <div className='text-right min-w-0 flex-shrink-0'>
                  <div
                    className={`text-sm font-semibold whitespace-nowrap ${
                      isExpense
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {isExpense ? '-' : '+'}
                    {formatCurrencyWithCode(0, currentBaseCurrency.code)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 递归渲染子分类 */}
        {category.children && category.children.length > 0 && (
          <div className='mt-2'>
            {renderHierarchicalCategories(
              category.children,
              isExpense,
              level + 1
            )}
          </div>
        )}
      </div>
    ))
  }

  const renderCategorySection = (
    title: string,
    categories: Record<string, CashFlowCategorySummary>,
    baseCurrency: SimpleCurrency,
    isExpense: boolean = false
  ) => {
    if (!categories || Object.keys(categories).length === 0) {
      return (
        <div className='mb-6'>
          {title && (
            <h4 className='font-semibold text-lg mb-3 text-gray-700 dark:text-gray-300'>
              {title}
            </h4>
          )}
          <div className='text-center py-4 text-gray-500 dark:text-gray-400'>
            {t('reports.cash.flow.no.data')}
          </div>
        </div>
      )
    }

    return (
      <div className='mb-6'>
        {title && (
          <h4 className='font-semibold text-lg mb-3 text-gray-700 dark:text-gray-300'>
            {title}
          </h4>
        )}
        {Object.entries(categories).map(([categoryId, category]) => (
          <div key={categoryId} className='mb-4'>
            <div
              className={`font-medium mb-2 ${
                isExpense
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-green-700 dark:text-green-300'
              }`}
            >
              {category.categoryName}
            </div>

            {/* 按币种显示该类别的总计 */}
            {Object.entries(category.totalByCurrency || {}).map(
              ([currencyCode, total]) => (
                <div key={currencyCode} className='mb-3'>
                  <div className='flex justify-between items-center mb-2'>
                    <span className='font-medium text-gray-600 dark:text-gray-400'>
                      {currencyCode}
                    </span>
                    <div className='flex flex-col items-end'>
                      <span
                        className={`font-semibold ${isExpense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
                      >
                        {isExpense ? '-' : '+'}
                        {formatCurrencyWithCode(total, currencyCode)}
                      </span>
                      {category.totalInBaseCurrency !== undefined &&
                        currencyCode !== baseCurrency.code && (
                          <span className='text-xs text-gray-400'>
                            ≈ {isExpense ? '-' : '+'}
                            {formatCurrencyWithCode(
                              Math.abs(category.totalInBaseCurrency),
                              baseCurrency.code
                            )}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* 显示该币种下的账户 */}
                  <div className='ml-4 space-y-1'>
                    {(category.accounts || [])
                      .filter(
                        account => account.currency?.code === currencyCode
                      )
                      .map(account => (
                        <div
                          key={account.id}
                          className='flex justify-between text-sm'
                        >
                          <div className='flex items-center'>
                            {/* 账户颜色指示器 */}
                            <div
                              className='w-2 h-2 rounded-full mr-2 flex-shrink-0'
                              style={{
                                backgroundColor: (() => {
                                  const fullAccount = accounts.find(
                                    acc => acc.id === account.id
                                  )
                                  const accountType = fullAccount?.category
                                    ?.type as AccountType | undefined
                                  return ColorManager.getAccountColor(
                                    account.id,
                                    fullAccount?.color,
                                    accountType
                                  )
                                })(),
                              }}
                            />
                            <span className='text-gray-600 dark:text-gray-400'>
                              {account.name}
                            </span>
                          </div>
                          <div className='flex flex-col items-end'>
                            <span
                              className={`${isExpense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
                            >
                              {formatCurrencyWithSymbol(
                                account.totalAmount,
                                account.currency
                              )}
                            </span>
                            {account.totalAmountInBaseCurrency !== undefined &&
                              account.currency.code !== baseCurrency.code && (
                                <span className='text-xs text-gray-400'>
                                  ≈{' '}
                                  {formatCurrencyWithCode(
                                    Math.abs(account.totalAmountInBaseCurrency),
                                    baseCurrency.code
                                  )}
                                </span>
                              )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    )
  }

  // 如果没有设置本位币，显示提示
  if (!baseCurrency) {
    return (
      <WithTranslation>
        <Card className='mt-4'>
          <CardHeader>
            <CardTitle>{t('reports.cash.flow.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-center py-8'>
              <p className='text-gray-500 dark:text-gray-400 mb-4'>
                {t('currency.setup.required')}
              </p>
              <p className='text-sm text-gray-400'>
                {t('currency.setup.description')}
              </p>
            </div>
          </CardContent>
        </Card>
      </WithTranslation>
    )
  }

  if (!data) {
    return (
      <WithTranslation>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              {t('reports.cash.flow.title')}
              <Button
                variant='outline'
                size='sm'
                onClick={fetchCashFlow}
                disabled={loading}
                title={t('reports.cash.flow.refresh')}
              >
                {loading ? (
                  <LoadingSpinnerSVG
                    size='sm'
                    color='current'
                    className='h-4 w-4'
                  />
                ) : (
                  <RefreshCw className='h-4 w-4' />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
              {loading
                ? t('reports.cash.flow.loading')
                : t('reports.cash.flow.no.data')}
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
          <div className='flex flex-col md:flex-row md:justify-between md:items-center'>
            {/* 左侧：标题和期间 */}
            <div className='mb-2 md:mb-0'>
              <CardTitle>{t('reports.cash.flow.title')}</CardTitle>
              <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                {t('reports.cash.flow.period')}:{' '}
                {formatDate(new Date(data.period.start))}{' '}
                {t('reports.cash.flow.to')}{' '}
                {formatDate(new Date(data.period.end))}
              </p>
            </div>
            {/* 右侧：日期选择和按钮 */}
            <div className='flex gap-2 items-center'>
              <div className='w-40'>
                <DateInput
                  name='startDate'
                  label=''
                  value={formatInputDate(startDate)}
                  onChange={e => setStartDate(new Date(e.target.value))}
                  showCalendar={true}
                  showFormatHint={false}
                  className='text-sm'
                />
              </div>
              <span className='text-gray-500 dark:text-gray-400'>
                {t('reports.cash.flow.to')}
              </span>
              <div className='flex gap-2 items-end'>
                <div className='w-40'>
                  <DateInput
                    name='endDate'
                    label=''
                    value={formatInputDate(endDate)}
                    onChange={e => setEndDate(new Date(e.target.value))}
                    showCalendar={true}
                    showFormatHint={false}
                    className='text-sm'
                  />
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={fetchCashFlow}
                  disabled={loading}
                  title={t('reports.cash.flow.refresh')}
                  className='h-12'
                >
                  {loading ? (
                    <LoadingSpinnerSVG
                      size='sm'
                      color='current'
                      className='h-4 w-4'
                    />
                  ) : (
                    <RefreshCw className='h-4 w-4' />
                  )}
                </Button>
              </div>

              {/* <Button
                variant='outline'
                size='sm'
                title={t('reports.cash.flow.download')}
              >
                <Download className='h-4 w-4' />
              </Button> */}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
            {/* Income Categories Section */}
            <div>
              <h3 className='text-xl font-bold mb-4 text-green-600 dark:text-green-400'>
                {t('reports.cash.flow.income')}
              </h3>

              <div className='mb-6'>
                {enrichedCategoryTree?.income &&
                enrichedCategoryTree.income.length > 0
                  ? renderHierarchicalCategories(
                      enrichedCategoryTree.income,
                      false
                    )
                  : renderCategorySection(
                      '',
                      data.cashFlow.income.categories,
                      data.baseCurrency,
                      false
                    )}
              </div>

              {/* Income Total */}
              <div className='border-t border-gray-200 dark:border-gray-700 pt-3 mt-6'>
                <div className='flex justify-between font-bold text-lg'>
                  <span className='text-gray-900 dark:text-gray-100'>
                    {t('reports.cash.flow.total.income')}
                  </span>
                  <div>
                    {Object.entries(data.summary.currencyTotals)
                      .filter(
                        ([, currencyTotal]) => currencyTotal.totalIncome > 0
                      )
                      .map(([currencyCode, currencyTotal]) => {
                        // 计算该币种的收入本币折算金额
                        const incomeBaseCurrencyAmount = Object.values(
                          data.cashFlow.income.categories
                        )
                          .flatMap(category => category.accounts)
                          .filter(
                            account => account.currency.code === currencyCode
                          )
                          .reduce(
                            (sum, account) =>
                              sum + (account.totalAmountInBaseCurrency || 0),
                            0
                          )

                        return (
                          <div
                            key={currencyCode}
                            className='flex flex-col items-end'
                          >
                            <div className='text-green-600 dark:text-green-400'>
                              +
                              {formatCurrencyWithSymbol(
                                currencyTotal.totalIncome,
                                currencyTotal.currency
                              )}
                            </div>
                            {currencyCode !== data.baseCurrency.code &&
                              incomeBaseCurrencyAmount > 0 && (
                                <div className='text-xs text-gray-400'>
                                  ≈ +
                                  {formatCurrencyById(
                                    Math.abs(incomeBaseCurrencyAmount),
                                    data.baseCurrency.id
                                  )}
                                </div>
                              )}
                          </div>
                        )
                      })}
                  </div>
                </div>

                {/* Base Currency Total Income */}
                {data.summary.baseCurrencyTotals && (
                  <div className='mt-2 pt-2 border-t border-gray-100 dark:border-gray-600'>
                    <div className='flex justify-between font-semibold text-base'>
                      <span className='text-gray-700 dark:text-gray-300'>
                        {t('reports.cash.flow.base.currency.total')} (
                        {data.baseCurrency.code})
                      </span>
                      <div className='text-green-600 dark:text-green-400'>
                        +
                        {formatCurrencyWithSymbol(
                          data.summary.baseCurrencyTotals.totalIncome,
                          data.baseCurrency
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expense Categories Section */}
            <div>
              <h3 className='text-xl font-bold mb-4 text-red-600 dark:text-red-400'>
                {t('reports.cash.flow.expense')}
              </h3>

              <div className='mb-6'>
                {enrichedCategoryTree?.expense &&
                enrichedCategoryTree.expense.length > 0
                  ? renderHierarchicalCategories(
                      enrichedCategoryTree.expense,
                      true
                    )
                  : renderCategorySection(
                      '',
                      data.cashFlow.expense.categories,
                      data.baseCurrency,
                      true
                    )}
              </div>

              {/* Expense Total */}
              <div className='border-t border-gray-200 dark:border-gray-700 pt-3 mt-6'>
                <div className='flex justify-between font-bold text-lg'>
                  <span className='text-gray-900 dark:text-gray-100'>
                    {t('reports.cash.flow.total.expense')}
                  </span>
                  <div>
                    {Object.entries(data.summary.currencyTotals)
                      .filter(
                        ([, currencyTotal]) => currencyTotal.totalExpense > 0
                      )
                      .map(([currencyCode, currencyTotal]) => {
                        // 计算该币种的支出本币折算金额
                        const expenseBaseCurrencyAmount = Object.values(
                          data.cashFlow.expense.categories
                        )
                          .flatMap(category => category.accounts)
                          .filter(
                            account => account.currency.code === currencyCode
                          )
                          .reduce(
                            (sum, account) =>
                              sum + (account.totalAmountInBaseCurrency || 0),
                            0
                          )

                        return (
                          <div
                            key={currencyCode}
                            className='flex flex-col items-end'
                          >
                            <div className='text-red-600 dark:text-red-400'>
                              -
                              {formatCurrencyWithSymbol(
                                currencyTotal.totalExpense,
                                currencyTotal.currency
                              )}
                            </div>
                            {currencyCode !== data.baseCurrency.code &&
                              expenseBaseCurrencyAmount > 0 && (
                                <div className='text-xs text-gray-400'>
                                  ≈ -
                                  {formatCurrencyById(
                                    Math.abs(expenseBaseCurrencyAmount),
                                    data.baseCurrency.id
                                  )}
                                </div>
                              )}
                          </div>
                        )
                      })}
                  </div>
                </div>

                {/* Base Currency Total Expense */}
                {data.summary.baseCurrencyTotals && (
                  <div className='mt-2 pt-2 border-t border-gray-100 dark:border-gray-600'>
                    <div className='flex justify-between font-semibold text-base'>
                      <span className='text-gray-700 dark:text-gray-300'>
                        {t('reports.cash.flow.base.currency.total')} (
                        {data.baseCurrency.code})
                      </span>
                      <div className='text-red-600 dark:text-red-400'>
                        -
                        {formatCurrencyWithSymbol(
                          data.summary.baseCurrencyTotals.totalExpense,
                          data.baseCurrency
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Net Cash Flow for the Period */}
          <div className='mt-8 border-t-2 border-gray-200 dark:border-gray-700 pt-4'>
            <div className='flex justify-between font-bold text-lg'>
              <span className='text-gray-900 dark:text-gray-100'>
                {t('reports.cash.flow.net.cash.flow')}
              </span>
              <div>
                {Object.entries(data.summary.currencyTotals)
                  .filter(
                    ([, currencyTotal]) =>
                      Math.abs(currencyTotal.netCashFlow) > 0.01
                  )
                  .map(([currencyCode, currencyTotal]) => {
                    // 计算该币种的本币折算金额
                    const incomeBaseCurrencyAmount = Object.values(
                      data.cashFlow.income.categories
                    )
                      .flatMap(category => category.accounts)
                      .filter(account => account.currency.code === currencyCode)
                      .reduce(
                        (sum, account) =>
                          sum + (account.totalAmountInBaseCurrency || 0),
                        0
                      )

                    const expenseBaseCurrencyAmount = Object.values(
                      data.cashFlow.expense.categories
                    )
                      .flatMap(category => category.accounts)
                      .filter(account => account.currency.code === currencyCode)
                      .reduce(
                        (sum, account) =>
                          sum + (account.totalAmountInBaseCurrency || 0),
                        0
                      )

                    const netBaseCurrencyAmount =
                      incomeBaseCurrencyAmount - expenseBaseCurrencyAmount

                    return (
                      <div
                        key={currencyCode}
                        className='flex flex-col items-end'
                      >
                        <div className='text-purple-600 dark:text-purple-400'>
                          {currencyTotal.netCashFlow >= 0 ? '+' : ''}
                          {formatCurrencyWithSymbol(
                            currencyTotal.netCashFlow,
                            currencyTotal.currency
                          )}
                        </div>
                        {currencyCode !== data.baseCurrency.code &&
                          Math.abs(netBaseCurrencyAmount) > 0.01 && (
                            <div className='text-xs text-gray-400'>
                              ≈ {netBaseCurrencyAmount >= 0 ? '+' : '-'}
                              {formatCurrencyById(
                                Math.abs(netBaseCurrencyAmount),
                                data.baseCurrency.id
                              )}
                            </div>
                          )}
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Base Currency Summary */}
            {data.summary.baseCurrencyTotals && (
              <div className='mt-3 pt-3 border-t border-gray-100 dark:border-gray-600'>
                <div className='flex justify-between font-semibold text-base'>
                  <span className='text-gray-700 dark:text-gray-300'>
                    {t('reports.cash.flow.base.currency.total')} (
                    {data.baseCurrency.code})
                  </span>
                  <div className='text-purple-600 dark:text-purple-400'>
                    {data.summary.baseCurrencyTotals.netCashFlow >= 0
                      ? '+'
                      : ''}
                    {formatCurrencyWithSymbol(
                      data.summary.baseCurrencyTotals.netCashFlow,
                      data.baseCurrency
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div className='mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
            <h4 className='font-semibold mb-2 text-gray-900 dark:text-gray-100'>
              {t('reports.cash.flow.financial.summary')}
            </h4>

            {/* Original Currency Breakdown */}
            <div className='grid grid-cols-3 gap-4 text-sm mb-4'>
              <div>
                <span className='text-gray-600 dark:text-gray-400'>
                  {t('reports.cash.flow.total.income')}
                </span>
                <div className='font-semibold'>
                  {(() => {
                    // 获取收入账户中实际存在的货币汇总
                    const incomeCurrencyTotals: Record<
                      string,
                      {
                        total: number
                        currency: any
                        baseCurrencyAmount: number
                      }
                    > = {}

                    Object.values(data.cashFlow.income.categories).forEach(
                      (category: any) => {
                        category.accounts.forEach((account: any) => {
                          const currencyCode = account.currency.code
                          if (!incomeCurrencyTotals[currencyCode]) {
                            incomeCurrencyTotals[currencyCode] = {
                              total: 0,
                              currency: account.currency,
                              baseCurrencyAmount: 0,
                            }
                          }
                          incomeCurrencyTotals[currencyCode].total +=
                            account.totalAmount
                          incomeCurrencyTotals[
                            currencyCode
                          ].baseCurrencyAmount +=
                            account.totalAmountInBaseCurrency || 0
                        })
                      }
                    )

                    return Object.entries(incomeCurrencyTotals).map(
                      ([currencyCode, currencyData]) => {
                        return (
                          <div
                            key={currencyCode}
                            className='text-green-600 dark:text-green-400'
                          >
                            <div>
                              +
                              {formatCurrencyWithSymbol(
                                currencyData.total,
                                currencyData.currency
                              )}
                            </div>
                            {currencyCode !== data.baseCurrency.code && (
                              <div className='text-xs text-gray-400'>
                                ≈ +
                                {formatCurrencyById(
                                  Math.abs(currencyData.baseCurrencyAmount),
                                  data.baseCurrency.id
                                )}
                              </div>
                            )}
                          </div>
                        )
                      }
                    )
                  })()}
                </div>
              </div>
              <div>
                <span className='text-gray-600 dark:text-gray-400'>
                  {t('reports.cash.flow.total.expense')}
                </span>
                <div className='font-semibold'>
                  {(() => {
                    // 获取支出账户中实际存在的货币汇总
                    const expenseCurrencyTotals: Record<
                      string,
                      {
                        total: number
                        currency: any
                        baseCurrencyAmount: number
                      }
                    > = {}

                    Object.values(data.cashFlow.expense.categories).forEach(
                      (category: any) => {
                        category.accounts.forEach((account: any) => {
                          const currencyCode = account.currency.code
                          if (!expenseCurrencyTotals[currencyCode]) {
                            expenseCurrencyTotals[currencyCode] = {
                              total: 0,
                              currency: account.currency,
                              baseCurrencyAmount: 0,
                            }
                          }
                          expenseCurrencyTotals[currencyCode].total +=
                            account.totalAmount
                          expenseCurrencyTotals[
                            currencyCode
                          ].baseCurrencyAmount +=
                            account.totalAmountInBaseCurrency || 0
                        })
                      }
                    )

                    return Object.entries(expenseCurrencyTotals).map(
                      ([currencyCode, currencyData]) => {
                        return (
                          <div
                            key={currencyCode}
                            className='text-red-600 dark:text-red-400'
                          >
                            <div>
                              -
                              {formatCurrencyWithSymbol(
                                currencyData.total,
                                currencyData.currency
                              )}
                            </div>
                            {currencyCode !== data.baseCurrency.code && (
                              <div className='text-xs text-gray-400'>
                                ≈ -
                                {formatCurrencyById(
                                  Math.abs(currencyData.baseCurrencyAmount),
                                  data.baseCurrency.id
                                )}
                              </div>
                            )}
                          </div>
                        )
                      }
                    )
                  })()}
                </div>
              </div>
              <div>
                <span className='text-gray-600 dark:text-gray-400'>
                  {t('reports.cash.flow.net.summary')}
                </span>
                <div className='font-semibold'>
                  {(() => {
                    // 获取所有账户中实际存在的货币汇总（收入+支出）
                    const netCurrencyTotals: Record<
                      string,
                      {
                        incomeTotal: number
                        expenseTotal: number
                        netTotal: number
                        currency: any
                        incomeBaseCurrencyAmount: number
                        expenseBaseCurrencyAmount: number
                        netBaseCurrencyAmount: number
                      }
                    > = {}

                    // 收集收入数据
                    Object.values(data.cashFlow.income.categories).forEach(
                      (category: any) => {
                        category.accounts.forEach((account: any) => {
                          const currencyCode = account.currency.code
                          if (!netCurrencyTotals[currencyCode]) {
                            netCurrencyTotals[currencyCode] = {
                              incomeTotal: 0,
                              expenseTotal: 0,
                              netTotal: 0,
                              currency: account.currency,
                              incomeBaseCurrencyAmount: 0,
                              expenseBaseCurrencyAmount: 0,
                              netBaseCurrencyAmount: 0,
                            }
                          }
                          netCurrencyTotals[currencyCode].incomeTotal +=
                            account.totalAmount
                          netCurrencyTotals[
                            currencyCode
                          ].incomeBaseCurrencyAmount +=
                            account.totalAmountInBaseCurrency || 0
                        })
                      }
                    )

                    // 收集支出数据
                    Object.values(data.cashFlow.expense.categories).forEach(
                      (category: any) => {
                        category.accounts.forEach((account: any) => {
                          const currencyCode = account.currency.code
                          if (!netCurrencyTotals[currencyCode]) {
                            netCurrencyTotals[currencyCode] = {
                              incomeTotal: 0,
                              expenseTotal: 0,
                              netTotal: 0,
                              currency: account.currency,
                              incomeBaseCurrencyAmount: 0,
                              expenseBaseCurrencyAmount: 0,
                              netBaseCurrencyAmount: 0,
                            }
                          }
                          netCurrencyTotals[currencyCode].expenseTotal +=
                            account.totalAmount
                          netCurrencyTotals[
                            currencyCode
                          ].expenseBaseCurrencyAmount +=
                            account.totalAmountInBaseCurrency || 0
                        })
                      }
                    )

                    // 计算净值
                    Object.keys(netCurrencyTotals).forEach(currencyCode => {
                      const data = netCurrencyTotals[currencyCode]
                      data.netTotal = data.incomeTotal - data.expenseTotal
                      data.netBaseCurrencyAmount =
                        data.incomeBaseCurrencyAmount -
                        data.expenseBaseCurrencyAmount
                    })

                    return Object.entries(netCurrencyTotals).map(
                      ([currencyCode, currencyData]) => {
                        return (
                          <div
                            key={currencyCode}
                            className='text-purple-600 dark:text-purple-400'
                          >
                            <div>
                              {currencyData.netTotal >= 0 ? '+' : ''}
                              {formatCurrencyWithSymbol(
                                currencyData.netTotal,
                                currencyData.currency
                              )}
                            </div>
                            {currencyCode !== data.baseCurrency.code && (
                              <div className='text-xs text-gray-400'>
                                ≈{' '}
                                {currencyData.netBaseCurrencyAmount >= 0
                                  ? '+'
                                  : '-'}
                                {formatCurrencyById(
                                  Math.abs(currencyData.netBaseCurrencyAmount),
                                  data.baseCurrency.id
                                )}
                              </div>
                            )}
                          </div>
                        )
                      }
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* Base Currency Summary */}
            {data.summary.baseCurrencyTotals && (
              <div className='border-t border-gray-200 dark:border-gray-600 pt-3'>
                <div className='grid grid-cols-3 gap-4 text-sm'>
                  <div>
                    <span className='text-gray-600 dark:text-gray-400'>
                      {t('reports.cash.flow.total.income')} (
                      {data.baseCurrency.code})
                    </span>
                    <div className='font-semibold text-green-600 dark:text-green-400'>
                      +
                      {formatCurrencyWithSymbol(
                        data.summary.baseCurrencyTotals.totalIncome,
                        data.baseCurrency
                      )}
                    </div>
                  </div>
                  <div>
                    <span className='text-gray-600 dark:text-gray-400'>
                      {t('reports.cash.flow.total.expense')} (
                      {data.baseCurrency.code})
                    </span>
                    <div className='font-semibold text-red-600 dark:text-red-400'>
                      -
                      {formatCurrencyWithSymbol(
                        data.summary.baseCurrencyTotals.totalExpense,
                        data.baseCurrency
                      )}
                    </div>
                  </div>
                  <div>
                    <span className='text-gray-600 dark:text-gray-400'>
                      {t('reports.cash.flow.net.summary')} (
                      {data.baseCurrency.code})
                    </span>
                    <div className='font-semibold text-purple-600 dark:text-purple-400'>
                      {data.summary.baseCurrencyTotals.netCashFlow >= 0
                        ? '+'
                        : ''}
                      {formatCurrencyWithSymbol(
                        data.summary.baseCurrencyTotals.netCashFlow,
                        data.baseCurrency
                      )}
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
