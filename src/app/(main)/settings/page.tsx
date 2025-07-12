import { getCurrentUser } from '@/lib/services/auth.service'
import { redirect } from 'next/navigation'
import UserSettingsPage from '@/components/features/settings/UserSettingsPage'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // 将数据查询移到客户端，避免在数据导入期间的连接冲突
  return <UserSettingsPage user={user} />
}
