import { getCurrentUser } from '@/lib/services/auth.service'
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from '@/lib/api/response'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return unauthorizedResponse()
    }

    // 返回用户信息（不包含密码）
    const { password: _password, ...userWithoutPassword } = user

    return successResponse({
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Get current user API error:', error)
    return errorResponse('服务器内部错误', 500)
  }
}
