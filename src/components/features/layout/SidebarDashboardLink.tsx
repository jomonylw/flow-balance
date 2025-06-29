'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/providers/LanguageContext'

interface SidebarDashboardLinkProps {
  onNavigate?: () => void
}

export default function SidebarDashboardLink({
  onNavigate,
}: SidebarDashboardLinkProps) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const isActive = pathname === '/dashboard'

  return (
    <div className='mb-4'>
      <Link
        href='/dashboard'
        onClick={onNavigate}
        className={`
          group flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
          ${
            isActive
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transform scale-[1.02]'
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
                : 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50'
            }
          `}
          >
            <svg
              className={`h-5 w-5 ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              strokeWidth={2}
            >
              {/* 仪表盘外圈 */}
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z'
              />
              {/* 仪表盘指针 */}
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 6v6l4 2'
              />
              {/* 中心点 */}
              <circle cx='12' cy='12' r='1' fill='currentColor' />
            </svg>
          </div>
          <span className='tracking-wide'>{t('nav.dashboard')}</span>
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
