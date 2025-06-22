'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import LoadingSpinner from './LoadingSpinner'

interface LoadingScreenProps {
  /** 自定义消息文本 */
  message?: string
  /** 预定义的消息类型 */
  messageType?:
    | 'loading'
    | 'redirecting'
    | 'processing'
    | 'initializing'
    | 'preparing'
    | 'loading-data'
    | 'loading-page'
    | 'loading-app'
    | 'auth-checking'
  /** 加载器样式 */
  variant?: 'spin' | 'pulse' | 'dots' | 'bars' | 'ring'
  /** 是否显示应用标题 */
  showAppTitle?: boolean
  /** 自定义类名 */
  className?: string
  /** 是否显示背景 */
  showBackground?: boolean
}

/**
 * 全屏加载屏幕组件
 * 支持国际化、主题适配和多种加载样式
 */
export default function LoadingScreen({
  message,
  messageType = 'loading',
  variant = 'spin',
  showAppTitle = false,
  className = '',
  showBackground = true,
}: LoadingScreenProps) {
  const { t, isLoading: languageLoading } = useLanguage()
  const { resolvedTheme } = useTheme()

  // 获取消息文本
  const getMessageText = () => {
    // 如果提供了自定义消息，直接使用
    if (message) {
      return message
    }

    // 如果翻译还在加载中，使用默认文本避免显示翻译键
    if (languageLoading) {
      return resolvedTheme === 'dark' ? 'Loading...' : '加载中...'
    }

    // 根据消息类型获取对应的翻译
    switch (messageType) {
      case 'redirecting':
        return t('common.redirecting')
      case 'processing':
        return t('common.processing')
      case 'initializing':
        return t('common.initializing')
      case 'preparing':
        return t('common.preparing')
      case 'loading-data':
        return t('common.loading.data')
      case 'loading-page':
        return t('common.loading.page')
      case 'loading-app':
        return t('common.loading.app')
      case 'auth-checking':
        return t('auth.checking.status')
      case 'loading':
      default:
        return t('common.loading')
    }
  }

  const messageText = getMessageText()

  // 背景样式
  const backgroundClass = showBackground
    ? 'min-h-screen bg-gray-50 dark:bg-gray-900'
    : 'min-h-screen'

  return (
    <div
      className={`${backgroundClass} flex flex-col items-center justify-center ${className}`}
    >
      {/* 应用标题（可选） */}
      {showAppTitle && (
        <div className='mb-8 text-center'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
            Flow Balance
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>
            {languageLoading ? '个人财务管理' : t('common.app.subtitle')}
          </p>
        </div>
      )}

      {/* 加载器 */}
      <div className='flex flex-col items-center space-y-4'>
        <LoadingSpinner
          size='xl'
          variant={variant}
          color='primary'
          showText={false}
        />

        {/* 消息文本 */}
        {messageText && (
          <div className='text-center'>
            <p className='text-lg font-medium text-gray-700 dark:text-gray-300'>
              {messageText}
            </p>
          </div>
        )}
      </div>

      {/* 底部提示（可选） */}
      {showAppTitle && (
        <div className='mt-12 text-center'>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            {languageLoading ? '请稍候...' : t('common.loading')}
          </p>
        </div>
      )}
    </div>
  )
}
