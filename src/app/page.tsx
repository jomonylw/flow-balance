import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'

export default async function Home() {
  // 检查用户是否已登录
  const user = await getCurrentUser()

  if (user) {
    // 检查用户是否已完成初始设置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    })

    if (!userSettings?.baseCurrencyCode) {
      // 如果未设置本位币，重定向到初始设置页面
      redirect('/setup')
    } else {
      // 如果已完成设置，重定向到 dashboard
      redirect('/dashboard')
    }
  } else {
    // 如果未登录，重定向到登录页
    redirect('/login')
  }
}
