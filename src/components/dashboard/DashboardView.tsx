import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DashboardContent from './DashboardContent'
import { serializeAccounts } from '@/lib/serialization'

export default async function DashboardView() {
  const user = await getCurrentUser()
  if (!user) return null

  // 获取必要的数据
  const [accountCount, transactionCount, categoryCount, accounts, categories, currencies, tags, userSettings] = await Promise.all([
    prisma.account.count({ where: { userId: user.id } }),
    prisma.transaction.count({ where: { userId: user.id } }),
    prisma.category.count({ where: { userId: user.id } }),
    prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          include: {
            currency: true
          }
        }
      },
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
    }),
    prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true }
    })
  ])

  // 获取基础货币
  const baseCurrency = userSettings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }

  // 使用序列化函数转换所有Decimal类型为普通数字
  const serializedAccounts = serializeAccounts(accounts)

  return (
    <DashboardContent
      user={user}
      stats={{
        accountCount,
        transactionCount,
        categoryCount
      }}
      accounts={serializedAccounts}
      categories={categories}
      currencies={currencies}
      tags={tags.map(tag => ({
        ...tag,
        color: tag.color || undefined
      }))}
      baseCurrency={baseCurrency}
    />
  )
}
