/**
 * 开发环境缓存统计 API
 * 仅在开发环境下可用
 */

import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { cacheStats } from '@/lib/services/cache.service'
import { cacheAnalyzer } from '@/lib/utils/cache-monitor'

/**
 * 获取缓存统计信息
 */
export async function GET() {
  // 仅在开发环境下可用
  if (process.env.NODE_ENV !== 'development') {
    return errorResponse('此 API 仅在开发环境下可用', 403)
  }

  try {
    const globalStats = cacheStats.getGlobalStats()
    const functionStats = cacheStats.getFunctionStats()

    // 计算一些额外的统计信息
    const totalFunctions = Object.keys(functionStats).length
    const highPerformanceFunctions = Object.values(functionStats).filter(
      stats => parseFloat(stats.hitRate) >= 80
    ).length
    const lowPerformanceFunctions = Object.values(functionStats).filter(
      stats => parseFloat(stats.hitRate) < 60 && stats.total > 3
    ).length

    const analysis = {
      summary: {
        totalFunctions,
        highPerformanceFunctions,
        lowPerformanceFunctions,
        averageHitRate:
          totalFunctions > 0
            ? (
                Object.values(functionStats).reduce(
                  (sum, stats) => sum + parseFloat(stats.hitRate),
                  0
                ) / totalFunctions
              ).toFixed(1) + '%'
            : '0.0%',
      },
      recommendations: generateRecommendations(functionStats),
    }

    return successResponse({
      timestamp: new Date().toISOString(),
      global: globalStats,
      functions: functionStats,
      analysis,
    })
  } catch (error) {
    console.error('获取缓存统计失败:', error)
    return errorResponse('获取缓存统计失败', 500)
  }
}

/**
 * 重置缓存统计
 */
export async function DELETE() {
  // 仅在开发环境下可用
  if (process.env.NODE_ENV !== 'development') {
    return errorResponse('此 API 仅在开发环境下可用', 403)
  }

  try {
    cacheAnalyzer.reset()
    return successResponse({ message: '缓存统计已重置' })
  } catch (error) {
    console.error('重置缓存统计失败:', error)
    return errorResponse('重置缓存统计失败', 500)
  }
}

/**
 * 触发缓存性能分析
 */
export async function POST(request: NextRequest) {
  // 仅在开发环境下可用
  if (process.env.NODE_ENV !== 'development') {
    return errorResponse('此 API 仅在开发环境下可用', 403)
  }

  try {
    const body = await request.json()
    const { action } = body

    if (action === 'analyze') {
      // 触发控制台分析
      cacheAnalyzer.analyzePerformance()

      // 返回分析结果
      const stats = cacheAnalyzer.exportStats()
      return successResponse({
        message: '缓存性能分析已完成，请查看控制台输出',
        stats,
      })
    }

    return errorResponse('未知的操作类型', 400)
  } catch (error) {
    console.error('缓存分析失败:', error)
    return errorResponse('缓存分析失败', 500)
  }
}

/**
 * 生成优化建议
 */
function generateRecommendations(functionStats: Record<string, any>): string[] {
  const recommendations: string[] = []

  // 分析低性能函数
  const lowPerformanceFunctions = Object.entries(functionStats)
    .filter(([, stats]) => parseFloat(stats.hitRate) < 60 && stats.total > 3)
    .sort(([, a], [, b]) => b.total - a.total) // 按调用次数排序

  if (lowPerformanceFunctions.length > 0) {
    recommendations.push(
      `发现 ${lowPerformanceFunctions.length} 个低性能缓存函数需要优化`
    )

    lowPerformanceFunctions.slice(0, 3).forEach(([functionName, stats]) => {
      recommendations.push(
        `${functionName}: 命中率 ${stats.hitRate}，建议检查缓存失效逻辑或增加 TTL`
      )
    })
  }

  // 分析高频调用但低命中率的函数
  const highFrequencyLowHitRate = Object.entries(functionStats)
    .filter(([, stats]) => stats.total > 10 && parseFloat(stats.hitRate) < 70)
    .sort(([, a], [, b]) => b.total - a.total)

  if (highFrequencyLowHitRate.length > 0) {
    recommendations.push('高频调用但低命中率的函数需要重点优化:')
    highFrequencyLowHitRate.slice(0, 2).forEach(([functionName, stats]) => {
      recommendations.push(
        `${functionName}: ${stats.total} 次调用，命中率 ${stats.hitRate}`
      )
    })
  }

  // 分析未使用的缓存函数
  const unusedFunctions = Object.entries(functionStats).filter(
    ([, stats]) => stats.total === 0
  )

  if (unusedFunctions.length > 0) {
    recommendations.push(
      `发现 ${unusedFunctions.length} 个未使用的缓存函数，考虑移除`
    )
  }

  // 全局建议
  const globalStats = cacheStats.getGlobalStats()
  const globalHitRate = parseFloat(globalStats.hitRate)

  if (globalHitRate < 70) {
    recommendations.push('整体缓存命中率偏低，建议检查缓存策略和失效机制')
  } else if (globalHitRate > 90) {
    recommendations.push('缓存性能优秀！考虑将成功经验应用到其他模块')
  }

  if (recommendations.length === 0) {
    recommendations.push('缓存性能表现良好，无需特别优化')
  }

  return recommendations
}
