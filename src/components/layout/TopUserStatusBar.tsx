'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import UserMenuDropdown from './UserMenuDropdown'

interface User {
  id: string
  email: string
  settings?: {
    baseCurrency?: {
      code: string
      name: string
      symbol: string
    }
  }
}

interface TopUserStatusBarProps {
  user: User
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export default function TopUserStatusBar({
  user,
  onMenuClick,
  showMenuButton = false
}: TopUserStatusBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      })
      
      if (response.ok) {
        router.push('/login')
        router.refresh()
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* 左侧：移动端菜单按钮 + Logo */}
        <div className="flex items-center">
          {/* 移动端菜单按钮 */}
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="mr-3 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
              aria-label="打开菜单"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Flow Balance</h1>
          </div>
        </div>

        {/* 右侧：用户信息和菜单 */}
        <div className="flex items-center space-x-4">
          {/* 本位币显示 */}
          {user.settings?.baseCurrency && (
            <div className="hidden sm:flex items-center text-sm text-gray-600">
              <span className="font-medium">
                {user.settings.baseCurrency.symbol} {user.settings.baseCurrency.code}
              </span>
            </div>
          )}

          {/* 用户菜单 */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1"
            >
              {/* 用户头像 */}
              <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              
              {/* 用户邮箱 */}
              <span className="hidden sm:block font-medium">
                {user.email}
              </span>
              
              {/* 下拉箭头 */}
              <svg 
                className={`h-4 w-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 下拉菜单 */}
            <UserMenuDropdown 
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
