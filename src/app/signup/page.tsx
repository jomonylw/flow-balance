import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import AuthLayout from '@/components/auth/AuthLayout'
import SignupForm from '@/components/auth/SignupForm'

export default async function SignupPage() {
  // 如果用户已登录，重定向到 dashboard
  const user = await getCurrentUser()
  if (user) {
    redirect('/dashboard')
  }

  return (
    <AuthLayout 
      title="注册" 
      subtitle="创建您的 Flow Balance 账户"
    >
      <SignupForm />
    </AuthLayout>
  )
}
