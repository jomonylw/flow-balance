import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface JWTPayload {
  userId: string
  email: string
}

// JWT 相关函数
export function generateToken(payload: JWTPayload): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not defined')
  }

  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET is not defined')
    }

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

    const payload = verifyToken(token)
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
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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
export function isValidPassword(password: string): {
  valid: boolean
  message?: string
} {
  if (password.length < 6) {
    return { valid: false, message: '密码至少需要6个字符' }
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: '密码需要包含至少一个小写字母' }
  }

  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: '密码需要包含至少一个数字' }
  }

  return { valid: true }
}

// 用户注册
export async function registerUser(email: string, password: string) {
  try {
    // 验证邮箱格式
    if (!isValidEmail(email)) {
      throw new Error('邮箱格式不正确')
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
      throw new Error('该邮箱已被注册')
    }

    // 创建用户
    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
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
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

// 用户登录
export async function loginUser(email: string, password: string) {
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
      throw new Error('邮箱或密码错误')
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      throw new Error('邮箱或密码错误')
    }

    // 生成 JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    return { success: true, user, token }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

// 中间件：要求用户认证
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('未授权访问')
  }
  return user
}
