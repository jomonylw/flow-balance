/**
 * 数据库健康检查 API
 * 用于监控数据库连接状态和性能
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectionManager } from '@/lib/database/connection-manager'

export async function GET(_request: NextRequest) {
  const startTime = Date.now()

  try {
    // 获取连接状态
    const connectionStatus = connectionManager.getStatus()

    // 测试数据库连接
    const client = await connectionManager.getClient()

    // 执行简单查询测试
    await client.$queryRaw`SELECT 1 as test`
    const queryTime = Date.now() - startTime

    // 获取数据库统计信息
    let dbStats = null
    try {
      // 尝试获取数据库统计信息（仅适用于 PostgreSQL）
      if (process.env.DATABASE_URL?.includes('postgresql')) {
        dbStats = await client.$queryRaw`
          SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `
      }
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
        connectionManager: {
          connected: connectionStatus.connected,
          connectionCount: connectionStatus.connectionCount,
          maxConnections: connectionStatus.maxConnections,
          idleTime: `${Math.round(connectionStatus.idleTime / 1000)}s`,
          lastUsed: new Date(connectionStatus.lastUsed).toISOString(),
        },
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
        connectionManager: connectionManager.getStatus(),
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
    const client = await connectionManager.getClient()
    await client.$queryRaw`SELECT 1`

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
