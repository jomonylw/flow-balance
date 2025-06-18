import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
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
    const months = parseInt(searchParams.get('months') || '12') // 默认12个月

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
      category: account.category,
      transactions: account.transactions.map(t => ({
        type: t.type as 'INCOME' | 'EXPENSE' | 'BALANCE',
        amount: parseFloat(t.amount.toString()),
        date: t.date,
        currency: t.currency,
      })),
    }))

    // 生成月份数据
    const monthlyData = []
    const currentDate = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = subMonths(currentDate, i)
      const monthStart = startOfMonth(targetDate)
      const monthEnd = endOfMonth(targetDate)
      const monthLabel = format(targetDate, 'yyyy-MM')

      try {
        // 分离存量类账户（资产/负债）和流量类账户（收入/支出）
        const stockAccounts = accountsForCalculation.filter(
          account =>
            account.category.type === 'ASSET' ||
            account.category.type === 'LIABILITY'
        )

        const flowAccounts = accountsForCalculation.filter(
          account =>
            account.category.type === 'INCOME' ||
            account.category.type === 'EXPENSE'
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

          if (accountType === 'INCOME' || accountType === 'EXPENSE') {
            const monthlyTransactions = account.transactions.filter(t => {
              const transactionDate = new Date(t.date)
              return (
                transactionDate >= monthStart && transactionDate <= monthEnd
              )
            })

            monthlyTransactions.forEach(transaction => {
              if (transaction.amount > 0) {
                if (accountType === 'INCOME' && transaction.type === 'INCOME') {
                  monthlyIncomeAmounts.push({
                    amount: transaction.amount,
                    currency: transaction.currency.code,
                  })
                } else if (
                  accountType === 'EXPENSE' &&
                  transaction.type === 'EXPENSE'
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
          account => account.category.type === 'ASSET'
        )
        const liabilityAccounts = stockAccounts.filter(
          account => account.category.type === 'LIABILITY'
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
          type: 'line',
          data: monthlyData.map(d => d.totalAssets),
          smooth: true,
          itemStyle: { color: '#10b981' },
        },
        {
          name: 'total_liabilities', // 使用键名，前端翻译
          type: 'line',
          data: monthlyData.map(d => d.totalLiabilities),
          smooth: true,
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
      period: `最近${months}个月`,
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
