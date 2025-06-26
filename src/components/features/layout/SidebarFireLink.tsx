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
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              strokeWidth={2}
            >
              {/* 地平线 - 基准线 */}
              <path strokeLinecap='round' strokeLinejoin='round' d='M2 20h20' />
              {/* 上升的山峰线条 - 类似股市上升图案 */}
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M3 18l3-6 4 2 3-8 4 4 4-7'
              />
              {/* 山峰顶点标记 */}
              <circle cx='21' cy='3' r='1.5' fill='currentColor' />
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
