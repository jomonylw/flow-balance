'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUserData } from '@/contexts/UserDataContext'

interface SidebarFireLinkProps {
  onNavigate?: () => void
}

export default function SidebarFireLink({ onNavigate }: SidebarFireLinkProps) {
  const { t } = useLanguage()
  const { userSettings } = useUserData()
  const pathname = usePathname()
  const isActive = pathname === '/fire'

  // 只有在用户启用了FIRE功能时才显示
  if (!userSettings?.fireEnabled) {
    return null
  }

  return (
    <div className="mb-6">
      <Link
        href="/fire"
        onClick={onNavigate}
        className={`
          flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${isActive
            ? 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-700'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
          }
        `}
      >
        <div className="flex items-center">
          <svg
            className={`mr-3 h-5 w-5 ${isActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            {/* 简化的火焰图标 */}
            <path d="M12 2c1.1 0 2 .9 2 2 0 1.1-.9 2-2 2s-2-.9-2-2c0-1.1.9-2 2-2zm7 7c0 4.4-3.6 8-8 8-.6 0-1.2-.1-1.8-.3-.1 0-.2-.1-.2-.3 0-.2.1-.3.2-.3.6.2 1.2.3 1.8.3 4.1 0 7.4-3.3 7.4-7.4 0-4.1-3.3-7.4-7.4-7.4-.6 0-1.2.1-1.8.3-.1 0-.2-.1-.2-.3 0-.1.1-.2.2-.2.6-.2 1.2-.3 1.8-.3 4.4 0 8 3.6 8 8z" />
          </svg>
          {t('nav.fire')}
        </div>
        {/* 可以添加一个小的火焰动画效果 */}
        {isActive && (
          <div className="flex items-center">
            <span className="text-xs text-orange-600 dark:text-orange-400 animate-pulse">🔥</span>
          </div>
        )}
      </Link>
    </div>
  )
}
