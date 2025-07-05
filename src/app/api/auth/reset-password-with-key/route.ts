import { NextRequest } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import bcrypt from 'bcryptjs'

/**
 * 使用恢复密钥重置密码
 * POST /api/auth/reset-password-with-key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { verificationToken, newPassword } = body

    // 验证必填字段
    if (!verificationToken || !newPassword) {
      return validationErrorResponse('验证令牌和新密码不能为空')
    }

    // 验证密码强度
    if (newPassword.length < 6) {
      return validationErrorResponse('密码长度至少为6位')
    }

    // 查找有效的验证令牌
    const user = await prisma.user.findFirst({
      where: {
        resetToken: verificationToken,
        resetTokenExpiry: {
          gt: new Date(), // 令牌未过期
        },
      },
    })

    if (!user) {
      return errorResponse('验证令牌无效或已过期', 400)
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // 更新用户密码并清除验证令牌
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return successResponse({
      message: '密码重置成功，请使用新密码登录',
    })
  } catch (error) {
    console.error('Reset password with key error:', error)
    return errorResponse('服务器内部错误', 500)
  }
}
