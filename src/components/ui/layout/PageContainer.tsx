'use client'

import { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/ui/useResponsive'
import { getSpacing, getTextSize } from '@/lib/utils/responsive'
import { LoadingSpinnerSVG } from '@/components/ui/feedback/LoadingSpinner'

interface PageContainerProps {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
  breadcrumb?: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full'
  padding?: boolean
}

export default function PageContainer({
  children,
  title,
  subtitle,
  actions,
  breadcrumb,
  className = '',
  maxWidth = '7xl',
  padding = true,
}: PageContainerProps) {
  const isMobile = useIsMobile()

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  }

  const paddingClass = padding ? getSpacing('padding') : ''

  return (
    <div
      className={`${maxWidthClasses[maxWidth]} mx-auto ${paddingClass} ${className}`}
    >
      {/* 面包屑导航 */}
      {breadcrumb && <div className='mb-4 sm:mb-6'>{breadcrumb}</div>}

      {/* 页面头部 */}
      {(title || actions) && (
        <div
          className={`mb-6 sm:mb-8 ${isMobile ? 'space-y-4' : 'flex justify-between items-start'}`}
        >
          {/* 标题区域 */}
          {title && (
            <div className='min-w-0 flex-1'>
              <h1
                className={`font-bold text-gray-900 dark:text-gray-100 ${getTextSize('3xl')}`}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  className={`mt-2 text-gray-600 dark:text-gray-400 ${getTextSize('base')}`}
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* 操作区域 */}
          {actions && (
            <div className={`flex-shrink-0 ${isMobile ? 'w-full' : 'ml-6'}`}>
              {actions}
            </div>
          )}
        </div>
      )}

      {/* 页面内容 */}
      <div>{children}</div>
    </div>
  )
}

// 面包屑组件
import type { BreadcrumbItem } from '@/types/ui'

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const isMobile = useIsMobile()

  return (
    <nav
      className={`flex overflow-x-auto ${className}`}
      aria-label='Breadcrumb'
    >
      <ol className='inline-flex items-center space-x-1 sm:space-x-3 whitespace-nowrap'>
        {items.map((item, index) => (
          <li key={index} className='inline-flex items-center'>
            {index > 0 && (
              <svg
                className='w-4 h-4 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500 mx-1'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
                  clipRule='evenodd'
                />
              </svg>
            )}

            {item.href ? (
              <a
                href={item.href}
                className={`inline-flex items-center font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 ${getTextSize('sm')}`}
              >
                {item.icon && <span className='mr-1 sm:mr-2'>{item.icon}</span>}
                <span className={isMobile ? 'truncate max-w-[120px]' : ''}>
                  {item.label}
                </span>
              </a>
            ) : (
              <span
                className={`inline-flex items-center font-medium text-gray-500 dark:text-gray-400 ${getTextSize('sm')}`}
              >
                {item.icon && <span className='mr-1 sm:mr-2'>{item.icon}</span>}
                <span className={isMobile ? 'truncate max-w-[120px]' : ''}>
                  {item.label}
                </span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

// 页面操作按钮组
interface PageActionsProps {
  children: ReactNode
  className?: string
}

export function PageActions({ children, className = '' }: PageActionsProps) {
  const isMobile = useIsMobile()

  return (
    <div
      className={`
      ${isMobile ? 'flex flex-col space-y-2' : 'flex items-center space-x-3'}
      ${className}
    `}
    >
      {children}
    </div>
  )
}

// 响应式按钮
interface ResponsiveButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: ReactNode
  className?: string
  fullWidthOnMobile?: boolean
}

export function ResponsiveButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = '',
  fullWidthOnMobile = true,
}: ResponsiveButtonProps) {
  const isMobile = useIsMobile()

  const variantClasses = {
    primary:
      'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400',
    secondary:
      'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500 dark:focus:ring-gray-400',
    danger:
      'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 dark:focus:ring-red-400',
    ghost:
      'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500 dark:focus:ring-gray-400 border border-gray-300 dark:border-gray-600',
  }

  const sizeClasses = {
    sm: isMobile ? 'px-3 py-2 text-sm min-h-[40px]' : 'px-3 py-1.5 text-sm',
    md: isMobile ? 'px-4 py-2.5 text-base min-h-[44px]' : 'px-4 py-2 text-sm',
    lg: isMobile ? 'px-6 py-3 text-lg min-h-[48px]' : 'px-6 py-2.5 text-base',
  }

  const widthClass = isMobile && fullWidthOnMobile ? 'w-full' : ''

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-md
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors touch-manipulation
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${widthClass}
        ${className}
      `}
    >
      {loading ? (
        <>
          <LoadingSpinnerSVG size='sm' className='-ml-1 mr-2' />
          处理中...
        </>
      ) : (
        <>
          {icon && <span className='mr-2'>{icon}</span>}
          {children}
        </>
      )}
    </button>
  )
}
