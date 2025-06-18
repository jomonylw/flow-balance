import { NextRequest } from 'next/server'
import { loginUser, setAuthCookie } from '@/lib/services/auth.service'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 验证必填字段
    if (!email || !password) {
      return validationErrorResponse('邮箱和密码不能为空')
    }

    // 尝试登录
    const result = await loginUser(email, password)

    if (!result.success) {
      return errorResponse(result.error || '登录失败', 401)
    }

    // 设置认证 Cookie
    if (result.token) {
      await setAuthCookie(result.token)
    }

    // 返回用户信息（不包含密码）
    if (!result.user) {
      return errorResponse('用户信息获取失败', 500)
    }
    const { password: _password, ...userWithoutPassword } = result.user

    return successResponse({
      user: userWithoutPassword,
      message: '登录成功',
    })
  } catch (error) {
    console.error('Login API error:', error)
    return errorResponse('服务器内部错误', 500)
  }
}
