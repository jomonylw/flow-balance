'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import UserMenuDropdown from './UserMenuDropdown'
import LanguageToggle from './LanguageToggle'
import ThemeToggle from './ThemeToggle'

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
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* 左侧：移动端菜单按钮 + Logo */}
        <div className="flex items-center">
          {/* 移动端菜单按钮 */}
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="mr-3 p-2.5 rounded-xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 dark:hover:from-gray-800 dark:hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden transition-all duration-200"
              aria-label="打开菜单"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                Flow Balance
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">个人财务管理</p>
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:hidden">Flow Balance</h1>
          </div>
        </div>

        {/* 右侧：用户信息和菜单 */}
        <div className="flex items-center space-x-4">
          {/* 本位币显示 */}
          {user.settings?.baseCurrency && (
            <div className="hidden md:flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <svg className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {user.settings.baseCurrency.symbol} {user.settings.baseCurrency.code}
              </span>
            </div>
          )}

          {/* 快捷操作按钮（中等屏幕以上） */}
          <div className="hidden md:flex items-center space-x-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>

          {/* 用户菜单 */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-3 text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-xl px-3 py-2 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all duration-200"
            >
              {/* 用户头像 */}
              <div className="h-9 w-9 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center shadow-inner">
                <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              {/* 用户信息 */}
              <div className="hidden sm:block text-left">
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-32">
                  {user.email}
                </div>
                {/* <div className="text-xs text-gray-500 dark:text-gray-400">
                  在线
                </div> */}
              </div>

              {/* 下拉箭头 */}
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}
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
