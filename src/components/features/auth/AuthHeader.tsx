'use client'

import { useRouter } from 'next/navigation'
import LanguageToggle from '@/components/features/layout/LanguageToggle'
import ThemeToggle from '@/components/features/layout/ThemeToggle'
import AppLogo from '@/components/ui/branding/AppLogo'

/**
 * 认证页面统一头部组件
 * 包含左上角可点击的项目 logo 和右上角的语言/主题切换功能
 * 用于所有认证相关页面：login, signup, forgot-password, reset-password, recovery-key-setup, setup
 */
export default function AuthHeader() {
  const router = useRouter()

  const handleLogoClick = () => {
    router.push('/')
  }

  return (
    <>
      {/* 顶部左侧 Logo */}
      <div className='absolute top-4 left-4'>
        <AppLogo
          size='sm'
          showText={true}
          showSubtitle={false}
          clickable={true}
          onClick={handleLogoClick}
          textMode='full'
          className='hover:opacity-80 transition-opacity duration-200'
        />
      </div>

      {/* 顶部右侧工具栏 */}
      <div className='absolute top-4 right-4 flex items-center space-x-2'>
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </>
  )
}
