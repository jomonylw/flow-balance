import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
import { getUserTranslator } from '@/lib/utils/server-i18n'

export async function GET() {
  let user = null
  try {
    user = await getCurrentUser()
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
  let user = null
  try {
    user = await getCurrentUser()
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
