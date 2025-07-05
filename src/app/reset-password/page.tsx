import { Suspense } from 'react'
import AuthLayout from '@/components/features/auth/AuthLayout'
import ResetPasswordWithKey from '@/components/features/auth/ResetPasswordWithKey'

export default function ResetPasswordPage() {
  return (
    <AuthLayout title='重置密码' subtitle='设置您的新密码'>
      <Suspense fallback={<div>加载中...</div>}>
        <ResetPasswordWithKey />
      </Suspense>
    </AuthLayout>
  )
}
