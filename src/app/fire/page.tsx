import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AppLayout from '@/components/layout/AppLayout'
import FireJourneyContent from '@/components/fire/FireJourneyContent'

export default async function FirePage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  // 获取用户设置
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    include: { baseCurrency: true }
  })

  // 如果用户未完成初始设置，重定向到设置页面
  if (!userSettings?.baseCurrencyCode) {
    redirect('/setup')
  }

  // 如果用户未启用FIRE功能，重定向到设置页面
  if (!userSettings.fireEnabled) {
    redirect('/settings?tab=preferences&highlight=fire')
  }

  return (
    <AppLayout>
      <FireJourneyContent user={user} userSettings={userSettings} />
    </AppLayout>
  )
}
