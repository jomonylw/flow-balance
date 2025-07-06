import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import AppLayout from '@/components/features/layout/AppLayout'
import FireJourneyContent from '@/components/features/fire/FireJourneyContent'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function FirePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // 获取用户设置
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    include: { baseCurrency: true },
  })

  // 如果用户未完成初始设置，重定向到设置页面
  if (!userSettings?.baseCurrencyId) {
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
