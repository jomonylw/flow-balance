import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { TransactionType, AccountType } from '@/types/core/constants'
import { calculateTotalBalanceWithConversion } from '@/lib/services/account.service'
import { convertMultipleCurrencies } from '@/lib/services/currency.service'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

/**
 * Dashboard 图表数据 API
 * 提供净资产变化图和现金流图的数据
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const monthsParam = searchParams.get('months') || '12'

    // 支持 'all' 参数来获取所有历史数据
    let months: number
    let useAllData = false

    if (monthsParam === 'all') {
      useAllData = true
      // 设置一个足够大的数字来获取所有数据，或者我们可以动态计算
      months = 1000 // 临时设置，后面会根据实际数据调整
    } else {
      months = parseInt(monthsParam)
    }

    // 获取用户设置以确定本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    const baseCurrency = userSettings?.baseCurrency || {
      code: 'CNY',
      symbol: '¥',
      name: '人民币',
    }

    // 获取所有账户及其交易
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          include: {
            currency: true,
          },
        },
      },
    })

    // 转换账户数据格式
    const accountsForCalculation = accounts.map(account => ({
      id: account.id,
      name: account.name,
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
      transactions: account.transactions.map(t => ({
        id: t.id,
        type: t.type as TransactionType,
        amount: parseFloat(t.amount.toString()),
        date: t.date.toISOString(),
        description: t.description,
        notes: t.notes,
        currency: {
          code: t.currency.code,
          symbol: t.currency.symbol,
          name: t.currency.name,
        },
      })),
    }))

    // 生成月份数据
    const monthlyData = []
    const currentDate = new Date()

    // 如果是获取所有数据，需要先确定实际的数据范围
    let actualMonths = months
    if (useAllData) {
      // 找到最早的交易日期来确定实际需要的月份数
      const earliestTransaction = await prisma.transaction.findFirst({
        where: { account: { userId: user.id } },
        orderBy: { date: 'asc' },
        select: { date: true },
      })

      if (earliestTransaction) {
        const earliestDate = earliestTransaction.date
        const monthsDiff = Math.ceil(
          (currentDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        ) + 1 // 加1确保包含当前月
        actualMonths = Math.max(monthsDiff, 1)
      } else {
        actualMonths = 12 // 如果没有交易记录，默认12个月
      }
    }

    for (let i = actualMonths - 1; i >= 0; i--) {
      const targetDate = subMonths(currentDate, i)
      const monthStart = startOfMonth(targetDate)
      const monthEnd = endOfMonth(targetDate)
      const monthLabel = format(targetDate, 'yyyy-MM')

      try {
        // 分离存量类账户（资产/负债）和流量类账户（收入/支出）
        const stockAccounts = accountsForCalculation.filter(
          account =>
            account.category.type === AccountType.ASSET ||
            account.category.type === AccountType.LIABILITY
        )

        const flowAccounts = accountsForCalculation.filter(
          account =>
            account.category.type === AccountType.INCOME ||
            account.category.type === AccountType.EXPENSE
        )

        // 计算该月末的净资产（只包含存量类账户）
        const netWorthResult = await calculateTotalBalanceWithConversion(
          user.id,
          stockAccounts,
          baseCurrency,
          { asOfDate: monthEnd }
        )

        // 计算当月现金流（收入和支出）
        const monthlyIncomeAmounts: Array<{
          amount: number
          currency: string
        }> = []
        const monthlyExpenseAmounts: Array<{
          amount: number
          currency: string
        }> = []

        // 只使用流量类账户计算现金流
        flowAccounts.forEach(account => {
          const accountType = account.category.type

          if (
            accountType === AccountType.INCOME ||
            accountType === AccountType.EXPENSE
          ) {
            const monthlyTransactions = account.transactions.filter(t => {
              const transactionDate = new Date(t.date)
              return (
                transactionDate >= monthStart && transactionDate <= monthEnd
              )
            })

            monthlyTransactions.forEach(transaction => {
              if (transaction.amount > 0) {
                if (
                  accountType === AccountType.INCOME &&
                  transaction.type === TransactionType.INCOME
                ) {
                  monthlyIncomeAmounts.push({
                    amount: transaction.amount,
                    currency: transaction.currency.code,
                  })
                } else if (
                  accountType === AccountType.EXPENSE &&
                  transaction.type === TransactionType.EXPENSE
                ) {
                  monthlyExpenseAmounts.push({
                    amount: transaction.amount,
                    currency: transaction.currency.code,
                  })
                }
              }
            })
          }
        })

        // 转换收支到本位币
        const [incomeConversions, expenseConversions] = await Promise.all([
          convertMultipleCurrencies(
            user.id,
            monthlyIncomeAmounts,
            baseCurrency.code,
            monthEnd
          ),
          convertMultipleCurrencies(
            user.id,
            monthlyExpenseAmounts,
            baseCurrency.code,
            monthEnd
          ),
        ])

        const monthlyIncomeInBaseCurrency = incomeConversions.reduce(
          (sum, result) => {
            if (result.success) {
              return sum + result.convertedAmount
            } else if (result.originalCurrency === baseCurrency.code) {
              // 只有相同货币时才使用原始金额
              return sum + result.originalAmount
            } else {
              console.warn(
                `收入汇率转换失败: ${result.originalCurrency} -> ${baseCurrency.code}`
              )
              return sum // 不添加转换失败的金额
            }
          },
          0
        )

        const monthlyExpenseInBaseCurrency = expenseConversions.reduce(
          (sum, result) => {
            if (result.success) {
              return sum + result.convertedAmount
            } else if (result.originalCurrency === baseCurrency.code) {
              // 只有相同货币时才使用原始金额
              return sum + result.originalAmount
            } else {
              console.warn(
                `支出汇率转换失败: ${result.originalCurrency} -> ${baseCurrency.code}`
              )
              return sum // 不添加转换失败的金额
            }
          },
          0
        )

        const netCashFlow =
          monthlyIncomeInBaseCurrency - monthlyExpenseInBaseCurrency

        // 分离资产和负债
        let totalAssets = 0
        let totalLiabilities = 0

        Object.entries(netWorthResult.totalsByOriginalCurrency).forEach(
          ([_currencyCode, _balance]) => {
            // 这里需要根据账户类型来分离资产和负债
            // 由于我们已经过滤了账户，这里的逻辑需要重新计算
          }
        )

        // 使用已经过滤的存量类账户分别计算资产和负债
        const assetAccounts = stockAccounts.filter(
          account => account.category.type === AccountType.ASSET
        )
        const liabilityAccounts = stockAccounts.filter(
          account => account.category.type === AccountType.LIABILITY
        )

        const [assetResult, liabilityResult] = await Promise.all([
          calculateTotalBalanceWithConversion(
            user.id,
            assetAccounts,
            baseCurrency,
            { asOfDate: monthEnd }
          ),
          calculateTotalBalanceWithConversion(
            user.id,
            liabilityAccounts,
            baseCurrency,
            { asOfDate: monthEnd }
          ),
        ])

        totalAssets = assetResult.totalInBaseCurrency
        totalLiabilities = Math.abs(liabilityResult.totalInBaseCurrency) // 负债显示为正数

        const netWorth = totalAssets - totalLiabilities

        monthlyData.push({
          month: monthLabel,
          monthName: format(targetDate, 'yyyy年MM月'),
          netWorth: Math.round(netWorth * 100) / 100,
          totalAssets: Math.round(totalAssets * 100) / 100,
          totalLiabilities: Math.round(totalLiabilities * 100) / 100,
          monthlyIncome: Math.round(monthlyIncomeInBaseCurrency * 100) / 100,
          monthlyExpense: Math.round(monthlyExpenseInBaseCurrency * 100) / 100,
          netCashFlow: Math.round(netCashFlow * 100) / 100,
          hasConversionErrors:
            netWorthResult.hasConversionErrors ||
            incomeConversions.some(r => !r.success) ||
            expenseConversions.some(r => !r.success),
        })
      } catch (error) {
        console.error(`计算月份 ${monthLabel} 数据失败:`, error)
        // 添加错误数据点
        monthlyData.push({
          month: monthLabel,
          monthName: format(targetDate, 'yyyy年MM月'),
          netWorth: 0,
          totalAssets: 0,
          totalLiabilities: 0,
          monthlyIncome: 0,
          monthlyExpense: 0,
          netCashFlow: 0,
          hasConversionErrors: true,
          error: '数据计算失败',
        })
      }
    }

    // 准备图表数据 - 移除硬编码文本，让前端组件处理国际化
    const netWorthChartData = {
      xAxis: monthlyData.map(d => d.month), // 使用标准格式 YYYY-MM
      series: [
        {
          name: 'net_worth', // 使用键名，前端翻译
          type: 'line',
          data: monthlyData.map(d => d.netWorth),
          smooth: true,
          itemStyle: { color: '#3b82f6' },
        },
        {
          name: 'total_assets', // 使用键名，前端翻译
          type: 'bar',
          data: monthlyData.map(d => d.totalAssets),
          itemStyle: { color: '#10b981' },
        },
        {
          name: 'total_liabilities', // 使用键名，前端翻译
          type: 'bar',
          data: monthlyData.map(d => -d.totalLiabilities), // 负债显示为负数
          itemStyle: { color: '#ef4444' },
        },
      ],
    }

    const cashFlowChartData = {
      xAxis: monthlyData.map(d => d.month), // 使用标准格式 YYYY-MM
      series: [
        {
          name: 'income', // 使用键名，前端翻译
          type: 'bar',
          data: monthlyData.map(d => d.monthlyIncome),
          itemStyle: { color: '#10b981' },
        },
        {
          name: 'expense', // 使用键名，前端翻译
          type: 'bar',
          data: monthlyData.map(d => -d.monthlyExpense), // 负值显示
          itemStyle: { color: '#ef4444' },
        },
        {
          name: 'net_cash_flow', // 使用键名，前端翻译
          type: 'line',
          data: monthlyData.map(d => d.netCashFlow),
          smooth: true,
          itemStyle: { color: '#3b82f6' },
          yAxisIndex: 1,
        },
      ],
    }

    // 检查是否有转换错误
    const hasAnyConversionErrors = monthlyData.some(
      data => data.hasConversionErrors
    )

    return successResponse({
      netWorthChart: netWorthChartData,
      cashFlowChart: cashFlowChartData,
      monthlyData,
      currency: baseCurrency,
      period: useAllData ? '全部历史数据' : `最近${monthsParam}个月`,
      currencyConversion: {
        baseCurrency,
        hasErrors: hasAnyConversionErrors,
        note: hasAnyConversionErrors
          ? '部分数据可能因汇率缺失而不准确'
          : '所有数据已正确转换为本位币',
      },
    })
  } catch (error) {
    console.error('Get dashboard charts error:', error)
    return errorResponse('获取图表数据失败', 500)
  }
}
