import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { ExchangeRateAutoUpdateService } from '@/lib/services/exchange-rate-auto-update.service'
import { revalidateAllCurrencyAndExchangeRateCache } from '@/lib/services/cache-revalidation'

/**
 * 测试汇率更新的开发工具API
 * 仅在开发环境下可用
 */
export async function POST(_request: NextRequest) {
  // 仅在开发环境下可用
  if (process.env.NODE_ENV !== 'development') {
    return errorResponse('此 API 仅在开发环境下可用', 403)
  }

  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    console.log(`🧪 开始测试汇率更新 - 用户: ${user.email}`)

    // 强制更新汇率（忽略24小时限制）
    const result = await ExchangeRateAutoUpdateService.updateExchangeRates(
      user.id,
      true // forceUpdate = true
    )

    // 清除所有相关缓存
    revalidateAllCurrencyAndExchangeRateCache(user.id)
    console.log(`🧹 已清除用户 ${user.id} 的所有货币和汇率缓存`)

    if (!result.success) {
      console.error(`❌ 汇率更新失败: ${result.message}`)
      return errorResponse(result.message || '汇率更新失败', 500)
    }

    console.log('✅ 汇率更新成功:')
    console.log(`   - 更新数量: ${result.data?.updatedCount || 0}`)
    console.log(`   - 错误数量: ${result.data?.errors?.length || 0}`)
    console.log(`   - 数据源: ${result.data?.source || 'Unknown'}`)
    console.log(`   - 本位币: ${result.data?.baseCurrency || 'Unknown'}`)

    return successResponse({
      message: '汇率更新测试完成',
      userId: user.id,
      updateResult: result,
      cacheCleared: true,
    })
  } catch (error) {
    console.error('❌ 测试汇率更新失败:', error)
    return errorResponse('测试汇率更新失败', 500)
  }
}
