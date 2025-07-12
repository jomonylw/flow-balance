import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import AppLayoutClient from '@/components/features/layout/AppLayoutClient'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 强制执行身份验证
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  // 获取用户设置
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    include: { baseCurrency: true },
  })

  const userWithSettings = {
    ...user,
    settings: userSettings,
  }

  return <AppLayoutClient user={userWithSettings}>{children}</AppLayoutClient>
}
