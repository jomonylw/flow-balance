'use client'

import { useState } from 'react'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import CurrencyBreakdown from './CurrencyBreakdown'
import type { ByCurrencyInfo } from '@/types/core'

interface ExpandableIncomeExpenseRowProps {
  type: 'income' | 'expense'
  label: string
  amount: number
  currency: { code: string; symbol: string; name: string }
  byCurrency?: Record<string, ByCurrencyInfo>
  formatCurrencyAmount: (amount: number, currency: any) => string
}

export default function ExpandableIncomeExpenseRow({
  type,
  label,
  amount,
  currency,
  byCurrency,
  formatCurrencyAmount,
}: ExpandableIncomeExpenseRowProps) {
  const { resolvedTheme } = useTheme()
  const _t = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)

  // 检查是否有货币数据（包括单货币）
  const hasCurrencyData = byCurrency && Object.keys(byCurrency).length > 0
  const _hasMultipleCurrencies =
    byCurrency && Object.keys(byCurrency).length > 1

  // 颜色配置
  const colors = {
    income: {
      text: resolvedTheme === 'dark' ? 'text-green-400' : 'text-green-600',
      textBold: resolvedTheme === 'dark' ? 'text-green-300' : 'text-green-800',
      button:
        resolvedTheme === 'dark'
          ? 'text-green-400 hover:text-green-300'
          : 'text-green-600 hover:text-green-500',
      expandedBg:
        resolvedTheme === 'dark' ? 'bg-green-500/10' : 'bg-green-500/5',
    },
    expense: {
      text: resolvedTheme === 'dark' ? 'text-red-400' : 'text-red-600',
      textBold: resolvedTheme === 'dark' ? 'text-red-300' : 'text-red-800',
      button:
        resolvedTheme === 'dark'
          ? 'text-red-400 hover:text-red-300'
          : 'text-red-600 hover:text-red-500',
      expandedBg: resolvedTheme === 'dark' ? 'bg-red-500/10' : 'bg-red-500/5',
    },
  }

  const currentColors = colors[type]

  return (
    <div>
      {/* 主要行 */}
      <div className='flex justify-between items-center'>
        <span className={currentColors.text}>{label}</span>
        <div className='flex items-center space-x-2'>
          <span className={`font-medium ${currentColors.textBold}`}>
            {type === 'income' ? '+' : '-'}
            {formatCurrencyAmount(amount, currency)}
          </span>
          {/* 展开按钮 - 始终显示以保持一致性 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1 rounded transition-colors ${currentColors.button}`}
            title={isExpanded ? '收起货币详情' : '展开货币详情'}
          >
            <svg
              className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
        </div>
      </div>

      {/* 货币详情 */}
      {isExpanded && hasCurrencyData && byCurrency && (
        <div className={`mt-2 rounded-lg p-3 ${currentColors.expandedBg}`}>
          <CurrencyBreakdown
            byCurrency={byCurrency}
            type={type} // 使用对应的类型
            baseCurrency={currency}
            hideAccountCount={true} // 隐藏账户数量
            hideHeader={true} // 隐藏标题栏，直接显示货币列表
          />
        </div>
      )}
    </div>
  )
}
