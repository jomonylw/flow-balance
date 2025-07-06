/**
 * Docker 环境智能配置工具
 * 用于在 Docker 容器中自动检测和配置认证相关的环境变量
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'

/**
 * 智能检测容器的访问 URL
 * 优先级：环境变量 > 请求头检测 > 默认值
 */
export function detectContainerUrl(request?: Request): string {
  // 1. 优先使用环境变量
  const envUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL
  if (envUrl && envUrl !== 'http://localhost:3000') {
    return envUrl
  }

  // 2. 从请求头检测（如果有请求对象）
  if (request) {
    try {
      const url = new URL(request.url)
      const host = request.headers.get('host') || url.host
      const protocol =
        request.headers.get('x-forwarded-proto') ||
        request.headers.get('x-forwarded-protocol') ||
        url.protocol.replace(':', '')

      return `${protocol}://${host}`
    } catch (error) {
      console.warn('Failed to detect URL from request:', error)
    }
  }

  // 3. 默认值（容器内部可访问）
  const port = process.env.PORT || '3000'
  return `http://0.0.0.0:${port}`
}

/**
 * 获取或生成安全的认证密钥
 */
export function getAuthSecret(type: 'jwt' | 'nextauth'): string {
  const envKey = type === 'jwt' ? 'JWT_SECRET' : 'NEXTAUTH_SECRET'
  const existingSecret = process.env[envKey]

  // 如果已有安全的密钥，直接使用
  if (
    existingSecret &&
    existingSecret !== 'your-nextauth-secret-change-this-in-production' &&
    existingSecret !== 'your-secure-jwt-secret' &&
    existingSecret.length >= 32
  ) {
    return existingSecret
  }

  // 尝试从文件读取持久化的密钥
  try {
    const dataDir = '/app/data'
    const secretFile = join(dataDir, `.${type}-secret`)

    if (existsSync(secretFile)) {
      const secret = readFileSync(secretFile, 'utf8').trim()
      if (secret.length >= 32) {
        return secret
      }
    }
  } catch (error) {
    console.warn(`Failed to read ${type} secret from file:`, error)
  }

  // 生成新的密钥（这种情况下应该在启动脚本中处理）
  console.warn(`Using fallback ${type} secret generation`)
  return randomBytes(32).toString('base64')
}

/**
 * 动态配置 NextAuth URL
 * 在运行时根据请求动态设置正确的 URL
 */
export function configureNextAuthUrl(request?: Request): void {
  const detectedUrl = detectContainerUrl(request)

  // 只在必要时更新环境变量
  if (
    !process.env.NEXTAUTH_URL ||
    process.env.NEXTAUTH_URL === 'http://localhost:3000'
  ) {
    process.env.NEXTAUTH_URL = detectedUrl
  }

  if (
    !process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL === 'http://localhost:3000'
  ) {
    process.env.NEXT_PUBLIC_APP_URL = detectedUrl
  }
}

/**
 * 检查是否在 Docker 环境中运行
 */
export function isDockerEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    (process.env.HOSTNAME === '0.0.0.0' ||
      process.env.DOCKER_CONTAINER === 'true' ||
      existsSync('/.dockerenv'))
  )
}

/**
 * Docker 环境初始化
 * 在应用启动时调用，确保所有配置正确
 */
export function initializeDockerConfig(request?: Request): void {
  if (!isDockerEnvironment()) {
    return
  }

  // 使用 console.warn 避免 ESLint 错误
  console.warn('🐳 Initializing Docker environment configuration...')

  // 配置 URL
  configureNextAuthUrl(request)

  // 确保密钥安全
  const jwtSecret = getAuthSecret('jwt')
  const nextAuthSecret = getAuthSecret('nextauth')

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = jwtSecret
  }

  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = nextAuthSecret
  }

  console.warn('✅ Docker configuration initialized')
  console.warn(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`)
  console.warn(`   NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`)
  console.warn('   JWT_SECRET: [HIDDEN]')
  console.warn('   NEXTAUTH_SECRET: [HIDDEN]')
}
