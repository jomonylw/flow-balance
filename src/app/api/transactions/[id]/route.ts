import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response'
import { TransactionType } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: id,
        userId: user.id
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

    if (!transaction) {
      return notFoundResponse('交易记录不存在')
    }

    return successResponse(transaction)
  } catch (error) {
    console.error('Get transaction error:', error)
    return errorResponse('获取交易记录失败', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证交易是否存在且属于当前用户
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    })

    if (!existingTransaction) {
      return notFoundResponse('交易记录不存在')
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

    // 更新交易
    const transaction = await prisma.transaction.update({
      where: { id: id },
      data: {
        accountId,
        categoryId,
        currencyCode,
        type: type as TransactionType,
        amount: parseFloat(amount),
        description,
        notes: notes || null,
        date: new Date(date),
        tags: {
          deleteMany: {},
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

    return successResponse(transaction, '交易更新成功')
  } catch (error) {
    console.error('Update transaction error:', error)
    return errorResponse('更新交易失败', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证交易是否存在且属于当前用户
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    })

    if (!existingTransaction) {
      return notFoundResponse('交易记录不存在')
    }

    // 删除交易
    await prisma.transaction.delete({
      where: { id: id }
    })

    return successResponse(null, '交易删除成功')
  } catch (error) {
    console.error('Delete transaction error:', error)
    return errorResponse('删除交易失败', 500)
  }
}
