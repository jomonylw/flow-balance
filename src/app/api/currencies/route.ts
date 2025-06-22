import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'

/**
 * 获取所有可用货币列表（全局货币）
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 获取所有货币（包括全局货币和用户的自定义货币）
    const currencies = await prisma.currency.findMany({
      where: {
        OR: [
          { createdBy: null }, // 全局货币
          { createdBy: user.id }, // 用户的自定义货币
        ],
      },
      orderBy: [
        { createdBy: 'asc' }, // 全局货币在前（null 值排在前面）
        { code: 'asc' },
      ],
    })

    // 获取用户已选择的货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: { currencyId: true },
    })

    const userCurrencyIds = new Set(userCurrencies.map(uc => uc.currencyId))

    // 标记哪些货币已被用户选择
    const currenciesWithStatus = currencies.map(currency => ({
      ...currency,
      isSelected: userCurrencyIds.has(currency.id),
    }))

    return successResponse({
      currencies: currenciesWithStatus,
    })
  } catch (error) {
    console.error('获取货币列表失败:', error)
    return errorResponse('获取货币列表失败', 500)
  }
}
