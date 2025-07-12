import { PrismaClient } from '@prisma/client'
import { getPrismaClient } from './connection-manager'
import { getBuildSafePrismaClient } from './build-safe-prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 检查是否在构建时环境
const isBuildTime =
  process.env.NODE_ENV === 'production' &&
  process.env.DATABASE_URL?.startsWith('file:/tmp/build.db')

// 创建安全的 Prisma 客户端，避免在构建时连接数据库
function createSafePrismaClient(): PrismaClient {
  // 在构建时使用专门的构建安全客户端
  if (isBuildTime) {
    console.log('🔧 Using build-safe Prisma client')
    return getBuildSafePrismaClient()
  }

  // 运行时使用正常的客户端
  const databaseUrl = process.env.DATABASE_URL || 'file:/tmp/fallback.db'

  return new PrismaClient({
    // 数据库连接池配置 - 针对 serverless 环境优化
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    // 日志配置 - 生产环境减少日志输出
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    errorFormat: 'minimal',
  })
}

// 为了向后兼容，保留原有的 prisma 导出
// 但在 serverless 环境中推荐使用 getPrismaClient()
export const prisma = globalForPrisma.prisma ?? createSafePrismaClient()

// 在非生产环境中复用全局实例，避免热重载时创建多个连接
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// 导出连接管理器方法，推荐在 serverless 环境中使用
export { getPrismaClient }

// 优雅关闭处理 - 确保在 serverless 函数结束时正确关闭连接
if (typeof window === 'undefined') {
  // 只在服务器端添加关闭处理
  const cleanup = async () => {
    await prisma.$disconnect()
  }

  // 监听进程退出事件
  process.on('beforeExit', cleanup)
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
}
