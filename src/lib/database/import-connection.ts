/**
 * 专用于数据导入的数据库连接管理
 * 针对长时间运行的导入操作进行优化
 */

import { PrismaClient } from '@prisma/client'

// 导入操作专用连接配置
const IMPORT_CONNECTION_CONFIG = {
  // 连接超时时间 - 更长的超时时间
  connectionTimeout: 30000,
  // 查询超时时间 - 支持长时间运行的导入操作
  queryTimeout: 300000, // 5 分钟
  // 事务超时时间
  transactionTimeout: 300000, // 5 分钟
} as const

/**
 * 创建专用于导入操作的 Prisma 客户端
 * 使用独立的连接配置，避免影响其他操作
 */
export function createImportPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || 'file:/tmp/fallback.db'

  // 构建优化的连接URL
  let optimizedUrl = databaseUrl

  if (
    databaseUrl.startsWith('postgresql://') ||
    databaseUrl.startsWith('postgres://')
  ) {
    const url = new URL(databaseUrl)

    // 为导入操作设置专门的连接参数
    url.searchParams.set('connection_limit', '3') // 允许3个连接，支持事务内的并发查询
    url.searchParams.set('pool_timeout', '30') // 连接池超时30秒
    url.searchParams.set('connect_timeout', '30') // 连接超时30秒
    url.searchParams.set('statement_timeout', '300000') // 语句超时5分钟
    url.searchParams.set('idle_in_transaction_session_timeout', '300000') // 空闲事务超时5分钟
    url.searchParams.set('application_name', 'flow-balance-import') // 标识导入连接

    optimizedUrl = url.toString()
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: optimizedUrl,
      },
    },
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    errorFormat: 'minimal',
  })
}

/**
 * 执行带有专用连接的导入操作
 * 自动管理连接的创建和清理
 */
export async function executeWithImportConnection<T>(
  operation: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const importPrisma = createImportPrismaClient()

  try {
    // 连接到数据库
    await importPrisma.$connect()

    // 执行操作
    const result = await operation(importPrisma)

    return result
  } finally {
    // 确保连接被正确关闭
    await importPrisma.$disconnect()
  }
}

/**
 * 执行带有专用连接和事务的导入操作
 * 使用更长的事务超时时间
 */
export async function executeImportTransaction<T>(
  operation: (tx: any) => Promise<T>
): Promise<T> {
  return executeWithImportConnection(async importPrisma => {
    return importPrisma.$transaction(operation, {
      maxWait: 60000, // 最大等待时间 1 分钟
      timeout: IMPORT_CONNECTION_CONFIG.transactionTimeout, // 事务超时时间 5 分钟
    })
  })
}
