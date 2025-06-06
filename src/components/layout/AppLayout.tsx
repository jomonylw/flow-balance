import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AppLayoutClient from './AppLayoutClient'

interface AppLayoutProps {
  children: React.ReactNode
}

interface User {
  id: string
  email: string
  settings?: {
    baseCurrency?: {
      code: string
      name: string
      symbol: string
    }
  }
}

export default async function AppLayout({ children }: AppLayoutProps) {
  // 强制执行身份验证
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  // 获取用户设置
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    include: { baseCurrency: true }
  })

  const userWithSettings = {
    ...user,
    settings: userSettings ? {
      baseCurrency: userSettings.baseCurrency ? {
        code: userSettings.baseCurrency.code,
        name: userSettings.baseCurrency.name,
        symbol: userSettings.baseCurrency.symbol
      } : undefined
    } : undefined
  }

  return (
    <AppLayoutClient user={userWithSettings}>
      {children}
    </AppLayoutClient>
  )
}
