import { clearAuthCookie } from '@/lib/services/auth.service'
import { successResponse, errorResponse } from '@/lib/api/response'
import { getCommonError } from '@/lib/constants/api-messages'

export async function POST() {
  try {
    await clearAuthCookie()

    return successResponse({
      message: 'Logout successful',
    })
  } catch (error) {
    console.error('Logout API error:', error)
    return errorResponse(getCommonError('INTERNAL_ERROR'), 500)
  }
}
