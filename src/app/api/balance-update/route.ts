import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import type { Prisma } from '@prisma/client'
import {
  publishBalanceUpdate,
  publishTransactionUpdate,
} from '@/lib/services/data-update.service'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const {
      accountId,
      currencyCode,
      balanceChange,
      newBalance,
      updateDate,
      notes,
    } = body

    // 验证必填字段
    if (
      !accountId ||
      !currencyCode ||
      balanceChange === undefined ||
      !updateDate
    ) {
      return errorResponse('缺少必填字段', 400)
    }

    // 验证账户是否属于当前用户
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
      include: {
        category: true,
        currency: true,
      },
    })

    if (!account) {
      return errorResponse('账户不存在', 400)
    }

    // 验证账户货币限制
    if (account.currency?.code && account.currency.code !== currencyCode) {
      return errorResponse(
        `此账户只能使用 ${account.currency.name} (${account.currency.code})，无法使用 ${currencyCode}`,
        400
      )
    }

    // 验证是否为存量类账户
    const accountType = account.category.type
    if (accountType !== 'ASSET' && accountType !== 'LIABILITY') {
      return errorResponse('只有资产或负债账户可以进行余额更新', 400)
    }

    // 验证币种
    const currency = await prisma.currency.findFirst({
      where: {
        code: currencyCode,
        OR: [{ createdBy: user.id }, { createdBy: null }],
      },
    })

    if (!currency) {
      return errorResponse('币种不存在', 400)
    }

    // 验证金额
    const changeAmount = parseFloat(balanceChange)
    const newBalanceAmount = parseFloat(newBalance)
    if (isNaN(changeAmount) || isNaN(newBalanceAmount)) {
      return errorResponse('无效的金额', 400)
    }

    // 验证前端提交的余额和计算的变化金额是否一致
    console.warn('API接收数据验证:', {
      newBalance: newBalanceAmount,
      balanceChange: changeAmount,
      accountId,
      updateDate,
    })

    const updateDateObj = new Date(updateDate)
    // 确保时间部分为UTC时间的00:00:00，与单笔创建交易保持一致
    updateDateObj.setUTCHours(0, 0, 0, 0)

    const startOfDay = new Date(
      updateDateObj.getFullYear(),
      updateDateObj.getMonth(),
      updateDateObj.getDate()
    )
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)

    // 检查当天是否已有BALANCE记录
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        userId: user.id,
        accountId,
        type: 'BALANCE',
        date: {
          gte: startOfDay,
          lte: endOfDay,
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

    let transaction
    const transactionData = {
      userId: user.id,
      accountId,
      currencyId: currency.id,
      type: 'BALANCE' as const,
      amount: newBalanceAmount, // 存储目标余额，而不是变化金额
      description: `余额更新 - ${account.name}`,
      notes:
        notes ||
        `余额更新：${currency.symbol}${newBalanceAmount.toFixed(2)}。变化金额：${changeAmount >= 0 ? '+' : ''}${changeAmount.toFixed(2)}`,
      date: updateDateObj,
    }

    if (existingTransaction) {
      // 如果当天已有记录，则更新现有记录
      transaction = await prisma.transaction.update({
        where: {
          id: existingTransaction.id,
        },
        data: transactionData,
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
    } else {
      // 如果当天没有记录，则创建新记录
      transaction = await prisma.transaction.create({
        data: transactionData,
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
    }

    // 记录余额更新历史（可选：创建一个专门的余额历史表）
    // 这里我们可以在未来扩展一个 BalanceHistory 表来跟踪余额变化

    // 发布余额更新事件
    await publishBalanceUpdate(accountId, {
      newBalance: newBalanceAmount,
      currencyCode,
    })

    // 同时发布交易更新事件，因为余额调整也是一种交易
    await publishTransactionUpdate(accountId, account.category.id, {
      transactionId: transaction.id,
    })

    return successResponse({
      transaction: {
        ...transaction,
        amount: parseFloat(transaction.amount.toString()),
        date: transaction.date.toISOString(),
        notes: transaction.notes || undefined,
      },
      balanceChange: changeAmount,
      newBalance: newBalanceAmount,
      isUpdate: !!existingTransaction,
      message: existingTransaction
        ? `${account.name} 当天余额记录已更新`
        : `${account.name} 余额已更新`,
    })
  } catch (error) {
    console.error('Balance update error:', error)
    return errorResponse('余额更新失败', 500)
  }
}

// 获取账户余额历史
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const currencyCode = searchParams.get('currencyCode')
    const limit = parseInt(searchParams.get('limit') || '10') // 保持较小的默认值用于余额更新

    if (!accountId) {
      return errorResponse('缺少账户ID', 400)
    }

    // 验证账户是否属于当前用户
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
      include: {
        category: true,
      },
    })

    if (!account) {
      return errorResponse('账户不存在', 400)
    }

    // 获取余额相关的交易历史
    const whereClause: Prisma.TransactionWhereInput = {
      userId: user.id,
      accountId: accountId,
    }

    if (currencyCode) {
      // 需要通过关联查询来过滤货币
      whereClause.currency = {
        code: currencyCode,
        OR: [{ createdBy: user.id }, { createdBy: null }],
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        currency: true,
      },
      orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    })

    // 定义交易类型（包含关联数据）
    type TransactionWithCurrency = Prisma.TransactionGetPayload<{
      include: {
        currency: true
      }
    }>

    // 计算每个时点的累计余额
    const balanceHistory: Array<{
      date: string
      balance: number
      change: number
      transaction: {
        id: string
        type: string
        amount: number
        description: string
        notes: string | null
      }
    }> = []

    // 按时间正序处理以计算累计余额
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // 对于存量类账户，需要特殊处理BALANCE
    const isStockAccount =
      account.category.type === 'ASSET' || account.category.type === 'LIABILITY'
    let cumulativeBalance = 0

    if (isStockAccount) {
      // 存量类账户：找到最新的BALANCE作为基准
      let latestBalanceAdjustment: TransactionWithCurrency | null = null
      let latestBalanceDate = new Date(0)

      sortedTransactions.forEach(transaction => {
        if (transaction.type === 'BALANCE') {
          const transactionDate = new Date(transaction.date)
          if (transactionDate > latestBalanceDate) {
            latestBalanceAdjustment = transaction as TransactionWithCurrency
            latestBalanceDate = transactionDate
          }
        }
      })

      // 如果有余额调整记录，使用该记录作为基准
      if (latestBalanceAdjustment) {
        const balanceTransaction =
          latestBalanceAdjustment as TransactionWithCurrency
        cumulativeBalance = parseFloat(balanceTransaction.amount.toString())

        // 添加余额调整记录到历史
        balanceHistory.push({
          date: balanceTransaction.date.toISOString(),
          balance: cumulativeBalance,
          change: cumulativeBalance, // 对于余额调整，变化金额就是目标余额
          transaction: {
            id: balanceTransaction.id,
            type: balanceTransaction.type,
            amount: parseFloat(balanceTransaction.amount.toString()),
            description: balanceTransaction.description,
            notes: balanceTransaction.notes,
          },
        })

        // 处理余额调整之后的其他交易
        sortedTransactions.forEach(transaction => {
          if (
            transaction.type === 'BALANCE' ||
            new Date(transaction.date) <= latestBalanceDate
          ) {
            return // 跳过余额调整记录和之前的交易
          }

          const amount = parseFloat(transaction.amount.toString())
          let balanceChange = 0

          if (account.category.type === 'ASSET') {
            balanceChange = transaction.type === 'INCOME' ? amount : -amount
          } else if (account.category.type === 'LIABILITY') {
            balanceChange = transaction.type === 'INCOME' ? amount : -amount
          }

          cumulativeBalance += balanceChange

          balanceHistory.push({
            date: transaction.date.toISOString(),
            balance: cumulativeBalance,
            change: balanceChange,
            transaction: {
              id: transaction.id,
              type: transaction.type,
              amount: amount,
              description: transaction.description,
              notes: transaction.notes,
            },
          })
        })
      }
    } else {
      // 流量类账户：累加所有交易
      sortedTransactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount.toString())
        let balanceChange = 0

        if (account.category.type === 'INCOME') {
          balanceChange = transaction.type === 'INCOME' ? amount : 0
        } else if (account.category.type === 'EXPENSE') {
          balanceChange = transaction.type === 'EXPENSE' ? amount : 0
        }

        cumulativeBalance += balanceChange

        balanceHistory.push({
          date: transaction.date.toISOString(),
          balance: cumulativeBalance,
          change: balanceChange,
          transaction: {
            id: transaction.id,
            type: transaction.type,
            amount: amount,
            description: transaction.description,
            notes: transaction.notes,
          },
        })
      })
    }

    // 按日期倒序排列历史记录
    balanceHistory.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return successResponse({
      account: {
        id: account.id,
        name: account.name,
        type: account.category.type,
      },
      currentBalance: cumulativeBalance,
      currency: currencyCode
        ? await prisma.currency.findFirst({
            where: {
              code: currencyCode,
              OR: [{ createdBy: user.id }, { createdBy: null }],
            },
          })
        : null,
      history: balanceHistory.slice(0, limit),
    })
  } catch (error) {
    console.error('Get balance history error:', error)
    return errorResponse('获取余额历史失败', 500)
  }
}
