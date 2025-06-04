import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import TopUserStatusBar from './TopUserStatusBar'
import NavigationSidebar from './NavigationSidebar'

interface AppLayoutProps {
  children: React.ReactNode
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
      baseCurrency: userSettings.baseCurrency
    } : undefined
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部用户状态栏 */}
      <TopUserStatusBar user={userWithSettings} />

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧导航栏 */}
        <NavigationSidebar user={user} />

        {/* 右侧主内容 */}
        <main className="flex-1 overflow-y-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  )
}
