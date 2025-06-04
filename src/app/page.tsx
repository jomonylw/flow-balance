import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function Home() {
  // 检查用户是否已登录
  const user = await getCurrentUser()

  if (user) {
    // 如果已登录，重定向到 dashboard
    redirect('/dashboard')
  } else {
    // 如果未登录，重定向到登录页
    redirect('/login')
  }
}
