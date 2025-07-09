import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import { getUserTranslator } from '@/lib/utils/server-i18n'

/**
 * 创建自定义货币
 */
export async function POST(request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { code, name, symbol, decimalPlaces } = body
    const t = await getUserTranslator(user.id)

    // 验证输入
    if (!code || !name || !symbol) {
      return validationErrorResponse(t('currency.custom.fields.required'))
    }

    // 验证小数位数
    const decimalPlacesValue =
      decimalPlaces !== undefined ? parseInt(decimalPlaces) : 2
    if (
      isNaN(decimalPlacesValue) ||
      decimalPlacesValue < 0 ||
      decimalPlacesValue > 10
    ) {
      return validationErrorResponse(
        t('currency.custom.decimal.places.invalid')
      )
    }

    // 验证货币代码格式（3-10个字符，只允许字母和数字）
    if (!/^[A-Z0-9]{3,10}$/.test(code)) {
      return validationErrorResponse(t('currency.custom.code.format.invalid'))
    }

    // 检查用户是否已创建相同代码的货币
    const existingCurrency = await prisma.currency.findUnique({
      where: {
        createdBy_code: {
          createdBy: user.id,
          code: code.toUpperCase(),
        },
      },
    })

    if (existingCurrency) {
      return validationErrorResponse(t('currency.custom.code.already.exists'))
    }

    // 检查用户是否已经选择了相同货币代码的其他货币
    const existingCurrenciesWithSameCode = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
        currency: {
          code: code.toUpperCase(),
        },
      },
      include: {
        currency: true,
      },
    })

    if (existingCurrenciesWithSameCode.length > 0) {
      return validationErrorResponse(
        t('currency.custom.code.already.selected', { code: code.toUpperCase() })
      )
    }

    // 创建自定义货币
    const currency = await prisma.currency.create({
      data: {
        code: code.toUpperCase(),
        name: name.trim(),
        symbol: symbol.trim(),
        decimalPlaces: decimalPlacesValue,
        isCustom: true,
        createdBy: user.id,
      },
    })

    // 自动添加到用户可用货币列表
    const maxOrder = await prisma.userCurrency.aggregate({
      where: { userId: user.id },
      _max: { order: true },
    })

    await prisma.userCurrency.create({
      data: {
        userId: user.id,
        currencyId: currency.id,
        order: (maxOrder._max.order || 0) + 1,
        isActive: true,
      },
    })

    return successResponse({
      currency,
      message: t('currency.custom.create.success'),
    })
  } catch (error) {
    console.error('Create custom currency error:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('currency.custom.create.failed'), 500)
  }
}

/**
 * 获取用户的自定义货币列表
 */
export async function GET(_request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const customCurrencies = await prisma.currency.findMany({
      where: {
        createdBy: user.id,
      },
      orderBy: { code: 'asc' },
    })

    return successResponse({
      currencies: customCurrencies,
    })
  } catch (error) {
    console.error('Get custom currencies error:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('currency.custom.get.failed'), 500)
  }
}
