'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { ReactNode } from 'react'

interface TranslationLoaderProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * 翻译加载器组件
 * 在翻译未加载完成时显示加载状态，避免显示翻译键值
 */
export default function TranslationLoader({ children, fallback }: TranslationLoaderProps) {
  const { isLoading } = useLanguage()

  if (isLoading) {
    return (
      <div className="animate-pulse">
        {fallback || (
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        )}
      </div>
    )
  }

  return <>{children}</>
}
