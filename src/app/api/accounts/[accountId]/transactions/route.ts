import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response'
import { TransactionType } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证账户是否属于当前用户
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id
      }
    })

    if (!account) {
      return notFoundResponse('账户不存在')
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as TransactionType | null
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // 构建查询条件
    const where: Record<string, unknown> = {
      userId: user.id,
      accountId: accountId
    }

    if (type) {
      where.type = type
    }

    if (dateFrom || dateTo) {
      where.date = {} as Record<string, Date>
      if (dateFrom) {
        (where.date as Record<string, Date>).gte = new Date(dateFrom)
      }
      if (dateTo) {
        (where.date as Record<string, Date>).lte = new Date(dateTo)
      }
    }

    if (search) {
      where.OR = [
        {
          description: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          notes: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ]
    }

    // 获取交易列表
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: true,
          category: true,
          currency: true,
          tags: {
            include: {
              tag: true
            }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.transaction.count({ where })
    ])

    // 计算分页信息
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    // 格式化交易数据
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      notes: transaction.notes,
      date: transaction.date,
      account: {
        id: transaction.account.id,
        name: transaction.account.name
      },
      category: {
        id: transaction.category.id,
        name: transaction.category.name
      },
      tags: transaction.tags.map(tt => ({
        id: tt.tag.id,
        name: tt.tag.name
      })),
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    }))

    return successResponse({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      account: {
        id: account.id,
        name: account.name
      }
    })
  } catch (error) {
    console.error('Get account transactions error:', error)
    return errorResponse('获取账户交易记录失败', 500)
  }
}
