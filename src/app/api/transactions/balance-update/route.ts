import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'

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
      updateType
    } = body

    // 验证必填字段
    if (!accountId || !currencyCode || balanceChange === undefined || !updateDate) {
      return errorResponse('缺少必填字段', 400)
    }

    // 验证账户是否属于当前用户
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id
      },
      include: {
        category: true
      }
    })

    if (!account) {
      return errorResponse('账户不存在', 400)
    }

    // 验证是否为存量类账户
    const accountType = account.category.type
    if (accountType !== 'ASSET' && accountType !== 'LIABILITY') {
      return errorResponse('只有资产或负债账户可以进行余额更新', 400)
    }

    // 验证币种
    const currency = await prisma.currency.findUnique({
      where: { code: currencyCode }
    })

    if (!currency) {
      return errorResponse('币种不存在', 400)
    }

    // 验证金额
    const changeAmount = parseFloat(balanceChange)
    if (isNaN(changeAmount)) {
      return errorResponse('无效的金额', 400)
    }

    // 创建余额调整交易
    // 对于存量类账户，我们创建一个特殊的调整交易来记录余额变化
    const transactionType = changeAmount >= 0 ? 'INCOME' : 'EXPENSE'
    const transactionAmount = Math.abs(changeAmount)

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId,
        categoryId: account.categoryId,
        currencyCode,
        type: transactionType,
        amount: transactionAmount,
        description: `余额${updateType === 'absolute' ? '更新' : '调整'} - ${account.name}`,
        notes: notes || `余额${updateType === 'absolute' ? '更新' : '调整'}：${currency.symbol}${newBalance?.toFixed(2) || 'N/A'}`,
        date: new Date(updateDate)
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

    // 记录余额更新历史（可选：创建一个专门的余额历史表）
    // 这里我们可以在未来扩展一个 BalanceHistory 表来跟踪余额变化

    return successResponse({
      transaction: {
        ...transaction,
        amount: parseFloat(transaction.amount.toString()),
        date: transaction.date.toISOString(),
        notes: transaction.notes || undefined
      },
      balanceChange: changeAmount,
      newBalance: newBalance,
      message: `${account.name} 余额已更新`
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
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!accountId) {
      return errorResponse('缺少账户ID', 400)
    }

    // 验证账户是否属于当前用户
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: user.id
      },
      include: {
        category: true
      }
    })

    if (!account) {
      return errorResponse('账户不存在', 400)
    }

    // 获取余额相关的交易历史
    const whereClause: any = {
      userId: user.id,
      accountId: accountId
    }

    if (currencyCode) {
      whereClause.currencyCode = currencyCode
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        currency: true,
        category: true
      },
      orderBy: {
        date: 'desc'
      },
      take: limit
    })

    // 计算每个时点的累计余额
    const balanceHistory = []
    let cumulativeBalance = 0

    // 按时间正序处理以计算累计余额
    const sortedTransactions = [...transactions].reverse()

    for (const transaction of sortedTransactions) {
      const amount = parseFloat(transaction.amount.toString())
      
      // 根据账户类型和交易类型计算余额变化
      let balanceChange = 0
      if (account.category.type === 'ASSET') {
        balanceChange = transaction.type === 'INCOME' ? amount : -amount
      } else if (account.category.type === 'LIABILITY') {
        balanceChange = transaction.type === 'INCOME' ? amount : -amount
      }

      cumulativeBalance += balanceChange

      balanceHistory.unshift({
        date: transaction.date.toISOString(),
        balance: cumulativeBalance,
        change: balanceChange,
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: amount,
          description: transaction.description,
          notes: transaction.notes
        }
      })
    }

    return successResponse({
      account: {
        id: account.id,
        name: account.name,
        type: account.category.type
      },
      currentBalance: cumulativeBalance,
      currency: currencyCode ? await prisma.currency.findUnique({
        where: { code: currencyCode }
      }) : null,
      history: balanceHistory.slice(0, limit)
    })

  } catch (error) {
    console.error('Get balance history error:', error)
    return errorResponse('获取余额历史失败', 500)
  }
}
