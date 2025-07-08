'use client'

import { useEffect, useState } from 'react'
import { Z_INDEX } from '@/lib/constants/dimensions'
import { AppLogoVariants } from '@/components/ui/branding/AppLogo'
import { useLanguage } from '@/contexts/providers/LanguageContext'

interface MobileSidebarOverlayProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function MobileSidebarOverlay({
  isOpen,
  onClose,
  children,
}: MobileSidebarOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const { t } = useLanguage()

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // 防止iOS Safari的橡皮筋效果
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = 'unset'
      document.body.style.position = 'unset'
      document.body.style.width = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
      document.body.style.position = 'unset'
      document.body.style.width = 'unset'
    }
  }, [isOpen])

  // ESC键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // 处理动画状态
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      return undefined
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen && !isAnimating) return null

  return (
    <div className='fixed inset-0 lg:hidden' style={{ zIndex: Z_INDEX.MODAL }}>
      {/* 背景遮罩 */}
      <div
        className={`
          fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out
          ${isOpen ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
      />

      {/* 侧边栏内容 */}
      <div
        className={`
        fixed top-0 left-0 h-full w-[22rem] max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl
        transform transition-all duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* 顶部栏 */}
        <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700'>
          <AppLogoVariants.TopBarMobile />

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className='p-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200'
            aria-label={t('sidebar.mobile.close.menu')}
          >
            <svg
              className='h-6 w-6'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        {/* 侧边栏内容 */}
        <div className='h-full overflow-y-auto'>{children}</div>

        {/* 底部装饰 */}
        <div className='absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-600 dark:via-indigo-600 dark:to-purple-600'></div>
      </div>
    </div>
  )
}
