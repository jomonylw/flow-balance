'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

interface SidebarTransactionsLinkProps {
  onNavigate?: () => void
}

export default function SidebarTransactionsLink({ onNavigate }: SidebarTransactionsLinkProps) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const isActive = pathname === '/transactions'

  return (
    <div className="mb-6">
      <Link
        href="/transactions"
        onClick={onNavigate}
        className={`
          flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${isActive
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }
        `}
      >
        <div className="flex items-center">
          <svg
            className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
          {t('nav.transactions')}
        </div>
      </Link>
    </div>
  )
}