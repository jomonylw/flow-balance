import { Suspense } from 'react'
import AuthLayout from '@/components/features/auth/AuthLayout'
import ResetPasswordForm from '@/components/features/auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <AuthLayout title='重置密码' subtitle='设置您的新密码'>
      <Suspense fallback={<div>加载中...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  )
}
