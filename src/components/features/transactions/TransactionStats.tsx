'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'

interface TransactionStatsData {
  totalIncome: number
  totalExpense: number
  totalNet: number
  thisMonthIncome: number
  thisMonthExpense: number
  thisMonthNet: number
  monthlyChange: number
  incomeCount: number
  expenseCount: number
  totalCount: number
}

interface TransactionStatsProps {
  stats: TransactionStatsData | null
  currencyId: string
  isLoading?: boolean
}

export default function TransactionStats({
  stats,
  currencyId,
  isLoading = false,
}: TransactionStatsProps) {
  const { t } = useLanguage()
  const { formatCurrencyById, formatNumber: _formatNumber } =
    useUserCurrencyFormatter()

  // 如果没有有效的货币ID，显示加载状态
  if (!currencyId) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'
          >
            <div className='animate-pulse'>
              <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2'></div>
              <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2'></div>
              <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3'></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 如果正在加载或没有数据，显示加载状态
  if (isLoading || !stats) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'
          >
            <div className='animate-pulse'>
              <div className='flex items-center'>
                <div className='h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full'></div>
                <div className='ml-5 w-0 flex-1'>
                  <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2'></div>
                  <div className='h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1'></div>
                  <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3'></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-6'>
      {/* 总收入 */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
        <div className='flex items-center'>
          <div className='flex-shrink-0'>
            <div className='h-8 w-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center'>
              <svg
                className='h-5 w-5 text-green-600 dark:text-green-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                />
              </svg>
            </div>
          </div>
          <div className='ml-5 w-0 flex-1'>
            <dl>
              <dt className='text-sm font-medium text-gray-500 dark:text-gray-400 truncate'>
                {t('transaction.stats.total.income')}
              </dt>
              <dd className='text-2xl font-semibold text-green-600 dark:text-green-400'>
                {formatCurrencyById(stats.totalIncome, currencyId)}
              </dd>
              <dd className='text-xs text-gray-500 dark:text-gray-400'>
                {t('transaction.stats.count.transactions', {
                  count: stats.incomeCount,
                })}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 总支出 */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
        <div className='flex items-center'>
          <div className='flex-shrink-0'>
            <div className='h-8 w-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center'>
              <svg
                className='h-5 w-5 text-red-600 dark:text-red-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M20 12H4'
                />
              </svg>
            </div>
          </div>
          <div className='ml-5 w-0 flex-1'>
            <dl>
              <dt className='text-sm font-medium text-gray-500 dark:text-gray-400 truncate'>
                {t('transaction.stats.total.expense')}
              </dt>
              <dd className='text-2xl font-semibold text-red-600 dark:text-red-400'>
                {formatCurrencyById(stats.totalExpense, currencyId)}
              </dd>
              <dd className='text-xs text-gray-500 dark:text-gray-400'>
                {t('transaction.stats.count.transactions', {
                  count: stats.expenseCount,
                })}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 净收支 */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
        <div className='flex items-center'>
          <div className='flex-shrink-0'>
            <div className='h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center'>
              <svg
                className='h-5 w-5 text-purple-600 dark:text-purple-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                />
              </svg>
            </div>
          </div>
          <div className='ml-5 w-0 flex-1'>
            <dl>
              <dt className='text-sm font-medium text-gray-500 dark:text-gray-400 truncate'>
                {t('transaction.stats.net.flow')}
              </dt>
              <dd className='text-2xl font-semibold text-purple-600 dark:text-purple-400'>
                {stats.totalNet >= 0 ? '+' : '-'}
                {formatCurrencyById(Math.abs(stats.totalNet), currencyId)}
              </dd>
              <dd className='text-xs text-gray-500 dark:text-gray-400'>
                {t('transaction.stats.total.records', {
                  count: stats.totalCount,
                })}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* 本月净额 */}
      {/* <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              stats.thisMonthNet >= 0 ? 'bg-purple-100 dark:bg-purple-900' : 'bg-yellow-100 dark:bg-yellow-900'
            }`}>
              <svg className={`h-5 w-5 ${
                stats.thisMonthNet >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-yellow-600 dark:text-yellow-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0h6m-6 0a1 1 0 00-1 1v10a1 1 0 001 1h6a1 1 0 001-1V8a1 1 0 00-1-1" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {t('transaction.stats.this.month.net')}
              </dt>
              <dd className={`text-2xl font-semibold ${
                stats.thisMonthNet >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {stats.thisMonthNet >= 0 ? '+' : ''}
                {formatCurrency(Math.abs(stats.thisMonthNet), currencyCode)}
              </dd>
              {stats.monthlyChange !== 0 && (
                <dd className={`text-xs ${
                  stats.monthlyChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {stats.monthlyChange > 0 ? '↗' : '↘'} {formatNumber(Math.abs(stats.monthlyChange), 1)}% {t('transaction.stats.vs.last.month')}
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div> */}
    </div>
  )
}
