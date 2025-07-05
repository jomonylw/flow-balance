import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import { generateAutoExchangeRates } from '@/lib/services/exchange-rate-auto-generation.service'
import { getUserTranslator } from '@/lib/utils/server-i18n'

/**
 * 自动生成汇率
 */
export async function POST(request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { effectiveDate } = body

    let parsedDate: Date | undefined
    if (effectiveDate) {
      parsedDate = new Date(effectiveDate)
      if (isNaN(parsedDate.getTime())) {
        const t = await getUserTranslator(user.id)
        return validationErrorResponse(t('exchange.rate.invalid.date.format'))
      }
    }

    // 执行自动生成
    const result = await generateAutoExchangeRates(user.id, parsedDate)
    const t = await getUserTranslator(user.id)

    if (!result.success) {
      return errorResponse(
        t('exchange.rate.auto.generate.partial.failed', {
          errors: result.errors.join(', '),
        }),
        400
      )
    }

    return successResponse({
      generatedCount: result.generatedCount,
      details: result.details,
      message: t('exchange.rate.auto.generate.success', {
        count: result.generatedCount,
      }),
    })
  } catch (error) {
    const t = await getUserTranslator(user?.id || '')
    console.error(t('exchange.rate.auto.generate.process.failed'), error)
    return errorResponse(t('exchange.rate.auto.generate.process.failed'), 500)
  }
}

/**
 * 获取自动生成汇率的预览信息
 */
export async function GET(request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const effectiveDate = searchParams.get('effectiveDate')

    let parsedDate: Date | undefined
    if (effectiveDate) {
      parsedDate = new Date(effectiveDate)
      if (isNaN(parsedDate.getTime())) {
        const t = await getUserTranslator(user.id)
        return validationErrorResponse(t('exchange.rate.invalid.date.format'))
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
