'use client'

import Link from 'next/link'
import { Currency } from '@/types/business/transaction'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { CategorySummaryItemSkeleton } from '@/components/ui/data-display/page-skeletons'

interface BalanceInfo {
  currencyCode: string
  balance: number
  convertedAmount?: number
}

interface CategorySummaryItemProps {
  name: string
  href: string

  // For stock type (assets/liabilities)
  balances?: BalanceInfo[]
  baseCurrency?: Currency
  currencies?: Currency[]
  accountCount?: number

  // For flow type (income/expense)
  simpleBalance?: number
  currencySymbol?: string
  transactionCount?: number

  // For subcategories without balances
  isSubcategory?: boolean
  subcategoryLabel?: string

  // Loading state
  loading?: boolean
}

export default function CategorySummaryItem({
  name,
  href,
  balances = [],
  baseCurrency,
  currencies: _currencies = [],
  accountCount = 0,
  simpleBalance,
  currencySymbol: _currencySymbol = '$',
  transactionCount = 0,
  isSubcategory = false,
  subcategoryLabel,
  loading = false,
}: CategorySummaryItemProps) {
  const { t } = useLanguage()
  const { formatCurrency } = useUserCurrencyFormatter()

  // 如果正在加载，显示骨架屏
  if (loading) {
    return <CategorySummaryItemSkeleton />
  }

  // Check if this is a subcategory (child category) that should show account count below name
  // Show account count for categories (not individual accounts) that have accountCount data
  const isChildCategory =
    !isSubcategory &&
    accountCount !== undefined &&
    accountCount >= 0 &&
    transactionCount === 0 && // This helps distinguish categories from individual accounts
    href.includes('/categories/') // Categories have /categories/ in href, accounts have /accounts/

  const renderStockContent = () => {
    if (isSubcategory) {
      return (
        <span className='text-gray-500 dark:text-gray-400'>
          {subcategoryLabel || t('category.subcategory')}
        </span>
      )
    }

    if (simpleBalance !== undefined) {
      return (
        <span
          className={`ml-2 ${
            simpleBalance >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {formatCurrency(simpleBalance, baseCurrency?.code || 'USD')}
        </span>
      )
    }

    const hasBalances = balances.length > 0

    if (!hasBalances) {
      // If this is a child category showing account count below name, don't show it on the right
      if (isChildCategory) {
        return null
      }

      return (
        <span className='text-gray-500 dark:text-gray-400'>
          {transactionCount > 0
            ? t('account.transaction.count.value', { count: transactionCount })
            : `${accountCount} ${t('category.accounts')}`}
        </span>
      )
    }

    return (
      <div className='flex flex-col items-end min-w-0'>
        {balances.map(({ currencyCode, balance, convertedAmount }) => {
          // 查找对应的货币信息
          // const currencyInfo = currencies.find(c => c.code === currencyCode)
          // const originalSymbol = currencyInfo?.symbol || currencyCode

          return (
            <div
              key={currencyCode}
              className='grid grid-cols-[1fr_auto] gap-2 items-center min-h-[2.5rem] w-full'
            >
              <div className='flex flex-col items-end justify-center min-h-[2.5rem] min-w-0'>
                <span
                  className={`text-sm font-medium truncate ${
                    balance >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(balance, currencyCode)}
                </span>
                {convertedAmount !== undefined &&
                  currencyCode !== baseCurrency?.code && (
                    <span className='text-xs text-gray-400 mt-0.5 truncate'>
                      ≈{' '}
                      {formatCurrency(
                        convertedAmount,
                        baseCurrency?.code || 'USD'
                      )}
                    </span>
                  )}
              </div>
              <span className='inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 min-w-[2.5rem] h-6 flex-shrink-0'>
                {currencyCode}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className='flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg'>
      <div className='flex flex-col'>
        <Link
          href={href}
          className='font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
        >
          {name}
        </Link>
        {isChildCategory && (
          <span className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            {accountCount === 0
              ? t('category.no.accounts')
              : `${accountCount} ${t('category.accounts')}`}
          </span>
        )}
      </div>
      <div className='text-sm text-gray-600 dark:text-gray-400'>
        {renderStockContent()}
      </div>
    </div>
  )
}
