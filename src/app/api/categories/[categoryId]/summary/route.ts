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

    // 递归获取所有子分类ID
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

    // 获取该分类及其所有子分类下的账户
    const allAccounts = await prisma.account.findMany({
      where: {
        userId: user.id,
        categoryId: {
          in: allCategoryIds
        }
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

    // 计算所有账户余额
    const allAccountSummaries = allAccounts.map(account => {
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
        categoryId: account.categoryId,
        balances,
        transactionCount: account.transactions.length
      }
    })

    // 分离直属账户和子分类账户
    const directAccounts = allAccountSummaries.filter(account => account.categoryId === categoryId)

    // 为每个子分类计算汇总余额
    const childrenWithBalances = await Promise.all(
      category.children.map(async (child) => {
        const childAccountIds = await getAllCategoryIds(child.id)
        const childAccounts = allAccountSummaries.filter(account =>
          childAccountIds.includes(account.categoryId)
        )

        // 计算子分类的汇总余额
        const childBalances: Record<string, number> = {}
        childAccounts.forEach(account => {
          Object.entries(account.balances).forEach(([currencyCode, balance]) => {
            if (!childBalances[currencyCode]) {
              childBalances[currencyCode] = 0
            }
            childBalances[currencyCode] += balance
          })
        })

        return {
          ...child,
          balances: childBalances,
          accountCount: childAccounts.length
        }
      })
    )

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

    // 基于实际账户余额计算分类汇总（而非基于交易统计）
    const categoryBalanceSummary: Record<string, number> = {}

    // 汇总所有账户的余额
    allAccountSummaries.forEach(account => {
      Object.entries(account.balances).forEach(([currencyCode, balance]) => {
        if (!categoryBalanceSummary[currencyCode]) {
          categoryBalanceSummary[currencyCode] = 0
        }
        categoryBalanceSummary[currencyCode] += balance
      })
    })

    // 为了保持API兼容性，仍然提供交易统计数据（但主要用于显示交易活动）
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

    // 转换交易统计数据，但主要显示基于余额的净值
    const summaryForResponse = Object.keys(categoryBalanceSummary).reduce((acc, currencyCode) => {
      const transactionData = transactionSummary[currencyCode] || {
        income: 0,
        expense: 0,
        balanceAdjustment: 0,
        count: 0
      }

      // 使用实际余额作为净值
      const actualBalance = categoryBalanceSummary[currencyCode]

      acc[currencyCode] = {
        income: transactionData.income,
        expense: transactionData.expense,
        balanceAdjustment: transactionData.balanceAdjustment,
        count: transactionData.count,
        net: actualBalance // 使用实际余额而非交易计算的净值
      }
      return acc
    }, {} as Record<string, { income: number; expense: number; balanceAdjustment: number; count: number; net: number }>)

    // 获取最近的交易
    const recentTransactions = transactions.slice(0, 10)

    // 获取用户的货币设置
    const currencies = await prisma.currency.findMany({
      where: {
        OR: [
          { isCustom: false }, // 全局货币
          { isCustom: true, createdBy: user.id } // 用户的自定义货币
        ]
      }
    })

    return successResponse({
      category: {
        id: category.id,
        name: category.name,
        parent: category.parent,
        childrenCount: category.children.length
      },
      children: childrenWithBalances, // 包含余额信息的子分类
      accounts: directAccounts, // 只返回直属账户
      allAccounts: allAccountSummaries, // 所有账户（包括子分类下的）
      categoryBalances: categoryBalanceSummary, // 分类总余额
      transactionSummary: summaryForResponse,
      recentTransactions,
      currencies: currencies.map(currency => ({
        code: currency.code,
        symbol: currency.symbol,
        name: currency.name
      })),
      stats: {
        totalAccounts: allAccountSummaries.length, // 包括子分类下的所有账户
        directAccounts: directAccounts.length, // 直属账户数量
        totalTransactions: transactions.length,
        totalChildren: category.children.length
      }
    })
  } catch (error) {
    console.error('Get category summary error:', error)
    return errorResponse('获取分类汇总失败', 500)
  }
}
