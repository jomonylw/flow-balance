import { PrismaClient } from '@prisma/client'

// Declare a global variable to cache the PrismaClient instance
// This prevents creating multiple PrismaClient instances during development hot-reloading
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

// Function to build optimized connection URL for Vercel serverless
function buildConnectionUrl(): string {
  let connectionUrl = process.env.DATABASE_URL || ''

  if (
    connectionUrl.includes('postgresql://') ||
    connectionUrl.includes('postgres://')
  ) {
    const url = new URL(connectionUrl)

    // Remove any existing connection parameters to avoid conflicts
    url.searchParams.delete('connection_limit')
    url.searchParams.delete('pool_timeout')
    url.searchParams.delete('connect_timeout')
    url.searchParams.delete('statement_timeout')

    // Add strict serverless-optimized parameters
    url.searchParams.set('pgbouncer', 'true')
    url.searchParams.set('connection_limit', '1') // Only 1 connection per serverless instance
    url.searchParams.set('pool_timeout', '20') // 20 second pool timeout
    url.searchParams.set('connect_timeout', '15') // 15 second connect timeout
    url.searchParams.set('statement_timeout', '60000') // 60 second statement timeout

    connectionUrl = url.toString()
    console.log('🔗 Using optimized connection URL for Vercel serverless')
  }

  return connectionUrl
}

// Create and export the singleton PrismaClient optimized for Vercel serverless
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Configure for serverless environment with strict connection pooling
    datasources: {
      db: {
        url: buildConnectionUrl(),
      },
    },
    // Optimize logging for production
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    // Optimize for serverless with minimal error format
    errorFormat: 'minimal',
  })

// In non-production environments, assign the created instance to the global variable
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Enhanced connection management for serverless environment
export async function ensureConnection() {
  try {
    // Test the connection with a simple query
    await prisma.$queryRaw`SELECT 1`
    return prisma
  } catch (error) {
    console.warn(
      'Prisma connection test failed, attempting to reconnect:',
      error
    )

    // 尝试多次重连
    for (let i = 0; i < 3; i++) {
      try {
        // 先断开连接
        await prisma.$disconnect()
        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        // 重新连接
        await prisma.$connect()
        // 测试连接
        await prisma.$queryRaw`SELECT 1`
        console.log(`✅ Reconnected to database on attempt ${i + 1}`)
        return prisma
      } catch (reconnectError) {
        console.warn(`❌ Reconnection attempt ${i + 1} failed:`, reconnectError)
        if (i === 2) {
          console.error('Failed to reconnect to database after 3 attempts')
          throw reconnectError
        }
      }
    }

    throw error
  }
}

// Wrapper function for database operations with automatic retry
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 5 // 增加重试次数到5次
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // 在重试前等待更长时间并确保连接
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
        await ensureConnection()
      }
      return await operation()
    } catch (error) {
      lastError = error as Error

      // 扩展连接相关错误的检测
      const isConnectionError =
        error instanceof Error &&
        (error.message.includes('Server has closed the connection') ||
          error.message.includes('Connection terminated') ||
          error.message.includes('too many connections') ||
          error.message.includes('Connection lost') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('P1017') || // Prisma connection error code
          error.message.includes('P2037')) // Prisma too many connections error code

      if (isConnectionError && attempt < maxRetries) {
        console.warn(
          `Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`,
          error
        )
        continue
      }

      // 如果不是连接错误或重试次数用完，抛出错误
      throw error
    }
  }

  throw lastError
}

// Ensure proper connection handling in serverless environment
if (typeof window === 'undefined') {
  // Only run on server side

  // Handle process termination gracefully
  const cleanup = async () => {
    try {
      await prisma.$disconnect()
    } catch (error) {
      console.error('Error during Prisma cleanup:', error)
    }
  }

  // Register cleanup handlers
  process.on('beforeExit', cleanup)
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
  process.on('SIGUSR2', cleanup) // For nodemon restarts
}
