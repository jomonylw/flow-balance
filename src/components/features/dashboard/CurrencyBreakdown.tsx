'use client'

import { useState } from 'react'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import type { ByCurrencyInfo } from '@/types/core'

interface CurrencyBreakdownProps {
  byCurrency: Record<string, ByCurrencyInfo>
  type: 'assets' | 'liabilities' | 'dynamic' | 'income' | 'expense' // 新增income和expense类型
  baseCurrency?: { code: string; symbol: string; name: string }
  customTitle?: string // 自定义标题
  hideAccountCount?: boolean // 是否隐藏账户数量显示
  dynamicAmount?: number // 用于dynamic类型判断正负值的金额
  hideHeader?: boolean // 是否隐藏标题栏，直接显示货币列表
}

export default function CurrencyBreakdown({
  byCurrency,
  type,
  baseCurrency,
  customTitle,
  hideAccountCount = false,
  dynamicAmount = 0,
  hideHeader = false,
}: CurrencyBreakdownProps) {
  const { resolvedTheme } = useTheme()
  const { t } = useLanguage()
  const { formatCurrencyById, findCurrencyByCode } = useUserCurrencyFormatter()
  const [isExpanded, setIsExpanded] = useState(false)

  // 获取分货币数据
  const currencyEntries = Object.entries(byCurrency || {})
    // 按本币汇总金额从大到小排序
    .sort(
      ([, a], [, b]) =>
        Math.abs(b.convertedAmount) - Math.abs(a.convertedAmount)
    )

  // 如果没有货币数据，不显示组件
  if (currencyEntries.length === 0) {
    return null
  }

  // 如果是标准模式（有标题栏）且只有一种货币，不显示组件
  if (!hideHeader && currencyEntries.length <= 1) {
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
    dynamic: {
      // 动态颜色：根据金额正负值决定绿色或红色
      bg:
        dynamicAmount >= 0
          ? resolvedTheme === 'dark'
            ? 'bg-green-900/10'
            : 'bg-green-50'
          : resolvedTheme === 'dark'
            ? 'bg-red-900/10'
            : 'bg-red-50',
      border:
        dynamicAmount >= 0
          ? resolvedTheme === 'dark'
            ? 'border-green-700/30'
            : 'border-green-200'
          : resolvedTheme === 'dark'
            ? 'border-red-700/30'
            : 'border-red-200',
      text:
        dynamicAmount >= 0
          ? resolvedTheme === 'dark'
            ? 'text-green-300'
            : 'text-green-700'
          : resolvedTheme === 'dark'
            ? 'text-red-300'
            : 'text-red-700',
      textSecondary:
        dynamicAmount >= 0
          ? resolvedTheme === 'dark'
            ? 'text-green-400'
            : 'text-green-600'
          : resolvedTheme === 'dark'
            ? 'text-red-400'
            : 'text-red-600',
      icon: dynamicAmount >= 0 ? 'text-green-500' : 'text-red-500',
    },
    income: {
      // 收入：始终使用绿色主题
      bg: resolvedTheme === 'dark' ? 'bg-green-900/10' : 'bg-green-50',
      border:
        resolvedTheme === 'dark' ? 'border-green-700/30' : 'border-green-200',
      text: resolvedTheme === 'dark' ? 'text-green-300' : 'text-green-700',
      textSecondary:
        resolvedTheme === 'dark' ? 'text-green-400' : 'text-green-600',
      icon: 'text-green-500',
    },
    expense: {
      // 支出：始终使用红色主题
      bg: resolvedTheme === 'dark' ? 'bg-red-900/10' : 'bg-red-50',
      border: resolvedTheme === 'dark' ? 'border-red-700/30' : 'border-red-200',
      text: resolvedTheme === 'dark' ? 'text-red-300' : 'text-red-700',
      textSecondary: resolvedTheme === 'dark' ? 'text-red-400' : 'text-red-600',
      icon: 'text-red-500',
    },
  }

  const colors = colorConfig[type as keyof typeof colorConfig]

  // 如果隐藏标题栏，直接显示货币列表
  if (hideHeader) {
    return (
      <div className='space-y-2'>
        {currencyEntries.map(([currencyCode, info]) => (
          <div key={currencyCode} className={`${colors.textSecondary}`}>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <div className='text-left'>
                  <div className='font-medium text-sm'>
                    {info.currency.code}
                  </div>
                  {!hideAccountCount && (
                    <div className='text-xs opacity-75'>
                      ({info.accountCount} {t('dashboard.accounts.unit')})
                    </div>
                  )}
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
                {baseCurrency && info.currency.code !== baseCurrency.code && (
                  <div className='text-xs opacity-75'>
                    ≈ {formatCurrencyAmount(info.convertedAmount, baseCurrency)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`mt-3 border rounded-lg ${colors.bg} ${colors.border}`}>
      {/* 标题和展开/收起按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-3 py-2 flex items-center justify-between text-sm font-medium ${colors.text} hover:opacity-80 transition-opacity`}
      >
        <span>{customTitle || t('dashboard.currency.breakdown.title')}</span>
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
                    {!hideAccountCount && (
                      <div className='text-xs opacity-75'>
                        ({info.accountCount} {t('dashboard.accounts.unit')})
                      </div>
                    )}
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
