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
import {
  getUserBaseCurrency,
  getOptimizedMonthlyNetWorthData,
  generateMonthsList,
  getUserEarliestTransactionDate,
} from '@/lib/services/dashboard.service'

/**
 * 净资产趋势图数据 API
 * 提供净资产、总资产、总负债的历史趋势数据
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
    const useAllData = monthsParam === 'all'
    let monthsList: Date[]

    if (useAllData) {
      // 获取用户最早的交易日期来确定数据范围
      const earliestDate = await getUserEarliestTransactionDate(user.id)
      if (earliestDate) {
        monthsList = generateMonthsList(earliestDate, new Date())
      } else {
        // 如果没有交易记录，默认显示最近12个月
        monthsList = generateMonthsList(12)
      }
    } else {
      const months = parseInt(monthsParam)
      monthsList = generateMonthsList(months)
    }

    // 获取用户设置以确定本位币
    const baseCurrency = await getUserBaseCurrency(user.id)

    // 使用优化的批量计算函数（并行化处理）
    const monthlyData = await getOptimizedMonthlyNetWorthData(
      user.id,
      monthsList,
      baseCurrency
    )

    // 获取精度常量并应用精度处理
    const precision = BUSINESS_LIMITS.PERCENTAGE_MULTIPLIER
    const processedData = monthlyData.map(data => ({
      ...data,
      netWorth: Math.round(data.netWorth * precision) / precision,
      totalAssets: Math.round(data.totalAssets * precision) / precision,
      totalLiabilities:
        Math.round(data.totalLiabilities * precision) / precision,
    }))

    // 准备图表数据 - 按照用户要求的顺序：总资产，总负债，净资产
    const netWorthChartData = {
      xAxis: processedData.map(d => d.month), // 使用标准格式 YYYY-MM
      series: [
        {
          name: 'total_assets', // 使用键名，前端翻译
          type: 'bar',
          data: processedData.map(d => d.totalAssets),
          itemStyle: {
            color: ColorManager.getAccountTypeColor(AccountType.ASSET),
          },
        },
        {
          name: 'total_liabilities', // 使用键名，前端翻译
          type: 'bar',
          data: processedData.map(d => -d.totalLiabilities), // 负债显示为负数
          itemStyle: {
            color: ColorManager.getAccountTypeColor(AccountType.LIABILITY),
          },
        },
        {
          name: 'net_worth', // 使用键名，前端翻译
          type: 'line',
          data: processedData.map(d => d.netWorth),
          smooth: true,
          itemStyle: { color: ColorManager.getSemanticColor('info') }, // 使用青色，与蓝色资产柱状图区分
        },
      ],
    }

    // 检查是否有转换错误
    const hasAnyConversionErrors = processedData.some(
      data => data.hasConversionErrors
    )

    return successResponse({
      netWorthChart: netWorthChartData,
      monthlyData: processedData,
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
    console.error('Get net worth chart data error:', error)
    return errorResponse(getCommonError('INTERNAL_ERROR'), 500)
  }
}
