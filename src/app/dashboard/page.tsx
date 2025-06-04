import AppLayout from '@/components/layout/AppLayout'
import DashboardView from '@/components/dashboard/DashboardView'

export default async function DashboardPage() {
  return (
    <AppLayout>
      <DashboardView />
    </AppLayout>
  )
}
