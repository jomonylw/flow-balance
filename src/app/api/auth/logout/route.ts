import { clearAuthCookie } from '@/lib/services/auth.service'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function POST() {
  try {
    await clearAuthCookie()

    return successResponse({
      message: '登出成功',
    })
  } catch (error) {
    console.error('Logout API error:', error)
    return errorResponse('服务器内部错误', 500)
  }
}
