import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import AccountDetailRouter from '@/components/features/accounts/AccountDetailRouter'
import { ConstantsManager } from '@/lib/utils/constants-manager'
import { convertPrismaAccountType } from '@/types/core/constants'

// 强制动态渲染
export const dynamic = 'force-dynamic'

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
      userId: user.id,
    },
    include: {
      category: true,
      currency: true,
      transactions: {
        include: {
          account: {
            select: {
              id: true,
              name: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },

          currency: true,
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      },
    },
  })

  if (!account) {
    notFound()
  }

  // 获取其他必要数据
  const [categories, currencies, tags, userSettings] = await Promise.all([
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    }),
    prisma.currency.findMany({
      orderBy: { code: 'asc' },
    }),
    prisma.tag.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    }),
    prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    }),
  ])

  // 序列化 Decimal 对象
  const serializedAccount = {
    ...account,
    description: account.description || undefined,
    color: account.color || undefined,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    category: {
      ...account.category,
      parentId: account.category.parentId || undefined,
      type: convertPrismaAccountType(account.category.type),
    },
    currency: {
      id: account.currency.id,
      code: account.currency.code,
      name: account.currency.name,
      symbol: account.currency.symbol,
      decimalPlaces: account.currency.decimalPlaces,
      isCustom: account.currency.isCustom,
      createdBy: account.currency.createdBy,
    },
    transactions: account.transactions.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount.toString()),
      date: transaction.date.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      notes: transaction.notes || undefined,
      tags: transaction.tags.map(tt => ({
        ...tt,
        tag: {
          id: tt.tag.id,
          name: tt.tag.name,
        },
      })),
      account: {
        id: transaction.account.id,
        name: transaction.account.name,
        category: {
          id: transaction.account.category.id,
          name: transaction.account.category.name,
          type: convertPrismaAccountType(transaction.account.category.type),
        },
      },
      // 分类信息现在通过账户获取
      category: {
        id: transaction.account.category.id,
        name: transaction.account.category.name,
        type: convertPrismaAccountType(transaction.account.category.type),
      },
      currency: {
        id: transaction.currency.id,
        code: transaction.currency.code,
        name: transaction.currency.name,
        symbol: transaction.currency.symbol,
        decimalPlaces: transaction.currency.decimalPlaces,
        isCustom: transaction.currency.isCustom,
        createdBy: transaction.currency.createdBy,
      },
    })),
  }

  return (
    <AccountDetailRouter
      account={serializedAccount}
      categories={categories.map(category => ({
        ...category,
        parentId: category.parentId || undefined, // 转换 null 为 undefined
        type: convertPrismaAccountType(category.type),
      }))}
      currencies={currencies.map(currency => ({
        ...currency,
        isActive: true, // 默认为 true，因为 Prisma Currency 模型没有 isActive 字段
      }))}
      tags={tags.map(tag => ({
        ...tag,
        color: tag.color || undefined,
      }))}
      user={{
        ...user,
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
              autoUpdateExchangeRates: userSettings.autoUpdateExchangeRates,
              lastExchangeRateUpdate: userSettings.lastExchangeRateUpdate,
            }
          : undefined,
      }}
    />
  )
}
