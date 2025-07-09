import { clearAuthCookie } from '@/lib/services/auth.service'
import { successResponse, errorResponse } from '@/lib/api/response'
import { createServerTranslator } from '@/lib/utils/server-i18n'

export async function POST() {
  try {
    await clearAuthCookie()

    const t = createServerTranslator()
    return successResponse({
      message: t('auth.logout.success'),
    })
  } catch (error) {
    console.error('Logout API error:', error)
    const t = createServerTranslator()
    return errorResponse(t('auth.logout.failed'), 500)
  }
}
