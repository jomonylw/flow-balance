import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response'

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { baseCurrencyCode, dateFormat } = body

    // 验证币种代码
    if (baseCurrencyCode) {
      const currency = await prisma.currency.findUnique({
        where: { code: baseCurrencyCode }
      })
      
      if (!currency) {
        return validationErrorResponse('无效的币种代码')
      }
    }

    // 验证日期格式
    const validDateFormats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY']
    if (dateFormat && !validDateFormats.includes(dateFormat)) {
      return validationErrorResponse('无效的日期格式')
    }

    // 获取或创建用户设置
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    })

    let userSettings
    if (existingSettings) {
      // 更新现有设置
      userSettings = await prisma.userSettings.update({
        where: { userId: user.id },
        data: {
          ...(baseCurrencyCode && { baseCurrencyCode }),
          ...(dateFormat && { dateFormat })
        },
        include: { baseCurrency: true }
      })
    } else {
      // 创建新设置
      userSettings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          baseCurrencyCode: baseCurrencyCode || 'USD',
          dateFormat: dateFormat || 'YYYY-MM-DD'
        },
        include: { baseCurrency: true }
      })
    }

    return successResponse({
      message: '设置更新成功',
      userSettings
    })
  } catch (error) {
    console.error('Update user settings error:', error)
    return errorResponse('更新设置失败', 500)
  }
}
