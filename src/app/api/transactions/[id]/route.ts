import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { getPrismaClient } from '@/lib/database/connection-manager'
import { getTransactionError } from '@/lib/constants/api-messages'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response'
import { TransactionType } from '@prisma/client'
import { getUserTranslator } from '@/lib/utils/server-i18n'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user: any = null
  try {
    const { id } = await params
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const transaction = await (
      await getPrismaClient()
    ).transaction.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
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
    })

    if (!transaction) {
      const t = await getUserTranslator(user.id)
      return notFoundResponse(t('transaction.not.found'))
    }

    // 格式化交易数据，移除标签颜色信息
    const formattedTransaction = {
      ...transaction,
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
    }

    return successResponse(formattedTransaction)
  } catch (error) {
    console.error('Get transaction error:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('transaction.get.failed'), 500)
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
    const existingTransaction = await (
      await getPrismaClient()
    ).transaction.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
    })

    if (!existingTransaction) {
      return notFoundResponse('交易记录不存在')
    }

    const body = await request.json()
    const {
      accountId,
      currencyCode,
      type,
      amount,
      description,
      notes,
      date,
      tagIds = [],
    } = body

    // 验证必填字段
    if (
      !accountId ||
      !currencyCode ||
      !type ||
      !amount ||
      !description ||
      !date
    ) {
      return errorResponse('请填写所有必填字段', 400)
    }

    // 验证金额
    // BALANCE类型交易允许为0（如贷款还完时余额为0），其他类型必须大于0
    const amountValue = parseFloat(amount)
    if (
      isNaN(amountValue) ||
      (type === 'BALANCE' ? amountValue < 0 : amountValue <= 0)
    ) {
      return errorResponse(
        type === 'BALANCE' ? '余额调整金额不能为负数' : '金额必须是大于0的数字',
        400
      )
    }

    // 验证账户是否属于当前用户
    const account = await (
      await getPrismaClient()
    ).account.findFirst({
      where: { id: accountId, userId: user.id },
      include: {
        category: true,
        currency: true,
      },
    })

    if (!account) {
      return errorResponse('账户不存在', 400)
    }

    // 验证账户货币限制
    if (account.currency && account.currency.code !== currencyCode) {
      return errorResponse(
        `此账户只能使用 ${account.currency?.name} (${account.currency.code})，无法使用 ${currencyCode}`,
        400
      )
    }

    // 验证币种
    const currencyCheck = await (
      await getPrismaClient()
    ).currency.findFirst({
      where: {
        code: currencyCode,
        OR: [{ createdBy: user.id }, { createdBy: null }],
      },
    })

    if (!currencyCheck) {
      return errorResponse('币种不存在', 400)
    }

    // 验证账户类型与交易类型的匹配性
    const accountType = account.category.type
    if (accountType) {
      // 存量类账户（资产/负债）严格禁止编辑为普通交易
      if (accountType === 'ASSET' || accountType === 'LIABILITY') {
        // 检查原交易是否为余额调整类型
        if (existingTransaction.type !== 'BALANCE') {
          return errorResponse(
            `存量类账户"${account.name}"不能编辑普通交易记录。请使用"更新余额"功能来管理${accountType === 'ASSET' ? '资产' : '负债'}账户的余额变化。`,
            400
          )
        }
        // 如果是余额调整交易，也不允许通过普通交易API编辑
        if (type !== 'BALANCE') {
          return errorResponse('余额调整记录不能通过普通交易编辑功能修改', 400)
        }
      }

      // 流量类账户（收入/支出）的严格验证
      if (accountType === 'INCOME' && type !== 'INCOME') {
        return errorResponse(
          '收入类账户只能记录收入交易，请选择正确的交易类型',
          400
        )
      }

      if (accountType === 'EXPENSE' && type !== 'EXPENSE') {
        return errorResponse(
          '支出类账户只能记录支出交易，请选择正确的交易类型',
          400
        )
      }

      // 禁止在普通交易中使用BALANCE类型
      if (
        type === 'BALANCE' &&
        (accountType === 'INCOME' || accountType === 'EXPENSE')
      ) {
        return errorResponse('BALANCE类型只能用于存量类账户', 400)
      }
    }

    // 验证并获取货币ID
    const currency = await (
      await getPrismaClient()
    ).currency.findFirst({
      where: {
        code: currencyCode,
        OR: [
          { createdBy: user.id }, // 用户自定义货币
          { createdBy: null }, // 全局货币
        ],
      },
      orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
    })

    if (!currency) {
      return errorResponse('指定的货币不存在', 400)
    }

    // 更新交易
    const transaction = await (
      await getPrismaClient()
    ).transaction.update({
      where: { id: id },
      data: {
        accountId,
        currencyId: currency.id,
        type: type as TransactionType,
        amount: parseFloat(amount),
        description,
        notes: notes || null,
        date: new Date(date),
        tags: {
          deleteMany: {},
          create: tagIds.map((tagId: string) => ({
            tagId,
          })),
        },
      },
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
    })

    // 格式化交易数据，移除标签颜色信息
    const formattedTransaction = {
      ...transaction,
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
    }

    return successResponse(formattedTransaction, '交易更新成功')
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
    console.log(`[DELETE TRANSACTION] 开始删除交易，ID: ${id}`)

    const user = await getCurrentUser()
    if (!user) {
      console.log('[DELETE TRANSACTION] 用户未授权')
      return unauthorizedResponse()
    }

    console.log(`[DELETE TRANSACTION] 用户ID: ${user.id}`)

    // 验证交易是否存在且属于当前用户，并获取完整的关联数据
    const existingTransaction = await (
      await getPrismaClient()
    ).transaction.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
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
    })

    if (!existingTransaction) {
      console.log(
        `[DELETE TRANSACTION] 交易不存在或不属于用户，transactionId: ${id}, userId: ${user.id}`
      )
      return notFoundResponse('交易记录不存在')
    }

    console.log(
      `[DELETE TRANSACTION] 找到交易: ${existingTransaction.description}, 类型: ${existingTransaction.type}, 金额: ${existingTransaction.amount}`
    )

    // 删除交易
    console.log('[DELETE TRANSACTION] 开始删除交易...')
    await (
      await getPrismaClient()
    ).transaction.delete({
      where: { id: id },
    })

    // 格式化交易数据，与创建API保持一致的格式
    const formattedTransaction = {
      ...existingTransaction,
      tags: existingTransaction.tags.map(tt => ({
        tag: {
          id: tt.tag.id,
          name: tt.tag.name,
        },
      })),
    }

    console.log(
      `[DELETE TRANSACTION] 交易删除成功: ${existingTransaction.description}`
    )
    // 返回被删除的交易信息，用于事件发布
    return successResponse(
      {
        transaction: formattedTransaction,
      },
      '交易删除成功'
    )
  } catch (error) {
    console.error('[DELETE TRANSACTION] 删除交易时发生错误:', error)

    // 提供更详细的错误信息
    let errorMessage = getTransactionError('DELETE_FAILED')
    let statusCode = 500

    if (error instanceof Error) {
      console.error('[DELETE TRANSACTION] 错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })

      // 检查是否是特定的业务错误
      if (error.message.includes('Foreign key constraint')) {
        errorMessage = '删除失败：该交易存在关联数据，请先删除相关记录'
        statusCode = 400
      } else if (error.message.includes('Record to delete does not exist')) {
        errorMessage = getTransactionError('NOT_FOUND')
        statusCode = 404
      } else {
        errorMessage = `${getTransactionError('DELETE_FAILED')}：${error.message}`
      }
    }

    return errorResponse(errorMessage, statusCode)
  }
}
