import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import {
  getMissingExchangeRates,
  getUserCurrencies,
} from '@/lib/services/currency.service'

/**
 * 获取用户缺失的汇率设置
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 获取用户设置以确定本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    const baseCurrency = userSettings?.baseCurrency || {
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
    }

    // 获取用户使用的所有货币
    const userCurrencies = await getUserCurrencies(user.id)

    // 获取所有货币信息
    const currencies = await prisma.currency.findMany({
      where: {
        code: { in: userCurrencies },
      },
    })

    // 获取缺失的汇率
    const missingRates = await getMissingExchangeRates(
      user.id,
      baseCurrency.code
    )

    // 获取已设置的汇率
    const existingRates = await prisma.exchangeRate.findMany({
      where: {
        userId: user.id,
        toCurrencyRef: {
          code: baseCurrency.code,
        },
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [
        { fromCurrencyRef: { code: 'asc' } },
        { effectiveDate: 'desc' },
      ],
    })

    // 序列化现有汇率并添加货币代码字段
    const serializedExistingRates = existingRates.map(rate => ({
      ...rate,
      rate: parseFloat(rate.rate.toString()),
      fromCurrency: rate.fromCurrencyRef?.code || '',
      toCurrency: rate.toCurrencyRef?.code || '',
    }))

    // 构建缺失汇率的详细信息
    const missingRatesWithDetails = missingRates.map(missing => {
      const fromCurrency = currencies.find(c => c.code === missing.fromCurrency)
      const toCurrency = currencies.find(c => c.code === missing.toCurrency)

      return {
        fromCurrency: missing.fromCurrency,
        toCurrency: missing.toCurrency,
        fromCurrencyInfo: fromCurrency,
        toCurrencyInfo: toCurrency,
        required: true,
      }
    })

    // 获取用户所有货币对的汇率状态
    const allCurrencyPairs = userCurrencies
      .filter(currency => currency !== baseCurrency.code)
      .map(currency => {
        const fromCurrency = currencies.find(c => c.code === currency)
        const hasRate = !missingRates.some(
          missing =>
            missing.fromCurrency === currency &&
            missing.toCurrency === baseCurrency.code
        )

        return {
          fromCurrency: currency,
          toCurrency: baseCurrency.code,
          fromCurrencyInfo: fromCurrency,
          toCurrencyInfo: baseCurrency,
          hasRate,
          required: true,
        }
      })

    return successResponse({
      baseCurrency,
      userCurrencies,
      currencies,
      missingRates: missingRatesWithDetails,
      existingRates: serializedExistingRates,
      allCurrencyPairs,
      summary: {
        totalCurrencies: userCurrencies.length,
        missingRatesCount: missingRates.length,
        existingRatesCount: serializedExistingRates.length,
        needsAttention: missingRates.length > 0,
      },
    })
  } catch (error) {
    console.error('获取缺失汇率失败:', error)
    return errorResponse('获取缺失汇率失败', 500)
  }
}
