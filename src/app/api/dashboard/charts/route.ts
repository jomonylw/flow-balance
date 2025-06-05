import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { calculateAccountBalance } from '@/lib/account-balance'
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
      include: { baseCurrency: true }
    })

    const baseCurrency = userSettings?.baseCurrency || { code: 'CNY', symbol: '¥' }

    // 获取所有账户及其交易
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      include: {
        category: true,
        transactions: {
          include: {
            currency: true
          }
        }
      }
    })

    // 生成月份数据
    const monthlyData = []
    const currentDate = new Date()
    
    for (let i = months - 1; i >= 0; i--) {
      const targetDate = subMonths(currentDate, i)
      const monthStart = startOfMonth(targetDate)
      const monthEnd = endOfMonth(targetDate)
      const monthLabel = format(targetDate, 'yyyy-MM')

      // 计算该月末的净资产
      let totalAssets = 0
      let totalLiabilities = 0
      let monthlyIncome = 0
      let monthlyExpense = 0

      accounts.forEach(account => {
        const accountType = account.category.type
        
        // 计算到月末的余额（存量）
        const balances = calculateAccountBalance(account, monthEnd)
        const balance = balances[baseCurrency.code]?.amount || 0

        if (accountType === 'ASSET') {
          totalAssets += balance
        } else if (accountType === 'LIABILITY') {
          totalLiabilities += balance
        }

        // 计算当月的现金流（流量）
        const monthlyTransactions = account.transactions.filter(t => {
          const transactionDate = new Date(t.date)
          return transactionDate >= monthStart && transactionDate <= monthEnd &&
                 t.currency.code === baseCurrency.code
        })

        monthlyTransactions.forEach(transaction => {
          if (accountType === 'INCOME' && transaction.type === 'INCOME') {
            monthlyIncome += transaction.amount
          } else if (accountType === 'EXPENSE' && transaction.type === 'EXPENSE') {
            monthlyExpense += transaction.amount
          }
        })
      })

      const netWorth = totalAssets - totalLiabilities
      const netCashFlow = monthlyIncome - monthlyExpense

      monthlyData.push({
        month: monthLabel,
        monthName: format(targetDate, 'yyyy年MM月'),
        netWorth: Math.round(netWorth * 100) / 100,
        totalAssets: Math.round(totalAssets * 100) / 100,
        totalLiabilities: Math.round(totalLiabilities * 100) / 100,
        monthlyIncome: Math.round(monthlyIncome * 100) / 100,
        monthlyExpense: Math.round(monthlyExpense * 100) / 100,
        netCashFlow: Math.round(netCashFlow * 100) / 100
      })
    }

    // 准备图表数据
    const netWorthChartData = {
      title: '净资产变化趋势',
      xAxis: monthlyData.map(d => d.monthName),
      series: [
        {
          name: '净资产',
          type: 'line',
          data: monthlyData.map(d => d.netWorth),
          smooth: true,
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: '总资产',
          type: 'line',
          data: monthlyData.map(d => d.totalAssets),
          smooth: true,
          itemStyle: { color: '#10b981' }
        },
        {
          name: '总负债',
          type: 'line',
          data: monthlyData.map(d => d.totalLiabilities),
          smooth: true,
          itemStyle: { color: '#ef4444' }
        }
      ]
    }

    const cashFlowChartData = {
      title: '每月现金流',
      xAxis: monthlyData.map(d => d.monthName),
      series: [
        {
          name: '收入',
          type: 'bar',
          data: monthlyData.map(d => d.monthlyIncome),
          itemStyle: { color: '#10b981' }
        },
        {
          name: '支出',
          type: 'bar',
          data: monthlyData.map(d => -d.monthlyExpense), // 负值显示
          itemStyle: { color: '#ef4444' }
        },
        {
          name: '净现金流',
          type: 'line',
          data: monthlyData.map(d => d.netCashFlow),
          smooth: true,
          itemStyle: { color: '#3b82f6' },
          yAxisIndex: 1
        }
      ]
    }

    return successResponse({
      netWorthChart: netWorthChartData,
      cashFlowChart: cashFlowChartData,
      monthlyData,
      currency: baseCurrency,
      period: `最近${months}个月`
    })
  } catch (error) {
    console.error('Get dashboard charts error:', error)
    return errorResponse('获取图表数据失败', 500)
  }
}
