'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/providers/LanguageContext'

interface SidebarTransactionsLinkProps {
  onNavigate?: () => void
}

export default function SidebarTransactionsLink({
  onNavigate,
}: SidebarTransactionsLinkProps) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const isActive = pathname === '/transactions'

  return (
    <div className='mb-4'>
      <Link
        href='/transactions'
        onClick={onNavigate}
        className={`
          group flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
          ${
            isActive
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 transform scale-[1.02]'
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
                : 'bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-800/50'
            }
          `}
          >
            <svg
              className={`h-5 w-5 ${isActive ? 'text-white' : 'text-green-600 dark:text-green-400'}`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              strokeWidth={2}
            >
              {/* 上方箭头 - 向左 */}
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M20 9H4m0 0l3-3m-3 3l3 3'
              />
              {/* 下方箭头 - 向右 */}
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M4 15h16m0 0l-3-3m3 3l-3 3'
              />
            </svg>
          </div>
          <span className='tracking-wide'>{t('nav.transactions')}</span>
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
