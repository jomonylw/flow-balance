'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { ReactNode } from 'react'

interface TranslationTextProps {
  translationKey: string
  params?: Record<string, string | number>
  fallback?: ReactNode
  className?: string
  as?: keyof React.JSX.IntrinsicElements
}

/**
 * 翻译文本组件
 * 在翻译未加载完成时显示占位符，避免显示翻译键值
 */
export default function TranslationText({ 
  translationKey, 
  params, 
  fallback, 
  className = '',
  as: Component = 'span'
}: TranslationTextProps) {
  const { t, isLoading } = useLanguage()

  if (isLoading) {
    return (
      <Component className={`${className} animate-pulse`}>
        {fallback || (
          <span className="rounded h-4 w-20 inline-block bg-gray-200 dark:bg-gray-700"></span>
        )}
      </Component>
    )
  }

  const translatedText = t(translationKey, params)
  
  // 如果翻译为空或者是加载占位符，显示fallback
  if (!translatedText || translatedText.startsWith('__LOADING_')) {
    return (
      <Component className={className}>
        {fallback || ''}
      </Component>
    )
  }

  return (
    <Component className={className}>
      {translatedText}
    </Component>
  )
}
