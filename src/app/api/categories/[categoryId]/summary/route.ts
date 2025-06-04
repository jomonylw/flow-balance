import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/api-response'

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
        transactions: {
          include: {
            currency: true
          }
        }
      }
    })

    // 计算账户余额
    const accountSummaries = accounts.map(account => {
      const balances: Record<string, number> = {}
      let transactionCount = 0
      
      account.transactions.forEach(transaction => {
        const currencyCode = transaction.currency.code
        if (!balances[currencyCode]) {
          balances[currencyCode] = 0
        }
        
        const amount = parseFloat(transaction.amount.toString())
        if (transaction.type === 'INCOME') {
          balances[currencyCode] += amount
        } else if (transaction.type === 'EXPENSE') {
          balances[currencyCode] -= amount
        }
        transactionCount++
      })

      return {
        id: account.id,
        name: account.name,
        description: account.description,
        balances,
        transactionCount
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

    // 按币种统计交易金额
    const transactionSummary: Record<string, { 
      income: number; 
      expense: number; 
      count: number;
      currencies: Set<string>;
    }> = {}

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
      
      if (transaction.type === 'INCOME') {
        transactionSummary[currencyCode].income += amount
      } else if (transaction.type === 'EXPENSE') {
        transactionSummary[currencyCode].expense += amount
      }
    })

    // 转换 Set 为数组以便序列化
    const summaryForResponse = Object.entries(transactionSummary).reduce((acc, [currency, data]) => {
      acc[currency] = {
        income: data.income,
        expense: data.expense,
        count: data.count,
        net: data.income - data.expense
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
