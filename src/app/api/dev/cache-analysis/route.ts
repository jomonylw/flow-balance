import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { analyzeCachePerformance } from '@/lib/services/cache.service'

/**
 * 获取缓存性能分析
 */
export async function GET(_request: NextRequest) {
  try {
    // 仅在开发环境中可用
    if (process.env.NODE_ENV !== 'development') {
      return errorResponse('此API仅在开发环境中可用', 403)
    }

    const analysis = analyzeCachePerformance()

    return successResponse({
      analysis,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('获取缓存性能分析失败:', error)
    return errorResponse('获取缓存性能分析失败', 500)
  }
}
