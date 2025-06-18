import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'

/**
 * 获取用户可用货币列表
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 获取用户可用货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
      orderBy: [{ order: 'asc' }, { currency: { code: 'asc' } }],
    })

    return successResponse({
      currencies: userCurrencies.map(uc => ({
        ...uc.currency,
        order: uc.order,
        isActive: uc.isActive,
      })),
    })
  } catch (error) {
    console.error('获取用户货币失败:', error)
    return errorResponse('获取货币列表失败', 500)
  }
}

/**
 * 批量设置用户可用货币
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { currencyCodes } = body

    if (!Array.isArray(currencyCodes)) {
      return validationErrorResponse('货币代码列表格式错误')
    }

    // 验证所有货币代码是否有效
    const validCurrencies = await prisma.currency.findMany({
      where: {
        code: { in: currencyCodes },
      },
    })

    if (validCurrencies.length !== currencyCodes.length) {
      const invalidCodes = currencyCodes.filter(
        code => !validCurrencies.some(c => c.code === code),
      )
      return validationErrorResponse(
        `无效的货币代码: ${invalidCodes.join(', ')}`,
      )
    }

    // 使用事务处理
    await prisma.$transaction(async tx => {
      // 删除现有的用户货币设置
      await tx.userCurrency.deleteMany({
        where: { userId: user.id },
      })

      // 创建新的用户货币设置
      if (currencyCodes.length > 0) {
        await tx.userCurrency.createMany({
          data: currencyCodes.map((code: string, index: number) => ({
            userId: user.id,
            currencyCode: code,
            order: index,
            isActive: true,
          })),
        })
      }
    })

    return successResponse({ message: '货币设置更新成功' })
  } catch (error) {
    console.error('更新用户货币失败:', error)
    return errorResponse('更新货币设置失败', 500)
  }
}

/**
 * 添加单个货币到用户可用列表
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { currencyCode } = body

    if (!currencyCode) {
      return validationErrorResponse('货币代码不能为空')
    }

    // 验证货币代码是否有效
    const currency = await prisma.currency.findUnique({
      where: { code: currencyCode },
    })

    if (!currency) {
      return validationErrorResponse('无效的货币代码')
    }

    // 检查是否已存在
    const existingUserCurrency = await prisma.userCurrency.findUnique({
      where: {
        userId_currencyCode: {
          userId: user.id,
          currencyCode,
        },
      },
    })

    if (existingUserCurrency) {
      // 如果已存在但未激活，则激活它
      if (!existingUserCurrency.isActive) {
        await prisma.userCurrency.update({
          where: { id: existingUserCurrency.id },
          data: { isActive: true },
        })
        return successResponse({ message: '货币已激活' })
      } else {
        return validationErrorResponse('该货币已在您的可用列表中')
      }
    }

    // 获取当前最大排序值
    const maxOrder = await prisma.userCurrency.aggregate({
      where: { userId: user.id },
      _max: { order: true },
    })

    // 创建新的用户货币记录
    const userCurrency = await prisma.userCurrency.create({
      data: {
        userId: user.id,
        currencyCode,
        order: (maxOrder._max.order || 0) + 1,
        isActive: true,
      },
      include: {
        currency: true,
      },
    })

    return successResponse({
      currency: {
        ...userCurrency.currency,
        order: userCurrency.order,
        isActive: userCurrency.isActive,
      },
      message: '货币添加成功',
    })
  } catch (error) {
    console.error('添加用户货币失败:', error)
    return errorResponse('添加货币失败', 500)
  }
}
