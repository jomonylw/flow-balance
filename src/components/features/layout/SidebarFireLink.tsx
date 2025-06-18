'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserData } from '@/contexts/providers/UserDataContext'

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
    <div className='mb-4'>
      <Link
        href='/fire'
        onClick={onNavigate}
        className={`
          group flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
          ${
            isActive
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25 transform scale-[1.02]'
              : 'text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] backdrop-blur-sm'
          }
        `}
      >
        <div className='flex items-center flex-1'>
          <div
            className={`
            flex items-center justify-center w-10 h-10 rounded-lg mr-3 transition-all duration-200
            ${
              isActive
                ? 'bg-white/20 shadow-inner'
                : 'bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50'
            }
          `}
          >
            <svg
              className={`h-5 w-5 ${isActive ? 'text-white' : 'text-orange-600 dark:text-orange-400'}`}
              fill='currentColor'
              viewBox='0 0 24 24'
            >
              <path d='M12 2c1.1 0 2 .9 2 2 0 1.1-.9 2-2 2s-2-.9-2-2c0-1.1.9-2 2-2zm7 7c0 4.4-3.6 8-8 8-.6 0-1.2-.1-1.8-.3-.1 0-.2-.1-.2-.3 0-.2.1-.3.2-.3.6.2 1.2.3 1.8.3 4.1 0 7.4-3.3 7.4-7.4 0-4.1-3.3-7.4-7.4-7.4-.6 0-1.2.1-1.8.3-.1 0-.2-.1-.2-.3 0-.1.1-.2.2-.2.6-.2 1.2-.3 1.8-.3 4.4 0 8 3.6 8 8z' />
            </svg>
          </div>
          <span className='tracking-wide'>{t('nav.fire')}</span>
        </div>

        {isActive && (
          <div className='flex items-center'>
            <div className='w-2 h-2 bg-white rounded-full animate-pulse'></div>
          </div>
        )}
      </Link>
    </div>
  )
}
