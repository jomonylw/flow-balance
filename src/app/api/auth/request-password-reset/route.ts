import { NextRequest } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import crypto from 'crypto'
import { createServerTranslator } from '@/lib/utils/server-i18n'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    const t = createServerTranslator() // 使用默认语言，因为用户还未登录

    // 验证必填字段
    if (!email) {
      return validationErrorResponse(t('auth.email.required'))
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return validationErrorResponse(t('auth.email.format.invalid'))
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // 无论用户是否存在，都返回成功信息（安全考虑）
    // 这样可以防止邮箱枚举攻击
    if (!user) {
      return successResponse({
        message: t('auth.password.reset.email.sent'),
      })
    }

    // 生成重置令牌
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1小时后过期

    // 更新用户的重置令牌
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // TODO: 在实际应用中，这里应该发送邮件
    // 目前只是模拟邮件发送
    console.warn(`Password reset token for ${email}: ${resetToken}`)
    console.warn(
      `Reset link: ${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`
    )

    return successResponse({
      message: t('auth.password.reset.email.sent'),
    })
  } catch (error) {
    console.error('Request password reset error:', error)
    const t = createServerTranslator()
    return errorResponse(t('common.server.error'), 500)
  }
}
