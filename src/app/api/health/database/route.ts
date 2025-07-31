/**
 * 数据库健康检查 API
 * 用于监控数据库连接状态和性能
 */

import { NextRequest, NextResponse } from 'next/server'
// import { prisma } from '@/lib/database/connection-manager'
import {
  testDatabaseConnection,
  getDatabaseStats,
} from '@/lib/database/raw-queries'

export async function GET(_request: NextRequest) {
  const startTime = Date.now()

  try {
    // 使用统一查询服务测试数据库连接
    const connectionResult = await testDatabaseConnection()
    const queryTime = connectionResult.responseTime

    // 获取数据库统计信息
    let dbStats = null
    try {
      dbStats = await getDatabaseStats()
    } catch (error) {
      // 忽略统计查询错误，可能是权限问题
      console.warn('Could not fetch database statistics:', error)
    }

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        queryTime: `${queryTime}ms`,
        statistics: dbStats || 'Not available',
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL
          ? process.env.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
          : 'Not configured',
        vercelRegion: process.env.VERCEL_REGION || 'Unknown',
        vercelEnv: process.env.VERCEL_ENV || 'Unknown',
      },
      performance: {
        totalResponseTime: `${Date.now() - startTime}ms`,
        memoryUsage: process.memoryUsage(),
      },
    }

    return NextResponse.json(healthData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Database health check failed:', error)

    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'UnknownError',
      },
      database: {
        connected: false,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
        vercelRegion: process.env.VERCEL_REGION || 'Unknown',
        vercelEnv: process.env.VERCEL_ENV || 'Unknown',
      },
      performance: {
        totalResponseTime: `${Date.now() - startTime}ms`,
        memoryUsage: process.memoryUsage(),
      },
    }

    return NextResponse.json(errorData, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    })
  }
}

// 支持 HEAD 请求用于简单的存活检查
export async function HEAD(_request: NextRequest) {
  try {
    const connectionResult = await testDatabaseConnection()

    if (!connectionResult.connected) {
      throw new Error(connectionResult.error || 'Database connection failed')
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  }
}
