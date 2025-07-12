/**
 * 构建时安全的 Prisma 客户端
 * 专门用于 Docker 构建过程，避免在构建时连接数据库
 */

import { PrismaClient } from '@prisma/client'

// 检查是否在构建时环境
const isBuildTime =
  process.env.NODE_ENV === 'production' &&
  !process.env.DATABASE_URL?.startsWith('postgresql://')

/**
 * 创建构建时安全的 Prisma 客户端
 * 在构建时使用虚拟数据库 URL，避免连接错误
 */
export function createBuildSafePrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || 'file:/tmp/build-safe.db'

  console.log(
    `Creating Prisma client with URL: ${databaseUrl.replace(/\/\/.*@/, '//***@')}`
  )

  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    errorFormat: 'minimal',
  })

  // 在构建时，我们不需要实际连接数据库
  if (isBuildTime) {
    console.log('🔧 Build-time Prisma client created (no database connection)')
  }

  return client
}

/**
 * 获取构建时安全的 Prisma 客户端实例
 */
let buildSafePrismaInstance: PrismaClient | null = null

export function getBuildSafePrismaClient(): PrismaClient {
  if (!buildSafePrismaInstance) {
    buildSafePrismaInstance = createBuildSafePrismaClient()
  }
  return buildSafePrismaInstance
}

/**
 * 清理构建时 Prisma 客户端
 */
export async function cleanupBuildSafePrismaClient(): Promise<void> {
  if (buildSafePrismaInstance) {
    try {
      await buildSafePrismaInstance.$disconnect()
    } catch (error) {
      console.warn(
        'Warning: Failed to disconnect build-safe Prisma client:',
        error
      )
    } finally {
      buildSafePrismaInstance = null
    }
  }
}

// 进程退出时清理
if (typeof window === 'undefined') {
  const cleanup = async () => {
    await cleanupBuildSafePrismaClient()
  }

  process.on('beforeExit', cleanup)
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
}
