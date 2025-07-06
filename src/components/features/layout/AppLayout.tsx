import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import AppLayoutClient from './AppLayoutClient'

import type { AppLayoutProps } from '@/types/components'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: AppLayoutProps) {
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
