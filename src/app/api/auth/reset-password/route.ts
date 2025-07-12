import { NextRequest } from 'next/server'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    // 验证必填字段
    if (!token || !password) {
      return validationErrorResponse('令牌和新密码不能为空')
    }

    // 验证密码强度
    if (password.length < 6) {
      return validationErrorResponse('密码长度至少为6位')
    }

    // 查找有效的重置令牌
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // 令牌未过期
        },
      },
    })

    if (!user) {
      return errorResponse('重置令牌无效或已过期', 400)
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(password, 12)

    // 更新用户密码并清除重置令牌
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
    console.error('Reset password error:', error)
    return errorResponse('服务器内部错误', 500)
  }
}
