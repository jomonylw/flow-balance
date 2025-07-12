/**
 * 数据库连接管理器
 * 专门为 serverless 环境优化的数据库连接管理
 */

import { PrismaClient } from '@prisma/client'

// 连接池配置
const CONNECTION_CONFIG = {
  // 最大连接数 - 针对免费版数据库限制
  maxConnections: 5,
  // 连接超时时间
  connectionTimeout: 10000,
  // 查询超时时间
  queryTimeout: 30000,
  // 连接空闲超时时间
  idleTimeout: 60000,
} as const

// 全局连接管理器
class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager
  private prismaClient: PrismaClient | null = null
  private connectionCount = 0
  private lastUsed = Date.now()
  private cleanupTimer: NodeJS.Timeout | null = null

  private constructor() {
    // 私有构造函数，确保单例模式
  }

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager()
    }
    return DatabaseConnectionManager.instance
  }

  /**
   * 获取 Prisma 客户端实例
   */
  public async getClient(): Promise<PrismaClient> {
    this.lastUsed = Date.now()

    if (!this.prismaClient) {
      await this.createConnection()
    }

    return this.prismaClient!
  }

  /**
   * 创建数据库连接
   */
  private async createConnection(): Promise<void> {
    if (this.connectionCount >= CONNECTION_CONFIG.maxConnections) {
      throw new Error(
        `Too many database connections (max: ${CONNECTION_CONFIG.maxConnections})`
      )
    }

    try {
      this.prismaClient = new PrismaClient({
        datasources: {
          db: {
            url: this.buildConnectionUrl(),
          },
        },
        log:
          process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
        errorFormat: 'minimal',
      })

      // 测试连接
      await this.prismaClient.$connect()
      this.connectionCount++

      // 设置自动清理定时器
      this.setupCleanupTimer()

      console.log(
        `✅ Database connection established (${this.connectionCount}/${CONNECTION_CONFIG.maxConnections})`
      )
    } catch (error) {
      console.error('❌ Failed to create database connection:', error)
      throw error
    }
  }

  /**
   * 构建连接URL，添加连接池参数
   */
  private buildConnectionUrl(): string {
    const baseUrl = process.env.DATABASE_URL || ''

    // 如果是 PostgreSQL，添加连接池参数
    if (
      baseUrl.startsWith('postgresql://') ||
      baseUrl.startsWith('postgres://')
    ) {
      const url = new URL(baseUrl)

      // 设置连接池参数
      url.searchParams.set('connection_limit', '3') // 每个实例最多3个连接
      url.searchParams.set('pool_timeout', '10') // 连接池超时10秒
      url.searchParams.set('connect_timeout', '10') // 连接超时10秒
      url.searchParams.set('statement_timeout', '30000') // 语句超时30秒
      url.searchParams.set('idle_in_transaction_session_timeout', '60000') // 空闲事务超时60秒

      return url.toString()
    }

    return baseUrl
  }

  /**
   * 设置自动清理定时器
   */
  private setupCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
    }

    this.cleanupTimer = setTimeout(() => {
      this.cleanup()
    }, CONNECTION_CONFIG.idleTimeout)
  }

  /**
   * 清理空闲连接
   */
  private async cleanup(): Promise<void> {
    const idleTime = Date.now() - this.lastUsed

    if (idleTime >= CONNECTION_CONFIG.idleTimeout && this.prismaClient) {
      try {
        await this.prismaClient.$disconnect()
        this.prismaClient = null
        this.connectionCount = Math.max(0, this.connectionCount - 1)
        console.log(
          `🧹 Cleaned up idle database connection (${this.connectionCount}/${CONNECTION_CONFIG.maxConnections})`
        )
      } catch (error) {
        console.error('❌ Error during connection cleanup:', error)
      }
    }
  }

  /**
   * 强制断开所有连接
   */
  public async disconnect(): Promise<void> {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = null
    }

    if (this.prismaClient) {
      try {
        await this.prismaClient.$disconnect()
        this.prismaClient = null
        this.connectionCount = 0
        console.log('🔌 All database connections disconnected')
      } catch (error) {
        console.error('❌ Error during disconnect:', error)
      }
    }
  }

  /**
   * 获取连接状态
   */
  public getStatus() {
    return {
      connected: !!this.prismaClient,
      connectionCount: this.connectionCount,
      maxConnections: CONNECTION_CONFIG.maxConnections,
      lastUsed: this.lastUsed,
      idleTime: Date.now() - this.lastUsed,
    }
  }
}

// 导出单例实例
export const connectionManager = DatabaseConnectionManager.getInstance()

// 导出便捷方法
export async function getPrismaClient(): Promise<PrismaClient> {
  return connectionManager.getClient()
}

// 进程退出时清理连接
if (typeof window === 'undefined') {
  const cleanup = async () => {
    await connectionManager.disconnect()
  }

  process.on('beforeExit', cleanup)
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
  process.on('SIGUSR2', cleanup) // nodemon restart
}
