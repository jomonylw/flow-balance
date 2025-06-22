import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import { z } from 'zod'
import { TransactionType } from '@/types/core/constants'

// 更新模板验证schema
const updateTemplateSchema = z.object({
  name: z
    .string()
    .min(1, '模板名称不能为空')
    .max(100, '模板名称不能超过100个字符')
    .optional(),
  accountId: z.string().min(1, '账户ID不能为空').optional(),
  categoryId: z.string().min(1, '分类ID不能为空').optional(),
  currencyCode: z.string().min(1, '货币代码不能为空').optional(),
  type: z
    .enum([TransactionType.INCOME, TransactionType.EXPENSE], {
      errorMap: () => ({ message: '交易类型必须是收入或支出' }),
    })
    .optional(),
  description: z.string().min(1, '描述不能为空').optional(),
  notes: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
})

/**
 * 获取单个交易模板
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const template = await prisma.transactionTemplate.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
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

    if (!template) {
      return NextResponse.json(
        { success: false, error: '模板不存在或无权限访问' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('Get template error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 更新交易模板
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateTemplateSchema.parse(body)

    // 检查模板是否存在且属于当前用户
    const existingTemplate = await prisma.transactionTemplate.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: '模板不存在或无权限访问' },
        { status: 404 }
      )
    }

    // 如果更新名称，检查新名称是否已存在
    if (validatedData.name && validatedData.name !== existingTemplate.name) {
      const nameExists = await prisma.transactionTemplate.findUnique({
        where: {
          userId_name: {
            userId: user.id,
            name: validatedData.name,
          },
        },
      })

      if (nameExists) {
        return NextResponse.json(
          { success: false, error: '模板名称已存在，请使用其他名称' },
          { status: 400 }
        )
      }
    }

    // 如果更新账户，验证账户是否属于当前用户
    if (validatedData.accountId) {
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
      const transactionType = validatedData.type || existingTemplate.type
      const accountType = account.category.type
      if (
        (transactionType === TransactionType.INCOME && accountType !== 'INCOME') ||
        (transactionType === TransactionType.EXPENSE && accountType !== 'EXPENSE')
      ) {
        return NextResponse.json(
          { success: false, error: '交易类型与账户类型不匹配' },
          { status: 400 }
        )
      }
    }

    // 更新模板
    const template = await prisma.transactionTemplate.update({
      where: { id: id },
      data: validatedData,
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
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

    console.error('Update template error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 删除交易模板
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    // 检查模板是否存在且属于当前用户
    const existingTemplate = await prisma.transactionTemplate.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: '模板不存在或无权限访问' },
        { status: 404 }
      )
    }

    // 删除模板
    await prisma.transactionTemplate.delete({
      where: { id: id },
    })

    return NextResponse.json({ success: true, message: '模板删除成功' })
  } catch (error) {
    console.error('Delete template error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
