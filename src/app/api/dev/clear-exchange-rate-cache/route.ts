import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import {
  revalidateExchangeRateCache,
  revalidateAllCurrencyAndExchangeRateCache,
} from '@/lib/services/cache-revalidation'

/**
 * 清除汇率缓存的开发工具API
 * 仅在开发环境下可用
 */
export async function POST(request: NextRequest) {
  // 仅在开发环境下可用
  if (process.env.NODE_ENV !== 'development') {
    return errorResponse('此 API 仅在开发环境下可用', 403)
  }

  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const clearAll = searchParams.get('all') === 'true'

    if (clearAll) {
      // 清除所有货币和汇率缓存
      revalidateAllCurrencyAndExchangeRateCache(user.id)
      console.log(`🧹 已清除用户 ${user.id} 的所有货币和汇率缓存`)
      return successResponse({
        message: '已清除所有货币和汇率缓存',
        userId: user.id,
        type: 'all',
      })
    } else {
      // 只清除汇率缓存
      revalidateExchangeRateCache(user.id)
      console.log(`🧹 已清除用户 ${user.id} 的汇率缓存`)
      return successResponse({
        message: '已清除汇率缓存',
        userId: user.id,
        type: 'exchange-rates-only',
      })
    }
  } catch (error) {
    console.error('清除汇率缓存失败:', error)
    return errorResponse('清除汇率缓存失败', 500)
  }
}
