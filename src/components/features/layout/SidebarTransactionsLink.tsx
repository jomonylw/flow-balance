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
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
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
