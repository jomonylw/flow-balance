import { NextRequest } from 'next/server'
import { registerUser } from '@/lib/services/auth.service'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, confirmPassword } = body

    // 验证必填字段
    if (!email || !password || !confirmPassword) {
      return validationErrorResponse('所有字段都不能为空')
    }

    // 验证密码确认
    if (password !== confirmPassword) {
      return validationErrorResponse('两次输入的密码不一致')
    }

    // 尝试注册
    const result = await registerUser(email, password)

    if (!result.success) {
      return errorResponse(result.error || '注册失败', 400)
    }

    // 返回用户信息（不包含密码）
    if (!result.user) {
      return errorResponse('用户信息获取失败', 500)
    }
    const { password: _password, ...userWithoutPassword } = result.user

    return successResponse({
      user: userWithoutPassword,
      message: '注册成功，请登录',
    })
  } catch (error) {
    console.error('Signup API error:', error)
    return errorResponse('服务器内部错误', 500)
  }
}
