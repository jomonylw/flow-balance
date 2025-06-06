import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response'

/**
 * 从交易备注中提取余额变化金额
 * @param notes 交易备注
 * @returns 变化金额，如果无法提取则返回null
 */
function extractBalanceChangeFromNotes(notes: string): number | null {
  if (!notes) return null

  // 匹配模式：变化金额：+123.45 或 变化金额：-123.45
  const match = notes.match(/变化金额：([+-]?\d+\.?\d*)/)
  if (match && match[1]) {
    return parseFloat(match[1])
  }

  return null
}
import { calculateAccountBalance } from '@/lib/account-balance'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证分类是否属于当前用户
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id
      },
      include: {
        parent: true,
        children: {
          orderBy: [
            { order: 'asc' },
            { name: 'asc' }
          ]
        }
      }
    })

    if (!category) {
      return notFoundResponse('分类不存在')
    }

    // 获取该分类下的所有账户
    const accounts = await prisma.account.findMany({
      where: {
        userId: user.id,
        categoryId: categoryId
      },
      include: {
        category: true,
        transactions: {
          include: {
            currency: true
          }
        }
      }
    })

    // 计算账户余额（使用专业的余额计算服务）
    const accountSummaries = accounts.map(account => {
      // 序列化账户数据，将 Decimal 转换为 number
      const serializedAccount = {
        ...account,
        transactions: account.transactions.map(transaction => ({
          ...transaction,
          amount: parseFloat(transaction.amount.toString()),
          date: transaction.date.toISOString()
        }))
      }

      // 使用统一的余额计算方法
      const accountBalances = calculateAccountBalance(serializedAccount)

      // 转换为简单的余额记录格式
      const balances: Record<string, number> = {}
      Object.entries(accountBalances).forEach(([currencyCode, balanceData]) => {
        balances[currencyCode] = balanceData.amount
      })

      return {
        id: account.id,
        name: account.name,
        description: account.description,
        balances,
        transactionCount: account.transactions.length
      }
    })

    // 获取该分类及其子分类的所有交易
    const getAllCategoryIds = async (categoryId: string): Promise<string[]> => {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { children: true }
      })
      
      if (!category) return [categoryId]
      
      let ids = [categoryId]
      for (const child of category.children) {
        const childIds = await getAllCategoryIds(child.id)
        ids = ids.concat(childIds)
      }
      return ids
    }

    const allCategoryIds = await getAllCategoryIds(categoryId)
    
    // 获取相关交易统计
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        categoryId: {
          in: allCategoryIds
        }
      },
      include: {
        currency: true,
        account: true
      },
      orderBy: { date: 'desc' }
    })

    // 按币种统计交易金额（对于存量类分类，这里统计的是余额变化）
    const transactionSummary: Record<string, {
      income: number;
      expense: number;
      balanceAdjustment: number;
      count: number;
      currencies: Set<string>;
    }> = {}

    // 获取分类类型以确定计算方法
    const categoryType = category.type

    transactions.forEach(transaction => {
      const currencyCode = transaction.currency.code
      if (!transactionSummary[currencyCode]) {
        transactionSummary[currencyCode] = {
          income: 0,
          expense: 0,
          balanceAdjustment: 0,
          count: 0,
          currencies: new Set()
        }
      }

      const amount = parseFloat(transaction.amount.toString())
      transactionSummary[currencyCode].count++
      transactionSummary[currencyCode].currencies.add(currencyCode)

      // 根据交易类型和分类类型处理
      if (transaction.type === 'BALANCE_ADJUSTMENT') {
        // 余额调整：只有存量类分类应该有这种交易
        if (categoryType === 'ASSET' || categoryType === 'LIABILITY') {
          // 从备注中提取实际变化金额
          const changeAmount = extractBalanceChangeFromNotes(transaction.notes || '')
          transactionSummary[currencyCode].balanceAdjustment += changeAmount || amount
        } else {
          console.warn(`流量类分类 ${category.name} 不应该有余额调整交易`)
        }
      } else if (categoryType === 'ASSET' || categoryType === 'LIABILITY') {
        // 存量类：INCOME表示增加，EXPENSE表示减少
        if (transaction.type === 'INCOME') {
          transactionSummary[currencyCode].income += amount
        } else if (transaction.type === 'EXPENSE') {
          transactionSummary[currencyCode].expense += amount
        }
      } else {
        // 流量类：按原有逻辑处理
        if (transaction.type === 'INCOME') {
          transactionSummary[currencyCode].income += amount
        } else if (transaction.type === 'EXPENSE') {
          transactionSummary[currencyCode].expense += amount
        }
      }
    })

    // 转换 Set 为数组以便序列化，并计算净值
    const summaryForResponse = Object.entries(transactionSummary).reduce((acc, [currency, data]) => {
      let net = 0
      if (categoryType === 'ASSET') {
        // 资产：收入增加资产，支出减少资产，余额调整直接应用
        net = data.income - data.expense + (data.balanceAdjustment || 0)
      } else if (categoryType === 'LIABILITY') {
        // 负债：借入（收入）增加负债，偿还（支出）减少负债，余额调整直接应用
        net = data.income - data.expense + (data.balanceAdjustment || 0)
      } else {
        // 流量类：收入减支出，不应该有余额调整
        net = data.income - data.expense
        if (data.balanceAdjustment && data.balanceAdjustment !== 0) {
          console.warn(`流量类分类 ${category.name} 不应该有余额调整交易`)
        }
      }

      acc[currency] = {
        income: data.income,
        expense: data.expense,
        balanceAdjustment: data.balanceAdjustment || 0,
        count: data.count,
        net: net
      }
      return acc
    }, {} as Record<string, { income: number; expense: number; balanceAdjustment: number; count: number; net: number }>)

    // 获取最近的交易
    const recentTransactions = transactions.slice(0, 10)

    return successResponse({
      category: {
        id: category.id,
        name: category.name,
        parent: category.parent,
        childrenCount: category.children.length
      },
      children: category.children,
      accounts: accountSummaries,
      transactionSummary: summaryForResponse,
      recentTransactions,
      stats: {
        totalAccounts: accounts.length,
        totalTransactions: transactions.length,
        totalChildren: category.children.length
      }
    })
  } catch (error) {
    console.error('Get category summary error:', error)
    return errorResponse('获取分类汇总失败', 500)
  }
}
