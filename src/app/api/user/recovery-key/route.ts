import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import { generateRecoveryKey } from '@/lib/utils/recovery-key'
import bcrypt from 'bcryptjs'

/**
 * 获取当前用户的恢复密钥信息
 * GET /api/user/recovery-key
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    return successResponse({
      recoveryKey: user.recoveryKey,
      recoveryKeyCreatedAt: user.recoveryKeyCreatedAt,
    })
  } catch (error) {
    console.error('Get recovery key error:', error)
    return errorResponse('获取恢复密钥失败', 500)
  }
}

/**
 * 重新生成恢复密钥
 * POST /api/user/recovery-key
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { currentPassword } = body

    // 验证当前密码
    if (!currentPassword) {
      return validationErrorResponse('请输入当前密码以确认身份')
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isPasswordValid) {
      return errorResponse('当前密码不正确', 400)
    }

    // 生成新的恢复密钥
    const newRecoveryKey = generateRecoveryKey()
    const now = new Date()

    // 更新用户的恢复密钥
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        recoveryKey: newRecoveryKey,
        recoveryKeyCreatedAt: now,
      },
      select: {
        recoveryKey: true,
        recoveryKeyCreatedAt: true,
      },
    })

    return successResponse({
      message: '恢复密钥重新生成成功',
      recoveryKey: updatedUser.recoveryKey,
      recoveryKeyCreatedAt: updatedUser.recoveryKeyCreatedAt,
    })
  } catch (error) {
    console.error('Regenerate recovery key error:', error)
    return errorResponse('重新生成恢复密钥失败', 500)
  }
}
