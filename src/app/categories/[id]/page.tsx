import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AppLayout from '@/components/layout/AppLayout'
import CategoryDetailView from '@/components/categories/CategoryDetailView'
import { Transaction, Category } from '@/components/categories/types'
import { Decimal } from '@prisma/client/runtime/library'

interface CategoryPageProps {
  params: Promise<{ id: string }>
}

type PrismaTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | "BALANCE";
  amount: Decimal;
  description: string;
  notes: string | null;
  date: Date;
  currency: {
      code: string;
      name: string;
      symbol: string;
  };
  category: {
      id: string;
      name: string;
  };
  tags: {
      tag: {
          id: string;
          name: string;
          color: string | null;
      };
  }[];
  account: {
      id: string;
      name: string;
      category: {
          name: string;
      } | null;
  } | null;
}


// Helper function to serialize transactions
const serializeTransactions = (transactions: PrismaTransaction[]): Transaction[] => {
  return transactions.map(transaction => ({
    ...transaction,
    amount: parseFloat(transaction.amount.toString()),
    date: transaction.date.toISOString(),
    notes: transaction.notes || undefined,
    account: transaction.account ? {
      id: transaction.account.id,
      name: transaction.account.name,
      category: transaction.account.category ? {
        name: transaction.account.category.name
      } : { name: 'Unknown' }
    } : {
      id: 'unknown',
      name: 'Unknown Account',
      category: { name: 'Unknown' }
    },
    category: transaction.category ? {
      id: transaction.category.id,
      name: transaction.category.name
    } : {
      id: 'unknown',
      name: 'Unknown Category'
    },
    tags: transaction.tags ? transaction.tags.map((tt) => ({
      tag: {
        id: tt.tag.id,
        name: tt.tag.name
      }
    })) : []
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
                  currency: true,
                  category: true,
                  tags: {
                    include: {
                      tag: true
                    }
                  }
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

  if (!categoryData) {
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
  const serializedCategory: Category = {
    ...categoryData,
    parent: categoryData.parent ? {
      ...categoryData.parent,
      transactions: []
    } : undefined,
    children: categoryData.children.map(child => ({
      ...child,
      transactions: [], // Add empty transactions array for children
      accounts: child.accounts.map(account => ({
        ...account,
        description: account.description || undefined,
        category: account.category ? {
          id: account.category.id,
          name: account.category.name,
          type: account.category.type
        } : {
          id: 'unknown',
          name: 'Unknown',
          type: 'ASSET'
        },
        transactions: serializeTransactions(account.transactions as unknown as PrismaTransaction[])
      }))
    })),
    accounts: categoryData.accounts.map(account => ({
      ...account,
      description: account.description || undefined,
      category: account.category ? {
        id: account.category.id,
        name: account.category.name,
        type: account.category.type
      } : {
        id: 'unknown',
        name: 'Unknown',
        type: 'ASSET'
      },
      transactions: serializeTransactions(account.transactions as unknown as PrismaTransaction[])
    })),
    transactions: serializeTransactions(allTransactions as unknown as PrismaTransaction[])
  }

  return (
    <AppLayout>
      <CategoryDetailView
        category={serializedCategory}
        accounts={accounts.map(account => ({
          ...account,
          description: account.description || undefined,
          category: {
            id: account.category?.id || 'unknown',
            name: account.category?.name || 'Unknown',
            type: account.category?.type
          },
          transactions: []
        }))}
        categories={categories.map(cat => ({
          ...cat,
          transactions: []
        }))}
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
