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
      // 构建包含错误代码和参数的响应
      const errorData: any = {
        error: result.message || '汇率更新失败'
      }

      if (result.errorCode) {
        errorData.errorCode = result.errorCode
      }

      if (result.errorParams) {
        errorData.errorParams = result.errorParams
      }

      return new Response(JSON.stringify({
        success: false,
        ...errorData
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
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
