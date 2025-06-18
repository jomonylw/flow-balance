'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { ReactNode, ComponentType } from 'react'

interface WithTranslationProps {
  children: ReactNode
  fallback?: ReactNode
  className?: string
}

/**
 * 翻译包装器组件
 * 在翻译未加载完成时显示加载状态，避免显示翻译键值
 */
export default function WithTranslation({
  children,
  fallback,
  className = '',
}: WithTranslationProps) {
  const { isLoading } = useLanguage()

  if (isLoading) {
    return (
      <div className={`${className} animate-pulse`}>
        {fallback || (
          <div className='space-y-2'>
            <div className='h-4 rounded w-3/4 bg-gray-200 dark:bg-gray-700'></div>
            <div className='h-4 rounded w-1/2 bg-gray-200 dark:bg-gray-700'></div>
          </div>
        )}
      </div>
    )
  }

  return <>{children}</>
}

/**
 * 高阶组件：为组件添加翻译加载保护
 */
export function withTranslation<P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode,
) {
  return function WrappedComponent(props: P) {
    const { isLoading } = useLanguage()

    if (isLoading) {
      return (
        <div className='animate-pulse'>
          {fallback || (
            <div className='space-y-2'>
              <div className='h-4 rounded w-3/4 bg-gray-200 dark:bg-gray-700'></div>
              <div className='h-4 rounded w-1/2 bg-gray-200 dark:bg-gray-700'></div>
            </div>
          )}
        </div>
      )
    }

    return <Component {...props} />
  }
}
