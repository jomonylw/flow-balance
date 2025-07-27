import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import CategoryDetailView from '@/components/features/categories/CategoryDetailView'
import {
  TransactionType,
  convertPrismaAccountType,
} from '@/types/core/constants'
import { ConstantsManager } from '@/lib/utils/constants-manager'
import type { SerializedCategoryWithTransactions } from '@/components/features/categories/types'
import type { SerializedTransactionWithBasic } from '@/types/database'
import { Decimal } from '@prisma/client/runtime/library'
import type { AccountType } from '@prisma/client'
import { getAllCategoryIds } from '@/lib/services/category-summary/utils'

// 强制动态渲染
export const dynamic = 'force-dynamic'

interface CategoryPageProps {
  params: Promise<{ id: string }>
}

// 定义页面特定的 Prisma 查询结果类型
type PrismaTransactionWithRelations = {
  id: string
  type: TransactionType
  amount: Decimal
  description: string
  notes: string | null
  date: Date
  createdAt: Date
  updatedAt: Date
  userId: string
  currencyCode: string
  accountId: string
  recurringTransactionId?: string | null
  loanContractId?: string | null
  loanPaymentId?: string | null
  currency: {
    id: string
    code: string
    name: string
    symbol: string
    decimalPlaces: number
    isCustom: boolean
    createdBy: string | null
  }
  tags: {
    id: string
    tagId: string
    transactionId: string
    tag: {
      id: string
      name: string
      color: string | null
    }
  }[]
  account: {
    id: string
    name: string
    category: {
      id: string
      name: string
      type: AccountType
    } | null
  } | null
}

// Helper function to serialize transactions
const serializeTransactions = (
  transactions: PrismaTransactionWithRelations[]
): SerializedTransactionWithBasic[] => {
  return transactions.map(transaction => ({
    ...transaction,
    amount: parseFloat(transaction.amount.toString()),
    date: transaction.date.toISOString(),
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    notes: transaction.notes || undefined,
    recurringTransactionId: transaction.recurringTransactionId || null,
    loanContractId: transaction.loanContractId || null,
    loanPaymentId: transaction.loanPaymentId || null,
    currencyId: transaction.currencyCode, // 修复: 添加 currencyId
    account: transaction.account
      ? {
          id: transaction.account.id,
          name: transaction.account.name,
          category: transaction.account.category
            ? {
                id: transaction.account.category.id,
                name: transaction.account.category.name,
                type: convertPrismaAccountType(
                  transaction.account.category.type
                ),
              }
            : {
                id: 'unknown',
                name: 'Unknown',
                type: convertPrismaAccountType('ASSET'),
              },
        }
      : {
          id: 'unknown',
          name: 'Unknown Account',
          category: {
            id: 'unknown',
            name: 'Unknown',
            type: convertPrismaAccountType('ASSET'),
          },
        },
    // 分类信息现在通过账户获取
    category: transaction.account?.category
      ? {
          id: transaction.account.category.id,
          name: transaction.account.category.name,
          type: convertPrismaAccountType(transaction.account.category.type),
        }
      : {
          id: 'unknown',
          name: 'Unknown Category',
          type: convertPrismaAccountType('ASSET'),
        },
    tags: transaction.tags
      ? transaction.tags.map((tt: any) => ({
          id: tt.id,
          tagId: tt.tagId,
          transactionId: tt.transactionId,
          tag: {
            id: tt.tag.id,
            name: tt.tag.name,
          },
        }))
      : [],
    currency: transaction.currency
      ? {
          id: transaction.currency.id,
          code: transaction.currency.code,
          name: transaction.currency.name,
          symbol: transaction.currency.symbol,
          decimalPlaces: transaction.currency.decimalPlaces,
          isCustom: transaction.currency.isCustom,
          createdBy: transaction.currency.createdBy,
        }
      : {
          id: 'default-usd',
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          decimalPlaces: 2,
          isCustom: false,
          createdBy: null,
        },
  }))
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) {
    notFound()
  }

  // 获取分类信息（包含子分类和账户）
  const categoryData = await prisma.category.findFirst({
    where: {
      id: id,
      userId: user.id,
    },
    include: {
      parent: true,
      children: {
        include: {
          accounts: {
            include: {
              category: true,
              transactions: {
                include: {
                  currency: true,
                  tags: {
                    include: {
                      tag: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      },
      accounts: {
        include: {
          category: true,
          transactions: {
            include: {
              currency: true,
              tags: {
                include: {
                  tag: true,
                },
              },
            },
            orderBy: {
              date: 'desc',
            },
          },
        },
      },
    },
  })

  if (!categoryData) {
    notFound()
  }

  // 使用优化的递归CTE查询获取所有子分类ID
  const allCategoryIds = await getAllCategoryIds(prisma, id)

  // 获取该分类及其所有子分类的交易
  const allTransactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      account: {
        categoryId: {
          in: allCategoryIds,
        },
      },
    },
    include: {
      account: {
        include: {
          category: true,
        },
      },
      currency: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
  })

  // 获取其他必要数据
  const [accounts, categories, currencies, tags, userSettings] =
    await Promise.all([
      prisma.account.findMany({
        where: { userId: user.id },
        include: { category: true },
        orderBy: { name: 'asc' },
      }),
      prisma.category.findMany({
        where: { userId: user.id },
        orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
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

  // 辅助函数：序列化日期
  const serializeCategory = (
    cat: Record<string, unknown>
  ): SerializedCategoryWithTransactions =>
    ({
      ...cat,
      type: cat.type
        ? convertPrismaAccountType(cat.type as string)
        : convertPrismaAccountType('ASSET'),
      createdAt: (cat.createdAt as Date).toISOString(),
      updatedAt: (cat.updatedAt as Date).toISOString(),
      parentId: (cat.parentId as string | null) || undefined,
      transactions:
        (cat.transactions as SerializedTransactionWithBasic[]) || [],
    }) as SerializedCategoryWithTransactions

  // 序列化 Decimal 对象
  const serializedCategory: SerializedCategoryWithTransactions = {
    ...categoryData,
    type: convertPrismaAccountType(categoryData.type),
    createdAt: categoryData.createdAt.toISOString(),
    updatedAt: categoryData.updatedAt.toISOString(),
    parentId: categoryData.parentId || undefined,
    parent: categoryData.parent
      ? serializeCategory(categoryData.parent)
      : undefined,
    children: categoryData.children.map(child =>
      serializeCategory({
        ...child,
        accounts: child.accounts.map(account => ({
          ...account,
          description: account.description || undefined,
          color: account.color || undefined,
          category: account.category
            ? serializeCategory(account.category)
            : serializeCategory({
                id: 'unknown',
                name: 'Unknown',
                type: 'ASSET',
                order: 0,
                userId: user.id,
                createdAt: new Date(),
                updatedAt: new Date(),
                parentId: undefined,
              }),
          currency: currencies.find(c => c.id === account.currencyId) || {
            id: 'default-usd',
            code: 'USD',
            name: 'US Dollar',
            symbol: '$',
            decimalPlaces: 2,
            isCustom: false,
            createdBy: null,
          },
          transactions: serializeTransactions(
            account.transactions as unknown as PrismaTransactionWithRelations[]
          ),
        })),
      })
    ),
    accounts: categoryData.accounts.map(account => ({
      ...account,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      description: account.description || undefined,
      color: account.color || undefined,
      category: account.category
        ? serializeCategory(account.category)
        : serializeCategory({
            id: 'unknown',
            name: 'Unknown',
            type: 'ASSET',
            order: 0,
            userId: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            parentId: undefined,
          }),
      currency: currencies.find(c => c.id === account.currencyId) || {
        id: 'default-usd',
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalPlaces: 2,
        isCustom: false,
        createdBy: null,
      },
      transactions: serializeTransactions(
        account.transactions as unknown as PrismaTransactionWithRelations[]
      ),
    })),
    transactions: serializeTransactions(
      allTransactions as unknown as PrismaTransactionWithRelations[]
    ),
  }

  return (
    <CategoryDetailView
      category={serializedCategory}
      accounts={accounts.map(account => ({
        ...account,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
        description: account.description || undefined,
        color: account.color || undefined,
        category: account.category
          ? serializeCategory(account.category)
          : serializeCategory({
              id: 'unknown',
              name: 'Unknown',
              type: 'ASSET',
              order: 0,
              userId: user.id,
              createdAt: new Date(),
              updatedAt: new Date(),
              parentId: undefined,
            }),
        currency: currencies.find(c => c.id === account.currencyId) || {
          id: 'default-usd',
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          decimalPlaces: 2,
          isCustom: false,
          createdBy: null,
        },
        transactions: [],
      }))}
      categories={categories.map(cat => serializeCategory(cat))}
      currencies={currencies.map(currency => ({
        ...currency,
        isActive: true, // 默认为 true
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
              baseCurrencyId: userSettings.baseCurrencyId,
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
