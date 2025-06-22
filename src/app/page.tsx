'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/providers/AuthContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import LoadingScreen from '@/components/ui/feedback/LoadingScreen'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { userSettings, isLoading: userDataLoading } = useUserData()

  useEffect(() => {
    // 等待认证检查完成
    if (authLoading) return

    if (!isAuthenticated) {
      // 如果未登录，重定向到登录页
      router.replace('/login')
      return
    }

    // 如果已认证，等待用户数据加载完成
    if (userDataLoading) return

    // 检查用户是否已完成初始设置
    if (!userSettings?.baseCurrencyId) {
      // 如果未设置本位币，重定向到初始设置页面
      router.replace('/setup')
    } else {
      // 如果已完成设置，重定向到 dashboard
      router.replace('/dashboard')
    }
  }, [isAuthenticated, authLoading, userSettings, userDataLoading, router])

  // 显示加载状态
  if (authLoading) {
    return <LoadingScreen messageType='auth-checking' variant='pulse' />
  }

  if (!isAuthenticated) {
    return <LoadingScreen messageType='redirecting' variant='spin' />
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
