import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import { getCurrencyError } from '@/lib/constants/api-messages'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import type { CurrencyCodeRouteParams } from '@/types/api'

/**
 * 删除自定义货币
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

    // 检查货币是否存在且为用户创建的自定义货币
    const currency = await prisma.currency.findFirst({
      where: {
        createdBy: user.id,
        code: currencyCode,
      },
    })

    if (!currency) {
      return validationErrorResponse(getCurrencyError('NOT_FOUND'))
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

    // 使用事务删除货币和相关记录
    await prisma.$transaction(async tx => {
      // 删除用户货币记录
      await tx.userCurrency.deleteMany({
        where: {
          userId: user.id,
          currencyId: currency.id,
        },
      })

      // 删除自定义货币
      await tx.currency.delete({
        where: { id: currency.id },
      })
    })

    return successResponse({ message: '自定义货币删除成功' })
  } catch (error) {
    console.error('删除自定义货币失败:', error)
    return errorResponse(getCurrencyError('DELETE_FAILED'), 500)
  }
}

/**
 * 更新自定义货币
 */
export async function PUT(
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
    const { name, symbol, decimalPlaces } = body

    // 验证输入
    if (!name || !symbol) {
      return validationErrorResponse('名称和符号都不能为空')
    }

    // 验证小数位数（如果提供）
    let decimalPlacesValue: number | undefined
    if (decimalPlaces !== undefined) {
      decimalPlacesValue = parseInt(decimalPlaces)
      if (
        isNaN(decimalPlacesValue) ||
        decimalPlacesValue < 0 ||
        decimalPlacesValue > 10
      ) {
        return validationErrorResponse('小数位数必须是0-10之间的整数')
      }
    }

    // 检查货币是否存在且为用户创建的自定义货币
    const currency = await prisma.currency.findFirst({
      where: {
        createdBy: user.id,
        code: currencyCode,
      },
    })

    if (!currency) {
      return validationErrorResponse(getCurrencyError('NOT_FOUND'))
    }

    // 更新自定义货币
    const updatedCurrency = await prisma.currency.update({
      where: { id: currency.id },
      data: {
        name: name.trim(),
        symbol: symbol.trim(),
        ...(decimalPlacesValue !== undefined && {
          decimalPlaces: decimalPlacesValue,
        }),
      },
    })

    return successResponse({
      currency: updatedCurrency,
      message: '自定义货币更新成功',
    })
  } catch (error) {
    console.error('更新自定义货币失败:', error)
    return errorResponse(getCurrencyError('UPDATE_FAILED'), 500)
  }
}
