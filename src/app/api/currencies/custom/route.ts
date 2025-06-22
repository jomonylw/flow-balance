import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'

/**
 * 创建自定义货币
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { code, name, symbol, decimalPlaces } = body

    // 验证输入
    if (!code || !name || !symbol) {
      return validationErrorResponse('货币代码、名称和符号都不能为空')
    }

    // 验证小数位数
    const decimalPlacesValue =
      decimalPlaces !== undefined ? parseInt(decimalPlaces) : 2
    if (
      isNaN(decimalPlacesValue) ||
      decimalPlacesValue < 0 ||
      decimalPlacesValue > 10
    ) {
      return validationErrorResponse('小数位数必须是0-10之间的整数')
    }

    // 验证货币代码格式（3-10个字符，只允许字母和数字）
    if (!/^[A-Z0-9]{3,10}$/.test(code)) {
      return validationErrorResponse('货币代码必须是3-10个大写字母或数字')
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
      return validationErrorResponse('您已创建过该货币代码')
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
      message: '自定义货币创建成功',
    })
  } catch (error) {
    console.error('创建自定义货币失败:', error)
    return errorResponse('创建自定义货币失败', 500)
  }
}

/**
 * 获取用户的自定义货币列表
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
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
    console.error('获取自定义货币失败:', error)
    return errorResponse('获取自定义货币失败', 500)
  }
}
