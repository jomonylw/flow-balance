import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import AppLayout from '@/components/features/layout/AppLayout'
import TransactionListView from '@/components/features/transactions/TransactionListView'

export default async function TransactionsPage() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  // 获取用户设置用于基础货币信息
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    include: { baseCurrency: true },
  })

  return (
    <AppLayout>
      <TransactionListView
        user={{
          ...user,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          settings: userSettings
            ? {
                id: userSettings.id,
                userId: userSettings.userId,
                baseCurrencyId: userSettings.baseCurrencyId || '',
                language: userSettings.language as 'zh' | 'en',
                theme: userSettings.theme as 'light' | 'dark' | 'system',
                baseCurrency: userSettings.baseCurrency || undefined,
                createdAt: userSettings.createdAt,
                updatedAt: userSettings.updatedAt,
                fireSWR: userSettings.fireSWR,
                futureDataDays: userSettings.futureDataDays,
              }
            : undefined,
        }}
      />
    </AppLayout>
  )
}
