import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import { redirect } from 'next/navigation'
import UserSettingsPage from '@/components/features/settings/UserSettingsPage'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // 获取用户设置
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    include: { baseCurrency: true },
  })

  // 获取所有可用币种
  const currencies = await prisma.currency.findMany({
    orderBy: { code: 'asc' },
  })

  return (
    <UserSettingsPage
      user={user}
      userSettings={userSettings}
      currencies={currencies}
    />
  )
}
