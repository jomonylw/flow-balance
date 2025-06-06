import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response'
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
          count: 0,
          currencies: new Set()
        }
      }

      const amount = parseFloat(transaction.amount.toString())
      transactionSummary[currencyCode].count++
      transactionSummary[currencyCode].currencies.add(currencyCode)

      // 对于存量类分类，交易类型的含义不同
      if (categoryType === 'ASSET' || categoryType === 'LIABILITY') {
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
        // 资产：收入增加资产，支出减少资产
        net = data.income - data.expense
      } else if (categoryType === 'LIABILITY') {
        // 负债：支出增加负债，收入减少负债
        net = data.expense - data.income
      } else {
        // 流量类：收入减支出
        net = data.income - data.expense
      }

      acc[currency] = {
        income: data.income,
        expense: data.expense,
        count: data.count,
        net: net
      }
      return acc
    }, {} as Record<string, { income: number; expense: number; count: number; net: number }>)

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
