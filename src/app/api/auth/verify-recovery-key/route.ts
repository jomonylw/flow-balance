import { NextRequest } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import { formatRecoveryKey } from '@/lib/utils/recovery-key'
import crypto from 'crypto'

/**
 * 验证恢复密钥
 * POST /api/auth/verify-recovery-key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, recoveryKey } = body

    // 验证必填字段
    if (!email || !recoveryKey) {
      return validationErrorResponse('邮箱和恢复密钥不能为空')
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return validationErrorResponse('邮箱格式不正确')
    }

    // 格式化恢复密钥
    const formattedKey = formatRecoveryKey(recoveryKey)
    if (!formattedKey) {
      return validationErrorResponse('恢复密钥格式不正确')
    }

    // 查找用户
    const user = await prisma.user.findFirst({
      where: {
        email,
        recoveryKey: formattedKey,
      },
      select: {
        id: true,
        email: true,
        recoveryKey: true,
        recoveryKeyCreatedAt: true,
      },
    })

    if (!user) {
      return errorResponse('邮箱或恢复密钥不正确', 400)
    }

    // 生成临时验证令牌（用于后续重置密码）
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenExpiry = new Date(Date.now() + 30 * 60 * 1000) // 30分钟后过期

    // 更新用户的验证令牌（复用现有的 resetToken 字段）
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: verificationToken,
        resetTokenExpiry: verificationTokenExpiry,
      },
    })

    return successResponse({
      message: '恢复密钥验证成功',
      verificationToken,
      expiresAt: verificationTokenExpiry.toISOString(),
    })
  } catch (error) {
    console.error('Verify recovery key error:', error)
    return errorResponse('服务器内部错误', 500)
  }
}
