'use client'

import { Suspense } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import AuthLayout from '@/components/features/auth/AuthLayout'
import ResetPasswordWithKey from '@/components/features/auth/ResetPasswordWithKey'

export default function ResetPasswordPage() {
  const { t } = useLanguage()

  return (
    <AuthLayout
      title={t('auth.reset.password.title')}
      subtitle={t('auth.reset.password.new.subtitle')}
    >
      <Suspense fallback={<div>{t('data.loading')}</div>}>
        <ResetPasswordWithKey />
      </Suspense>
    </AuthLayout>
  )
}
