import { NextRequest } from 'next/server'
import { getCurrentUser, clearAuthCookie } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import bcrypt from 'bcryptjs'

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { password } = body

    // 验证密码
    if (!password) {
      return validationErrorResponse('请输入密码确认删除')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return errorResponse('密码不正确', 400)
    }

    // 删除用户及其所有相关数据
    // 由于设置了级联删除，删除用户会自动删除相关的所有数据
    await prisma.user.delete({
      where: { id: user.id },
    })

    // 清除认证Cookie
    await clearAuthCookie()

    return successResponse({
      message: '账户删除成功',
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return errorResponse('删除账户失败', 500)
  }
}
