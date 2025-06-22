import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'

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
    return errorResponse('获取账户失败', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { name, categoryId, description, color, currencyCode } = body

    if (!name) {
      return errorResponse('账户名称不能为空', 400)
    }

    if (!categoryId) {
      return errorResponse('请选择分类', 400)
    }

    if (!currencyCode) {
      return errorResponse('请选择账户货币', 400)
    }

    // 验证分类是否属于当前用户
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
      },
    })

    if (!category) {
      return errorResponse('分类不存在', 400)
    }

    // 验证货币（优先查找用户自定义货币）
    const currency = await prisma.currency.findFirst({
      where: {
        code: currencyCode,
        OR: [
          { createdBy: user.id }, // 用户自定义货币
          { createdBy: null }, // 全局货币
        ],
      },
      orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
    })

    if (!currency) {
      return errorResponse('指定的货币不存在', 400)
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
      return errorResponse('您没有权限使用此货币，请先在货币管理中添加', 400)
    }

    // 检查同一用户下是否已存在同名账户
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        name,
      },
    })

    if (existingAccount) {
      return errorResponse('该账户名称已存在', 400)
    }

    const account = await prisma.account.create({
      data: {
        userId: user.id,
        categoryId,
        currencyId: currency.id,
        name,
        description: description || null,
        color: color || null,
      },
      include: {
        category: true,
        currency: true,
      },
    })

    return successResponse(account, '账户创建成功')
  } catch (error) {
    console.error('Create account error:', error)
    return errorResponse('创建账户失败', 500)
  }
}
