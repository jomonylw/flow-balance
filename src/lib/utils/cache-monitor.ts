/**
 * 缓存监控工具
 * 用于在开发环境中监控缓存命中情况
 */

import { cacheLogger, cacheStats } from '@/lib/services/cache.service'

/**
 * 缓存函数包装器，用于监控缓存命中情况
 */
export function withCacheMonitoring<T extends (...args: any[]) => Promise<any>>(
  cacheFunction: T,
  functionName: string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = performance.now()
    const cacheKey = `${functionName}-${JSON.stringify(args).slice(0, 100)}`

    try {
      const result = await cacheFunction(...args)
      const endTime = performance.now()
      const executionTime = endTime - startTime

      // 根据执行时间判断是否为缓存命中
      // 缓存命中通常执行时间很短（< 5ms）
      if (executionTime < 5) {
        cacheLogger.logCacheHit(functionName, cacheKey, executionTime)
      } else {
        // 这个日志已经在缓存函数内部记录了，这里不重复记录
        // cacheLogger.logCacheMiss(functionName, cacheKey, executionTime)
      }

      return result
    } catch (error) {
      cacheLogger.logCacheError(functionName, cacheKey, error)
      throw error
    }
  }) as T
}

/**
 * API 路由缓存监控中间件
 */
export function createCacheMonitoringMiddleware() {
  return {
    /**
     * 在 API 路由开始时调用
     */
    onApiStart(apiPath: string) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`🚀 [API START] ${apiPath}`)
      }
    },

    /**
     * 在 API 路由结束时调用
     */
    onApiEnd(apiPath: string, duration: number) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`✅ [API END] ${apiPath} - ${duration.toFixed(2)}ms`)

        // 显示当前缓存统计
        this.logCurrentStats()
      }
    },

    /**
     * 显示当前缓存统计
     */
    logCurrentStats() {
      if (process.env.NODE_ENV === 'development') {
        const stats = cacheStats.getGlobalStats()
        if (stats.total > 0) {
          // eslint-disable-next-line no-console
          console.log(
            `📊 [CACHE STATS] Hits: ${stats.hits}, Misses: ${stats.misses}, Hit Rate: ${stats.hitRate}`
          )
        }
      }
    },

    /**
     * 显示详细的缓存统计
     */
    logDetailedStats() {
      cacheLogger.logCacheStats()
    },
  }
}

/**
 * 全局缓存监控实例
 */
export const cacheMonitor = createCacheMonitoringMiddleware()

/**
 * API 路由装饰器，用于自动监控 API 性能
 */
export function withApiMonitoring<T extends (...args: any[]) => Promise<any>>(
  apiHandler: T,
  apiPath: string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = performance.now()
    cacheMonitor.onApiStart(apiPath)

    try {
      const result = await apiHandler(...args)
      const endTime = performance.now()
      const duration = endTime - startTime
      cacheMonitor.onApiEnd(apiPath, duration)
      return result
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime

      if (process.env.NODE_ENV === 'development') {
        console.error(
          `❌ [API ERROR] ${apiPath} - ${duration.toFixed(2)}ms`,
          error
        )
      }

      throw error
    }
  }) as T
}

/**
 * 缓存性能分析器
 */
export const cacheAnalyzer = {
  /**
   * 分析缓存性能并给出优化建议
   */
  analyzePerformance() {
    if (process.env.NODE_ENV !== 'development') return

    const globalStats = cacheStats.getGlobalStats()
    const functionStats = cacheStats.getFunctionStats()

    // eslint-disable-next-line no-console
    console.group('🔍 Cache Performance Analysis')

    // 全局分析
    // eslint-disable-next-line no-console
    console.log('📈 Global Performance:')
    // eslint-disable-next-line no-console
    console.log(`  Total Calls: ${globalStats.total}`)
    // eslint-disable-next-line no-console
    console.log(`  Hit Rate: ${globalStats.hitRate}`)

    if (parseFloat(globalStats.hitRate) < 70) {
      console.warn(
        '⚠️  Low hit rate detected! Consider increasing cache TTL or checking cache invalidation logic.'
      )
    }

    // 函数级分析
    // eslint-disable-next-line no-console
    console.log('\n🔧 Function Performance:')

    const sortedFunctions = Object.entries(functionStats).sort(
      ([, a], [, b]) => parseFloat(b.hitRate) - parseFloat(a.hitRate)
    )

    sortedFunctions.forEach(([functionName, stats]) => {
      const hitRate = parseFloat(stats.hitRate)
      const icon = hitRate >= 80 ? '🟢' : hitRate >= 60 ? '🟡' : '🔴'

      // eslint-disable-next-line no-console
      console.log(
        `  ${icon} ${functionName}: ${stats.hitRate} (${stats.hits}/${stats.total})`
      )

      if (hitRate < 50 && stats.total > 5) {
        console.warn(
          `    💡 Consider optimizing ${functionName} - low hit rate with significant usage`
        )
      }
    })

    // 优化建议
    // eslint-disable-next-line no-console
    console.log('\n💡 Optimization Suggestions:')

    const lowPerformanceFunctions = sortedFunctions.filter(
      ([, stats]) => parseFloat(stats.hitRate) < 60 && stats.total > 3
    )

    if (lowPerformanceFunctions.length > 0) {
      lowPerformanceFunctions.forEach(([functionName]) => {
        // eslint-disable-next-line no-console
        console.log(`  • Review cache TTL for ${functionName}`)
        // eslint-disable-next-line no-console
        console.log(
          `  • Check if ${functionName} cache is being invalidated too frequently`
        )
      })
    } else {
      // eslint-disable-next-line no-console
      console.log('  ✅ Cache performance looks good!')
    }

    // eslint-disable-next-line no-console
    console.groupEnd()
  },

  /**
   * 重置统计数据
   */
  reset() {
    cacheStats.reset()
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('🔄 Cache statistics reset')
    }
  },

  /**
   * 导出统计数据
   */
  exportStats() {
    return {
      timestamp: new Date().toISOString(),
      global: cacheStats.getGlobalStats(),
      functions: cacheStats.getFunctionStats(),
    }
  },
}

/**
 * 开发环境缓存监控初始化
 */
export function initCacheMonitoring() {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('🔧 Cache monitoring initialized for development environment')

    // 定期显示缓存统计（每5分钟）
    setInterval(
      () => {
        const stats = cacheStats.getGlobalStats()
        if (stats.total > 0) {
          cacheAnalyzer.analyzePerformance()
        }
      },
      5 * 60 * 1000
    )
  }
}
