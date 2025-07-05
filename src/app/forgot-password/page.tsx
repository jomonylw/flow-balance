import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/services/auth.service'
import AuthLayout from '@/components/features/auth/AuthLayout'
import ForgotPasswordWithKey from '@/components/features/auth/ForgotPasswordWithKey'

export default async function ForgotPasswordPage() {
  // 如果用户已登录，重定向到 dashboard
  const user = await getCurrentUser()
  if (user) {
    redirect('/dashboard')
  }

  return (
    <AuthLayout title='重置密码' subtitle='使用恢复密钥重置您的密码'>
      <ForgotPasswordWithKey />
    </AuthLayout>
  )
}
