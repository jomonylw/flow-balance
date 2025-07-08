import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import TransactionListView from '@/components/features/transactions/TransactionListView'
import { ConstantsManager } from '@/lib/utils/constants-manager'

// 强制动态渲染
export const dynamic = 'force-dynamic'

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
              language: ConstantsManager.convertPrismaLanguage(
                userSettings.language
              ),
              theme: ConstantsManager.convertPrismaTheme(userSettings.theme),
              baseCurrency: userSettings.baseCurrency || undefined,
              createdAt: userSettings.createdAt,
              updatedAt: userSettings.updatedAt,
              fireSWR: userSettings.fireSWR,
              futureDataDays: userSettings.futureDataDays,
              autoUpdateExchangeRates:
                (userSettings as any).autoUpdateExchangeRates || false,
              lastExchangeRateUpdate:
                (userSettings as any).lastExchangeRateUpdate || null,
            }
          : undefined,
      }}
    />
  )
}
