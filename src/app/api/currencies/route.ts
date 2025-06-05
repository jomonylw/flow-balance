import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'

/**
 * 获取所有可用货币列表（全局货币）
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 获取所有货币（包括全局货币和用户的自定义货币）
    const currencies = await prisma.currency.findMany({
      where: {
        OR: [
          { isCustom: false }, // 全局货币
          { isCustom: true, createdBy: user.id } // 用户的自定义货币
        ]
      },
      orderBy: [
        { isCustom: 'asc' }, // 全局货币在前
        { code: 'asc' }
      ]
    })

    // 获取用户已选择的货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      select: { currencyCode: true }
    })

    const userCurrencyCodes = new Set(userCurrencies.map(uc => uc.currencyCode))

    // 标记哪些货币已被用户选择
    const currenciesWithStatus = currencies.map(currency => ({
      ...currency,
      isSelected: userCurrencyCodes.has(currency.code)
    }))

    return successResponse({
      currencies: currenciesWithStatus
    })
  } catch (error) {
    console.error('获取货币列表失败:', error)
    return errorResponse('获取货币列表失败', 500)
  }
}
