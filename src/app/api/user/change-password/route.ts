import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    // 验证必填字段
    if (!currentPassword || !newPassword) {
      return validationErrorResponse('当前密码和新密码不能为空')
    }

    // 验证新密码强度
    if (newPassword.length < 6) {
      return validationErrorResponse('新密码长度至少为6位')
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    )
    if (!isCurrentPasswordValid) {
      return errorResponse('当前密码不正确', 400)
    }

    // 检查新密码是否与当前密码相同
    const isSamePassword = await bcrypt.compare(newPassword, user.password)
    if (isSamePassword) {
      return errorResponse('新密码不能与当前密码相同', 400)
    }

    // 哈希新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // 更新密码
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    })

    return successResponse({
      message: '密码修改成功',
    })
  } catch (error) {
    console.error('Change password error:', error)
    return errorResponse('修改密码失败', 500)
  }
}
