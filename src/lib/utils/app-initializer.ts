/**
 * 应用初始化器
 * 处理应用启动时的初始化任务
 */

import { initializeJWTSecret } from './jwt-secret-manager'

/**
 * 初始化应用
 * 在服务器启动时调用
 */
export async function initializeApp(): Promise<void> {
  console.log('🚀 Initializing Flow Balance application...')

  try {
    // 1. 初始化 JWT 密钥系统
    await initializeJWTSecret()

    // 2. 其他初始化任务可以在这里添加
    // - 检查数据库连接
    // - 初始化缓存
    // - 设置定时任务等

    console.log('✅ Application initialized successfully')
  } catch (error) {
    console.error('❌ Application initialization failed:', error)
    throw error
  }
}

/**
 * 检查应用是否已正确初始化
 */
export async function checkAppInitialization(): Promise<boolean> {
  try {
    // 检查 JWT 密钥是否可用
    const { getJWTSecret } = await import('./jwt-secret-manager')
    await getJWTSecret()

    return true
  } catch (error) {
    console.error('App initialization check failed:', error)
    return false
  }
}
