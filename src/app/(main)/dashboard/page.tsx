import DashboardView from '@/components/features/dashboard/DashboardView'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  return <DashboardView />
}
