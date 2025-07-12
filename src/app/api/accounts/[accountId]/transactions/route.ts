import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import { getCommonError } from '@/lib/constants/api-messages'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response'
// import { getUserTranslator } from '@/lib/utils/server-i18n'
import { PAGINATION } from '@/lib/constants/app-config'
import { Prisma, TransactionType } from '@prisma/client'
import { normalizeDateRange } from '@/lib/utils/date-range'

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
        userId: user.id,
      },
    })

    if (!account) {
      return notFoundResponse('账户不存在')
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as TransactionType | null
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const recurringTransactionId = searchParams.get('recurringTransactionId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(
      searchParams.get('limit') || PAGINATION.DEFAULT_PAGE_SIZE.toString()
    )
    const skip = (page - 1) * limit

    // 构建基础查询条件
    const baseConditions: Prisma.TransactionWhereInput[] = [
      { userId: user.id },
      { accountId: accountId },
    ]

    if (type) {
      baseConditions.push({ type })
    }

    if (dateFrom || dateTo) {
      const { dateCondition } = normalizeDateRange(dateFrom, dateTo)
      baseConditions.push({ date: dateCondition })
    }

    if (recurringTransactionId) {
      baseConditions.push({ recurringTransactionId })
    }

    // 构建最终查询条件
    let where: Prisma.TransactionWhereInput

    if (search) {
      // 当有搜索条件时，需要将搜索条件与其他条件正确组合
      const allConditions: Prisma.TransactionWhereInput[] = [
        ...baseConditions,
        {
          OR: [
            {
              description: {
                contains: search,
              },
            },
            {
              notes: {
                contains: search,
              },
            },
          ],
        },
      ]

      where =
        allConditions.length === 1 ? allConditions[0] : { AND: allConditions }
    } else {
      // 没有搜索条件时，直接使用条件
      where =
        baseConditions.length === 1
          ? baseConditions[0]
          : { AND: baseConditions }
    }

    // 获取交易列表
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
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
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
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
      // 关联字段
      recurringTransactionId: transaction.recurringTransactionId,
      loanContractId: transaction.loanContractId,
      loanPaymentId: transaction.loanPaymentId,
      account: {
        id: transaction.account.id,
        name: transaction.account.name,
        category: {
          id: transaction.account.category.id,
          name: transaction.account.category.name,
          type: transaction.account.category.type,
        },
      },
      // 分类信息现在通过账户获取
      category: {
        id: transaction.account.category.id,
        name: transaction.account.category.name,
        type: transaction.account.category.type,
      },
      tags: transaction.tags.map(tt => ({
        tag: {
          id: tt.tag.id,
          name: tt.tag.name,
        },
      })),
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    }))

    return successResponse({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      account: {
        id: account.id,
        name: account.name,
      },
    })
  } catch (error) {
    console.error('Get account transactions error:', error)
    return errorResponse(getCommonError('INTERNAL_ERROR'), 500)
  }
}
