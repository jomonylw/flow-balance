import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import { z } from 'zod'
import { TransactionType } from '@/types/core/constants'

// 创建模板验证schema
const createTemplateSchema = z.object({
  name: z
    .string()
    .min(1, '模板名称不能为空')
    .max(100, '模板名称不能超过100个字符'),
  accountId: z.string().min(1, '账户ID不能为空'),
  currencyCode: z.string().min(1, '货币代码不能为空'),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE], {
    errorMap: () => ({ message: '交易类型必须是收入或支出' }),
  }),
  description: z.string().min(1, '描述不能为空'),
  notes: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
})

// 更新模板验证schema（在单独的路由文件中使用）
// const updateTemplateSchema = createTemplateSchema.partial().extend({
//   name: z.string().min(1, '模板名称不能为空').max(100, '模板名称不能超过100个字符').optional(),
// })

/**
 * 获取用户的交易模板列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as
      | TransactionType.INCOME
      | TransactionType.EXPENSE
      | null
    const accountId = searchParams.get('accountId')

    // 构建查询条件
    const where: {
      userId: string
      type?: TransactionType.INCOME | TransactionType.EXPENSE
      accountId?: string
    } = {
      userId: user.id,
    }

    if (type) {
      where.type = type
    }

    if (accountId) {
      where.accountId = accountId
    }

    const templates = await prisma.transactionTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
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
        currency: {
          select: {
            code: true,
            name: true,
            symbol: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, templates })
  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 创建新的交易模板
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createTemplateSchema.parse(body)

    // 检查模板名称是否已存在
    const existingTemplate = await prisma.transactionTemplate.findUnique({
      where: {
        userId_name: {
          userId: user.id,
          name: validatedData.name,
        },
      },
    })

    if (existingTemplate) {
      return NextResponse.json(
        { success: false, error: '模板名称已存在，请使用其他名称' },
        { status: 400 }
      )
    }

    // 验证账户是否属于当前用户
    const account = await prisma.account.findFirst({
      where: {
        id: validatedData.accountId,
        userId: user.id,
      },
      include: {
        category: true,
      },
    })

    if (!account) {
      return NextResponse.json(
        { success: false, error: '账户不存在或无权限访问' },
        { status: 400 }
      )
    }

    // 验证交易类型与账户类型是否匹配
    const accountType = account.category.type
    if (
      (validatedData.type === TransactionType.INCOME &&
        accountType !== 'INCOME') ||
      (validatedData.type === TransactionType.EXPENSE &&
        accountType !== 'EXPENSE')
    ) {
      return NextResponse.json(
        { success: false, error: '交易类型与账户类型不匹配' },
        { status: 400 }
      )
    }

    // 获取货币ID
    const currency = await prisma.currency.findFirst({
      where: {
        code: validatedData.currencyCode,
        OR: [{ createdBy: user.id }, { createdBy: null }],
      },
    })

    if (!currency) {
      return NextResponse.json(
        { success: false, error: '货币不存在' },
        { status: 400 }
      )
    }

    // 创建模板
    const template = await prisma.transactionTemplate.create({
      data: {
        name: validatedData.name,
        accountId: validatedData.accountId,
        currencyId: currency.id,
        type: validatedData.type,
        description: validatedData.description,
        notes: validatedData.notes,
        userId: user.id,
        tagIds: validatedData.tagIds || [],
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
        currency: {
          select: {
            code: true,
            name: true,
            symbol: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: '数据验证失败',
          details: error.errors.map(e => e.message),
        },
        { status: 400 }
      )
    }

    console.error('Create template error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
