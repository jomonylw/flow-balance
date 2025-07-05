import { NextRequest } from 'next/server'
import {
  registerUser,
  generateToken,
  setAuthCookie,
} from '@/lib/services/auth.service'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import { createServerTranslator } from '@/lib/utils/server-i18n'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, confirmPassword } = body

    const t = createServerTranslator() // 使用默认语言，因为用户还未登录

    // 验证必填字段
    if (!email || !password || !confirmPassword) {
      return validationErrorResponse(t('auth.all.fields.required'))
    }

    // 验证密码确认
    if (password !== confirmPassword) {
      return validationErrorResponse(t('auth.password.mismatch'))
    }

    // 尝试注册
    const result = await registerUser(email, password)

    if (!result.success) {
      return errorResponse(result.error || t('auth.signup.failed'), 400)
    }

    // 返回用户信息（不包含密码）
    if (!result.user) {
      return errorResponse(t('auth.user.info.failed'), 500)
    }
    const { password: _password, ...userWithoutPassword } = result.user

    // 自动登录用户
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
    })
    await setAuthCookie(token)

    return successResponse({
      user: userWithoutPassword,
      message: t('auth.signup.success.save.recovery.key'),
      redirectTo: '/recovery-key-setup?from=signup',
    })
  } catch (error) {
    console.error('Signup API error:', error)
    const t = createServerTranslator()
    return errorResponse(t('common.server.error'), 500)
  }
}
