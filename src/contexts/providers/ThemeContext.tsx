'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import type { Theme } from '@/types/ui'

export type { Theme }

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // 应用主题到DOM
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement
    console.log('=== applyTheme START ===')
    console.log('Theme to apply:', theme)
    console.log('Current classes before:', root.classList.toString())
    console.log('Current CSS variables before:', {
      background: getComputedStyle(root).getPropertyValue('--color-background'),
      foreground: getComputedStyle(root).getPropertyValue('--color-foreground'),
    })

    // 先清除所有主题类
    root.classList.remove('dark', 'light')
    console.log('After removing classes:', root.classList.toString())

    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
      console.log('System prefers dark:', systemPrefersDark)
      if (systemPrefersDark) {
        root.classList.add('dark')
        console.log('Added dark class for system theme')
      } else {
        root.classList.add('light')
        console.log('Added light class for system theme')
      }
      setResolvedTheme(systemPrefersDark ? 'dark' : 'light')
    } else if (theme === 'dark') {
      root.classList.add('dark')
      console.log('Added dark class')
      setResolvedTheme('dark')
    } else {
      root.classList.add('light')
      console.log('Added light class')
      setResolvedTheme('light')
    }

    console.log('Final classes:', root.classList.toString())

    // 强制重新计算样式
    root.style.display = 'none'
    void root.offsetHeight // 触发重排
    root.style.display = ''

    setTimeout(() => {
      console.log('CSS variables after:', {
        background:
          getComputedStyle(root).getPropertyValue('--color-background'),
        foreground:
          getComputedStyle(root).getPropertyValue('--color-foreground'),
      })
      console.log('Body computed styles:', {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        color: getComputedStyle(document.body).color,
      })
      console.log('=== applyTheme END ===')
    }, 50)
  }

  // 初始化主题
  useEffect(() => {
    setMounted(true)

    const initializeTheme = async () => {
      // 首先从localStorage获取当前主题
      const savedTheme = localStorage.getItem('theme') as Theme
      let currentTheme: Theme = 'system'

      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        currentTheme = savedTheme
      }

      // 设置主题状态并应用主题
      setThemeState(currentTheme)
      applyTheme(currentTheme)

      // 然后尝试从API获取用户设置并同步
      try {
        const response = await fetch('/api/user/settings')
        if (response.ok) {
          const data = await response.json()
          if (
            data.userSettings?.theme &&
            data.userSettings.theme !== currentTheme
          ) {
            // 如果API中的主题设置与当前不同，使用API的设置
            console.log('Syncing theme from API:', data.userSettings.theme)
            setThemeState(data.userSettings.theme)
            applyTheme(data.userSettings.theme)
            localStorage.setItem('theme', data.userSettings.theme)
          }
        }
      } catch (error) {
        console.log('Failed to fetch user theme setting:', error)
      }
    }

    initializeTheme()
  }, [])

  // 监听系统主题变化
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    return undefined
  }, [theme])

  // 设置主题
  const setTheme = async (newTheme: Theme) => {
    console.log('Setting theme to:', newTheme)
    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme', newTheme)

    // 尝试更新用户设置（如果用户已登录）
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme: newTheme }),
      })
      console.log('Theme saved to API:', response.ok)
    } catch (error) {
      console.log('Failed to update user theme setting:', error)
    }
  }

  // 防止服务端渲染不匹配
  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{ theme: 'system', setTheme: () => {}, resolvedTheme: 'light' }}
      >
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
