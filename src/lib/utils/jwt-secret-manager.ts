/**
 * JWT 密钥管理器
 * 自动生成和管理 JWT 密钥，无需用户手动配置
 */

import { randomBytes } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

const JWT_SECRET_FILE = process.env.JWT_SECRET_FILE || '/app/data/.jwt-secret'
const JWT_SECRET_FILE_DEV = path.join(process.cwd(), 'prisma', '.jwt-secret')

/**
 * 生成强随机 JWT 密钥
 */
function generateJWTSecret(): string {
  // 生成 64 字节（512 位）的随机密钥，转换为 hex 字符串
  return randomBytes(64).toString('hex')
}

/**
 * 获取密钥文件路径
 */
function getSecretFilePath(): string {
  const isDevelopment = process.env.NODE_ENV === 'development'
  return isDevelopment ? JWT_SECRET_FILE_DEV : JWT_SECRET_FILE
}

/**
 * 从文件读取 JWT 密钥
 */
async function readJWTSecretFromFile(): Promise<string | null> {
  try {
    const secretPath = getSecretFilePath()
    const secret = await fs.readFile(secretPath, 'utf-8')
    return secret.trim()
  } catch (error) {
    // 文件不存在或读取失败
    return null
  }
}

/**
 * 将 JWT 密钥写入文件
 */
async function writeJWTSecretToFile(secret: string): Promise<void> {
  try {
    const secretPath = getSecretFilePath()
    const secretDir = path.dirname(secretPath)
    
    // 确保目录存在
    await fs.mkdir(secretDir, { recursive: true })
    
    // 写入密钥文件
    await fs.writeFile(secretPath, secret, { mode: 0o600 }) // 只有所有者可读写
    
    console.log(`✅ JWT secret saved to: ${secretPath}`)
  } catch (error) {
    console.error('❌ Failed to save JWT secret:', error)
    throw error
  }
}

/**
 * 获取或生成 JWT 密钥
 * 优先级：环境变量 > 文件 > 自动生成
 */
export async function getJWTSecret(): Promise<string> {
  // 1. 优先使用环境变量（用于开发和测试）
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET
  }

  // 2. 尝试从文件读取
  const existingSecret = await readJWTSecretFromFile()
  if (existingSecret) {
    return existingSecret
  }

  // 3. 生成新密钥并保存
  console.log('🔑 Generating new JWT secret...')
  const newSecret = generateJWTSecret()
  
  try {
    await writeJWTSecretToFile(newSecret)
    return newSecret
  } catch (error) {
    console.warn('⚠️  Failed to save JWT secret to file, using in-memory secret')
    console.warn('⚠️  This means the secret will change on restart!')
    return newSecret
  }
}

/**
 * 验证 JWT 密钥强度
 */
export function validateJWTSecret(secret: string): boolean {
  // 至少 32 字符
  if (secret.length < 32) {
    return false
  }
  
  // 不能是常见的弱密码
  const weakSecrets = [
    'your-super-secret-jwt-key-change-this',
    'your-production-jwt-secret',
    'change-this-in-production',
    'jwt-secret',
    'secret',
    '123456',
  ]
  
  return !weakSecrets.some(weak => secret.includes(weak))
}

/**
 * 初始化 JWT 密钥系统
 * 在应用启动时调用
 */
export async function initializeJWTSecret(): Promise<string> {
  try {
    const secret = await getJWTSecret()
    
    // 验证密钥强度
    if (!validateJWTSecret(secret)) {
      console.warn('⚠️  JWT secret appears to be weak, consider regenerating')
    }
    
    console.log('✅ JWT secret initialized successfully')
    return secret
  } catch (error) {
    console.error('❌ Failed to initialize JWT secret:', error)
    throw new Error('JWT secret initialization failed')
  }
}
