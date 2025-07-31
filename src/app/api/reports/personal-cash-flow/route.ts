import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
// import { getUserTranslator } from '@/lib/utils/server-i18n'

import { normalizeDateRange } from '@/lib/utils/date-range'
import { getCashFlowData } from '@/lib/database/raw-queries'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'

/**
 * 个人现金流量表 API
 * 基于收入类（INCOME）和支出类（EXPENSE）账户进行统计
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🚀 现金流报表API被调用 - 修复汇总计算')
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }
    console.log('✅ 用户认证成功:', user.id)

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return errorResponse('开始日期和结束日期是必需的')
    }

    // 获取用户设置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    const baseCurrency = userSettings?.baseCurrency || {
      code: 'CNY',
      symbol: '¥',
      name: '人民币',
    }

    // 使用优化的数据库聚合查询获取现金流数据
    const { startDateTime, endDateTime } = normalizeDateRange(
      startDate,
      endDate
    )

    if (!startDateTime || !endDateTime) {
      return errorResponse('日期范围无效', 400)
    }

    const [cashFlowData, allIncomeExpenseAccounts] = await Promise.all([
      getCashFlowData(user.id, {
        startDate: startDateTime,
        endDate: endDateTime,
      }),
      getAllIncomeExpenseAccounts(user.id),
    ])

    // 使用优化的数据处理逻辑
    const cashFlowByCategory = await processOptimizedCashFlowData(
      cashFlowData,
      allIncomeExpenseAccounts,
      baseCurrency,
      user.id
    )

    const response = {
      period: {
        start: startDate,
        end: endDate,
      },
      baseCurrency,
      cashFlow: cashFlowByCategory.cashFlow,
      summary: cashFlowByCategory.summary,
    }

    return successResponse(response)
  } catch (error) {
    console.error('获取个人现金流量表失败:', error)
    return errorResponse('获取个人现金流量表失败')
  }
}

/**
 * 获取所有收入和支出账户
 */
async function getAllIncomeExpenseAccounts(userId: string) {
  return await prisma.account.findMany({
    where: {
      userId,
      category: {
        type: {
          in: ['INCOME', 'EXPENSE'],
        },
      },
    },
    include: {
      category: true,
      currency: true,
    },
  })
}

/**
 * 处理优化的现金流数据
 */
async function processOptimizedCashFlowData(
  cashFlowData: any[],
  allAccounts: any[],
  baseCurrency: any,
  userId?: string
) {
  const cashFlow = {
    income: { categories: {} as any },
    expense: { categories: {} as any },
  }

  const currencyTotals: Record<string, any> = {}

  // 初始化所有账户结构（确保所有账户都显示，即使没有交易）
  for (const account of allAccounts) {
    const categoryId = account.category.id
    const accountType = account.category.type as 'INCOME' | 'EXPENSE'
    const currencyCode = account.currency?.code || baseCurrency.code

    const categoryGroup =
      accountType === 'INCOME' ? cashFlow.income : cashFlow.expense

    if (!categoryGroup.categories[categoryId]) {
      categoryGroup.categories[categoryId] = {
        categoryId,
        categoryName: account.category.name,
        accounts: [],
        totalByCurrency: {},
      }
    }

    // 初始化货币总计
    if (!currencyTotals[currencyCode]) {
      currencyTotals[currencyCode] = {
        currency: {
          code: currencyCode,
          symbol: account.currency?.symbol || baseCurrency.symbol,
          name: account.currency?.name || baseCurrency.name,
        },
        totalIncome: 0,
        totalExpense: 0,
        netCashFlow: 0,
      }
    }

    // 添加账户到分类中（所有账户都会被添加，即使没有交易）
    const accountData = categoryGroup.categories[categoryId].accounts.find(
      (acc: any) => acc.id === account.id
    )
    if (!accountData) {
      categoryGroup.categories[categoryId].accounts.push({
        id: account.id,
        name: account.name,
        currency: {
          code: currencyCode,
          symbol: account.currency?.symbol || baseCurrency.symbol,
          name: account.currency?.name || baseCurrency.name,
        },
        totalAmount: 0,
        transactionCount: 0,
        transactions: [],
      })
    }

    // 确保所有账户的货币都在 totalByCurrency 中有条目，即使金额为0
    if (!categoryGroup.categories[categoryId].totalByCurrency[currencyCode]) {
      categoryGroup.categories[categoryId].totalByCurrency[currencyCode] = 0
    }
  }

  // 填充实际数据
  for (const row of cashFlowData) {
    const categoryType = row.categoryType as 'INCOME' | 'EXPENSE'
    const categoryGroup =
      categoryType === 'INCOME' ? cashFlow.income : cashFlow.expense
    const amount = row.totalAmount
    const count = row.transactionCount

    // 更新账户数据
    const category = categoryGroup.categories[row.categoryId]
    if (category) {
      const account = category.accounts.find(
        (acc: any) => acc.id === row.accountId
      )
      if (account) {
        account.totalAmount += amount
        account.transactionCount += count
      }

      // 更新分类总计
      if (!category.totalByCurrency[row.currencyCode]) {
        category.totalByCurrency[row.currencyCode] = 0
      }
      category.totalByCurrency[row.currencyCode] += amount
    }

    // 更新货币总计
    if (currencyTotals[row.currencyCode]) {
      if (categoryType === 'INCOME') {
        currencyTotals[row.currencyCode].totalIncome += amount
      } else {
        currencyTotals[row.currencyCode].totalExpense += amount
      }
    }
  }

  // 计算净现金流
  for (const currencyCode in currencyTotals) {
    currencyTotals[currencyCode].netCashFlow =
      currencyTotals[currencyCode].totalIncome -
      currencyTotals[currencyCode].totalExpense
  }

  // 为每个账户添加本位币转换金额
  console.log('🔄 开始为账户添加本位币转换金额...')
  await addBaseCurrencyAmountsToAccounts(cashFlow, baseCurrency, userId)
  console.log('✅ 账户本位币转换金额添加完成')

  // 计算本位币汇总（基于转换后的金额）
  const baseCurrencyTotals = {
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
  }

  // 从转换后的账户金额计算本位币汇总
  console.log('🔄 开始计算本位币汇总...')

  // 计算收入汇总
  Object.values(cashFlow.income.categories).forEach((category: any) => {
    category.accounts.forEach((account: any) => {
      const baseCurrencyAmount = account.totalAmountInBaseCurrency || 0
      baseCurrencyTotals.totalIncome += baseCurrencyAmount
      console.log(
        `📊 收入账户 ${account.name}: ${account.totalAmount} ${account.currency.code} → ${baseCurrencyAmount} ${baseCurrency.code}`
      )
    })
  })

  // 计算支出汇总
  Object.values(cashFlow.expense.categories).forEach((category: any) => {
    category.accounts.forEach((account: any) => {
      const baseCurrencyAmount = account.totalAmountInBaseCurrency || 0
      baseCurrencyTotals.totalExpense += baseCurrencyAmount
      console.log(
        `📊 支出账户 ${account.name}: ${account.totalAmount} ${account.currency.code} → ${baseCurrencyAmount} ${baseCurrency.code}`
      )
    })
  })

  baseCurrencyTotals.netCashFlow =
    baseCurrencyTotals.totalIncome - baseCurrencyTotals.totalExpense

  console.log('✅ 本位币汇总计算完成:', {
    totalIncome: baseCurrencyTotals.totalIncome,
    totalExpense: baseCurrencyTotals.totalExpense,
    netCashFlow: baseCurrencyTotals.netCashFlow,
  })

  // 排序账户
  Object.values(cashFlow.income.categories).forEach((category: any) => {
    category.accounts.sort((a: any, b: any) => b.totalAmount - a.totalAmount)
  })

  Object.values(cashFlow.expense.categories).forEach((category: any) => {
    category.accounts.sort((a: any, b: any) => b.totalAmount - a.totalAmount)
  })

  return {
    cashFlow,
    summary: {
      currencyTotals,
      baseCurrencyTotals,
      totalTransactions: cashFlowData.reduce(
        (sum, row) => sum + Number(row.transaction_count),
        0
      ),
    },
  }
}

/**
 * 为每个账户添加本位币转换金额
 */
async function addBaseCurrencyAmountsToAccounts(
  cashFlow: any,
  baseCurrency: any,
  userId?: string
) {
  // 收集所有需要转换的金额
  const amountsToConvert: Array<{ amount: number; currency: string }> = []
  const accountMappings: Array<{ account: any; index: number }> = []

  // 遍历收入账户
  Object.values(cashFlow.income.categories).forEach((category: any) => {
    category.accounts.forEach((account: any) => {
      if (account.currency.code !== baseCurrency.code) {
        // 非本位币账户需要转换
        amountsToConvert.push({
          amount: account.totalAmount,
          currency: account.currency.code,
        })
        accountMappings.push({ account, index: amountsToConvert.length - 1 })
      } else {
        // 本位币账户直接设置本位币金额
        account.totalAmountInBaseCurrency = account.totalAmount
      }
    })
  })

  // 遍历支出账户
  Object.values(cashFlow.expense.categories).forEach((category: any) => {
    category.accounts.forEach((account: any) => {
      if (account.currency.code !== baseCurrency.code) {
        // 非本位币账户需要转换
        amountsToConvert.push({
          amount: account.totalAmount,
          currency: account.currency.code,
        })
        accountMappings.push({ account, index: amountsToConvert.length - 1 })
      } else {
        // 本位币账户直接设置本位币金额
        account.totalAmountInBaseCurrency = account.totalAmount
      }
    })
  })

  // 如果没有需要转换的金额，直接返回
  if (amountsToConvert.length === 0) {
    return
  }

  try {
    // 批量转换货币
    const conversionResults = await convertMultipleCurrencies(
      userId || '',
      amountsToConvert,
      baseCurrency.code
    )

    // 将转换结果应用到对应的账户
    accountMappings.forEach(({ account, index }) => {
      const result = conversionResults[index]
      if (result && result.success) {
        account.totalAmountInBaseCurrency = result.convertedAmount
      } else if (result && result.fromCurrency === baseCurrency.code) {
        // 如果是相同货币，直接使用原始金额
        account.totalAmountInBaseCurrency = result.originalAmount
      } else {
        // 转换失败，使用0
        account.totalAmountInBaseCurrency = 0
      }
    })
  } catch (error) {
    console.error('批量货币转换失败:', error)
    // 转换失败时，为所有账户设置默认值
    accountMappings.forEach(({ account }) => {
      if (account.currency.code === baseCurrency.code) {
        account.totalAmountInBaseCurrency = account.totalAmount
      } else {
        account.totalAmountInBaseCurrency = 0
      }
    })
  }
}
