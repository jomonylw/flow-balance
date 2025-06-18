import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/services/auth.service'
import { Suspense } from 'react'
import AuthLayout from '@/components/features/auth/AuthLayout'
import LoginForm from '@/components/features/auth/LoginForm'

export default async function LoginPage() {
  // 如果用户已登录，重定向到 dashboard
  const user = await getCurrentUser()
  if (user) {
    redirect('/dashboard')
  }

  return (
    <AuthLayout title='登录' subtitle='登录您的 Flow Balance 账户'>
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  )
}
