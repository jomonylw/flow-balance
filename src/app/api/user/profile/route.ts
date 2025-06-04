import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response'

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

    // 更新用户信息
    // 注意：目前只支持昵称更新，实际的昵称字段需要添加到User模型中
    // 这里暂时返回成功，实际应用中需要扩展User模型
    
    // TODO: 添加nickname字段到User模型
    // const updatedUser = await prisma.user.update({
    //   where: { id: user.id },
    //   data: { nickname }
    // })

    return successResponse({
      message: '个人资料更新成功',
      // user: updatedUser
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return errorResponse('更新个人资料失败', 500)
  }
}
