import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { TransactionType } from '@prisma/client'

// 辅助函数：递归获取所有后代分类的ID
async function getDescendantCategoryIds(categoryId: string): Promise<string[]> {
const children = await prisma.category.findMany({
  where: { parentId: categoryId },
  select: { id: true }
})

const descendantIds: string[] = []
for (const child of children) {
  descendantIds.push(child.id)
  const grandChildrenIds = await getDescendantCategoryIds(child.id)
  descendantIds.push(...grandChildrenIds)
}
return descendantIds
}

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
  const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean) || []
  const excludeBalanceAdjustment = searchParams.get('excludeBalanceAdjustment') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  // 构建查询条件
  const where: Record<string, unknown> = {
    userId: user.id
  }

  // 根据参数决定是否排除余额调整类型的交易
  if (excludeBalanceAdjustment) {
    where.type = {
      not: 'BALANCE'
    }
  }

  if (accountId) where.accountId = accountId
  if (categoryId) {
    const descendantIds = await getDescendantCategoryIds(categoryId)
    const allCategoryIds = [categoryId, ...descendantIds]
    where.categoryId = { in: allCategoryIds }
  }
  if (type) {
    if (excludeBalanceAdjustment) {
      // 如果排除余额调整记录，需要同时排除BALANCE
      where.type = {
        equals: type,
        not: 'BALANCE'
      }
    } else {
      // 如果不排除余额调整记录，直接按类型过滤
      where.type = type
    }
  }

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

    // 标签筛选
    if (tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: {
            in: tagIds
          }
        }
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: {
            include: {
              category: true
            }
          },
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

    // 格式化交易数据，移除标签颜色信息
    const formattedTransactions = transactions.map(transaction => ({
      ...transaction,
      tags: transaction.tags.map(tt => ({
        tag: {
          id: tt.tag.id,
          name: tt.tag.name
        }
      }))
    }))

    return successResponse({
      transactions: formattedTransactions,
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
    console.log('Received transaction data:', body)

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

    console.log('Parsed transaction fields:', {
      accountId,
      categoryId,
      currencyCode,
      type,
      amount,
      description,
      notes,
      date,
      tagIds
    })

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
        where: { id: accountId, userId: user.id },
        include: {
          category: true,
          currency: true
        }
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

    // 验证账户类型与交易类型的匹配性
    const accountType = account.category.type
    console.log('Backend validation - Account:', account.name, 'Account type:', accountType, 'Transaction type:', type)

    if (accountType) {
      // 存量类账户（资产/负债）严格禁止创建普通交易
      if (accountType === 'ASSET' || accountType === 'LIABILITY') {
        console.error('Validation failed: Stock account cannot have regular transactions')
        return errorResponse(
          `存量类账户"${account.name}"不能直接添加交易记录。请使用"更新余额"功能来管理${accountType === 'ASSET' ? '资产' : '负债'}账户的余额变化。`,
          400
        )
      }

      // 流量类账户（收入/支出）的严格验证
      if (accountType === 'INCOME' && type !== 'INCOME') {
        console.error('Validation failed: Income account with non-income transaction', {
          accountName: account.name,
          accountType,
          transactionType: type,
          expectedType: 'INCOME'
        })
        return errorResponse('收入类账户只能记录收入交易，请选择正确的交易类型', 400)
      }

      if (accountType === 'EXPENSE' && type !== 'EXPENSE') {
        console.error('Validation failed: Expense account with non-expense transaction', {
          accountName: account.name,
          accountType,
          transactionType: type,
          expectedType: 'EXPENSE'
        })
        return errorResponse('支出类账户只能记录支出交易，请选择正确的交易类型', 400)
      }

      // 禁止在普通交易中使用BALANCE类型
      if (type === 'BALANCE') {
        console.error('Validation failed: BALANCE type in regular transaction')
        return errorResponse('BALANCE类型只能通过余额更新功能使用', 400)
      }
    }

    console.log('Backend validation passed successfully')

    // 验证账户货币限制
    if (account.currencyCode && account.currencyCode !== currencyCode) {
      return errorResponse(`此账户只能使用 ${account.currency?.name} (${account.currencyCode})，无法使用 ${currencyCode}`, 400)
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
        account: {
          include: {
            category: true
          }
        },
        category: true,
        currency: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    // 格式化交易数据，移除标签颜色信息
    const formattedTransaction = {
      ...transaction,
      tags: transaction.tags.map(tt => ({
        tag: {
          id: tt.tag.id,
          name: tt.tag.name
        }
      }))
    }

    return successResponse(formattedTransaction, '交易创建成功')
  } catch (error) {
    console.error('Create transaction error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    })
    return errorResponse('创建交易失败', 500)
  }
}
