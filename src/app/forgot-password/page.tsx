import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import AuthLayout from '@/components/auth/AuthLayout'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export default async function ForgotPasswordPage() {
  // 如果用户已登录，重定向到 dashboard
  const user = await getCurrentUser()
  if (user) {
    redirect('/dashboard')
  }

  return (
    <AuthLayout 
      title="忘记密码" 
      subtitle="输入您的邮箱地址，我们将发送重置链接"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
