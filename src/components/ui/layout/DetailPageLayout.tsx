'use client'

import React from 'react'
import BreadcrumbNavigation from '@/components/ui/navigation/BreadcrumbNavigation'

interface DetailPageLayoutProps {
  // 面包屑相关
  categoryId?: string
  accountId?: string
  customBreadcrumbItems?: Array<{
    label: string
    href?: string
    icon?: React.ReactNode
  }>

  // 标题区域
  title: string
  subtitle?: string
  description?: string
  icon?: React.ReactNode
  iconBackgroundColor?: string
  badge?: React.ReactNode

  // 操作按钮区域
  actions?: React.ReactNode
  actionsTip?: string

  // 内容区域
  children: React.ReactNode

  // 样式
  className?: string
  maxWidth?:
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | '6xl'
    | '7xl'
    | 'full'
}

export default function DetailPageLayout({
  categoryId,
  accountId,
  customBreadcrumbItems,
  title,
  subtitle,
  description,
  icon,
  iconBackgroundColor,
  badge,
  actions,
  actionsTip,
  children,
  className = '',
  maxWidth = '7xl',
}: DetailPageLayoutProps) {
  const maxWidthClass = maxWidth === 'full' ? 'max-w-full' : `max-w-${maxWidth}`

  return (
    <div className={`p-4 sm:p-6 ${maxWidthClass} mx-auto ${className}`}>
      {/* 面包屑导航 */}
      <BreadcrumbNavigation
        categoryId={categoryId}
        accountId={accountId}
        customItems={customBreadcrumbItems}
      />

      {/* 标题区域 */}
      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 sm:mb-6 space-y-4 sm:space-y-0'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center'>
            {icon && (
              <div
                className='h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0'
                style={{ backgroundColor: iconBackgroundColor || '#f3f4f6' }}
              >
                <span className='text-xl sm:text-2xl'>{icon}</span>
              </div>
            )}
            <div className='min-w-0 flex-1'>
              <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate'>
                {title}
              </h1>
              {subtitle && (
                <p className='mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400'>
                  {subtitle}
                </p>
              )}
              {description && (
                <p className='mt-1 sm:mt-2 text-sm text-gray-600 dark:text-gray-400'>
                  {description}
                </p>
              )}
              {badge && <div className='mt-2'>{badge}</div>}
            </div>
          </div>
        </div>

        {/* 操作按钮区域 */}
        {(actions || actionsTip) && (
          <div className='flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto'>
            {actions && (
              <div className='flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto'>
                {actions}
              </div>
            )}
            {actionsTip && (
              <div className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0'>
                💡 {actionsTip}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 内容区域 */}
      {children}
    </div>
  )
}
