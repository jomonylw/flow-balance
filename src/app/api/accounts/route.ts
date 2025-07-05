import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { createServerTranslator } from '@/lib/utils/server-i18n'

/**
 * 获取用户语言偏好并创建翻译函数
 */
async function getUserTranslator(userId: string) {
  try {
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { language: true },
    })

    const userLanguage = userSettings?.language || 'zh'
    return createServerTranslator(userLanguage)
  } catch (error) {
    console.warn(
      'Failed to get user language preference, using default:',
      error
    )
    return createServerTranslator('zh') // 默认使用中文
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const accounts = await prisma.account.findMany({
      where: {
        userId: user.id,
      },
      include: {
        category: true,
        currency: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return successResponse(accounts)
  } catch (error) {
    console.error('Get accounts error:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('account.get.failed'), 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { name, categoryId, description, color, currencyId } = body

    const t = await getUserTranslator(user.id)

    if (!name) {
      return errorResponse(t('account.name.required'), 400)
    }

    if (!categoryId) {
      return errorResponse(t('account.category.required'), 400)
    }

    if (!currencyId) {
      return errorResponse(t('account.currency.required'), 400)
    }

    // 验证分类是否属于当前用户
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
      },
    })

    if (!category) {
      return errorResponse(t('category.not.found'), 400)
    }

    // 验证货币是否存在且用户有权使用
    const currency = await prisma.currency.findFirst({
      where: {
        id: currencyId,
        OR: [
          { createdBy: user.id }, // 用户自定义货币
          { createdBy: null }, // 全局货币
        ],
      },
    })

    if (!currency) {
      return errorResponse(t('currency.not.found'), 400)
    }

    // 验证用户是否有权使用此货币
    const userCurrency = await prisma.userCurrency.findFirst({
      where: {
        userId: user.id,
        currencyId: currency.id,
        isActive: true,
      },
    })

    if (!userCurrency) {
      return errorResponse(t('currency.permission.denied'), 400)
    }

    // 检查同一用户下是否已存在同名账户
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        name,
      },
    })

    if (existingAccount) {
      return errorResponse(t('account.name.already.exists'), 400)
    }

    const account = await prisma.account.create({
      data: {
        userId: user.id,
        categoryId,
        currencyId,
        name,
        description: description || null,
        color: color || null,
      },
      include: {
        category: true,
        currency: true,
      },
    })

    return successResponse(account, t('account.create.success'))
  } catch (error) {
    console.error('Create account error:', error)
    const t = await getUserTranslator(user?.id || '')
    return errorResponse(t('account.create.failed'), 500)
  }
}
