import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import AppLayoutClient from './AppLayoutClient'

import type { AppLayoutProps } from '@/types/components'

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
    settings: userSettings
      ? {
          baseCurrency: userSettings.baseCurrency
            ? {
                id: userSettings.baseCurrency.id,
                code: userSettings.baseCurrency.code,
                name: userSettings.baseCurrency.name,
                symbol: userSettings.baseCurrency.symbol,
                decimalPlaces: userSettings.baseCurrency.decimalPlaces,
              }
            : undefined,
        }
      : undefined,
  }

  return <AppLayoutClient user={userWithSettings}>{children}</AppLayoutClient>
}
