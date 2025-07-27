import { NextRequest } from 'next/server'
import { loginUser, setAuthCookie } from '@/lib/services/auth.service'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import { getCommonError } from '@/lib/constants/api-messages'
import { createServerTranslator } from '@/lib/utils/server-i18n'
import { preloadUserCache } from '@/lib/services/cache.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    const t = createServerTranslator() // 使用默认语言，因为用户还未登录

    // 验证必填字段
    if (!email || !password) {
      return validationErrorResponse(t('auth.email.password.required'))
    }

    // 尝试登录
    const result = await loginUser(email, password)

    if (!result.success) {
      return errorResponse(result.error || getCommonError('UNAUTHORIZED'), 401)
    }

    // 设置认证 Cookie
    if (result.token) {
      await setAuthCookie(result.token)
    }

    // 返回用户信息（不包含密码）
    if (!result.user) {
      return errorResponse(t('auth.user.info.failed'), 500)
    }
    const { password: _password, ...userWithoutPassword } = result.user

    // 预热用户缓存数据（异步执行，不阻塞响应）
    preloadUserCache(result.user.id).catch(err => {
      console.error('缓存预热失败:', err)
    })

    return successResponse({
      user: userWithoutPassword,
      message: t('auth.login.success'),
    })
  } catch (error) {
    console.error('Login API error:', error)
    const t = createServerTranslator()
    return errorResponse(t('common.server.error'), 500)
  }
}
