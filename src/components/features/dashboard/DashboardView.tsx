import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import DashboardContent from './DashboardContent'
import { serializeAccounts } from '@/lib/utils/serialization'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default async function DashboardView() {
  const user = await getCurrentUser()
  if (!user) return null

  // 获取必要的数据
  const [
    accountCount,
    transactionCount,
    categoryCount,
    accounts,
    earliestTransaction,
  ] = await Promise.all([
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
    prisma.transaction.findFirst({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
      select: { date: true },
    }),
  ])

  // 计算记账天数
  let accountingDays = 1 // 默认显示第1天
  if (earliestTransaction) {
    const earliestDate = new Date(earliestTransaction.date)
    const today = new Date()
    // 计算天数差，包含开始日期
    const timeDiff = today.getTime() - earliestDate.getTime()
    accountingDays = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1
  }

  // 使用序列化函数转换所有Decimal类型为普通数字
  const serializedAccounts = serializeAccounts(accounts)

  return (
    <DashboardContent
      user={user}
      stats={{
        accountCount,
        transactionCount,
        categoryCount,
        accountingDays,
      }}
      accounts={serializedAccounts}
    />
  )
}
