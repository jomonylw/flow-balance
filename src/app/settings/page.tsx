import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import UserSettingsPage from '@/components/settings/UserSettingsPage'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  // 获取用户设置
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    include: { baseCurrency: true }
  })

  // 获取所有可用币种
  const currencies = await prisma.currency.findMany({
    orderBy: { code: 'asc' }
  })

  return (
    <AppLayout>
      <UserSettingsPage 
        user={user}
        userSettings={userSettings && userSettings.baseCurrency ? {
          ...userSettings,
          baseCurrency: userSettings.baseCurrency
        } : null}
        currencies={currencies}
      />
    </AppLayout>
  )
}
