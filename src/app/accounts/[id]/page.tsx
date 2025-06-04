import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AppLayout from '@/components/layout/AppLayout'
import AccountDetailView from '@/components/accounts/AccountDetailView'

interface AccountPageProps {
  params: Promise<{ id: string }>
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) {
    notFound()
  }

  // 获取账户信息
  const account = await prisma.account.findFirst({
    where: {
      id: id,
      userId: user.id
    },
    include: {
      category: true,
      transactions: {
        include: {
          category: true,
          currency: true,
          tags: {
            include: {
              tag: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        }
      }
    }
  })

  if (!account) {
    notFound()
  }

  // 获取其他必要数据
  const [categories, currencies, tags, userSettings] = await Promise.all([
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

  // 序列化 Decimal 对象
  const serializedAccount = {
    ...account,
    description: account.description || undefined,
    transactions: account.transactions.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount.toString()),
      date: transaction.date.toISOString(),
      notes: transaction.notes || undefined,
      tags: transaction.tags.map(tt => ({
        tag: {
          ...tt.tag,
          color: tt.tag.color || undefined
        }
      }))
    }))
  }

  return (
    <AppLayout>
      <AccountDetailView
        account={serializedAccount}
        categories={categories}
        currencies={currencies}
        tags={tags.map(tag => ({
          ...tag,
          color: tag.color || undefined
        }))}
        user={{
          ...user,
          settings: userSettings ? {
            baseCurrency: userSettings.baseCurrency
          } : undefined
        }}
      />
    </AppLayout>
  )
}
