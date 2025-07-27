/**
 * 服务器初始化工具
 * 确保应用启动时所有必要的组件都已正确初始化
 */

import { initializeJWTSecret } from './jwt-secret-manager'
import { initCacheMonitoring } from './cache-monitor'

let isInitialized = false
let initializationPromise: Promise<void> | null = null

/**
 * 初始化服务器组件
 * 确保只初始化一次
 */
export async function initializeServer(): Promise<void> {
  if (isInitialized) {
    return
  }

  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = performInitialization()
  await initializationPromise
}

async function performInitialization(): Promise<void> {
  try {
    // eslint-disable-next-line no-console
    console.log('🚀 Initializing server components...')

    // 1. 初始化 JWT 密钥系统
    await initializeJWTSecret()

    // 2. 初始化缓存监控系统（仅在开发环境）
    initCacheMonitoring()

    // 3. 其他初始化任务可以在这里添加
    // - 数据库连接检查
    // - 外部服务连接等

    isInitialized = true
    // eslint-disable-next-line no-console
    console.log('✅ Server initialization completed')
  } catch (error) {
    console.error('❌ Server initialization failed:', error)
    // 重置状态，允许重试
    isInitialized = false
    initializationPromise = null
    throw error
  }
}

/**
 * 检查服务器是否已初始化
 */
export function isServerInitialized(): boolean {
  return isInitialized
}

/**
 * 重置初始化状态（主要用于测试）
 */
export function resetInitialization(): void {
  isInitialized = false
  initializationPromise = null
}
