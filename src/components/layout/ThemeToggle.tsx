'use client'

import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme>('system')

  // 初始化主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setCurrentTheme(savedTheme)
    }
  }, [])

  // 应用主题
  useEffect(() => {
    const applyTheme = (theme: Theme) => {
      const root = document.documentElement
      
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', systemPrefersDark)
      } else {
        root.classList.toggle('dark', theme === 'dark')
      }
    }

    applyTheme(currentTheme)
    localStorage.setItem('theme', currentTheme)

    // 监听系统主题变化
    if (currentTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [currentTheme])

  const cycleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    setCurrentTheme(themes[nextIndex])
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

  const getNextThemeLabel = () => {
    const themes: Theme[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    return getThemeLabel(themes[nextIndex])
  }

  return (
    <button
      onClick={cycleTheme}
      className={`
        p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 
        transition-all duration-200 group relative
        ${className}
      `}
      title={`切换到${getNextThemeLabel()}`}
    >
      <div className="flex items-center space-x-1">
        {getThemeIcon(currentTheme)}
        <span className="text-xs font-medium hidden sm:block capitalize">
          {currentTheme === 'system' ? '自动' : currentTheme === 'light' ? '明亮' : '深色'}
        </span>
      </div>
      
      {/* 悬停提示 */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
        {getNextThemeLabel()}
      </div>
    </button>
  )
}
