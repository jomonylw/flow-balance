import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DashboardContent from './DashboardContent'

export default async function DashboardView() {
  const user = await getCurrentUser()
  if (!user) return null

  // 获取必要的数据
  const [accountCount, transactionCount, categoryCount, accounts, categories, currencies, tags] = await Promise.all([
    prisma.account.count({ where: { userId: user.id } }),
    prisma.transaction.count({ where: { userId: user.id } }),
    prisma.category.count({ where: { userId: user.id } }),
    prisma.account.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { name: 'asc' }
    }),
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' }
    }),
    prisma.currency.findMany({
      orderBy: { code: 'asc' }
    }),
    prisma.tag.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' }
    })
  ])

  return (
    <DashboardContent
      user={user}
      stats={{
        accountCount,
        transactionCount,
        categoryCount
      }}
      accounts={accounts}
      categories={categories}
      currencies={currencies}
      tags={tags.map(tag => ({
        ...tag,
        color: tag.color || undefined
      }))}
    />
  )
}
