import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import type { CurrencyCodeRouteParams } from '@/types/api'

/**
 * 删除用户可用货币
 */
export async function DELETE(
  request: NextRequest,
  { params }: CurrencyCodeRouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { currencyCode } = await params

    // 智能判断传入的是货币代码还是货币ID
    let currency

    // 首先尝试作为货币ID查找
    currency = await prisma.currency.findFirst({
      where: {
        id: currencyCode, // 这里实际上可能是货币ID
        OR: [
          { createdBy: user.id }, // 用户自定义货币
          { createdBy: null }, // 全局货币
        ],
      },
    })

    // 如果按ID没找到，再尝试按货币代码查找
    if (!currency) {
      currency = await prisma.currency.findFirst({
        where: {
          code: currencyCode, // 作为货币代码查找
          OR: [
            { createdBy: user.id }, // 用户自定义货币
            { createdBy: null }, // 全局货币
          ],
        },
      })
    }

    if (!currency) {
      return validationErrorResponse('货币不存在')
    }

    // 检查是否是本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    })

    if (userSettings?.baseCurrencyId === currency.id) {
      return validationErrorResponse('不能删除本位币，请先更改本位币设置')
    }

    // 检查是否有相关的交易记录
    const transactionCount = await prisma.transaction.count({
      where: {
        userId: user.id,
        currencyId: currency.id,
      },
    })

    if (transactionCount > 0) {
      return validationErrorResponse(
        `该货币有 ${transactionCount} 条交易记录，不能删除`
      )
    }

    // 检查是否有相关的汇率设置
    const exchangeRateCount = await prisma.exchangeRate.count({
      where: {
        userId: user.id,
        OR: [{ fromCurrencyId: currency.id }, { toCurrencyId: currency.id }],
      },
    })

    if (exchangeRateCount > 0) {
      return validationErrorResponse(
        `该货币有 ${exchangeRateCount} 条汇率设置，不能删除`
      )
    }

    // 删除用户货币记录
    const deletedCount = await prisma.userCurrency.deleteMany({
      where: {
        userId: user.id,
        currencyId: currency.id,
      },
    })

    if (deletedCount.count === 0) {
      return validationErrorResponse('该货币不在您的可用列表中')
    }

    return successResponse({ message: '货币删除成功' })
  } catch (error) {
    console.error('删除用户货币失败:', error)
    return errorResponse('删除货币失败', 500)
  }
}

/**
 * 更新用户货币设置（激活/停用）
 */
export async function PATCH(
  request: NextRequest,
  { params }: CurrencyCodeRouteParams
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { currencyCode } = await params
    const body = await request.json()
    const { isActive, order } = body

    // 先查找货币以获取 ID
    const currency = await prisma.currency.findFirst({
      where: {
        code: currencyCode,
        OR: [
          { createdBy: user.id }, // 用户自定义货币
          { createdBy: null }, // 全局货币
        ],
      },
    })

    if (!currency) {
      return validationErrorResponse('货币不存在')
    }

    // 查找用户货币记录
    const userCurrency = await prisma.userCurrency.findUnique({
      where: {
        userId_currencyId: {
          userId: user.id,
          currencyId: currency.id,
        },
      },
    })

    if (!userCurrency) {
      return validationErrorResponse('该货币不在您的可用列表中')
    }

    // 如果要停用货币，检查是否是本位币
    if (isActive === false) {
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
      })

      if (userSettings?.baseCurrencyId === currency.id) {
        return validationErrorResponse('不能停用本位币')
      }
    }

    // 更新用户货币设置
    const updatedUserCurrency = await prisma.userCurrency.update({
      where: { id: userCurrency.id },
      data: {
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(typeof order === 'number' && { order }),
      },
      include: {
        currency: true,
      },
    })

    return successResponse({
      currency: {
        ...updatedUserCurrency.currency,
        order: updatedUserCurrency.order,
        isActive: updatedUserCurrency.isActive,
      },
      message: '货币设置更新成功',
    })
  } catch (error) {
    console.error('更新用户货币失败:', error)
    return errorResponse('更新货币设置失败', 500)
  }
}
