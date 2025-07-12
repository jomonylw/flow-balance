import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import {
  getUserTranslator,
  clearUserLanguageCache,
} from '@/lib/utils/server-i18n'

export async function GET() {
  let user = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 获取用户设置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    return successResponse({
      userSettings,
    })
  } catch (error) {
    console.error('Get user settings error:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('settings.get.failed'), 500)
  }
}

export async function PUT(request: NextRequest) {
  let user = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const {
      baseCurrencyId, // 直接使用货币ID
      baseCurrencyCode, // 保持向后兼容
      dateFormat,
      theme,
      language,
      fireEnabled,
      fireSWR,
      futureDataDays,
      autoUpdateExchangeRates,
    } = body

    // 验证货币ID或代码并获取最终的货币ID
    let finalBaseCurrencyId: string | undefined

    if (baseCurrencyId) {
      // 如果提供了货币ID，验证其有效性
      const currency = await prisma.currency.findFirst({
        where: {
          id: baseCurrencyId,
          OR: [
            { createdBy: user.id }, // 用户自定义货币
            { createdBy: null }, // 全局货币
          ],
        },
      })

      if (!currency) {
        const t = await getUserTranslator(user.id)
        return validationErrorResponse(t('settings.currency.id.invalid'))
      }

      finalBaseCurrencyId = currency.id
    } else if (baseCurrencyCode) {
      // 向后兼容：如果提供了货币代码，查找对应的货币ID
      const currency = await prisma.currency.findFirst({
        where: {
          code: baseCurrencyCode,
          OR: [
            { createdBy: user.id }, // 用户自定义货币
            { createdBy: null }, // 全局货币
          ],
        },
        orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
      })

      if (!currency) {
        const t = await getUserTranslator(user.id)
        return validationErrorResponse(t('settings.currency.code.invalid'))
      }

      finalBaseCurrencyId = currency.id
    }

    const t = await getUserTranslator(user.id)

    // 验证日期格式
    const validDateFormats = [
      'YYYY-MM-DD',
      'DD/MM/YYYY',
      'MM/DD/YYYY',
      'DD-MM-YYYY',
    ]
    if (dateFormat && !validDateFormats.includes(dateFormat)) {
      return validationErrorResponse(t('settings.date.format.invalid'))
    }

    // 验证主题设置
    const validThemes = ['light', 'dark', 'system']
    if (theme && !validThemes.includes(theme)) {
      return validationErrorResponse(t('settings.theme.invalid'))
    }

    // 验证语言设置
    const validLanguages = ['zh', 'en']
    if (language && !validLanguages.includes(language)) {
      return validationErrorResponse(t('settings.language.invalid'))
    }

    // 验证FIRE设置
    if (fireEnabled !== undefined && typeof fireEnabled !== 'boolean') {
      return validationErrorResponse(t('settings.fire.enabled.invalid'))
    }

    if (fireSWR !== undefined) {
      const swrValue = parseFloat(fireSWR)
      if (isNaN(swrValue) || swrValue < 0 || swrValue > 20) {
        return validationErrorResponse(t('settings.fire.swr.invalid'))
      }
    }

    // 验证未来数据生成天数
    if (futureDataDays !== undefined) {
      const daysValue = parseInt(futureDataDays)
      if (isNaN(daysValue) || daysValue < 0 || daysValue > 30) {
        return validationErrorResponse(t('settings.future.data.days.invalid'))
      }
    }

    // 验证汇率自动更新设置
    if (
      autoUpdateExchangeRates !== undefined &&
      typeof autoUpdateExchangeRates !== 'boolean'
    ) {
      return validationErrorResponse(
        t('settings.auto.update.exchange.rates.invalid')
      )
    }

    // 获取或创建用户设置
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    })

    let userSettings
    if (existingSettings) {
      // 检查语言是否发生变化
      const languageChanged = language && existingSettings.language !== language

      // 更新现有设置
      userSettings = await prisma.userSettings.update({
        where: { userId: user.id },
        data: {
          ...(finalBaseCurrencyId && { baseCurrencyId: finalBaseCurrencyId }),
          ...(dateFormat && { dateFormat }),
          ...(theme && { theme }),
          ...(language && { language }),
          ...(fireEnabled !== undefined && { fireEnabled }),
          ...(fireSWR !== undefined && { fireSWR }),
          ...(futureDataDays !== undefined && { futureDataDays }),
          ...(autoUpdateExchangeRates !== undefined && {
            autoUpdateExchangeRates,
          }),
        },
        include: { baseCurrency: true },
      })

      // 如果语言发生变化，清除该用户的语言缓存
      if (languageChanged) {
        clearUserLanguageCache(user.id)
      }
    } else {
      // 创建新设置
      // 如果没有指定货币，使用默认的 USD
      let defaultBaseCurrencyId = finalBaseCurrencyId
      if (!defaultBaseCurrencyId) {
        const defaultCurrency = await prisma.currency.findFirst({
          where: {
            code: 'USD',
            OR: [
              { createdBy: user.id }, // 用户自定义货币
              { createdBy: null }, // 全局货币
            ],
          },
          orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
        })
        defaultBaseCurrencyId = defaultCurrency?.id
      }

      userSettings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          baseCurrencyId: defaultBaseCurrencyId,
          dateFormat: dateFormat || 'YYYY-MM-DD',
          theme: theme || 'system',
          language: language || 'zh',
          fireEnabled: fireEnabled !== undefined ? fireEnabled : false,
          fireSWR: fireSWR !== undefined ? fireSWR : 4.0,
          futureDataDays: futureDataDays !== undefined ? futureDataDays : 7,
          autoUpdateExchangeRates:
            autoUpdateExchangeRates !== undefined
              ? autoUpdateExchangeRates
              : false,
        },
        include: { baseCurrency: true },
      })

      // 创建新设置时，如果指定了语言，清除缓存以确保一致性
      if (language) {
        clearUserLanguageCache(user.id)
      }
    }

    return successResponse({
      message: t('settings.update.success'),
      userSettings,
    })
  } catch (error) {
    console.error('Update user settings error:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('settings.update.failed'), 500)
  }
}
