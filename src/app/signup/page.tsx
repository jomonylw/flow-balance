'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useAuth } from '@/contexts/providers/AuthContext'
import AuthLayout from '@/components/features/auth/AuthLayout'
import SignupForm from '@/components/features/auth/SignupForm'
import LoadingScreen from '@/components/ui/feedback/LoadingScreen'

export default function SignupPage() {
  const { t, isLoading: languageLoading } = useLanguage()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // 如果用户已登录，重定向到 dashboard
    if (mounted && isAuthenticated && !authLoading) {
      router.replace('/dashboard')
    }
  }, [mounted, isAuthenticated, authLoading, router])

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

  // 如果已认证，显示重定向消息
  if (isAuthenticated) {
    return <LoadingScreen messageType='redirecting' variant='dots' />
  }

  return (
    <AuthLayout
      title={t('auth.signup.title')}
      subtitle={t('auth.signup.subtitle')}
    >
      <SignupForm />
    </AuthLayout>
  )
}
