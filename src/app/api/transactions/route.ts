import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { TransactionType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const categoryId = searchParams.get('categoryId')
    const type = searchParams.get('type') as TransactionType | null
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // 构建查询条件
    const where: Record<string, unknown> = {
      userId: user.id
    }

    if (accountId) where.accountId = accountId
    if (categoryId) where.categoryId = categoryId
    if (type) where.type = type

    // 日期范围过滤
    if (dateFrom || dateTo) {
      where.date = {} as Record<string, Date>
      if (dateFrom) (where.date as Record<string, Date>).gte = new Date(dateFrom)
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999) // 包含整天
        ;(where.date as Record<string, Date>).lte = endDate
      }
    }

    // 搜索过滤
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [transactions, total] = await Promise.all([
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

    return successResponse({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get transactions error:', error)
    return errorResponse('获取交易记录失败', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const {
      accountId,
      categoryId,
      currencyCode,
      type,
      amount,
      description,
      notes,
      date,
      tagIds = []
    } = body

    // 验证必填字段
    if (!accountId || !categoryId || !currencyCode || !type || !amount || !description || !date) {
      return errorResponse('请填写所有必填字段', 400)
    }

    // 验证金额
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return errorResponse('金额必须是大于0的数字', 400)
    }

    // 验证账户和分类是否属于当前用户
    const [account, category] = await Promise.all([
      prisma.account.findFirst({
        where: { id: accountId, userId: user.id }
      }),
      prisma.category.findFirst({
        where: { id: categoryId, userId: user.id }
      })
    ])

    if (!account) {
      return errorResponse('账户不存在', 400)
    }

    if (!category) {
      return errorResponse('分类不存在', 400)
    }

    // 验证币种
    const currency = await prisma.currency.findUnique({
      where: { code: currencyCode }
    })

    if (!currency) {
      return errorResponse('币种不存在', 400)
    }

    // 创建交易
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId,
        categoryId,
        currencyCode,
        type: type as TransactionType,
        amount: parseFloat(amount),
        description,
        notes: notes || null,
        date: new Date(date),
        tags: {
          create: tagIds.map((tagId: string) => ({
            tagId
          }))
        }
      },
      include: {
        account: true,
        category: true,
        currency: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    return successResponse(transaction, '交易创建成功')
  } catch (error) {
    console.error('Create transaction error:', error)
    return errorResponse('创建交易失败', 500)
  }
}
