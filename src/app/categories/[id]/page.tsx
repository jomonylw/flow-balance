import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AppLayout from '@/components/layout/AppLayout'
import CategoryDetailView from '@/components/categories/CategoryDetailView'

interface CategoryPageProps {
  params: Promise<{ id: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) {
    notFound()
  }

  // 获取分类信息（包含子分类和账户）
  const category = await prisma.category.findFirst({
    where: {
      id: id,
      userId: user.id
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
                  currency: true
                }
              }
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      },
      accounts: {
        include: {
          category: true,
          transactions: {
            include: {
              currency: true,
              category: true,
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
      }
    }
  })

  if (!category) {
    notFound()
  }

  // 递归获取所有子分类ID
  const getAllCategoryIds = async (categoryId: string): Promise<string[]> => {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { children: true }
    })

    if (!category) return [categoryId]

    let ids = [categoryId]
    for (const child of category.children) {
      const childIds = await getAllCategoryIds(child.id)
      ids = ids.concat(childIds)
    }
    return ids
  }

  const allCategoryIds = await getAllCategoryIds(id)

  // 获取该分类及其所有子分类的交易
  const allTransactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      categoryId: {
        in: allCategoryIds
      }
    },
    include: {
      account: {
        include: {
          category: true
        }
      },
      currency: true,
      category: true,
      tags: {
        include: {
          tag: true
        }
      }
    },
    orderBy: {
      date: 'desc'
    }
  })

  // 获取其他必要数据
  const [accounts, categories, currencies, tags, userSettings] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { name: 'asc' }
    }),
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: [
        { parentId: 'asc' },
        { order: 'asc' }
      ]
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
  const serializedCategory = {
    ...category,
    children: category.children.map(child => ({
      ...child,
      accounts: child.accounts.map(account => ({
        ...account,
        description: account.description || undefined,
        category: account.category ? {
          id: account.category.id,
          name: account.category.name,
          type: account.category.type
        } : null,
        transactions: account.transactions.map(transaction => ({
          ...transaction,
          amount: parseFloat(transaction.amount.toString()),
          date: transaction.date.toISOString(),
          notes: transaction.notes || undefined
        }))
      }))
    })),
    accounts: category.accounts.map(account => ({
      ...account,
      description: account.description || undefined,
      category: account.category ? {
        id: account.category.id,
        name: account.category.name,
        type: account.category.type
      } : null,
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
    })),
    transactions: allTransactions.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount.toString()),
      date: transaction.date.toISOString(),
      notes: transaction.notes || undefined,
      account: transaction.account ? {
        id: transaction.account.id,
        name: transaction.account.name,
        category: transaction.account.category ? {
          name: transaction.account.category.name
        } : null
      } : null,
      category: transaction.category ? {
        id: transaction.category.id,
        name: transaction.category.name
      } : null,
      tags: transaction.tags ? transaction.tags.map(tt => ({
        tag: {
          ...tt.tag,
          color: tt.tag.color || undefined
        }
      })) : []
    }))
  }

  return (
    <AppLayout>
      <CategoryDetailView
        category={serializedCategory}
        accounts={accounts}
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
