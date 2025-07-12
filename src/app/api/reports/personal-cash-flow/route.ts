import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
// import { getUserTranslator } from '@/lib/utils/server-i18n'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
import { normalizeDateRange } from '@/lib/utils/date-range'

/**
 * 个人现金流量表 API
 * 基于收入类（INCOME）和支出类（EXPENSE）账户进行统计
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

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

    // 获取时间范围内的所有收入和支出交易
    const { dateCondition } = normalizeDateRange(startDate, endDate)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: dateCondition,
        type: {
          in: ['INCOME', 'EXPENSE'],
        },
      },
      include: {
        account: {
          include: {
            category: true,
          },
        },
        currency: true,
      },
      orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
    })

    // 获取所有收入和支出类别的账户，确保即使没有交易记录的账户也能被包含
    const allIncomeExpenseAccounts = await prisma.account.findMany({
      where: {
        userId: user.id,
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

    // 按类别分组统计（类似资产负债表结构）
    const cashFlowByCategory = {
      income: {
        categories: {} as Record<
          string,
          {
            categoryId: string
            categoryName: string
            accounts: Array<{
              id: string
              name: string
              currency: {
                code: string
                symbol: string
                name: string
              }
              totalAmount: number
              totalAmountInBaseCurrency?: number
              conversionRate?: number
              conversionSuccess?: boolean
              conversionError?: string
              transactionCount: number
              transactions: Array<{
                id: string
                amount: number
                description: string
                date: string
                type: 'INCOME' | 'EXPENSE'
              }>
            }>
            totalByCurrency: Record<string, number>
            totalInBaseCurrency?: number
          }
        >,
      },
      expense: {
        categories: {} as Record<
          string,
          {
            categoryId: string
            categoryName: string
            accounts: Array<{
              id: string
              name: string
              currency: {
                code: string
                symbol: string
                name: string
              }
              totalAmount: number
              totalAmountInBaseCurrency?: number
              conversionRate?: number
              conversionSuccess?: boolean
              conversionError?: string
              transactionCount: number
              transactions: Array<{
                id: string
                amount: number
                description: string
                date: string
                type: 'INCOME' | 'EXPENSE'
              }>
            }>
            totalByCurrency: Record<string, number>
            totalInBaseCurrency?: number
          }
        >,
      },
    }

    // 按货币分组的总计
    const currencyTotals: Record<
      string,
      {
        currency: {
          code: string
          symbol: string
          name: string
        }
        totalIncome: number
        totalExpense: number
        netCashFlow: number
      }
    > = {}

    // 首先初始化所有收入和支出账户的结构，确保即使没有交易记录的账户也能显示
    for (const account of allIncomeExpenseAccounts) {
      const categoryId = account.category.id
      const accountType = account.category.type as 'INCOME' | 'EXPENSE'
      const currencyCode = account.currency?.code || baseCurrency.code

      // 确定是收入还是支出类别
      const categoryGroup =
        accountType === 'INCOME'
          ? cashFlowByCategory.income
          : cashFlowByCategory.expense

      // 初始化类别
      if (!categoryGroup.categories[categoryId]) {
        categoryGroup.categories[categoryId] = {
          categoryId: categoryId,
          categoryName: account.category.name,
          accounts: [],
          totalByCurrency: {},
        }
      }

      // 检查账户是否已存在
      let accountData = categoryGroup.categories[categoryId].accounts.find(
        acc => acc.id === account.id
      )
      if (!accountData) {
        accountData = {
          id: account.id,
          name: account.name,
          currency: account.currency || {
            code: baseCurrency.code,
            symbol: baseCurrency.symbol,
            name: baseCurrency.name,
          },
          totalAmount: 0,
          transactionCount: 0,
          transactions: [],
        }
        categoryGroup.categories[categoryId].accounts.push(accountData)
      }

      // 初始化货币总计
      if (!currencyTotals[currencyCode]) {
        currencyTotals[currencyCode] = {
          currency: account.currency || {
            code: baseCurrency.code,
            symbol: baseCurrency.symbol,
            name: baseCurrency.name,
          },
          totalIncome: 0,
          totalExpense: 0,
          netCashFlow: 0,
        }
      }

      // 初始化类别货币总计
      if (!categoryGroup.categories[categoryId].totalByCurrency[currencyCode]) {
        categoryGroup.categories[categoryId].totalByCurrency[currencyCode] = 0
      }
    }

    // 处理交易数据
    for (const transaction of transactions) {
      const accountId = transaction.account.id
      const categoryId = transaction.account.category.id
      const currencyCode = transaction.currency.code
      const amount =
        typeof transaction.amount === 'number'
          ? transaction.amount
          : parseFloat(transaction.amount.toString())
      const accountType = transaction.account.category.type as
        | 'INCOME'
        | 'EXPENSE'

      // 确定是收入还是支出类别
      const categoryGroup =
        accountType === 'INCOME'
          ? cashFlowByCategory.income
          : cashFlowByCategory.expense

      // 查找账户（应该已经存在，因为我们已经初始化了所有账户）
      let accountData = categoryGroup.categories[categoryId]?.accounts.find(
        acc => acc.id === accountId
      )

      // 如果账户不存在（理论上不应该发生），创建它
      if (!accountData) {
        // 初始化类别（如果不存在）
        if (!categoryGroup.categories[categoryId]) {
          categoryGroup.categories[categoryId] = {
            categoryId: categoryId,
            categoryName: transaction.account.category.name,
            accounts: [],
            totalByCurrency: {},
          }
        }

        accountData = {
          id: transaction.account.id,
          name: transaction.account.name,
          currency: transaction.currency,
          totalAmount: 0,
          transactionCount: 0,
          transactions: [],
        }
        categoryGroup.categories[categoryId].accounts.push(accountData)
      }

      // 初始化货币总计（如果不存在）
      if (!currencyTotals[currencyCode]) {
        currencyTotals[currencyCode] = {
          currency: transaction.currency,
          totalIncome: 0,
          totalExpense: 0,
          netCashFlow: 0,
        }
      }

      // 累加账户金额
      accountData.totalAmount += amount
      accountData.transactionCount += 1
      accountData.transactions.push({
        id: transaction.id,
        amount: amount,
        description: transaction.description,
        date: transaction.date.toISOString(),
        type: transaction.type as 'INCOME' | 'EXPENSE',
      })

      // 累加类别货币总计
      if (!categoryGroup.categories[categoryId].totalByCurrency[currencyCode]) {
        categoryGroup.categories[categoryId].totalByCurrency[currencyCode] = 0
      }
      categoryGroup.categories[categoryId].totalByCurrency[currencyCode] +=
        amount

      // 累加全局货币总计
      if (transaction.type === 'INCOME') {
        currencyTotals[currencyCode].totalIncome += amount
      } else if (transaction.type === 'EXPENSE') {
        currencyTotals[currencyCode].totalExpense += amount
      }
    }

    // 计算净现金流
    for (const currencyCode in currencyTotals) {
      currencyTotals[currencyCode].netCashFlow =
        currencyTotals[currencyCode].totalIncome -
        currencyTotals[currencyCode].totalExpense
    }

    // 对每个类别内的账户按总金额降序排序
    Object.values(cashFlowByCategory.income.categories).forEach(category => {
      category.accounts.sort((a, b) => b.totalAmount - a.totalAmount)
    })

    Object.values(cashFlowByCategory.expense.categories).forEach(category => {
      category.accounts.sort((a, b) => b.totalAmount - a.totalAmount)
    })

    // 货币转换到本位币 - 增强版本，包含账户级别的转换
    let baseCurrencyTotals = {
      totalIncome: 0,
      totalExpense: 0,
      netCashFlow: 0,
    }

    try {
      // 收集所有需要转换的账户金额
      const accountAmountsToConvert: Array<{
        amount: number
        currency: string
        accountId: string
        categoryId: string
        type: 'INCOME' | 'EXPENSE'
      }> = []

      // 收集收入类别的账户转换数据
      Object.entries(cashFlowByCategory.income.categories).forEach(
        ([categoryId, category]) => {
          category.accounts.forEach(account => {
            if (
              Math.abs(account.totalAmount) > 0.01 &&
              account.currency.code !== baseCurrency.code
            ) {
              accountAmountsToConvert.push({
                amount: account.totalAmount,
                currency: account.currency.code,
                accountId: account.id,
                categoryId,
                type: 'INCOME',
              })
            }
          })
        }
      )

      // 收集支出类别的账户转换数据
      Object.entries(cashFlowByCategory.expense.categories).forEach(
        ([categoryId, category]) => {
          category.accounts.forEach(account => {
            if (
              Math.abs(account.totalAmount) > 0.01 &&
              account.currency.code !== baseCurrency.code
            ) {
              accountAmountsToConvert.push({
                amount: account.totalAmount,
                currency: account.currency.code,
                accountId: account.id,
                categoryId,
                type: 'EXPENSE',
              })
            }
          })
        }
      )

      // 执行批量货币转换
      const accountConversions = await convertMultipleCurrencies(
        user.id,
        accountAmountsToConvert.map(item => ({
          amount: item.amount,
          currency: item.currency,
        })),
        baseCurrency.code
      )

      // 应用转换结果到账户
      accountConversions.forEach((result, index) => {
        const conversionData = accountAmountsToConvert[index]
        const convertedAmount = result.success
          ? result.convertedAmount
          : result.originalAmount

        // 根据类型找到对应的账户
        const categoryGroup =
          conversionData.type === 'INCOME'
            ? cashFlowByCategory.income
            : cashFlowByCategory.expense
        const category = categoryGroup.categories[conversionData.categoryId]
        const account = category.accounts.find(
          acc => acc.id === conversionData.accountId
        )

        if (account) {
          account.totalAmountInBaseCurrency = convertedAmount
          account.conversionRate = result.exchangeRate
          account.conversionSuccess = result.success
          account.conversionError = result.error
        }
      })

      // 为本位币账户设置转换信息
      Object.values(cashFlowByCategory.income.categories).forEach(category => {
        category.accounts.forEach(account => {
          if (account.currency.code === baseCurrency.code) {
            account.totalAmountInBaseCurrency = account.totalAmount
            account.conversionRate = 1
            account.conversionSuccess = true
          }
        })
      })

      Object.values(cashFlowByCategory.expense.categories).forEach(category => {
        category.accounts.forEach(account => {
          if (account.currency.code === baseCurrency.code) {
            account.totalAmountInBaseCurrency = account.totalAmount
            account.conversionRate = 1
            account.conversionSuccess = true
          }
        })
      })

      // 计算类别级别的本位币总计
      Object.values(cashFlowByCategory.income.categories).forEach(category => {
        category.totalInBaseCurrency = category.accounts.reduce(
          (sum, account) => sum + (account.totalAmountInBaseCurrency || 0),
          0
        )
      })

      Object.values(cashFlowByCategory.expense.categories).forEach(category => {
        category.totalInBaseCurrency = category.accounts.reduce(
          (sum, account) => sum + (account.totalAmountInBaseCurrency || 0),
          0
        )
      })

      // 计算总计
      baseCurrencyTotals.totalIncome = Object.values(
        cashFlowByCategory.income.categories
      ).reduce((sum, category) => sum + (category.totalInBaseCurrency || 0), 0)

      baseCurrencyTotals.totalExpense = Object.values(
        cashFlowByCategory.expense.categories
      ).reduce((sum, category) => sum + (category.totalInBaseCurrency || 0), 0)

      baseCurrencyTotals.netCashFlow =
        baseCurrencyTotals.totalIncome - baseCurrencyTotals.totalExpense
    } catch (error) {
      console.error('货币转换失败:', error)
      // 如果转换失败，使用原始数据（仅限本位币）
      const baseCurrencyData = currencyTotals[baseCurrency.code]
      if (baseCurrencyData) {
        baseCurrencyTotals = {
          totalIncome: baseCurrencyData.totalIncome,
          totalExpense: baseCurrencyData.totalExpense,
          netCashFlow: baseCurrencyData.netCashFlow,
        }
      }
    }

    const response = {
      period: {
        start: startDate,
        end: endDate,
      },
      baseCurrency,
      cashFlow: cashFlowByCategory,
      summary: {
        currencyTotals,
        baseCurrencyTotals,
        totalTransactions: transactions.length,
      },
    }

    return successResponse(response)
  } catch (error) {
    console.error('获取个人现金流量表失败:', error)
    return errorResponse('获取个人现金流量表失败')
  }
}
