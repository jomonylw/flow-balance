import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import { generateRecoveryKey } from '@/lib/utils/recovery-key'
import { createServerTranslator } from '@/lib/utils/server-i18n'
import { getJWTSecret } from '@/lib/utils/jwt-secret-manager'
import { initializeServer } from '@/lib/utils/server-init'

const prisma = new PrismaClient()

export interface JWTPayload {
  userId: string
  email: string
}

// JWT 相关函数
export async function generateToken(payload: JWTPayload): Promise<string> {
  // 确保服务器已初始化
  await initializeServer()

  const secret = await getJWTSecret()

  // 验证payload类型
  if (
    !payload ||
    typeof payload !== 'object' ||
    !payload.userId ||
    !payload.email
  ) {
    throw new Error('Invalid payload: must be an object with userId and email')
  }

  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    // 确保服务器已初始化
    await initializeServer()

    const secret = await getJWTSecret()
    const decoded = jwt.verify(token, secret) as JWTPayload
    return decoded
  } catch {
    return null
  }
}

// 密码相关函数
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// 获取当前用户
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return null
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        settings: {
          include: {
            baseCurrency: true,
          },
        },
      },
    })

    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// 设置认证 Cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()

  // 在 Docker 环境中，即使是生产模式也可能使用 HTTP
  // 只有在明确使用 HTTPS 时才设置 secure
  const isHttps =
    process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ||
    process.env.NEXTAUTH_URL?.startsWith('https://') ||
    (process.env.NODE_ENV === 'production' && !process.env.DOCKER_CONTAINER)

  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

// 清除认证 Cookie
export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}

// 验证邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 验证密码强度
export function isValidPassword(
  password: string,
  language: string = 'zh'
): {
  valid: boolean
  message?: string
} {
  const t = createServerTranslator(language)

  if (password.length < 6) {
    return { valid: false, message: t('auth.password.min.length') }
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: t('auth.password.lowercase.required') }
  }

  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: t('auth.password.number.required') }
  }

  return { valid: true }
}

// 用户注册
export async function registerUser(email: string, password: string) {
  const t = createServerTranslator() // 使用默认语言，因为用户还未登录

  try {
    // 验证邮箱格式
    if (!isValidEmail(email)) {
      throw new Error(t('auth.email.format.invalid'))
    }

    // 验证密码强度
    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message)
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new Error(t('auth.email.already.registered'))
    }

    // 创建用户
    const hashedPassword = await hashPassword(password)
    // 从邮箱提取默认昵称（@之前的部分）
    const defaultName = email.split('@')[0]
    // 生成恢复密钥
    const recoveryKey = generateRecoveryKey()

    const user = await prisma.user.create({
      data: {
        email,
        name: defaultName,
        password: hashedPassword,
        recoveryKey,
        recoveryKeyCreatedAt: new Date(),
        settings: {
          create: {
            dateFormat: 'YYYY-MM-DD',
            // baseCurrencyId 暂时为空，需要用户在初始设置中选择
          },
        },
      },
      include: {
        settings: true,
      },
    })

    return { success: true, user }
  } catch (error) {
    console.error('Registration error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : t('auth.unknown.error'),
    }
  }
}

// 用户登录
export async function loginUser(email: string, password: string) {
  const t = createServerTranslator() // 使用默认语言，因为用户还未登录

  try {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        settings: {
          include: {
            baseCurrency: true,
          },
        },
      },
    })

    if (!user) {
      throw new Error(t('auth.email.password.incorrect'))
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      throw new Error(t('auth.email.password.incorrect'))
    }

    // 生成 JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
    })

    return { success: true, user, token }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : t('auth.unknown.error'),
    }
  }
}

// 中间件：要求用户认证
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    const t = createServerTranslator()
    throw new Error(t('auth.unauthorized'))
  }
  return user
}
