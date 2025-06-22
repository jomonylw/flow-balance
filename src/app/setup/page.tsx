'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useAuth } from '@/contexts/providers/AuthContext'
import InitialSetup from '@/components/features/setup/InitialSetup'
import LoadingScreen from '@/components/ui/feedback/LoadingScreen'

export default function SetupPage() {
  const { t: _t, isLoading: languageLoading } = useLanguage()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // 如果未认证，重定向到登录页
    if (mounted && !isAuthenticated && !authLoading) {
      router.replace('/login?redirect=setup')
    }
  }, [mounted, isAuthenticated, authLoading, router])

  useEffect(() => {
    // 检查用户是否已完成初始设置
    const checkSetupStatus = async () => {
      if (!user) return

      try {
        const response = await fetch('/api/user/settings')
        if (response.ok) {
          const data = await response.json()
          const hasBaseCurrency = !!data.userSettings?.baseCurrencyId
          setSetupCompleted(hasBaseCurrency)

          // 如果已完成设置，重定向到仪表板
          if (hasBaseCurrency) {
            router.replace('/dashboard')
          }
        }
      } catch (error) {
        console.error('Failed to check setup status:', error)
      }
    }

    if (mounted && user) {
      checkSetupStatus()
    }
  }, [mounted, user, router])

  // 简化加载状态
  if (!mounted) {
    return <LoadingScreen messageType='initializing' />
  }

  if (languageLoading) {
    return <LoadingScreen messageType='loading' />
  }

  // 如果正在认证检查中，显示加载
  if (authLoading) {
    return <LoadingScreen messageType='auth-checking' variant='pulse' />
  }

  // 如果未认证，显示重定向消息
  if (!isAuthenticated) {
    return <LoadingScreen messageType='redirecting' variant='dots' />
  }

  // 如果正在检查设置状态
  if (setupCompleted === null) {
    return <LoadingScreen messageType='loading' />
  }

  // 如果已完成设置，显示重定向消息
  if (setupCompleted) {
    return <LoadingScreen messageType='redirecting' variant='dots' />
  }

  // 如果用户信息不存在，显示加载状态
  if (!user) {
    return <LoadingScreen messageType='loading' />
  }

  return <InitialSetup user={user} />
}
