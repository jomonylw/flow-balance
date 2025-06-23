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

    // 检查货币代码列表中是否有重复项
    const uniqueCodes = new Set(currencyCodes)
    if (uniqueCodes.size !== currencyCodes.length) {
      const duplicates = currencyCodes.filter(
        (code, index) => currencyCodes.indexOf(code) !== index
      )
      return validationErrorResponse(
        `货币代码列表中存在重复项: ${[...new Set(duplicates)].join(', ')}`
      )
    }

    // 验证所有货币代码是否有效（优先查找用户自定义货币）
    const validCurrencies = await prisma.currency.findMany({
      where: {
        code: { in: currencyCodes },
        OR: [
          { createdBy: user.id }, // 用户自定义货币
          { createdBy: null }, // 全局货币
        ],
      },
    })

    if (validCurrencies.length !== currencyCodes.length) {
      const invalidCodes = currencyCodes.filter(
        code => !validCurrencies.some(c => c.code === code)
      )
      return validationErrorResponse(
        `无效的货币代码: ${invalidCodes.join(', ')}`
      )
    }

    // 检查是否会导致同一货币代码有多个选择
    // 为每个货币代码选择优先级最高的货币（用户自定义 > 全局）
    const selectedCurrencies: Array<{
      id: string
      code: string
      name: string
      symbol: string
      decimalPlaces: number
      userId?: string | null
    }> = []
    const codeToSelectedCurrency = new Map<
      string,
      {
        id: string
        code: string
        name: string
        symbol: string
        decimalPlaces: number
        userId?: string | null
      }
    >()

    for (const code of currencyCodes) {
      const candidateCurrencies = validCurrencies.filter(c => c.code === code)
      // 按优先级排序：用户自定义货币优先
      candidateCurrencies.sort((a, b) => {
        if (a.createdBy === user.id && b.createdBy !== user.id) return -1
        if (a.createdBy !== user.id && b.createdBy === user.id) return 1
        return 0
      })

      const selectedCurrency = candidateCurrencies[0]
      if (codeToSelectedCurrency.has(code)) {
        return validationErrorResponse(
          `货币代码 ${code} 存在多个可选项，请确保每个货币代码只选择一次`
        )
      }

      codeToSelectedCurrency.set(code, selectedCurrency)
      selectedCurrencies.push(selectedCurrency)
    }

    // 使用事务处理
    await prisma.$transaction(async tx => {
      // 删除现有的用户货币设置
      await tx.userCurrency.deleteMany({
        where: { userId: user.id },
      })

      // 创建新的用户货币设置
      if (selectedCurrencies.length > 0) {
        await tx.userCurrency.createMany({
          data: selectedCurrencies.map((currency, index) => ({
            userId: user.id,
            currencyId: currency.id,
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
    const { currencyId, currencyCode } = body

    // 支持新的货币ID字段，同时保持向后兼容
    if (!currencyId && !currencyCode) {
      return validationErrorResponse('货币ID或货币代码不能为空')
    }

    let currency
    if (currencyId) {
      // 优先使用货币ID（精确匹配）
      currency = await prisma.currency.findFirst({
        where: {
          id: currencyId,
          OR: [
            { createdBy: user.id }, // 用户自定义货币
            { createdBy: null }, // 全局货币
          ],
        },
      })

      if (!currency) {
        return validationErrorResponse('无效的货币ID')
      }
    } else {
      // 向后兼容：使用货币代码（优先选择用户自定义货币）
      currency = await prisma.currency.findFirst({
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
        return validationErrorResponse('无效的货币代码')
      }
    }

    // 检查用户是否已经选择了相同货币代码的其他货币
    const existingCurrenciesWithSameCode = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
        currency: {
          code: currency.code, // 使用实际找到的货币代码
        },
      },
      include: {
        currency: true,
      },
    })

    // 如果已经存在相同代码的货币，检查是否是同一个货币
    if (existingCurrenciesWithSameCode.length > 0) {
      const existingCurrency = existingCurrenciesWithSameCode.find(
        uc => uc.currencyId === currency.id
      )

      if (existingCurrency) {
        // 如果是同一个货币且已激活
        return validationErrorResponse('该货币已在您的可用列表中')
      } else {
        // 如果是不同的货币但代码相同
        return validationErrorResponse(
          `您已选择了货币代码为 ${currency.code} 的其他货币，同一货币代码只能选择一次`
        )
      }
    }

    // 检查是否已存在相同货币ID但未激活的记录
    const existingUserCurrency = await prisma.userCurrency.findUnique({
      where: {
        userId_currencyId: {
          userId: user.id,
          currencyId: currency.id,
        },
      },
    })

    if (existingUserCurrency && !existingUserCurrency.isActive) {
      // 如果已存在但未激活，则激活它
      await prisma.userCurrency.update({
        where: { id: existingUserCurrency.id },
        data: { isActive: true },
      })
      return successResponse({ message: '货币已激活' })
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
        currencyId: currency.id,
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
