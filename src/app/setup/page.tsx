import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import InitialSetup from '@/components/setup/InitialSetup'

export default async function SetupPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  // 检查用户是否已完成初始设置
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    include: { baseCurrency: true }
  })

  // 如果已设置本位币，说明已完成初始设置，重定向到仪表板
  if (userSettings?.baseCurrencyCode) {
    redirect('/dashboard')
  }

  return <InitialSetup user={user} />
}
