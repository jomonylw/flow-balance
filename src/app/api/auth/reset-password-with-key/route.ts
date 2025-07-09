import { NextRequest } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import bcrypt from 'bcryptjs'
import { createServerTranslator } from '@/lib/utils/server-i18n'

/**
 * 使用恢复密钥重置密码
 * POST /api/auth/reset-password-with-key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { verificationToken, newPassword } = body
    const t = createServerTranslator()

    // 验证必填字段
    if (!verificationToken || !newPassword) {
      return validationErrorResponse(t('auth.token.password.required'))
    }

    // 验证密码强度
    if (newPassword.length < 6) {
      return validationErrorResponse(t('auth.password.min.length'))
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
      return errorResponse(t('auth.token.invalid.expired'), 400)
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
      message: t('auth.password.reset.success'),
    })
  } catch (error) {
    console.error('Reset password with key error:', error)
    const t = createServerTranslator()
    return errorResponse(t('common.server.error'), 500)
  }
}
