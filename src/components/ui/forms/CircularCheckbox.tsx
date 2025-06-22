'use client'

import React from 'react'

export interface CircularCheckboxProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  variant?: 'default' | 'enhanced' // 新增变体选项
}

export default function CircularCheckbox({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
  variant = 'default',
}: CircularCheckboxProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const iconSizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }

  const handleClick = () => {
    if (!disabled) {
      onChange()
    }
  }

  // 增强版样式（来自 LoanPaymentHistory）
  if (variant === 'enhanced') {
    return (
      <button
        type='button'
        onClick={handleClick}
        disabled={disabled}
        className={`
          ${sizeClasses[size]} rounded-full border-2 transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1
          dark:focus:ring-blue-400/50 dark:focus:ring-offset-gray-800
          hover:scale-110 active:scale-95 transform relative group
          ${
            checked
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 border-blue-500 dark:border-blue-400 shadow-sm'
              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-600'
          }
          ${
            disabled
              ? 'opacity-50 cursor-not-allowed hover:scale-100'
              : 'cursor-pointer'
          }
          ${className}
        `}
        aria-checked={checked}
        role='checkbox'
      >
        {/* 选中状态的勾选图标 */}
        {checked && (
          <div className='absolute inset-0 flex items-center justify-center'>
            <svg
              className={`${iconSizeClasses[size]} text-white drop-shadow-sm`}
              fill='none'
              stroke='currentColor'
              strokeWidth={3}
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M5 13l4 4L19 7'
              />
            </svg>
          </div>
        )}

        {/* 未选中状态的内圈装饰 */}
        {!checked && (
          <div className='absolute inset-0.5 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-600 dark:to-gray-700 opacity-60 group-hover:opacity-80 transition-opacity duration-200' />
        )}
      </button>
    )
  }

  // 默认版样式（来自 TransactionList）
  return (
    <button
      type='button'
      onClick={handleClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]} rounded-full border-2 transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
        hover:scale-105 active:scale-95 transform relative
        ${
          checked
            ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500'
            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
        }
        ${
          disabled
            ? 'opacity-50 cursor-not-allowed hover:scale-100'
            : 'cursor-pointer'
        }
        ${className}
      `}
      aria-checked={checked}
      role='checkbox'
    >
      {/* 选中状态的勾选图标 */}
      {checked && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <svg
            className={`${iconSizeClasses[size]} text-white`}
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
              clipRule='evenodd'
            />
          </svg>
        </div>
      )}

      {/* 未选中状态的内圈 */}
      {!checked && (
        <div className='absolute inset-1 rounded-full bg-gray-50 dark:bg-gray-600 opacity-40' />
      )}
    </button>
  )
}
