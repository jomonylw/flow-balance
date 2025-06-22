'use client'

import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import type { CategoryType } from '@/types/core'

interface TypeGroupHeaderProps {
  type: CategoryType
  label: string
  totalBalance: number
  currencySymbol: string
  isExpanded: boolean
  onToggle: () => void
}

export default function TypeGroupHeader({
  type,
  label,
  totalBalance,
  currencySymbol,
  isExpanded,
  onToggle,
}: TypeGroupHeaderProps) {
  const { getUserLocale } = useUserCurrencyFormatter()
  // 根据账户类型获取样式
  const getTypeStyle = () => {
    switch (type) {
      case 'ASSET':
        return {
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-700/50',
          textColor: 'text-blue-700 dark:text-blue-300',
          iconColor: 'text-blue-600 dark:text-blue-400',
          amountColor: 'text-blue-800 dark:text-blue-200',
        }
      case 'LIABILITY':
        return {
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-700/50',
          textColor: 'text-red-700 dark:text-red-300',
          iconColor: 'text-red-600 dark:text-red-400',
          amountColor: 'text-red-800 dark:text-red-200',
        }
      case 'INCOME':
        return {
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-700/50',
          textColor: 'text-green-700 dark:text-green-300',
          iconColor: 'text-green-600 dark:text-green-400',
          amountColor: 'text-green-800 dark:text-green-200',
        }
      case 'EXPENSE':
        return {
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-700/50',
          textColor: 'text-orange-700 dark:text-orange-300',
          iconColor: 'text-orange-600 dark:text-orange-400',
          amountColor: 'text-orange-800 dark:text-orange-200',
        }
      default:
        return {
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-700/50',
          textColor: 'text-gray-700 dark:text-gray-300',
          iconColor: 'text-gray-600 dark:text-gray-400',
          amountColor: 'text-gray-800 dark:text-gray-200',
        }
    }
  }

  const style = getTypeStyle()

  // 格式化金额显示
  const formatAmount = (amount: number) => {
    const absAmount = Math.abs(amount)
    if (absAmount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    } else if (absAmount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`
    } else {
      const locale = getUserLocale()
      return amount.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    }
  }

  // 根据账户类型和金额确定显示颜色
  const getAmountDisplayColor = () => {
    // 负债和支出类账户显示红色，资产和收入类账户显示绿色
    if (type === 'LIABILITY' || type === 'EXPENSE') {
      return 'text-red-600 dark:text-red-400'
    } else {
      return 'text-green-600 dark:text-green-400'
    }
  }

  return (
    <div
      className={`
        flex items-center justify-between px-3 py-2.5 mx-1 rounded-lg border cursor-pointer
        transition-all duration-200 hover:shadow-md group
        ${style.bgColor} ${style.borderColor}
      `}
      onClick={onToggle}
    >
      <div className='flex items-center space-x-3'>
        {/* 展开/收起图标 */}
        <button
          className={`
            flex items-center justify-center w-5 h-5 rounded transition-all duration-200
            hover:bg-white/50 dark:hover:bg-black/20 group-hover:scale-110
            ${style.iconColor}
          `}
          onClick={e => {
            e.stopPropagation()
            onToggle()
          }}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : 'rotate-0'
            }`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            strokeWidth={2.5}
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M9 5l7 7-7 7'
            />
          </svg>
        </button>

        {/* 分组标签 */}
        <div className='flex items-center space-x-2'>
          <span className={`font-semibold text-sm ${style.textColor}`}>
            {label}
          </span>
        </div>
      </div>

      {/* 汇总金额 */}
      <div className='flex items-center space-x-2'>
        <span
          className={`text-sm font-semibold ${
            Math.abs(totalBalance) < 0.01
              ? 'text-gray-400 dark:text-gray-500'
              : getAmountDisplayColor()
          }`}
        >
          {currencySymbol}
          {formatAmount(totalBalance)}
        </span>
      </div>
    </div>
  )
}
