/**
 * Flow Balance - Health Check API
 * Docker 容器健康检查端点
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectionManager } from '@/lib/database/connection-manager'

export async function GET(_request: NextRequest) {
  const startTime = Date.now()

  try {
    // 检查数据库连接
    const client = await connectionManager.getClient()
    await client.$queryRaw`SELECT 1`

    // 获取连接状态
    const connectionStatus = connectionManager.getStatus()

    // 返回健康状态
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
        database: {
          status: 'connected',
          connectionCount: connectionStatus.connectionCount,
          maxConnections: connectionStatus.maxConnections,
          responseTime: `${Date.now() - startTime}ms`,
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        vercel: {
          region: process.env.VERCEL_REGION || 'Unknown',
          env: process.env.VERCEL_ENV || 'Unknown',
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        database: {
          status: 'disconnected',
          connectionManager: connectionManager.getStatus(),
        },
        responseTime: `${Date.now() - startTime}ms`,
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  }
}

// 支持 HEAD 请求用于简单的健康检查
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
