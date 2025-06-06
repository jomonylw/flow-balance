'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarDashboardLinkProps {
  onNavigate?: () => void
}

export default function SidebarDashboardLink({ onNavigate }: SidebarDashboardLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === '/dashboard'

  return (
    <div className="mb-6">
      <Link
        href="/dashboard"
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
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" 
            />
          </svg>
          Dashboard
        </div>
        
        <button className="text-gray-400 hover:text-gray-600 focus:outline-none">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </Link>
    </div>
  )
}
