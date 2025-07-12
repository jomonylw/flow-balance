import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import type { CurrencyCodeRouteParams } from '@/types/api'
import { getUserTranslator } from '@/lib/utils/server-i18n'

/**
 * 删除自定义货币
 */
export async function DELETE(
  request: NextRequest,
  { params }: CurrencyCodeRouteParams
) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { currencyCode } = await params
    const t = await getUserTranslator(user.id)

    // 检查货币是否存在且为用户创建的自定义货币
    const currency = await prisma.currency.findFirst({
      where: {
        createdBy: user.id,
        code: currencyCode,
      },
    })

    if (!currency) {
      return validationErrorResponse(t('currency.not.found'))
    }

    // 检查是否是本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    })

    if (userSettings?.baseCurrencyId === currency.id) {
      return validationErrorResponse(t('currency.custom.cannot.delete.base'))
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
        t('currency.custom.has.transactions', { count: transactionCount })
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
        t('currency.custom.has.exchange.rates', { count: exchangeRateCount })
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

    return successResponse({ message: t('currency.custom.delete.success') })
  } catch (error) {
    console.error('Delete custom currency error:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('currency.custom.delete.failed'), 500)
  }
}

/**
 * 更新自定义货币
 */
export async function PUT(
  request: NextRequest,
  { params }: CurrencyCodeRouteParams
) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { currencyCode } = await params
    const body = await request.json()
    const { name, symbol, decimalPlaces } = body
    const t = await getUserTranslator(user.id)

    // 验证输入
    if (!name || !symbol) {
      return validationErrorResponse(t('currency.custom.name.symbol.required'))
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
        return validationErrorResponse(
          t('currency.custom.decimal.places.invalid')
        )
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
      return validationErrorResponse(t('currency.not.found'))
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
      message: t('currency.custom.update.success'),
    })
  } catch (error) {
    console.error('Update custom currency error:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('currency.custom.update.failed'), 500)
  }
}
