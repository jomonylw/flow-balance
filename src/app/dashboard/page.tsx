import AppLayout from '@/components/features/layout/AppLayout'
import DashboardView from '@/components/features/dashboard/DashboardView'

export default async function DashboardPage() {
  return (
    <AppLayout>
      <DashboardView />
    </AppLayout>
  )
}
