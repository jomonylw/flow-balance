import { NextRequest } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import { getCurrentUser } from '@/lib/services/auth.service'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证分类是否存在且属于当前用户
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
      },
    })

    if (!category) {
      return notFoundResponse('分类不存在')
    }

    // 只有顶级分类才能检查类型变更
    if (category.parentId) {
      return errorResponse('只有顶级分类才能变更类型', 400)
    }

    // 获取该分类及其所有子分类的ID
    const allCategoryIds = await getAllCategoryIds(categoryId)

    // 检查是否有账户
    const accountCount = await prisma.account.count({
      where: {
        categoryId: {
          in: allCategoryIds,
        },
      },
    })

    // 检查是否有交易记录
    const transactionCount = await prisma.transaction.count({
      where: {
        accountId: {
          in: await prisma.account
            .findMany({
              where: {
                categoryId: {
                  in: allCategoryIds,
                },
              },
              select: {
                id: true,
              },
            })
            .then(accounts => accounts.map(a => a.id)),
        },
      },
    })

    // 获取具体的账户信息（用于显示详细信息）
    const accounts = await prisma.account.findMany({
      where: {
        categoryId: {
          in: allCategoryIds,
        },
      },
      select: {
        id: true,
        name: true,
        currency: {
          select: {
            code: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
    })

    // 检查不同类型的交易数量
    const transactionStats = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        accountId: {
          in: accounts.map(a => a.id),
        },
      },
      _count: {
        id: true,
      },
    })

    const result = {
      canChangeType: accountCount === 0 && transactionCount === 0,
      hasAccounts: accountCount > 0,
      hasTransactions: transactionCount > 0,
      accountCount,
      transactionCount,
      accounts,
      transactionStats: transactionStats.reduce(
        (acc, stat) => {
          acc[stat.type] = stat._count.id
          return acc
        },
        {} as Record<string, number>
      ),
      riskLevel: getRiskLevel(accountCount, transactionCount, transactionStats),
    }

    return successResponse(result)
  } catch (error) {
    console.error('Check type change error:', error)
    return errorResponse('检查类型变更失败', 500)
  }
}

// 递归获取所有子分类ID
async function getAllCategoryIds(categoryId: string): Promise<string[]> {
  const result = [categoryId]

  const children = await prisma.category.findMany({
    where: {
      parentId: categoryId,
    },
    select: {
      id: true,
    },
  })

  for (const child of children) {
    const childIds = await getAllCategoryIds(child.id)
    result.push(...childIds)
  }

  return result
}

// 评估风险等级
function getRiskLevel(
  accountCount: number,
  transactionCount: number,
  transactionStats: Array<{ type: string; _count: { id: number } }>
): 'safe' | 'warning' | 'danger' {
  if (accountCount === 0 && transactionCount === 0) {
    return 'safe'
  }

  // 检查是否有余额调整记录
  const hasBalanceRecords = transactionStats.some(
    stat => stat.type === 'BALANCE' && stat._count.id > 0
  )

  if (hasBalanceRecords) {
    return 'danger' // 有余额调整记录，变更类型会导致严重数据不一致
  }

  if (transactionCount > 10 || accountCount > 3) {
    return 'danger' // 大量数据，风险很高
  }

  return 'warning' // 有数据但风险相对较低
}
