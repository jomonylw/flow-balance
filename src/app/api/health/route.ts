/**
 * Flow Balance - Health Check API
 * Docker 容器健康检查端点
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// 创建 Prisma 客户端实例
let prisma: PrismaClient

try {
  prisma = new PrismaClient()
} catch (_error) {
  console.error('Failed to initialize Prisma client:', _error)
}

export async function GET(_request: NextRequest) {
  try {
    // 检查数据库连接
    if (prisma) {
      await prisma.$queryRaw`SELECT 1`
    }

    // 返回健康状态
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
        database: prisma ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        database: 'disconnected'
      },
      { status: 503 }
    )
  }
}

// 支持 HEAD 请求用于简单的健康检查
export async function HEAD(_request: NextRequest) {
  try {
    if (prisma) {
      await prisma.$queryRaw`SELECT 1`
    }
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
