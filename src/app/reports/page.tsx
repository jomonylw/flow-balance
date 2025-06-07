import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ReportsPageClient from '@/components/reports/ReportsPageClient'

export default async function ReportsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }

  return <ReportsPageClient />
}
