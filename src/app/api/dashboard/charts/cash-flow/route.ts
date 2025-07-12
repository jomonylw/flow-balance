import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { AccountType } from '@/types/core/constants'
import { ColorManager } from '@/lib/utils/color'
import { BUSINESS_LIMITS } from '@/lib/constants/app-config'
import { getCommonError } from '@/lib/constants/api-messages'
import { format } from 'date-fns'
import {
  getUserBaseCurrency,
  getUserAccountsForCalculation,
  calculateMonthlyCashFlowData,
  generateMonthsList,
  getUserEarliestTransactionDate,
} from '@/lib/services/dashboard.service'

/**
 * 现金流图表数据 API
 * 提供收入、支出、净现金流的月度数据
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
      // 获取用户最早的交易日期来确定实际需要的月份数
      const earliestDate = await getUserEarliestTransactionDate(user.id)
      if (earliestDate) {
        const now = new Date()
        const diffInMonths = Math.ceil(
          (now.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        )
        months = Math.min(diffInMonths + 1, BUSINESS_LIMITS.MAX_CHART_MONTHS)
      } else {
        months = 12 // 如果没有交易记录，默认显示12个月
      }
    } else {
      months = parseInt(monthsParam)
    }

    // 获取用户设置以确定本位币
    const baseCurrency = await getUserBaseCurrency(user.id)

    // 获取用户的所有账户
    const accountsForCalculation = await getUserAccountsForCalculation(user.id)

    // 生成月份列表
    const monthsList = generateMonthsList(months, useAllData)

    // 计算每个月的现金流数据
    const monthlyData: Array<{
      month: string
      monthName: string
      monthlyIncome: number
      monthlyExpense: number
      netCashFlow: number
      hasConversionErrors: boolean
      error?: string
    }> = []

    // 获取精度常量
    const precision = BUSINESS_LIMITS.PERCENTAGE_MULTIPLIER

    for (const targetDate of monthsList) {
      const monthLabel = format(targetDate, 'yyyy-MM')

      try {
        const cashFlowData = await calculateMonthlyCashFlowData(
          user.id,
          targetDate,
          accountsForCalculation,
          baseCurrency
        )

        monthlyData.push({
          month: monthLabel,
          monthName: format(targetDate, 'yyyy年MM月'),
          monthlyIncome:
            Math.round(cashFlowData.monthlyIncome * precision) / precision,
          monthlyExpense:
            Math.round(cashFlowData.monthlyExpense * precision) / precision,
          netCashFlow:
            Math.round(cashFlowData.netCashFlow * precision) / precision,
          hasConversionErrors: cashFlowData.hasConversionErrors,
        })
      } catch (error) {
        console.error(`计算月份 ${monthLabel} 现金流数据失败:`, error)
        // 添加错误数据点
        monthlyData.push({
          month: monthLabel,
          monthName: format(targetDate, 'yyyy年MM月'),
          monthlyIncome: 0,
          monthlyExpense: 0,
          netCashFlow: 0,
          hasConversionErrors: true,
          error: getCommonError('INTERNAL_ERROR'),
        })
      }
    }

    // 准备图表数据
    const cashFlowChartData = {
      xAxis: monthlyData.map(d => d.month), // 使用标准格式 YYYY-MM
      series: [
        {
          name: 'income', // 使用键名，前端翻译
          type: 'bar',
          data: monthlyData.map(d => d.monthlyIncome),
          itemStyle: {
            color: ColorManager.getAccountTypeColor(AccountType.INCOME),
          },
        },
        {
          name: 'expense', // 使用键名，前端翻译
          type: 'bar',
          data: monthlyData.map(d => -d.monthlyExpense), // 负值显示
          itemStyle: {
            color: ColorManager.getAccountTypeColor(AccountType.EXPENSE),
          },
        },
        {
          name: 'net_cash_flow', // 使用键名，前端翻译
          type: 'line',
          data: monthlyData.map(d => d.netCashFlow),
          smooth: true,
          itemStyle: { color: ColorManager.getSemanticColor('primary') },
          yAxisIndex: 1,
        },
      ],
    }

    // 检查是否有转换错误
    const hasAnyConversionErrors = monthlyData.some(
      data => data.hasConversionErrors
    )

    return successResponse({
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
    console.error('Get cash flow chart data error:', error)
    return errorResponse(getCommonError('INTERNAL_ERROR'), 500)
  }
}
