/**
 * 系统查询模块
 * 包含数据库方言检测、连接测试和系统统计相关查询
 */

import { prisma } from '../connection-manager'
import type {
  DatabaseDialect,
  DatabaseStatsResult,
  ConnectionTestResult,
} from '@/types/database/raw-queries'

// ============================================================================
// 数据库方言检测
// ============================================================================

/**
 * 检测当前数据库方言
 * @returns 数据库类型：'postgresql' 或 'sqlite'
 */
export function getDatabaseDialect(): DatabaseDialect {
  const databaseUrl = process.env.DATABASE_URL || ''
  return databaseUrl.includes('postgresql') || databaseUrl.includes('postgres')
    ? 'postgresql'
    : 'sqlite'
}

/**
 * 检查是否为 PostgreSQL 数据库
 * @returns 是否为 PostgreSQL
 */
export function isPostgreSQL(): boolean {
  return getDatabaseDialect() === 'postgresql'
}

// ============================================================================
// 系统查询模块
// ============================================================================

/**
 * 测试数据库连接
 * @returns 连接测试结果
 */
export async function testDatabaseConnection(): Promise<ConnectionTestResult> {
  const startTime = Date.now()

  try {
    await prisma.$queryRaw`SELECT 1 as test`
    const responseTime = Date.now() - startTime

    return {
      connected: true,
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    return {
      connected: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 获取数据库统计信息（仅适用于 PostgreSQL）
 * @returns 数据库统计信息，SQLite 返回 null
 */
export async function getDatabaseStats(): Promise<DatabaseStatsResult | null> {
  if (!isPostgreSQL()) {
    return null
  }

  try {
    const stats = await prisma.$queryRaw<
      Array<{
        total_connections: number
        active_connections: number
        idle_connections: number
      }>
    >`
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `

    if (stats.length > 0) {
      const stat = stats[0]
      return {
        totalConnections: Number(stat.total_connections),
        activeConnections: Number(stat.active_connections),
        idleConnections: Number(stat.idle_connections),
      }
    }

    return null
  } catch (error) {
    console.warn('获取数据库统计信息失败:', error)
    return null
  }
}

/**
 * 检查数据库连接是否可用（用于内部重试逻辑）
 * 成功则不返回任何内容，失败则抛出错误
 */
export async function checkDatabaseConnection(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`
}
