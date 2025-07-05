'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useAuth } from '@/contexts/providers/AuthContext'
import RecoveryKeyDisplay from '@/components/features/auth/RecoveryKeyDisplay'
import LoadingScreen from '@/components/ui/feedback/LoadingScreen'

export default function RecoveryKeySetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t: _t, isLoading: languageLoading } = useLanguage()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const fromSignup = searchParams.get('from') === 'signup'

  console.log('RecoveryKeySetupPage - Component rendered:', {
    fromSignup,
    isAuthenticated,
    authLoading,
    languageLoading,
    mounted,
    isChecking,
    user: user
      ? {
          id: user.id,
          email: user.email,
          hasRecoveryKey: !!user.recoveryKey,
        }
      : null,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    console.log('Recovery key setup - useEffect triggered:', {
      mounted,
      languageLoading,
      authLoading,
      fromSignup,
      user: user
        ? {
            id: user.id,
            email: user.email,
            hasRecoveryKey: !!user.recoveryKey,
            recoveryKey: user.recoveryKey ? 'EXISTS' : 'MISSING',
          }
        : 'NO_USER',
    })

    if (!mounted || languageLoading || authLoading) {
      console.log('Recovery key setup - Early return:', {
        mounted,
        languageLoading,
        authLoading,
      })
      return
    }

    // 如果不是从注册页面来的，重定向到设置页面
    if (!fromSignup) {
      console.log(
        'Recovery key setup - Not from signup, redirecting to settings'
      )
      router.push('/settings?tab=security')
      return
    }

    // 检查用户是否已登录
    if (!user) {
      console.log('Recovery key setup - No user, redirecting to login')
      router.push('/login')
      return
    }

    // 检查用户是否有恢复密钥
    if (!user.recoveryKey) {
      console.log(
        'Recovery key setup - No recovery key, redirecting to dashboard'
      )
      router.push('/dashboard')
      return
    }

    console.log('Recovery key setup - All checks passed, showing recovery key')
    setIsChecking(false)
  }, [mounted, user, authLoading, languageLoading, fromSignup, router])

  // 简化加载状态
  if (!mounted) {
    console.log('RecoveryKeySetupPage - Returning: not mounted')
    return <LoadingScreen messageType='initializing' />
  }

  if (languageLoading) {
    console.log('RecoveryKeySetupPage - Returning: language loading')
    return <LoadingScreen messageType='loading' />
  }

  // 如果正在认证检查中，显示加载
  if (authLoading) {
    console.log('RecoveryKeySetupPage - Returning: auth loading')
    return <LoadingScreen messageType='auth-checking' variant='pulse' />
  }

  // 如果未认证，显示重定向消息
  if (!isAuthenticated) {
    console.log('RecoveryKeySetupPage - Returning: not authenticated')
    return <LoadingScreen messageType='redirecting' variant='dots' />
  }

  // 如果正在检查状态
  if (isChecking) {
    console.log('RecoveryKeySetupPage - Returning: is checking')
    return <LoadingScreen messageType='loading' />
  }

  if (!user || !user.recoveryKey) {
    console.log(
      'RecoveryKeySetupPage - Returning null: missing user or recovery key',
      {
        hasUser: !!user,
        hasRecoveryKey: user ? !!user.recoveryKey : false,
      }
    )
    return null // 重定向中
  }

  console.log('RecoveryKeySetupPage - Rendering RecoveryKeyDisplay')
  return (
    <RecoveryKeyDisplay
      recoveryKey={user.recoveryKey}
      userEmail={user.email}
      createdAt={user.recoveryKeyCreatedAt || new Date()}
    />
  )
}
