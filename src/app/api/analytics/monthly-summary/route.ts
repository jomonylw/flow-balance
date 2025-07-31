import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
// import { getUserTranslator } from '@/lib/utils/server-i18n'
import type { Prisma } from '@prisma/client'
import { getMonthsAgoDateRange } from '@/lib/utils/date-range'
import { AccountType, TransactionType } from '@/types/core/constants'
import { calculateAccountBalance } from '@/lib/services/account.service'
import { getAllCategoryIds } from '@/lib/services/category-summary/utils'
import { getCategoryTreeIds } from '@/lib/database/raw-queries'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '12') // 默认获取12个月的数据
    const categoryId = searchParams.get('categoryId') // 可选：特定分类的数据

    // 获取用户的基础货币设置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    const baseCurrency = userSettings?.baseCurrency || {
      code: 'CNY',
      symbol: '¥',
      name: '人民币',
    }

    // 如果指定了分类ID，检查分类类型
    let targetCategory = null
    if (categoryId) {
      targetCategory = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId: user.id,
        },
      })

      if (!targetCategory) {
        return errorResponse('分类不存在', 404)
      }

      // 如果是存量类分类，使用优化的存量数据处理逻辑
      if (
        targetCategory.type === 'ASSET' ||
        targetCategory.type === 'LIABILITY'
      ) {
        return await getOptimizedStockCategoryMonthlyData(
          user.id,
          categoryId,
          months,
          baseCurrency
        )
      }
    }

    // 使用优化的流量类数据处理逻辑
    return await getOptimizedFlowMonthlyData(
      user.id,
      categoryId,
      months,
      baseCurrency
    )
  } catch (error) {
    console.error('Get monthly summary error:', error)
    return errorResponse('获取月度汇总数据失败', 500)
  }
}

/**
 * 优化的存量类分类月度数据获取函数
 * 使用数据库聚合查询替代内存计算
 */
async function getOptimizedStockCategoryMonthlyData(
  userId: string,
  categoryId: string,
  months: number,
  baseCurrency: { code: string; symbol: string; name: string }
) {
  // 计算日期范围
  const { startDate, endDate } = getMonthsAgoDateRange(months)

  // 获取分类及其子分类的所有ID
  const getAllCategoryIds = async (categoryId: string): Promise<string[]> => {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { children: true },
    })

    if (!category) return [categoryId]

    let ids = [categoryId]
    for (const child of category.children) {
      const childIds = await getAllCategoryIds(child.id)
      ids = ids.concat(childIds)
    }
    return ids
  }

  const categoryIds = await getAllCategoryIds(categoryId)

  // 获取这些分类下的所有账户
  const accounts = await prisma.account.findMany({
    where: {
      categoryId: {
        in: categoryIds,
      },
      userId: userId,
    },
    include: {
      category: true,
      transactions: {
        include: {
          currency: true,
        },
        orderBy: {
          date: 'asc',
        },
      },
    },
  })

  // 按月计算每个账户的余额
  const monthlyData: Record<
    string,
    Record<
      string,
      {
        totalBalance: number
        accounts: Record<
          string,
          {
            id: string
            name: string
            balance: number
          }
        >
      }
    >
  > = {}

  // 生成完整的月份列表
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    monthlyData[monthKey] = {}
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  // 为每个账户计算月末余额
  for (const account of accounts) {
    // 序列化账户数据，将 Decimal 转换为 number
    const serializedAccount = {
      ...account,
      category: account.category
        ? {
            id: account.category.id,
            name: account.category.name,
            type: account.category.type as AccountType | undefined,
          }
        : {
            id: 'unknown',
            name: 'Unknown',
            type: undefined,
          },
      transactions: account.transactions.map(transaction => ({
        id: transaction.id,
        type: transaction.type as TransactionType,
        amount: parseFloat(transaction.amount.toString()),
        date: transaction.date.toISOString(),
        description: transaction.description,
        notes: transaction.notes,
        currency: {
          code: transaction.currency.code,
          symbol: transaction.currency.symbol,
          name: transaction.currency.name,
        },
      })),
    }

    // 为每个月计算该账户的余额
    Object.keys(monthlyData).forEach(monthKey => {
      const [year, month] = monthKey.split('-')
      const monthEnd = new Date(
        parseInt(year),
        parseInt(month),
        0,
        23,
        59,
        59,
        999
      ) // 月末最后一刻

      // 计算截止到该月末的余额
      const balancesAtMonthEnd = calculateAccountBalance(serializedAccount, {
        asOfDate: monthEnd,
        validateData: false, // 减少日志输出
      })

      // 如果该月没有余额数据，跳过
      if (Object.keys(balancesAtMonthEnd).length === 0) {
        return
      }

      Object.entries(balancesAtMonthEnd).forEach(
        ([currencyCode, balanceData]) => {
          if (!monthlyData[monthKey][currencyCode]) {
            monthlyData[monthKey][currencyCode] = {
              totalBalance: 0,
              accounts: {},
            }
          }

          monthlyData[monthKey][currencyCode].accounts[account.id] = {
            id: account.id,
            name: account.name,
            balance: balanceData.amount,
          }

          monthlyData[monthKey][currencyCode].totalBalance += balanceData.amount
        }
      )
    })
  }

  return successResponse({
    monthlyData,
    baseCurrency,
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    totalMonths: months,
    dataType: 'stock', // 标识为存量数据
  })
}

/**
 * 获取流量类数据（原有逻辑）
 */
async function _getFlowMonthlyData(
  userId: string,
  categoryId: string | null,
  months: number,
  baseCurrency: { code: string; symbol: string; name: string }
) {
  // 计算日期范围
  const { startDate, endDate } = getMonthsAgoDateRange(months)

  // 构建查询条件
  const whereCondition: Prisma.TransactionWhereInput = {
    userId: userId,
    date: {
      gte: startDate,
      lte: endDate,
    },
  }

  if (categoryId) {
    // 如果指定了分类，需要获取该分类及其子分类下的所有账户
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: userId,
      },
    })

    if (!category) {
      return errorResponse('分类不存在', 404)
    }

    // 使用优化的递归CTE查询获取所有子分类ID
    const categoryIds = await getAllCategoryIds(prisma, categoryId)

    // 获取这些分类下的所有账户ID
    const accounts = await prisma.account.findMany({
      where: {
        categoryId: {
          in: categoryIds,
        },
        userId: userId,
      },
      select: { id: true },
    })

    whereCondition.accountId = {
      in: accounts.map(acc => acc.id),
    }
  }

  // 获取交易数据
  const transactions = await prisma.transaction.findMany({
    where: whereCondition,
    include: {
      currency: true,
      account: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  })

  // 按月分组数据
  const monthlyData: Record<
    string,
    Record<
      string,
      {
        income: number
        expense: number
        balance: number
        transactionCount: number
        categories: Record<
          string,
          { income: number; expense: number; balance: number }
        >
      }
    >
  > = {}

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
        categories: {},
      }
    }
    if (!monthlyData[monthKey][currencyCode].categories[categoryName]) {
      monthlyData[monthKey][currencyCode].categories[categoryName] = {
        income: 0,
        expense: 0,
        balance: 0,
      }
    }

    // 累计数据
    monthlyData[monthKey][currencyCode].transactionCount++

    if (transaction.type === 'INCOME') {
      monthlyData[monthKey][currencyCode].income += amount
      monthlyData[monthKey][currencyCode].categories[categoryName].income +=
        amount
    } else if (transaction.type === 'EXPENSE') {
      monthlyData[monthKey][currencyCode].expense += amount
      monthlyData[monthKey][currencyCode].categories[categoryName].expense +=
        amount
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
  const completeMonthlyData: Record<
    string,
    Record<
      string,
      {
        income: number
        expense: number
        balance: number
        transactionCount: number
        categories: Record<
          string,
          { income: number; expense: number; balance: number }
        >
      }
    >
  > = {}
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    completeMonthlyData[monthKey] = monthlyData[monthKey] || {}
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return successResponse({
    monthlyData: completeMonthlyData,
    baseCurrency,
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    totalMonths: months,
    dataType: 'flow', // 标识为流量数据
  })
}

/**
 * 优化的流量类数据获取函数
 * 使用数据库聚合查询替代内存计算
 */
async function getOptimizedFlowMonthlyData(
  userId: string,
  categoryId: string | null,
  months: number,
  baseCurrency: { code: string; symbol: string; name: string }
) {
  // 计算日期范围
  const { startDate, endDate } = getMonthsAgoDateRange(months)

  // 构建查询条件
  let whereCondition = `t."userId" = '${userId}' AND t.date >= '${startDate.toISOString()}' AND t.date <= '${endDate.toISOString()}' AND t.type IN ('INCOME', 'EXPENSE')`

  if (categoryId) {
    const categoryIds = await getCategoryTreeIds(categoryId)
    const categoryIdsStr = categoryIds.map(id => `'${id}'`).join(',')
    whereCondition += ` AND a."categoryId" IN (${categoryIdsStr})`
  }

  // 使用单次数据库查询获取月度流量数据
  const monthlyFlowData = await prisma.$queryRaw<
    Array<{
      month: string
      account_id: string
      account_name: string
      category_name: string
      currency_code: string
      currency_symbol: string
      currency_name: string
      transaction_type: string
      total_amount: number
      transaction_count: number
    }>
  >`
    SELECT
      to_char(t.date, 'YYYY-MM') as month,
      a.id as account_id,
      a.name as account_name,
      cat.name as category_name,
      c.code as currency_code,
      c.symbol as currency_symbol,
      c.name as currency_name,
      t.type as transaction_type,
      SUM(t.amount) as total_amount,
      COUNT(*) as transaction_count
    FROM transactions t
    JOIN accounts a ON t."accountId" = a.id
    JOIN categories cat ON a."categoryId" = cat.id
    JOIN currencies c ON t."currencyId" = c.id
    WHERE ${whereCondition}
    GROUP BY month, a.id, a.name, cat.name, c.code, c.symbol, c.name, t.type
    ORDER BY month DESC, account_name
  `

  // 处理查询结果并按月分组
  const monthlyData: Record<string, any> = {}

  monthlyFlowData.forEach(row => {
    const month = row.month

    if (!monthlyData[month]) {
      monthlyData[month] = {
        month,
        accounts: {},
        totalByCurrency: {},
        totalInBaseCurrency: 0,
      }
    }

    if (!monthlyData[month].accounts[row.account_id]) {
      monthlyData[month].accounts[row.account_id] = {
        id: row.account_id,
        name: row.account_name,
        categoryName: row.category_name,
        income: {},
        expense: {},
        net: {},
      }
    }

    const account = monthlyData[month].accounts[row.account_id]
    const amount = parseFloat(row.total_amount.toString())
    const currency = {
      code: row.currency_code,
      symbol: row.currency_symbol,
      name: row.currency_name,
    }

    if (row.transaction_type === 'INCOME') {
      account.income[row.currency_code] = { amount, currency }
    } else if (row.transaction_type === 'EXPENSE') {
      account.expense[row.currency_code] = { amount, currency }
    }

    // 计算净值
    const incomeAmount = account.income[row.currency_code]?.amount || 0
    const expenseAmount = account.expense[row.currency_code]?.amount || 0
    account.net[row.currency_code] = {
      amount: incomeAmount - expenseAmount,
      currency,
    }

    // 累加到货币总计
    if (!monthlyData[month].totalByCurrency[row.currency_code]) {
      monthlyData[month].totalByCurrency[row.currency_code] = {
        income: 0,
        expense: 0,
        net: 0,
        currency,
      }
    }

    if (row.transaction_type === 'INCOME') {
      monthlyData[month].totalByCurrency[row.currency_code].income += amount
    } else if (row.transaction_type === 'EXPENSE') {
      monthlyData[month].totalByCurrency[row.currency_code].expense += amount
    }

    monthlyData[month].totalByCurrency[row.currency_code].net =
      monthlyData[month].totalByCurrency[row.currency_code].income -
      monthlyData[month].totalByCurrency[row.currency_code].expense
  })

  return successResponse({
    monthlyData: Object.values(monthlyData),
    baseCurrency,
    summary: {
      totalMonths: months,
      dataType: 'flow',
    },
  })
}
