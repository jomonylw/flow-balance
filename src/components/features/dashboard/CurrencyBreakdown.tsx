'use client'

import { useState } from 'react'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import type { ByCurrencyInfo } from '@/types/core'

interface CurrencyBreakdownProps {
  byCurrency: Record<string, ByCurrencyInfo>
  type: 'assets' | 'liabilities'
  baseCurrency?: { code: string; symbol: string; name: string }
}

export default function CurrencyBreakdown({
  byCurrency,
  type,
  baseCurrency,
}: CurrencyBreakdownProps) {
  const { resolvedTheme } = useTheme()
  const { t } = useLanguage()
  const { formatCurrencyById, findCurrencyByCode } = useUserCurrencyFormatter()
  const [isExpanded, setIsExpanded] = useState(false)

  // 如果没有分货币数据或只有一种货币，不显示组件
  const currencyEntries = Object.entries(byCurrency || {})
  if (currencyEntries.length <= 1) {
    return null
  }

  // 格式化货币金额
  const formatCurrencyAmount = (
    amount: number,
    currency: { code: string; symbol: string; name: string }
  ) => {
    const currencyInfo = findCurrencyByCode(currency.code)
    return currencyInfo?.id
      ? formatCurrencyById(amount, currencyInfo.id)
      : `${currency.symbol}${amount.toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
  }

  // 主题颜色配置
  const colorConfig = {
    assets: {
      bg: resolvedTheme === 'dark' ? 'bg-blue-900/10' : 'bg-blue-50',
      border:
        resolvedTheme === 'dark' ? 'border-blue-700/30' : 'border-blue-200',
      text: resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700',
      textSecondary:
        resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-600',
      icon: 'text-blue-500',
    },
    liabilities: {
      bg: resolvedTheme === 'dark' ? 'bg-orange-900/10' : 'bg-orange-50',
      border:
        resolvedTheme === 'dark' ? 'border-orange-700/30' : 'border-orange-200',
      text: resolvedTheme === 'dark' ? 'text-orange-300' : 'text-orange-700',
      textSecondary:
        resolvedTheme === 'dark' ? 'text-orange-400' : 'text-orange-600',
      icon: 'text-orange-500',
    },
  }

  const colors = colorConfig[type]

  return (
    <div className={`mt-3 border rounded-lg ${colors.bg} ${colors.border}`}>
      {/* 标题和展开/收起按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-3 py-2 flex items-center justify-between text-sm font-medium ${colors.text} hover:opacity-80 transition-opacity`}
      >
        <span>{t('dashboard.currency.breakdown.title')}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M19 9l-7 7-7-7'
          />
        </svg>
      </button>

      {/* 分货币详情 */}
      {isExpanded && (
        <div className='px-3 pb-3 space-y-3'>
          {currencyEntries.map(([currencyCode, info]) => (
            <div key={currencyCode} className={`${colors.textSecondary}`}>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <div className='text-left'>
                    <div className='font-medium text-sm'>
                      {info.currency.code}
                    </div>
                    <div className='text-xs opacity-75'>
                      ({info.accountCount} {t('dashboard.accounts.unit')})
                    </div>
                  </div>
                  {!info.success && (
                    <svg
                      className='h-3 w-3 text-yellow-500'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                      />
                    </svg>
                  )}
                </div>
                <div className='text-right'>
                  <div className='font-medium text-sm'>
                    {formatCurrencyAmount(info.originalAmount, info.currency)}
                  </div>
                  {info.exchangeRate !== 1 && baseCurrency && (
                    <div className='text-xs opacity-75'>
                      ≈{' '}
                      {formatCurrencyAmount(info.convertedAmount, baseCurrency)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
