'use client'

import Link from 'next/link'
import { Currency } from '@/types/business/transaction'
import { useLanguage } from '@/contexts/providers/LanguageContext'

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
}

export default function CategorySummaryItem({
  name,
  href,
  balances = [],
  baseCurrency,
  currencies = [],
  accountCount = 0,
  simpleBalance,
  currencySymbol = '$',
  transactionCount = 0,
  isSubcategory = false,
  subcategoryLabel,
}: CategorySummaryItemProps) {
  const { t } = useLanguage()

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
          {currencySymbol}
          {Math.abs(simpleBalance).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      )
    }

    const hasBalances = balances.length > 0

    if (!hasBalances) {
      return (
        <span className='text-gray-500 dark:text-gray-400'>
          {transactionCount > 0
            ? t('account.transaction.count.value', { count: transactionCount })
            : `${accountCount} ${t('category.accounts')}`}
        </span>
      )
    }

    return (
      <div className='flex flex-col items-end'>
        {balances.map(({ currencyCode, balance, convertedAmount }) => {
          // 查找对应的货币信息
          const currencyInfo = currencies.find(c => c.code === currencyCode)
          const originalSymbol = currencyInfo?.symbol || currencyCode

          return (
            <div
              key={currencyCode}
              className='flex items-center space-x-2 mb-1'
            >
              <span className='inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'>
                {currencyCode}
              </span>
              <div className='flex flex-col items-end'>
                <span
                  className={`${
                    balance >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {originalSymbol}
                  {Math.abs(balance).toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                {convertedAmount !== undefined &&
                  currencyCode !== baseCurrency?.code && (
                    <span className='text-xs text-gray-400'>
                      ≈ {baseCurrency?.symbol}
                      {Math.abs(convertedAmount).toLocaleString('zh-CN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
      <Link
        href={href}
        className='font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
      >
        {name}
      </Link>
      <div className='text-sm text-gray-600 dark:text-gray-400'>
        {renderStockContent()}
      </div>
    </div>
  )
}
