'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/providers/AuthContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import AuthLayout from '@/components/features/auth/AuthLayout'
import ForgotPasswordWithKey from '@/components/features/auth/ForgotPasswordWithKey'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    // 如果用户已登录，重定向到 dashboard
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  // 如果正在加载或用户已登录，显示加载状态
  if (isLoading || user) {
    return <div>Loading...</div>
  }

  return (
    <AuthLayout
      title={t('auth.reset.password.title')}
      subtitle={t('auth.reset.password.subtitle')}
    >
      <ForgotPasswordWithKey />
    </AuthLayout>
  )
}
