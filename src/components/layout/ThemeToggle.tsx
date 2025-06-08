'use client'

import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { useState, useRef, useEffect } from 'react'

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleThemeSelect = (selectedTheme: Theme) => {
    console.log('=== ThemeToggle handleThemeSelect ===')
    console.log('Selected theme:', selectedTheme)
    console.log('Current theme before:', theme)
    console.log('Current DOM classes before:', document.documentElement.classList.toString())

    setTheme(selectedTheme)
    setIsOpen(false)

    // 延迟检查结果
    setTimeout(() => {
      console.log('Theme after setTheme:', selectedTheme)
      console.log('DOM classes after:', document.documentElement.classList.toString())
      console.log('=== ThemeToggle handleThemeSelect END ===')
    }, 100)
  }

  const getThemeIcon = (theme: Theme) => {
    switch (theme) {
      case 'light':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      case 'dark':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )
      case 'system':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  const getThemeLabel = (theme: Theme) => {
    switch (theme) {
      case 'light': return '明亮模式'
      case 'dark': return '深色模式'
      case 'system': return '跟随系统'
    }
  }

  const themes: { value: Theme; label: string; icon: JSX.Element }[] = [
    {
      value: 'light',
      label: '明亮模式',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      value: 'dark',
      label: '深色模式',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )
    },
    {
      value: 'system',
      label: '跟随系统',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    }
  ]

  const currentTheme = themes.find(t => t.value === theme) || themes[0]

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 主题切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50
          dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800
          transition-all duration-200 flex items-center space-x-1
        "
        title="选择主题"
      >
        {currentTheme.icon}
        <span className="text-xs font-medium hidden sm:block">
          {theme === 'system' ? '自动' : theme === 'light' ? '明亮' : '深色'}
        </span>
        {/* 下拉箭头 */}
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="
          absolute top-full right-0 mt-2 w-40 bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg
          py-1 z-50
        ">
          {themes.map((themeOption) => (
            <button
              key={themeOption.value}
              onClick={() => handleThemeSelect(themeOption.value)}
              className={`
                w-full px-3 py-2 text-left flex items-center space-x-2
                hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150
                ${theme === themeOption.value
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300'
                }
              `}
            >
              {themeOption.icon}
              <span className="text-sm">{themeOption.label}</span>
              {theme === themeOption.value && (
                <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
