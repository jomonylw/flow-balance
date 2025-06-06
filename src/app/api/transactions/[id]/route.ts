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
        where: { id: accountId, userId: user.id },
        include: { category: true }
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
    if (accountType) {
      // 存量类账户（资产/负债）严格禁止编辑为普通交易
      if (accountType === 'ASSET' || accountType === 'LIABILITY') {
        // 检查原交易是否为余额调整类型
        if (existingTransaction.type !== 'BALANCE_ADJUSTMENT') {
          return errorResponse(
            `存量类账户"${account.name}"不能编辑普通交易记录。请使用"更新余额"功能来管理${accountType === 'ASSET' ? '资产' : '负债'}账户的余额变化。`,
            400
          )
        }
        // 如果是余额调整交易，也不允许通过普通交易API编辑
        if (type !== 'BALANCE_ADJUSTMENT') {
          return errorResponse('余额调整记录不能通过普通交易编辑功能修改', 400)
        }
      }

      // 流量类账户（收入/支出）的严格验证
      if (accountType === 'INCOME' && type !== 'INCOME') {
        return errorResponse('收入类账户只能记录收入交易，请选择正确的交易类型', 400)
      }

      if (accountType === 'EXPENSE' && type !== 'EXPENSE') {
        return errorResponse('支出类账户只能记录支出交易，请选择正确的交易类型', 400)
      }

      // 禁止在普通交易中使用BALANCE_ADJUSTMENT类型
      if (type === 'BALANCE_ADJUSTMENT' && (accountType === 'INCOME' || accountType === 'EXPENSE')) {
        return errorResponse('BALANCE_ADJUSTMENT类型只能用于存量类账户', 400)
      }
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
