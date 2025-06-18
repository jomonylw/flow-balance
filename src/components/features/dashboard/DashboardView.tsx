import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import DashboardContent from './DashboardContent'
import { serializeAccounts } from '@/lib/utils/serialization'

export default async function DashboardView() {
  const user = await getCurrentUser()
  if (!user) return null

  // 获取必要的数据
  const [accountCount, transactionCount, categoryCount, accounts] =
    await Promise.all([
      prisma.account.count({ where: { userId: user.id } }),
      prisma.transaction.count({ where: { userId: user.id } }),
      prisma.category.count({ where: { userId: user.id } }),
      prisma.account.findMany({
        where: { userId: user.id },
        include: {
          category: true,
          currency: true,
          transactions: {
            include: {
              currency: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ])

  // 使用序列化函数转换所有Decimal类型为普通数字
  const serializedAccounts = serializeAccounts(accounts)

  return (
    <DashboardContent
      user={user}
      stats={{
        accountCount,
        transactionCount,
        categoryCount,
      }}
      accounts={serializedAccounts}
    />
  )
}
