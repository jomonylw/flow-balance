'use client'

import { APP_INFO } from '@/lib/constants/app-config'
import { useLanguage } from '@/contexts/providers/LanguageContext'

interface AppLogoProps {
  /** Logo 大小 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否显示文字 */
  showText?: boolean
  /** 是否显示副标题 */
  showSubtitle?: boolean
  /** 是否可点击 */
  clickable?: boolean
  /** 点击回调 */
  onClick?: () => void
  /** 自定义类名 */
  className?: string
  /** 文字显示模式 */
  textMode?: 'full' | 'compact' | 'mobile'
}

export default function AppLogo({
  size = 'md',
  showText = true,
  showSubtitle = false,
  clickable = false,
  onClick,
  className = '',
  textMode = 'full',
}: AppLogoProps) {
  const { t } = useLanguage()
  // 根据大小设置样式
  const sizeClasses = {
    sm: {
      container: 'h-6 w-6',
      icon: 'h-3 w-3',
      text: 'text-sm',
      subtitle: 'text-xs',
    },
    md: {
      container: 'h-9 w-9',
      icon: 'h-5 w-5',
      text: 'text-xl',
      subtitle: 'text-xs',
    },
    lg: {
      container: 'h-12 w-12',
      icon: 'h-6 w-6',
      text: 'text-2xl',
      subtitle: 'text-sm',
    },
  }

  const currentSize = sizeClasses[size]

  // 根据文字模式设置显示内容
  const getTextContent = () => {
    switch (textMode) {
      case 'compact':
        return 'FB'
      case 'mobile':
        return APP_INFO.NAME
      case 'full':
      default:
        return APP_INFO.NAME
    }
  }

  const logoContent = (
    <>
      {/* Logo 图标 */}
      <div
        className={`${currentSize.container} bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg`}
      >
        <svg
          className={`${currentSize.icon} text-white`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
      </div>

      {/* 文字内容 */}
      {showText && (
        <div className='flex flex-col'>
          <h1
            className={`${currentSize.text} font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent`}
          >
            {getTextContent()}
          </h1>
          {showSubtitle && textMode === 'full' && (
            <p
              className={`${currentSize.subtitle} text-gray-500 dark:text-gray-400 -mt-0.5`}
            >
              {t('common.app.subtitle') || APP_INFO.DESCRIPTION}
            </p>
          )}
        </div>
      )}
    </>
  )

  if (clickable) {
    return (
      <div
        className={`flex items-center space-x-3 cursor-pointer ${className}`}
        onClick={onClick}
      >
        {logoContent}
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {logoContent}
    </div>
  )
}

// 预设的 Logo 变体
export const AppLogoVariants = {
  // 顶部状态栏使用的 Logo
  TopBar: ({ onClick }: { onClick?: () => void }) => (
    <AppLogo
      size='md'
      showText={true}
      showSubtitle={true}
      clickable={true}
      onClick={onClick}
      textMode='full'
    />
  ),

  // 移动端顶部状态栏
  TopBarMobile: ({ onClick }: { onClick?: () => void }) => (
    <AppLogo
      size='md'
      showText={true}
      showSubtitle={false}
      clickable={true}
      onClick={onClick}
      textMode='mobile'
    />
  ),

  // 版本信息中的小 Logo
  VersionInfo: () => (
    <AppLogo
      size='sm'
      showText={false}
      showSubtitle={false}
      clickable={false}
    />
  ),

  // 登录页面的大 Logo
  Auth: () => (
    <AppLogo
      size='lg'
      showText={true}
      showSubtitle={true}
      clickable={false}
      textMode='full'
    />
  ),

  // 紧凑模式（只显示缩写）
  Compact: () => (
    <AppLogo
      size='sm'
      showText={true}
      showSubtitle={false}
      clickable={false}
      textMode='compact'
    />
  ),
}
