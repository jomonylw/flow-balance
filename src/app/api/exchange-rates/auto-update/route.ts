import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { ExchangeRateAutoUpdateService } from '@/lib/services/exchange-rate-auto-update.service'

/**
 * 手动更新汇率
 */
export async function POST(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 调用汇率自动更新服务
    const result = await ExchangeRateAutoUpdateService.updateExchangeRates(user.id, true)

    if (!result.success) {
      return errorResponse(result.message || '汇率更新失败', 500)
    }

    return successResponse(
      result.data,
      result.message
    )
  } catch (error) {
    console.error('Manual update exchange rates failed:', error)
    return errorResponse('汇率手动更新失败', 500)
  }
}
