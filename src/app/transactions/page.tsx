import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AppLayout from '@/components/layout/AppLayout'
import TransactionListView from '@/components/transactions/TransactionListView'

export default async function TransactionsPage() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  // 获取用户设置用于基础货币信息
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    include: { baseCurrency: true }
  })

  return (
    <AppLayout>
      <TransactionListView
        user={{
          ...user,
          settings: userSettings ? {
            baseCurrency: userSettings.baseCurrency || undefined
          } : undefined
        }}
      />
    </AppLayout>
  )
}
