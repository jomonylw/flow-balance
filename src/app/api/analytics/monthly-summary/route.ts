import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '12') // 默认获取12个月的数据
    const categoryId = searchParams.get('categoryId') // 可选：特定分类的数据

    // 计算日期范围
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months + 1)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    // 构建查询条件
    const whereCondition: any = {
      userId: user.id,
      date: {
        gte: startDate,
        lte: endDate
      }
    }

    if (categoryId) {
      // 如果指定了分类，需要获取该分类及其子分类下的所有账户
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId: user.id
        }
      })

      if (!category) {
        return errorResponse('分类不存在', 404)
      }

      // 递归获取所有子分类ID
      const getAllCategoryIds = async (catId: string): Promise<string[]> => {
        const children = await prisma.category.findMany({
          where: {
            parentId: catId,
            userId: user.id
          },
          select: { id: true }
        })

        let allIds = [catId]
        for (const child of children) {
          const childIds = await getAllCategoryIds(child.id)
          allIds = allIds.concat(childIds)
        }
        return allIds
      }

      const categoryIds = await getAllCategoryIds(categoryId)
      
      // 获取这些分类下的所有账户ID
      const accounts = await prisma.account.findMany({
        where: {
          categoryId: {
            in: categoryIds
          },
          userId: user.id
        },
        select: { id: true }
      })

      whereCondition.accountId = {
        in: accounts.map(acc => acc.id)
      }
    }

    // 获取交易数据
    const transactions = await prisma.transaction.findMany({
      where: whereCondition,
      include: {
        currency: true,
        account: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // 按月分组数据
    const monthlyData: Record<string, Record<string, {
      income: number
      expense: number
      balance: number
      transactionCount: number
      categories: Record<string, { income: number; expense: number; balance: number }>
    }>> = {}

    transactions.forEach(transaction => {
      const date = new Date(transaction.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const currencyCode = transaction.currency.code
      const amount = parseFloat(transaction.amount.toString())
      const categoryName = transaction.account.category.name

      // 初始化月度数据
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {}
      }
      if (!monthlyData[monthKey][currencyCode]) {
        monthlyData[monthKey][currencyCode] = {
          income: 0,
          expense: 0,
          balance: 0,
          transactionCount: 0,
          categories: {}
        }
      }
      if (!monthlyData[monthKey][currencyCode].categories[categoryName]) {
        monthlyData[monthKey][currencyCode].categories[categoryName] = {
          income: 0,
          expense: 0,
          balance: 0
        }
      }

      // 累计数据
      monthlyData[monthKey][currencyCode].transactionCount++
      
      if (transaction.type === 'INCOME') {
        monthlyData[monthKey][currencyCode].income += amount
        monthlyData[monthKey][currencyCode].categories[categoryName].income += amount
      } else if (transaction.type === 'EXPENSE') {
        monthlyData[monthKey][currencyCode].expense += amount
        monthlyData[monthKey][currencyCode].categories[categoryName].expense += amount
      }
    })

    // 计算余额
    Object.keys(monthlyData).forEach(monthKey => {
      Object.keys(monthlyData[monthKey]).forEach(currencyCode => {
        const monthData = monthlyData[monthKey][currencyCode]
        monthData.balance = monthData.income - monthData.expense
        
        Object.keys(monthData.categories).forEach(categoryName => {
          const categoryData = monthData.categories[categoryName]
          categoryData.balance = categoryData.income - categoryData.expense
        })
      })
    })

    // 生成完整的月份列表（包括没有交易的月份）
    const completeMonthlyData: Record<string, Record<string, any>> = {}
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      completeMonthlyData[monthKey] = monthlyData[monthKey] || {}
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    // 获取用户的基础货币设置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true }
    })

    const baseCurrency = userSettings?.baseCurrency || { code: 'CNY', symbol: '¥', name: '人民币' }

    return successResponse({
      monthlyData: completeMonthlyData,
      baseCurrency,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      totalMonths: months
    })
  } catch (error) {
    console.error('Get monthly summary error:', error)
    return errorResponse('获取月度汇总数据失败', 500)
  }
}
