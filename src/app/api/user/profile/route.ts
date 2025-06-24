import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { nickname } = body

    // 验证昵称
    if (nickname && typeof nickname !== 'string') {
      return validationErrorResponse('昵称格式不正确')
    }

    if (nickname && nickname.length > 50) {
      return validationErrorResponse('昵称长度不能超过50个字符')
    }

    if (nickname && nickname.trim().length === 0) {
      return validationErrorResponse('昵称不能为空')
    }

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name: nickname.trim() },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return successResponse({
      message: '个人资料更新成功',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return errorResponse('更新个人资料失败', 500)
  }
}
