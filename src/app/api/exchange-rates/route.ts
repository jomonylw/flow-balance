import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import type { Prisma } from '@prisma/client'
import { generateAutoExchangeRates } from '@/lib/services/exchange-rate-auto-generation.service'
import { getUserTranslator } from '@/lib/utils/server-i18n'
import { revalidateAllCurrencyAndExchangeRateCache } from '@/lib/services/cache-revalidation'
import {
  cleanupSpecificCurrencyPairHistory,
  cleanupExchangeRateHistory,
} from '@/lib/services/exchange-rate-cleanup.service'

/**
 * 获取用户的汇率设置
 */
export async function GET(request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const fromCurrency = searchParams.get('fromCurrency')
    const toCurrency = searchParams.get('toCurrency')

    const whereClause: Prisma.ExchangeRateWhereInput = { userId: user.id }

    // 如果指定了货币对，则过滤（需要先查找货币ID）
    if (fromCurrency) {
      const fromCurrencyRecord = await prisma.currency.findFirst({
        where: {
          code: fromCurrency,
          OR: [
            { createdBy: user.id }, // 用户自定义货币
            { createdBy: null }, // 全局货币
          ],
        },
        orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
      })
      if (fromCurrencyRecord) {
        whereClause.fromCurrencyId = fromCurrencyRecord.id
      }
    }
    if (toCurrency) {
      const toCurrencyRecord = await prisma.currency.findFirst({
        where: {
          code: toCurrency,
          OR: [
            { createdBy: user.id }, // 用户自定义货币
            { createdBy: null }, // 全局货币
          ],
        },
        orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
      })
      if (toCurrencyRecord) {
        whereClause.toCurrencyId = toCurrencyRecord.id
      }
    }

    const exchangeRates = await prisma.exchangeRate.findMany({
      where: whereClause,
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
      orderBy: [
        { fromCurrencyRef: { code: 'asc' } },
        { toCurrencyRef: { code: 'asc' } },
        { effectiveDate: 'desc' },
      ],
    })

    // 序列化 Decimal 类型并添加货币代码字段
    const serializedRates = exchangeRates.map(rate => ({
      ...rate,
      rate: parseFloat(rate.rate.toString()),
      fromCurrency: rate.fromCurrencyRef?.code || '',
      toCurrency: rate.toCurrencyRef?.code || '',
    }))

    return successResponse(serializedRates)
  } catch (error) {
    console.error('获取汇率失败:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('exchange.rate.get.failed'), 500)
  }
}

/**
 * 创建或更新汇率
 */
export async function POST(request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { fromCurrency, toCurrency, rate, effectiveDate, notes } = body

    // 验证必填字段
    if (!fromCurrency || !toCurrency || !rate || !effectiveDate) {
      const t = await getUserTranslator(user.id)
      return validationErrorResponse(t('exchange.rate.required.fields'))
    }

    // 验证汇率值
    const rateValue = parseFloat(rate)
    const t = await getUserTranslator(user.id)
    if (isNaN(rateValue) || rateValue <= 0) {
      return validationErrorResponse(t('exchange.rate.invalid.value'))
    }

    // 验证汇率精度（不能超过8位小数）
    const rateStr = rateValue.toString()
    const decimalIndex = rateStr.indexOf('.')
    if (decimalIndex !== -1 && rateStr.length - decimalIndex - 1 > 8) {
      return validationErrorResponse(t('exchange.rate.precision.limit'))
    }

    // 验证汇率合理性
    if (rateValue > 1000000) {
      return validationErrorResponse(t('exchange.rate.value.too.large'))
    }

    // 验证货币代码（优先查找用户自定义货币）
    const fromCurrencyExists = await prisma.currency.findFirst({
      where: {
        code: fromCurrency,
        OR: [
          { createdBy: user.id }, // 用户自定义货币
          { createdBy: null }, // 全局货币
        ],
      },
      orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
    })

    const toCurrencyExists = await prisma.currency.findFirst({
      where: {
        code: toCurrency,
        OR: [
          { createdBy: user.id }, // 用户自定义货币
          { createdBy: null }, // 全局货币
        ],
      },
      orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
    })

    if (!fromCurrencyExists) {
      return validationErrorResponse(
        t('exchange.rate.from.currency.not.found', { currency: fromCurrency })
      )
    }

    if (!toCurrencyExists) {
      return validationErrorResponse(
        t('exchange.rate.to.currency.not.found', { currency: toCurrency })
      )
    }

    // 验证不能设置相同货币的汇率
    if (fromCurrency === toCurrency) {
      return validationErrorResponse(t('exchange.rate.same.currency.error'))
    }

    // 验证日期
    const parsedDate = new Date(effectiveDate)
    if (isNaN(parsedDate.getTime())) {
      return validationErrorResponse(t('exchange.rate.invalid.date'))
    }

    // 验证生效日期不能是未来日期
    const now = new Date()
    now.setHours(23, 59, 59, 999) // 设置为今天的最后一刻
    if (parsedDate > now) {
      return validationErrorResponse('汇率生效日期不能是未来日期')
    }

    // 检查是否已存在相同日期的汇率
    const existingRate = await prisma.exchangeRate.findUnique({
      where: {
        userId_fromCurrencyId_toCurrencyId_effectiveDate: {
          userId: user.id,
          fromCurrencyId: fromCurrencyExists.id,
          toCurrencyId: toCurrencyExists.id,
          effectiveDate: parsedDate,
        },
      },
    })

    let exchangeRate
    if (existingRate) {
      // 更新现有汇率
      exchangeRate = await prisma.exchangeRate.update({
        where: { id: existingRate.id },
        data: {
          rate: rateValue,
          notes: notes || null,
        },
        include: {
          fromCurrencyRef: true,
          toCurrencyRef: true,
        },
      })
    } else {
      // 创建新汇率
      exchangeRate = await prisma.exchangeRate.create({
        data: {
          userId: user.id,
          fromCurrencyId: fromCurrencyExists.id,
          toCurrencyId: toCurrencyExists.id,
          rate: rateValue,
          effectiveDate: parsedDate,
          type: 'USER', // 用户输入的汇率
          notes: notes || null,
        },
        include: {
          fromCurrencyRef: true,
          toCurrencyRef: true,
        },
      })
    }

    // 序列化 Decimal 类型并添加货币代码字段
    const serializedRate = {
      ...exchangeRate,
      rate: parseFloat(exchangeRate.rate.toString()),
      fromCurrency: exchangeRate.fromCurrencyRef?.code || '',
      toCurrency: exchangeRate.toCurrencyRef?.code || '',
    }

    // 清理所有自动生成的汇率，然后重新生成
    try {
      // 删除所有自动生成的汇率
      await prisma.exchangeRate.deleteMany({
        where: {
          userId: user.id,
          type: 'AUTO',
        },
      })

      // 重新生成所有自动汇率
      await generateAutoExchangeRates(user.id, parsedDate)
    } catch (error) {
      console.error(t('exchange.rate.auto.generate.failed'), error)
      // 不影响主要操作，只记录错误
    }

    // 清理汇率历史记录，只保留最新的 effectiveDate 汇率
    try {
      await cleanupSpecificCurrencyPairHistory(
        user.id,
        fromCurrencyExists.id,
        toCurrencyExists.id,
        { clearCache: false } // 稍后统一清除缓存
      )
    } catch (error) {
      console.error('清理汇率历史失败:', error)
      // 不影响主要操作，只记录错误
    }

    // 🔥 关键修复：汇率创建/更新完成后，立即清除所有相关缓存
    console.log(
      `🧹 汇率创建/更新完成，清除用户 ${user.id} 的所有货币和汇率缓存`
    )
    revalidateAllCurrencyAndExchangeRateCache(user.id)

    return successResponse(
      serializedRate,
      existingRate
        ? t('exchange.rate.update.success')
        : t('exchange.rate.create.success')
    )
  } catch (error) {
    console.error('创建/更新汇率失败:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('exchange.rate.operation.failed'), 500)
  }
}

/**
 * 批量创建汇率
 */
export async function PUT(request: NextRequest) {
  let user: any = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { rates } = body

    if (!Array.isArray(rates) || rates.length === 0) {
      return validationErrorResponse('汇率数据格式不正确')
    }

    const results = []
    const errors = []

    for (let i = 0; i < rates.length; i++) {
      const rateData = rates[i]
      try {
        const { fromCurrency, toCurrency, rate, effectiveDate, notes } =
          rateData

        // 基本验证
        if (!fromCurrency || !toCurrency || !rate || !effectiveDate) {
          errors.push(`第${i + 1}条记录：缺少必填字段`)
          continue
        }

        const rateValue = parseFloat(rate)
        if (isNaN(rateValue) || rateValue <= 0) {
          errors.push(`第${i + 1}条记录：汇率必须是大于0的数字`)
          continue
        }

        // 验证汇率精度
        const rateStr = rateValue.toString()
        const decimalIndex = rateStr.indexOf('.')
        if (decimalIndex !== -1 && rateStr.length - decimalIndex - 1 > 8) {
          errors.push(`第${i + 1}条记录：汇率精度不能超过8位小数`)
          continue
        }

        // 验证汇率合理性
        if (rateValue > 1000000) {
          errors.push(`第${i + 1}条记录：汇率值过大，请确认是否正确`)
          continue
        }

        if (fromCurrency === toCurrency) {
          errors.push(`第${i + 1}条记录：不能设置相同货币之间的汇率`)
          continue
        }

        const parsedDate = new Date(effectiveDate)
        if (isNaN(parsedDate.getTime())) {
          errors.push(`第${i + 1}条记录：无效的生效日期`)
          continue
        }

        // 验证生效日期不能是未来日期
        const now = new Date()
        now.setHours(23, 59, 59, 999)
        if (parsedDate > now) {
          errors.push(`第${i + 1}条记录：汇率生效日期不能是未来日期`)
          continue
        }

        // 验证货币是否存在
        const fromCurrencyExists = await prisma.currency.findFirst({
          where: {
            code: fromCurrency,
            OR: [
              { createdBy: user.id }, // 用户自定义货币
              { createdBy: null }, // 全局货币
            ],
          },
          orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
        })

        const toCurrencyExists = await prisma.currency.findFirst({
          where: {
            code: toCurrency,
            OR: [
              { createdBy: user.id }, // 用户自定义货币
              { createdBy: null }, // 全局货币
            ],
          },
          orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
        })

        if (!fromCurrencyExists) {
          errors.push(`第${i + 1}条记录：源货币 ${fromCurrency} 不存在`)
          continue
        }

        if (!toCurrencyExists) {
          errors.push(`第${i + 1}条记录：目标货币 ${toCurrency} 不存在`)
          continue
        }

        // 使用 upsert 创建或更新
        const exchangeRate = await prisma.exchangeRate.upsert({
          where: {
            userId_fromCurrencyId_toCurrencyId_effectiveDate: {
              userId: user.id,
              fromCurrencyId: fromCurrencyExists.id,
              toCurrencyId: toCurrencyExists.id,
              effectiveDate: parsedDate,
            },
          },
          update: {
            rate: rateValue,
            notes: notes || null,
          },
          create: {
            userId: user.id,
            fromCurrencyId: fromCurrencyExists.id,
            toCurrencyId: toCurrencyExists.id,
            rate: rateValue,
            effectiveDate: parsedDate,
            type: 'USER', // 用户输入的汇率
            notes: notes || null,
          },
          include: {
            fromCurrencyRef: true,
            toCurrencyRef: true,
          },
        })

        results.push({
          ...exchangeRate,
          rate: parseFloat(exchangeRate.rate.toString()),
          fromCurrency: exchangeRate.fromCurrencyRef?.code || '',
          toCurrency: exchangeRate.toCurrencyRef?.code || '',
        })
      } catch (error) {
        errors.push(
          `第${i + 1}条记录：${error instanceof Error ? error.message : '未知错误'}`
        )
      }
    }

    // 如果有成功创建的汇率，触发自动重新生成
    if (results.length > 0) {
      try {
        // 清理所有自动生成的汇率，然后重新生成
        await prisma.exchangeRate.deleteMany({
          where: {
            userId: user.id,
            type: 'AUTO',
          },
        })

        // 重新生成所有自动汇率
        await generateAutoExchangeRates(user.id)
      } catch (error) {
        console.error('汇率自动生成失败:', error)
        // 不影响主要操作，只记录错误
      }
    }

    // 如果有成功创建的汇率，清理汇率历史记录，只保留最新的 effectiveDate 汇率
    if (results.length > 0) {
      try {
        // 批量清理所有用户的汇率历史记录
        await cleanupExchangeRateHistory(user.id, { clearCache: false })
      } catch (error) {
        console.error('批量清理汇率历史失败:', error)
        // 不影响主要操作，只记录错误
      }
    }

    // 如果有成功创建的汇率，清除汇率缓存
    if (results.length > 0) {
      console.log(
        `🧹 批量汇率创建完成，清除用户 ${user.id} 的所有货币和汇率缓存`
      )
      revalidateAllCurrencyAndExchangeRateCache(user.id)
    }

    return successResponse(
      {
        success: results.length,
        errors: errors.length,
        results,
        errorMessages: errors,
      },
      `成功处理 ${results.length} 条汇率记录${errors.length > 0 ? `，${errors.length} 条失败` : ''}`
    )
  } catch (error) {
    console.error('批量创建汇率失败:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('exchange.rate.batch.operation.failed'), 500)
  }
}
