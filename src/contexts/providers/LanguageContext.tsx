'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import type { Language } from '@/types/ui'
import { Language as LanguageEnum } from '@/types/core/constants'
import { ApiEndpoints } from '@/lib/constants/api-endpoints'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
  isLoading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
)

interface LanguageProviderProps {
  children: ReactNode
}

const namespaces = [
  'account',
  'account-settings',
  'auth',
  'balance-update',
  'category',
  'chart',
  'common',
  'confirm',
  'currency',
  'currency-conversion',
  'dashboard',
  'data',
  'error',
  'exchange-rate',
  'feature',
  'fire',
  'form',
  'loan',
  'menu',
  'nav',
  'password',
  'preferences',
  'recurring',
  'reports',
  'settings',
  'setup',
  'sidebar',
  'status',
  'success',
  'tag',
  'template',
  'time',
  'transaction',
  'type',
  'validation',
]

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(LanguageEnum.ZH)
  const [mounted, setMounted] = useState(false)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setMounted(true)

    const getInitialLanguage = (): Language => {
      const initialLanguage = window.__INITIAL_LANGUAGE__
      if (
        initialLanguage === LanguageEnum.EN ||
        initialLanguage === LanguageEnum.ZH
      ) {
        return initialLanguage
      }

      const savedLanguage = localStorage.getItem('language') as Language
      if (
        savedLanguage === LanguageEnum.EN ||
        savedLanguage === LanguageEnum.ZH
      ) {
        return savedLanguage
      }

      return LanguageEnum.ZH
    }

    const initialLanguage = getInitialLanguage()
    setLanguageState(initialLanguage)
    document.documentElement.lang =
      initialLanguage === LanguageEnum.ZH ? 'zh-CN' : 'en'

    const initializeLanguage = async () => {
      try {
        const response = await fetch(ApiEndpoints.user.SETTINGS)
        if (response.ok) {
          const data = await response.json()
          if (data.userSettings?.language) {
            if (data.userSettings.language !== initialLanguage) {
              setLanguageState(data.userSettings.language)
              localStorage.setItem('language', data.userSettings.language)
              document.documentElement.lang =
                data.userSettings.language === LanguageEnum.ZH ? 'zh-CN' : 'en'
            }
          }
        }
      } catch (error) {
        console.log('Failed to fetch user language setting:', error)
      }
    }

    initializeLanguage()
  }, [])

  useEffect(() => {
    if (!mounted) return

    const loadTranslations = async () => {
      setIsLoading(true)
      try {
        const promises = namespaces.map(ns =>
          fetch(`/locales/${language}/${ns}.json`).then(res => {
            if (!res.ok) {
              console.error(`Failed to load ${ns}.json for ${language}`)
              return {} // Return empty object on failure to avoid breaking Promise.all
            }
            return res.json()
          })
        )
        const results = await Promise.all(promises)
        const mergedTranslations = results.reduce(
          (acc, curr) => ({ ...acc, ...curr }),
          {}
        )
        setTranslations(mergedTranslations)
      } catch (error) {
        console.error('Failed to load translations:', error)
        setTranslations({})
      } finally {
        setIsLoading(false)
        // 移除初始化标志
        if (typeof window !== 'undefined') {
          window.__LANGUAGE_INITIALIZING__ = false
        }
      }
    }

    loadTranslations()
  }, [language, mounted])

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)

    document.documentElement.lang = lang === LanguageEnum.ZH ? 'zh-CN' : 'en'

    try {
      await fetch(ApiEndpoints.user.SETTINGS, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: lang }),
      })
    } catch (error) {
      console.log('Failed to update user language setting:', error)
    }
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    // 如果正在加载翻译，返回空字符串避免显示键值
    if (isLoading || !mounted) {
      return ''
    }

    let text = translations[key]

    // 如果找不到翻译，记录警告并返回键值（开发时有用）
    if (!text) {
      console.warn(`Translation missing for key: ${key}`)
      return key
    }

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        // Support both {key} and {{key}} formats
        text = text.replace(
          new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'),
          String(value)
        )
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value))
      })
    }

    return text
  }

  if (!mounted) {
    return (
      <LanguageContext.Provider
        value={{
          language: LanguageEnum.ZH,
          setLanguage: () => {},
          t: () => '',
          isLoading: true,
        }}
      >
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
