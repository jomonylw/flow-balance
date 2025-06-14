'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'

interface SidebarReportsLinkProps {
  onNavigate?: () => void
}

export default function SidebarReportsLink({ onNavigate }: SidebarReportsLinkProps) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const isActive = pathname === '/reports'

  return (
    <div className="mb-6">
      <Link
        href="/reports"
        onClick={onNavigate}
        className={`
          flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${isActive
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }
        `}
      >
        <div className="flex items-center">
          <svg 
            className={`mr-3 h-5 w-5 ${isActive ? 'text-green-600' : 'text-gray-400'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 00-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2z" 
            />
          </svg>
          {t('nav.reports')}
        </div>
        
        {/* <div className="flex items-center space-x-1"> */}
          {/* 新功能标识 */}
          {/* <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {t('common.new')}
          </span> */}
          {/* <button className="text-gray-400 hover:text-gray-600 focus:outline-none">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button> */}
        {/* </div> */}
      </Link>
    </div>
  )
}
