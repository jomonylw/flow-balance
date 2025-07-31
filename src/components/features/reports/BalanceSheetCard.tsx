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
import { useUserData } from '@/contexts/providers/UserDataContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import ColorManager from '@/lib/utils/color'
import WithTranslation from '@/components/ui/data-display/WithTranslation'
import { AccountType } from '@/types/core/constants'
import type {
  BalanceSheetAccountInfo,
  BalanceSheetData,
  BalanceSheetCategoryWithAccounts,
} from '@/types/components'
import type { SimpleCurrency } from '@/types/core'

interface BalanceSheetResponse {
  balanceSheet: BalanceSheetData
  asOfDate: string
  baseCurrency: SimpleCurrency
  summary: {
    totalAssets: Record<string, number>
    totalLiabilities: Record<string, number>
    netWorth: Record<string, number>
    baseCurrencyTotals?: {
      totalAssets: number
      totalLiabilities: number
      netWorth: number
    }
  }
}

export default function BalanceSheetCard() {
  const { t } = useLanguage()
  const { categories, accounts, getBaseCurrency } = useUserData()
  const { formatCurrencyById, findCurrencyByCode } = useUserCurrencyFormatter()
  const { formatDate, formatInputDate } = useUserDateFormatter()
  const [data, setData] = useState<BalanceSheetResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [asOfDate, setAsOfDate] = useState<Date>(new Date())

  const baseCurrency = getBaseCurrency()

  // 构建分类树并汇总余额数据
  const enrichedCategoryTree = useMemo(() => {
    if (!data || !categories || !accounts) return null

    const buildCategoryTree = (
      type: AccountType.ASSET | AccountType.LIABILITY
    ) => {
      // 获取该类型的原始分类数据
      const rawCategories =
        data.balanceSheet[type === AccountType.ASSET ? 'assets' : 'liabilities']
          .categories

      // 构建分类映射
      const categoryMap = new Map<string, BalanceSheetCategoryWithAccounts>()
      const rootCategories: BalanceSheetCategoryWithAccounts[] = []

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
        category: BalanceSheetCategoryWithAccounts
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

        // 确保每个分类都有本币汇总金额（如果还没有的话）
        if (
          category.totalInBaseCurrency === undefined ||
          category.totalInBaseCurrency === 0
        ) {
          // 如果没有子分类的汇总，则计算自己账户的本币汇总
          if (category.accounts.length > 0) {
            category.totalInBaseCurrency = category.accounts.reduce(
              (sum, account) => {
                return sum + (account.balanceInBaseCurrency || 0)
              },
              0
            )
          } else {
            category.totalInBaseCurrency = 0
          }
        }
      }

      rootCategories.forEach(calculateParentTotals)

      // 排序
      const sortCategories = (cats: BalanceSheetCategoryWithAccounts[]) => {
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
      assets: buildCategoryTree(AccountType.ASSET),
      liabilities: buildCategoryTree(AccountType.LIABILITY),
    }
  }, [data, categories, accounts])

  const fetchBalanceSheet = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/reports/balance-sheet?asOfDate=${asOfDate.toISOString()}`
      )
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error(t('reports.balance.sheet.fetch.error'), error)
    } finally {
      setLoading(false)
    }
  }, [asOfDate, t])

  useEffect(() => {
    fetchBalanceSheet()
  }, [asOfDate, fetchBalanceSheet])

  // 如果没有设置本位币，显示提示
  if (!baseCurrency) {
    return (
      <WithTranslation>
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.balance.sheet.title')}</CardTitle>
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

  // 使用统一的格式化函数
  const formatCurrencyWithCode = (amount: number, currencyCode: string) => {
    const currency = findCurrencyByCode(currencyCode)
    return currency?.id
      ? formatCurrencyById(amount, currency.id)
      : `${amount} ${currencyCode}`
  }

  const formatCurrencyWithSymbol = (
    amount: number,
    currencyCode: string,
    _symbol: string
  ) => {
    const currency = findCurrencyByCode(currencyCode)
    return currency?.id
      ? formatCurrencyById(amount, currency.id)
      : `${amount} ${currencyCode}`
  }

  // 新的层级渲染函数
  const renderHierarchicalCategories = (
    categories: BalanceSheetCategoryWithAccounts[],
    level: number = 0
  ) => {
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
                category.type === 'ASSET'
                  ? 'text-blue-700 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400'
                  : 'text-orange-700 dark:text-orange-300 hover:text-orange-600 dark:hover:text-orange-400'
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

          {/* 分类汇总金额 - 只有当分类有金额或账户时才显示本币汇总 */}
          {(category.totalInBaseCurrency &&
            Math.abs(category.totalInBaseCurrency) > 0) ||
          (category.accounts && category.accounts.length > 0) ? (
            <div className='text-right'>
              <span
                className={`inline-block px-2 py-1 rounded text-sm font-bold border ${
                  category.type === 'ASSET'
                    ? level === 0
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                      : 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-700/50'
                    : level === 0
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700'
                      : 'bg-orange-50/50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-700/50'
                }`}
              >
                {formatCurrencyWithSymbol(
                  Math.abs(category.totalInBaseCurrency || 0),
                  baseCurrency.code,
                  baseCurrency.symbol
                )}
              </span>
            </div>
          ) : null}
        </div>

        {/* 显示账户详情 - 即使没有账户也显示分类 */}
        <div style={{ paddingLeft: `${(level + 1) * 16}px` }} className='mt-2'>
          {/* 如果有账户，按币种分组显示账户 */}
          {category.accounts.length > 0
            ? Object.entries(category.totalByCurrency || {}).map(
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
                              category.type === 'ASSET'
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-orange-600 dark:text-orange-400'
                            }`}
                          >
                            {formatCurrencyWithCode(total, currencyCode)}
                          </div>
                          {currencyCode !== baseCurrency.code && (
                            <div className='text-xs text-gray-400 whitespace-nowrap'>
                              ≈{' '}
                              {formatCurrencyWithSymbol(
                                currencyAccounts.reduce(
                                  (sum, account) =>
                                    sum + (account.balanceInBaseCurrency || 0),
                                  0
                                ),
                                baseCurrency.code,
                                baseCurrency.symbol
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
                                  category.type === 'ASSET'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-orange-600 dark:text-orange-400'
                                }`}
                              >
                                {formatCurrencyWithSymbol(
                                  account.balance,
                                  account.currency.code,
                                  account.currency.symbol
                                )}
                              </div>
                              {account.balanceInBaseCurrency !== undefined &&
                                account.currency.code !== baseCurrency.code && (
                                  <div className='text-xs text-gray-400 whitespace-nowrap'>
                                    ≈{' '}
                                    {formatCurrencyWithSymbol(
                                      Math.abs(account.balanceInBaseCurrency),
                                      baseCurrency.code,
                                      baseCurrency.symbol
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
            : /* 如果没有账户，不显示任何货币记录 */
              null}
        </div>

        {/* 递归渲染子分类 */}
        {category.children && category.children.length > 0 && (
          <div className='mt-2'>
            {renderHierarchicalCategories(category.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  // 保留原有的渲染函数作为后备
  const renderCategorySection = (
    title: string,
    categories: Record<
      string,
      {
        categoryName: string
        accounts: BalanceSheetAccountInfo[]
        totalByCurrency: Record<string, number>
        totalInBaseCurrency?: number
      }
    >,
    baseCurrency: SimpleCurrency,
    accountType: 'ASSET' | 'LIABILITY' = 'ASSET'
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
            {t('reports.balance.sheet.no.data')}
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
            <div className='font-medium mb-2'>
              <Link
                href={`/categories/${categoryId}`}
                className={`transition-colors duration-200 hover:underline ${
                  accountType === 'ASSET'
                    ? 'text-blue-700 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400'
                    : 'text-orange-700 dark:text-orange-300 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
              >
                {category.categoryName}
              </Link>
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
                        className={`font-semibold ${
                          accountType === 'ASSET'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-orange-600 dark:text-orange-400'
                        }`}
                      >
                        {formatCurrencyWithCode(total, currencyCode)}
                      </span>
                      {category.totalInBaseCurrency !== undefined &&
                        currencyCode !== baseCurrency.code && (
                          <span className='text-xs text-gray-400'>
                            ≈ {baseCurrency.symbol}
                            {formatCurrencyWithSymbol(
                              Math.abs(category.totalInBaseCurrency),
                              baseCurrency.code,
                              baseCurrency.symbol
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
                          <Link
                            href={`/accounts/${account.id}`}
                            className='text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 hover:underline'
                          >
                            {account.name}
                          </Link>
                          <div className='flex flex-col items-end'>
                            <span
                              className={`${
                                accountType === 'ASSET'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-orange-600 dark:text-orange-400'
                              }`}
                            >
                              {formatCurrencyWithSymbol(
                                account.balance,
                                account.currency.code,
                                account.currency.symbol
                              )}
                            </span>
                            {account.balanceInBaseCurrency !== undefined &&
                              account.currency.code !== baseCurrency.code && (
                                <span className='text-xs text-gray-400'>
                                  ≈{' '}
                                  {formatCurrencyWithSymbol(
                                    Math.abs(account.balanceInBaseCurrency),
                                    baseCurrency.code,
                                    baseCurrency.symbol
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

  if (!data) {
    return (
      <WithTranslation>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              {t('reports.balance.sheet.title')}
              <Button
                variant='outline'
                size='sm'
                onClick={fetchBalanceSheet}
                disabled={loading}
                title={t('reports.balance.sheet.refresh')}
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
                ? t('reports.balance.sheet.loading')
                : t('reports.balance.sheet.no.data')}
            </div>
          </CardContent>
        </Card>
      </WithTranslation>
    )
  }

  return (
    <WithTranslation>
      <Card>
        <CardHeader>
          <div className='flex justify-between items-center'>
            <CardTitle>{t('reports.balance.sheet.title')}</CardTitle>
            <div className='flex gap-2 items-end'>
              <div className='w-40'>
                <DateInput
                  name='asOfDate'
                  label=''
                  value={formatInputDate(asOfDate)}
                  onChange={e => setAsOfDate(new Date(e.target.value))}
                  showCalendar={true}
                  showFormatHint={false}
                  className='text-sm'
                />
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={fetchBalanceSheet}
                disabled={loading}
                title={t('reports.balance.sheet.refresh')}
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
              {/* <Button
                variant='outline'
                size='sm'
                title={t('reports.balance.sheet.download')}
              >
                <Download className='h-4 w-4' />
              </Button> */}
            </div>
          </div>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            {t('reports.balance.sheet.as.of')}{' '}
            {formatDate(new Date(data.asOfDate))}
          </p>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
            {/* Assets Section */}
            <div>
              <h3 className='text-xl font-bold mb-4 text-blue-600 dark:text-blue-400'>
                {t('reports.assets')}
              </h3>

              <div className='mb-6'>
                {enrichedCategoryTree?.assets &&
                enrichedCategoryTree.assets.length > 0
                  ? renderHierarchicalCategories(enrichedCategoryTree.assets)
                  : renderCategorySection(
                      '',
                      data.balanceSheet.assets.categories,
                      data.baseCurrency,
                      'ASSET'
                    )}
              </div>

              <div className='border-t border-gray-200 dark:border-gray-700 pt-3'>
                <div className='flex justify-between font-bold text-lg'>
                  <span className='text-gray-900 dark:text-gray-100'>
                    {t('reports.balance.sheet.total.assets')}
                  </span>
                  <div>
                    {Object.entries(
                      data.balanceSheet.assets.totalByCurrency || {}
                    ).map(([currencyCode, total]) => {
                      // 计算该币种的本币折算金额
                      const baseCurrencyAmount = Object.values(
                        data.balanceSheet.assets.categories
                      ).reduce((sum, category) => {
                        const categoryTotal = category.accounts
                          .filter(
                            account => account.currency.code === currencyCode
                          )
                          .reduce(
                            (accSum, account) =>
                              accSum + (account.balanceInBaseCurrency || 0),
                            0
                          )
                        return sum + categoryTotal
                      }, 0)

                      return (
                        <div
                          key={currencyCode}
                          className='flex flex-col items-end'
                        >
                          <div className='text-blue-600 dark:text-blue-400'>
                            {formatCurrencyWithCode(total, currencyCode)}
                          </div>
                          {currencyCode !== data.baseCurrency.code &&
                            baseCurrencyAmount > 0 && (
                              <div className='text-xs text-gray-400'>
                                ≈{' '}
                                {formatCurrencyWithSymbol(
                                  Math.abs(baseCurrencyAmount),
                                  data.baseCurrency.code,
                                  data.baseCurrency.symbol
                                )}
                              </div>
                            )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Base Currency Total Assets */}
                {data.summary.baseCurrencyTotals && (
                  <div className='mt-2 pt-2 border-t border-gray-100 dark:border-gray-600'>
                    <div className='flex justify-between font-semibold text-base'>
                      <span className='text-gray-700 dark:text-gray-300'>
                        {t('reports.balance.sheet.base.currency.total')} (
                        {data.baseCurrency.code})
                      </span>
                      <div className='text-blue-600 dark:text-blue-400'>
                        {formatCurrencyWithSymbol(
                          data.summary.baseCurrencyTotals.totalAssets,
                          data.baseCurrency.code,
                          data.baseCurrency.symbol
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Liabilities and Equity Section */}
            <div>
              <h3 className='text-xl font-bold mb-4 text-orange-600 dark:text-orange-400'>
                {t('reports.liabilities')}
              </h3>

              <div className='mb-6'>
                {enrichedCategoryTree?.liabilities &&
                enrichedCategoryTree.liabilities.length > 0
                  ? renderHierarchicalCategories(
                      enrichedCategoryTree.liabilities
                    )
                  : renderCategorySection(
                      '',
                      data.balanceSheet.liabilities.categories,
                      data.baseCurrency,
                      'LIABILITY'
                    )}
              </div>

              <div className='border-t border-gray-200 dark:border-gray-700 pt-3 mb-6'>
                <div className='flex justify-between font-bold'>
                  <span className='text-gray-900 dark:text-gray-100'>
                    {t('reports.balance.sheet.total.liabilities')}
                  </span>
                  <div>
                    {Object.entries(
                      data.balanceSheet.liabilities.totalByCurrency || {}
                    ).map(([currencyCode, total]) => {
                      // 计算该币种的本币折算金额
                      const baseCurrencyAmount = Object.values(
                        data.balanceSheet.liabilities.categories
                      ).reduce((sum, category) => {
                        const categoryTotal = category.accounts
                          .filter(
                            account => account.currency.code === currencyCode
                          )
                          .reduce(
                            (accSum, account) =>
                              accSum + (account.balanceInBaseCurrency || 0),
                            0
                          )
                        return sum + categoryTotal
                      }, 0)

                      return (
                        <div
                          key={currencyCode}
                          className='flex flex-col items-end'
                        >
                          <div className='text-orange-600 dark:text-orange-400'>
                            {formatCurrencyWithCode(total, currencyCode)}
                          </div>
                          {currencyCode !== data.baseCurrency.code &&
                            baseCurrencyAmount > 0 && (
                              <div className='text-xs text-gray-400'>
                                ≈{' '}
                                {formatCurrencyById(
                                  Math.abs(baseCurrencyAmount),
                                  data.baseCurrency.id
                                )}
                              </div>
                            )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Base Currency Total Liabilities */}
                {data.summary.baseCurrencyTotals && (
                  <div className='mt-2 pt-2 border-t border-gray-100 dark:border-gray-600'>
                    <div className='flex justify-between font-semibold text-base'>
                      <span className='text-gray-700 dark:text-gray-300'>
                        {t('reports.balance.sheet.base.currency.total')} (
                        {data.baseCurrency.code})
                      </span>
                      <div className='text-orange-600 dark:text-orange-400'>
                        {formatCurrencyById(
                          data.summary.baseCurrencyTotals.totalLiabilities,
                          data.baseCurrency.id
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <h3 className='text-xl font-bold mb-4 text-green-600 dark:text-green-400'>
                {t('reports.balance.sheet.equity')}
              </h3>
              <div className='border-t border-gray-200 dark:border-gray-700 pt-3'>
                <div className='flex justify-between font-bold text-lg'>
                  <span className='text-gray-900 dark:text-gray-100'>
                    {t('reports.balance.sheet.net.assets')}
                  </span>
                  <div>
                    {Object.entries(data.balanceSheet.equity || {}).map(
                      ([currencyCode, equity]) => {
                        // 计算该币种的净资产本币折算金额
                        const assetBaseCurrencyAmount = Object.values(
                          data.balanceSheet.assets.categories
                        ).reduce((sum, category) => {
                          const categoryTotal = category.accounts
                            .filter(
                              account => account.currency.code === currencyCode
                            )
                            .reduce(
                              (accSum, account) =>
                                accSum + (account.balanceInBaseCurrency || 0),
                              0
                            )
                          return sum + categoryTotal
                        }, 0)

                        const liabilityBaseCurrencyAmount = Object.values(
                          data.balanceSheet.liabilities.categories
                        ).reduce((sum, category) => {
                          const categoryTotal = category.accounts
                            .filter(
                              account => account.currency.code === currencyCode
                            )
                            .reduce(
                              (accSum, account) =>
                                accSum + (account.balanceInBaseCurrency || 0),
                              0
                            )
                          return sum + categoryTotal
                        }, 0)

                        const netBaseCurrencyAmount =
                          assetBaseCurrencyAmount - liabilityBaseCurrencyAmount

                        return (
                          <div
                            key={currencyCode}
                            className='flex flex-col items-end'
                          >
                            <div
                              className={
                                equity >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }
                            >
                              {formatCurrencyWithCode(equity, currencyCode)}
                            </div>
                            {currencyCode !== data.baseCurrency.code &&
                              Math.abs(netBaseCurrencyAmount) > 0.01 && (
                                <div className='text-xs text-gray-400'>
                                  ≈{' '}
                                  {formatCurrencyById(
                                    Math.abs(netBaseCurrencyAmount),
                                    data.baseCurrency.id
                                  )}
                                </div>
                              )}
                          </div>
                        )
                      }
                    )}
                  </div>
                </div>

                {/* Base Currency Net Worth */}
                {data.summary.baseCurrencyTotals && (
                  <div className='mt-2 pt-2 border-t border-gray-100 dark:border-gray-600'>
                    <div className='flex justify-between font-semibold text-base'>
                      <span className='text-gray-700 dark:text-gray-300'>
                        {t('reports.balance.sheet.base.currency.total')} (
                        {data.baseCurrency.code})
                      </span>
                      <div
                        className={
                          data.summary.baseCurrencyTotals.netWorth >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }
                      >
                        {formatCurrencyById(
                          data.summary.baseCurrencyTotals.netWorth,
                          data.baseCurrency.id
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className='mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
            <h4 className='font-semibold mb-2 text-gray-900 dark:text-gray-100'>
              {t('reports.balance.sheet.financial.summary')}
            </h4>

            {/* Original Currency Breakdown */}
            <div className='grid grid-cols-3 gap-4 text-sm mb-4'>
              <div>
                <span className='text-gray-600 dark:text-gray-400'>
                  {t('reports.balance.sheet.total.assets.summary')}
                </span>
                <div className='font-semibold text-blue-600 dark:text-blue-400'>
                  {Object.entries(data.summary.totalAssets).map(
                    ([currencyCode, total]) => {
                      // 计算该币种的本币折算金额
                      const baseCurrencyAmount = Object.values(
                        data.balanceSheet.assets.categories
                      ).reduce((sum, category) => {
                        const categoryTotal = category.accounts
                          .filter(
                            account => account.currency.code === currencyCode
                          )
                          .reduce(
                            (accSum, account) =>
                              accSum + (account.balanceInBaseCurrency || 0),
                            0
                          )
                        return sum + categoryTotal
                      }, 0)

                      return (
                        <div key={currencyCode}>
                          <div className='text-blue-600 dark:text-blue-400'>
                            {formatCurrencyWithCode(total, currencyCode)}
                          </div>
                          {currencyCode !== data.baseCurrency.code && (
                            <div className='text-xs text-gray-400'>
                              ≈{' '}
                              {formatCurrencyById(
                                Math.abs(baseCurrencyAmount),
                                data.baseCurrency.id
                              )}
                            </div>
                          )}
                        </div>
                      )
                    }
                  )}
                </div>
              </div>
              <div>
                <span className='text-gray-600 dark:text-gray-400'>
                  {t('reports.balance.sheet.total.liabilities.summary')}
                </span>
                <div className='font-semibold text-orange-600 dark:text-orange-400'>
                  {Object.entries(data.summary.totalLiabilities).map(
                    ([currencyCode, total]) => {
                      // 计算该币种的本币折算金额
                      const baseCurrencyAmount = Object.values(
                        data.balanceSheet.liabilities.categories
                      ).reduce((sum, category) => {
                        const categoryTotal = category.accounts
                          .filter(
                            account => account.currency.code === currencyCode
                          )
                          .reduce(
                            (accSum, account) =>
                              accSum + (account.balanceInBaseCurrency || 0),
                            0
                          )
                        return sum + categoryTotal
                      }, 0)

                      return (
                        <div key={currencyCode}>
                          <div className='text-orange-600 dark:text-orange-400'>
                            {formatCurrencyWithCode(total, currencyCode)}
                          </div>
                          {currencyCode !== data.baseCurrency.code && (
                            <div className='text-xs text-gray-400'>
                              ≈{' '}
                              {formatCurrencyById(
                                Math.abs(baseCurrencyAmount),
                                data.baseCurrency.id
                              )}
                            </div>
                          )}
                        </div>
                      )
                    }
                  )}
                </div>
              </div>
              <div>
                <span className='text-gray-600 dark:text-gray-400'>
                  {t('reports.balance.sheet.net.worth.summary')}
                </span>
                <div className='font-semibold'>
                  {Object.entries(data.summary.netWorth).map(
                    ([currencyCode, netWorth]) => {
                      // 计算该币种的净资产本币折算金额
                      const assetBaseCurrencyAmount = Object.values(
                        data.balanceSheet.assets.categories
                      ).reduce((sum, category) => {
                        const categoryTotal = category.accounts
                          .filter(
                            account => account.currency.code === currencyCode
                          )
                          .reduce(
                            (accSum, account) =>
                              accSum + (account.balanceInBaseCurrency || 0),
                            0
                          )
                        return sum + categoryTotal
                      }, 0)

                      const liabilityBaseCurrencyAmount = Object.values(
                        data.balanceSheet.liabilities.categories
                      ).reduce((sum, category) => {
                        const categoryTotal = category.accounts
                          .filter(
                            account => account.currency.code === currencyCode
                          )
                          .reduce(
                            (accSum, account) =>
                              accSum + (account.balanceInBaseCurrency || 0),
                            0
                          )
                        return sum + categoryTotal
                      }, 0)

                      const netBaseCurrencyAmount =
                        assetBaseCurrencyAmount - liabilityBaseCurrencyAmount

                      return (
                        <div
                          key={currencyCode}
                          className={
                            netWorth >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          <div>
                            {formatCurrencyWithCode(netWorth, currencyCode)}
                          </div>
                          {currencyCode !== data.baseCurrency.code && (
                            <div className='text-xs text-gray-400'>
                              ≈{' '}
                              {formatCurrencyById(
                                Math.abs(netBaseCurrencyAmount),
                                data.baseCurrency.id
                              )}
                            </div>
                          )}
                        </div>
                      )
                    }
                  )}
                </div>
              </div>
            </div>

            {/* Base Currency Summary */}
            {data.summary.baseCurrencyTotals && (
              <div className='border-t border-gray-200 dark:border-gray-600 pt-3'>
                <div className='grid grid-cols-3 gap-4 text-sm'>
                  <div>
                    <span className='text-gray-600 dark:text-gray-400'>
                      {t('reports.balance.sheet.total.assets.summary')} (
                      {data.baseCurrency.code})
                    </span>
                    <div className='font-semibold text-blue-600 dark:text-blue-400'>
                      {formatCurrencyById(
                        data.summary.baseCurrencyTotals.totalAssets,
                        data.baseCurrency.id
                      )}
                    </div>
                  </div>
                  <div>
                    <span className='text-gray-600 dark:text-gray-400'>
                      {t('reports.balance.sheet.total.liabilities.summary')} (
                      {data.baseCurrency.code})
                    </span>
                    <div className='font-semibold text-orange-600 dark:text-orange-400'>
                      {formatCurrencyById(
                        data.summary.baseCurrencyTotals.totalLiabilities,
                        data.baseCurrency.id
                      )}
                    </div>
                  </div>
                  <div>
                    <span className='text-gray-600 dark:text-gray-400'>
                      {t('reports.balance.sheet.net.worth.summary')} (
                      {data.baseCurrency.code})
                    </span>
                    <div
                      className={`font-semibold ${data.summary.baseCurrencyTotals.netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                    >
                      {formatCurrencyById(
                        data.summary.baseCurrencyTotals.netWorth,
                        data.baseCurrency.id
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
