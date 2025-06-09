import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AppLayout from '@/components/layout/AppLayout'
import TransactionListView from '@/components/transactions/TransactionListView'

export default async function TransactionsPage() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  // 获取必要的数据
  const [accounts, categories, currencies, tags, userSettings] = await Promise.all([
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
    }),
    prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true }
    })
  ])

  return (
    <AppLayout>
      <TransactionListView
        accounts={accounts.map(account => ({
          ...account,
          description: account.description || undefined
        }))}
        categories={categories}
        currencies={currencies}
        tags={tags.map(tag => ({
          ...tag,
          color: tag.color || undefined
        }))}
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
