import { PrismaClient } from '@prisma/client'
import { getPrismaClient } from './connection-manager'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 为了向后兼容，保留原有的 prisma 导出
// 但在 serverless 环境中推荐使用 getPrismaClient()
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // 数据库连接池配置 - 针对 serverless 环境优化
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // 日志配置 - 生产环境减少日志输出
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    errorFormat: 'minimal',
  })

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
