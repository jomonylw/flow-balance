import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import { generateAutoExchangeRates } from '@/lib/services/exchange-rate-auto-generation.service'

/**
 * 自动生成汇率
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { effectiveDate } = body

    let parsedDate: Date | undefined
    if (effectiveDate) {
      parsedDate = new Date(effectiveDate)
      if (isNaN(parsedDate.getTime())) {
        return validationErrorResponse('无效的日期格式')
      }
    }

    // 执行自动生成
    const result = await generateAutoExchangeRates(user.id, parsedDate)

    if (!result.success) {
      return errorResponse(
        `自动生成汇率部分失败: ${result.errors.join(', ')}`,
        400
      )
    }

    return successResponse({
      generatedCount: result.generatedCount,
      details: result.details,
      message: `成功自动生成 ${result.generatedCount} 条汇率记录`,
    })
  } catch (error) {
    console.error('自动生成汇率失败:', error)
    return errorResponse('自动生成汇率失败', 500)
  }
}

/**
 * 获取自动生成汇率的预览信息
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const effectiveDate = searchParams.get('effectiveDate')

    let parsedDate: Date | undefined
    if (effectiveDate) {
      parsedDate = new Date(effectiveDate)
      if (isNaN(parsedDate.getTime())) {
        return validationErrorResponse('无效的日期格式')
      }
    }

    // 这里可以实现预览逻辑，暂时返回基本信息
    return successResponse({
      message: '自动生成汇率预览功能',
      targetDate: parsedDate || new Date(),
    })
  } catch (error) {
    console.error('获取自动生成预览失败:', error)
    return errorResponse('获取预览信息失败', 500)
  }
}
