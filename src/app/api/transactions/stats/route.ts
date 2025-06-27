import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { TransactionType, Prisma } from '@prisma/client'

// 辅助函数：递归获取所有后代分类的ID
async function getDescendantCategoryIds(categoryId: string): Promise<string[]> {
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  })

  const descendantIds: string[] = []
  for (const child of children) {
    descendantIds.push(child.id)
    const grandChildrenIds = await getDescendantCategoryIds(child.id)
    descendantIds.push(...grandChildrenIds)
  }
  return descendantIds
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const categoryId = searchParams.get('categoryId')
    const currencyId = searchParams.get('currencyId')
    const type = searchParams.get('type') as TransactionType | null
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean) || []

    // 构建基础查询条件
    const baseConditions: Prisma.TransactionWhereInput[] = [{ userId: user.id }]

    if (accountId) {
      baseConditions.push({ accountId })
    }

    if (categoryId) {
      // 获取该分类及其所有后代分类的ID
      const descendantIds = await getDescendantCategoryIds(categoryId)
      const allCategoryIds = [categoryId, ...descendantIds]
      baseConditions.push({
        account: {
          categoryId: { in: allCategoryIds },
        },
      })
    }

    if (currencyId) {
      baseConditions.push({ currencyId })
    }

    if (type) {
      // 确保指定的类型是收入或支出
      if (type === 'INCOME' || type === 'EXPENSE') {
        baseConditions.push({ type })
      } else {
        // 如果指定了其他类型（如BALANCE），忽略该参数，使用默认筛选
        baseConditions.push({ type: { in: ['INCOME', 'EXPENSE'] } })
      }
    } else {
      // 默认只处理收入和支出类型的交易
      baseConditions.push({ type: { in: ['INCOME', 'EXPENSE'] } })
    }

    if (dateFrom || dateTo) {
      const dateCondition: Record<string, Date> = {}
      if (dateFrom) {
        dateCondition.gte = new Date(dateFrom)
      }
      if (dateTo) {
        dateCondition.lte = new Date(dateTo)
      }
      baseConditions.push({ date: dateCondition })
    }

    if (tagIds.length > 0) {
      baseConditions.push({
        tags: {
          some: {
            tagId: {
              in: tagIds,
            },
          },
        },
      })
    }

    // 构建最终查询条件
    let where: Prisma.TransactionWhereInput

    if (search) {
      // 当有搜索条件时，需要将搜索条件与其他条件正确组合
      const allConditions: Prisma.TransactionWhereInput[] = [
        ...baseConditions,
        {
          OR: [
            {
              description: {
                contains: search,
              },
            },
            {
              notes: {
                contains: search,
              },
            },
          ],
        },
      ]

      where =
        allConditions.length === 1 ? allConditions[0] : { AND: allConditions }
    } else {
      // 没有搜索条件时，直接使用条件
      where =
        baseConditions.length === 1
          ? baseConditions[0]
          : { AND: baseConditions }
    }

    // 获取用户的基础货币设置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    const baseCurrency = userSettings?.baseCurrency

    if (!baseCurrency) {
      return errorResponse('请先设置本位币', 400)
    }

    // 获取所有符合条件的交易用于统计
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        type: true,
        amount: true,
        date: true,
        currencyId: true,
        currency: {
          select: {
            code: true,
          },
        },
      },
    })

    // 获取所有涉及的货币ID和代码
    const currencyIds = [...new Set(transactions.map(t => t.currencyId))]
    const exchangeRates = await prisma.exchangeRate.findMany({
      where: {
        userId: user.id,
        fromCurrencyId: { in: currencyIds },
        toCurrencyId: baseCurrency.id,
      },
      include: {
        fromCurrencyRef: { select: { code: true } },
        toCurrencyRef: { select: { code: true } },
      },
      orderBy: { effectiveDate: 'desc' },
    })

    // 创建汇率映射
    const rateMap = new Map<string, number>()
    exchangeRates.forEach(rate => {
      const key = `${rate.fromCurrencyRef.code}-${rate.toCurrencyRef.code}`
      if (!rateMap.has(key)) {
        rateMap.set(key, parseFloat(rate.rate.toString()))
      }
    })

    // 货币转换函数
    const convertToBaseCurrency = (
      amount: number,
      fromCurrency: string
    ): number => {
      if (fromCurrency === baseCurrency.code) {
        return amount
      }

      const rateKey = `${fromCurrency}-${baseCurrency.code}`
      const rate = rateMap.get(rateKey)

      if (rate) {
        return amount * rate
      } else {
        console.warn(
          `No exchange rate found for ${fromCurrency} to ${baseCurrency.code}, using original amount`
        )
        return amount
      }
    }

    // 计算统计数据
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    let totalIncome = 0
    let totalExpense = 0
    let thisMonthIncome = 0
    let thisMonthExpense = 0
    let lastMonthIncome = 0
    let lastMonthExpense = 0
    let incomeCount = 0
    let expenseCount = 0

    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date)
      const originalAmount = parseFloat(String(transaction.amount)) || 0
      const amount = convertToBaseCurrency(
        originalAmount,
        transaction.currency.code
      )

      if (transaction.type === 'INCOME') {
        totalIncome += amount
        incomeCount++
        if (transactionDate >= thisMonth) {
          thisMonthIncome += amount
        } else if (
          transactionDate >= lastMonth &&
          transactionDate < thisMonth
        ) {
          lastMonthIncome += amount
        }
      } else if (transaction.type === 'EXPENSE') {
        totalExpense += amount
        expenseCount++
        if (transactionDate >= thisMonth) {
          thisMonthExpense += amount
        } else if (
          transactionDate >= lastMonth &&
          transactionDate < thisMonth
        ) {
          lastMonthExpense += amount
        }
      }
    })

    const totalNet = totalIncome - totalExpense
    const thisMonthNet = thisMonthIncome - thisMonthExpense
    const lastMonthNet = lastMonthIncome - lastMonthExpense
    const monthlyChange =
      lastMonthNet !== 0
        ? ((thisMonthNet - lastMonthNet) / Math.abs(lastMonthNet)) * 100
        : 0

    const stats = {
      totalIncome,
      totalExpense,
      totalNet,
      thisMonthIncome,
      thisMonthExpense,
      thisMonthNet,
      monthlyChange,
      incomeCount,
      expenseCount,
      totalCount: transactions.length,
    }

    return successResponse(stats)
  } catch (error) {
    console.error('Get transaction stats error:', error)
    return errorResponse('获取交易统计失败', 500)
  }
}
