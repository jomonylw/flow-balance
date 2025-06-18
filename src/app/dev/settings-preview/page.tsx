import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import MobilePreview from '@/components/features/dev/MobilePreview'
import UserSettingsPage from '@/components/features/settings/UserSettingsPage'

export default async function SettingsPreviewPage() {
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
    <MobilePreview>
      <UserSettingsPage
        user={user}
        userSettings={userSettings}
        currencies={currencies}
      />
    </MobilePreview>
  )
}
