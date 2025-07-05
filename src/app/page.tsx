'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/providers/AuthContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import LoadingScreen from '@/components/ui/feedback/LoadingScreen'
import LandingPage from '@/components/features/landing/LandingPage'

export default function Home() {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { userSettings, isLoading: userDataLoading } = useUserData()

  // 检查是否在注册流程中（通过检查 referrer 或其他方式）
  const isInSignupFlow =
    typeof window !== 'undefined' &&
    (document.referrer.includes('/signup') ||
      document.referrer.includes('/recovery-key-setup') ||
      sessionStorage.getItem('signup-flow') === 'true')

  useEffect(() => {
    console.log('Root page - useEffect triggered:', {
      pathname,
      authLoading,
      isAuthenticated,
      userDataLoading,
      isInSignupFlow,
      referrer: typeof window !== 'undefined' ? document.referrer : 'SSR',
      userSettings: userSettings
        ? {
            baseCurrencyId: userSettings.baseCurrencyId,
            hasBaseCurrency: !!userSettings.baseCurrencyId,
          }
        : null,
    })

    // 等待认证检查完成
    if (authLoading) {
      console.log('Root page - Auth loading, returning')
      return
    }

    if (!isAuthenticated) {
      // 如果未登录，显示着陆页
      console.log('Root page - Not authenticated, showing landing page')
      return
    }

    // 如果在注册流程中，不执行重定向
    if (isInSignupFlow) {
      console.log('Root page - In signup flow, not redirecting')
      return
    }

    // 如果已认证，等待用户数据加载完成
    if (userDataLoading) {
      console.log('Root page - User data loading, returning')
      return
    }

    // 检查用户是否已完成初始设置
    if (!userSettings?.baseCurrencyId) {
      // 如果未设置本位币，重定向到初始设置页面
      console.log('Root page - No base currency, redirecting to setup')
      router.replace('/setup')
    } else {
      // 如果已完成设置，重定向到 dashboard
      console.log('Root page - Has base currency, redirecting to dashboard')
      router.replace('/dashboard')
    }
  }, [
    isAuthenticated,
    authLoading,
    userSettings,
    userDataLoading,
    router,
    pathname,
    isInSignupFlow,
  ])

  // 显示加载状态
  if (authLoading) {
    return <LoadingScreen messageType='auth-checking' variant='pulse' />
  }

  if (!isAuthenticated) {
    return <LandingPage />
  }

  if (userDataLoading) {
    return <LoadingScreen messageType='loading-data' variant='spin' />
  }

  // 根据设置状态显示相应的重定向加载
  if (!userSettings?.baseCurrencyId) {
    return <LoadingScreen messageType='redirecting' variant='spin' />
  }

  return <LoadingScreen messageType='redirecting' variant='spin' />
}
