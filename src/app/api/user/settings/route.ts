import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'

export async function GET() {
  try {
    const user = await getCurrentUser()
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
    return errorResponse('获取设置失败', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const {
      baseCurrencyCode,
      dateFormat,
      theme,
      language,
      fireEnabled,
      fireSWR,
      futureDataDays,
    } = body

    // 验证币种代码并获取货币ID
    let baseCurrencyId: string | undefined
    if (baseCurrencyCode) {
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
        return validationErrorResponse('无效的币种代码')
      }

      baseCurrencyId = currency.id
    }

    // 验证日期格式
    const validDateFormats = [
      'YYYY-MM-DD',
      'DD/MM/YYYY',
      'MM/DD/YYYY',
      'DD-MM-YYYY',
    ]
    if (dateFormat && !validDateFormats.includes(dateFormat)) {
      return validationErrorResponse('无效的日期格式')
    }

    // 验证主题设置
    const validThemes = ['light', 'dark', 'system']
    if (theme && !validThemes.includes(theme)) {
      return validationErrorResponse('无效的主题设置')
    }

    // 验证语言设置
    const validLanguages = ['zh', 'en']
    if (language && !validLanguages.includes(language)) {
      return validationErrorResponse('无效的语言设置')
    }

    // 验证FIRE设置
    if (fireEnabled !== undefined && typeof fireEnabled !== 'boolean') {
      return validationErrorResponse('无效的FIRE启用设置')
    }

    if (fireSWR !== undefined) {
      const swrValue = parseFloat(fireSWR)
      if (isNaN(swrValue) || swrValue < 0 || swrValue > 20) {
        return validationErrorResponse('安全提取率必须在0-20%之间')
      }
    }

    // 验证未来数据生成天数
    if (futureDataDays !== undefined) {
      const daysValue = parseInt(futureDataDays)
      if (isNaN(daysValue) || daysValue < 0 || daysValue > 30) {
        return validationErrorResponse('未来数据生成天数必须在0-30天之间')
      }
    }

    // 获取或创建用户设置
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    })

    let userSettings
    if (existingSettings) {
      // 更新现有设置
      userSettings = await prisma.userSettings.update({
        where: { userId: user.id },
        data: {
          ...(baseCurrencyId && { baseCurrencyId }),
          ...(dateFormat && { dateFormat }),
          ...(theme && { theme }),
          ...(language && { language }),
          ...(fireEnabled !== undefined && { fireEnabled }),
          ...(fireSWR !== undefined && { fireSWR }),
          ...(futureDataDays !== undefined && { futureDataDays }),
        },
        include: { baseCurrency: true },
      })
    } else {
      // 创建新设置
      // 如果没有指定货币，使用默认的 USD
      let defaultBaseCurrencyId = baseCurrencyId
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
        },
        include: { baseCurrency: true },
      })
    }

    return successResponse({
      message: '设置更新成功',
      userSettings,
    })
  } catch (error) {
    console.error('Update user settings error:', error)
    return errorResponse('更新设置失败', 500)
  }
}
