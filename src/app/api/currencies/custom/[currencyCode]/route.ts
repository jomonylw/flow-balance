import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response'

interface RouteParams {
  params: Promise<{
    currencyCode: string
  }>
}

/**
 * 删除自定义货币
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { currencyCode } = await params

    // 检查货币是否存在且为用户创建的自定义货币
    const currency = await prisma.currency.findUnique({
      where: { code: currencyCode }
    })

    if (!currency) {
      return validationErrorResponse('货币不存在')
    }

    if (!currency.isCustom || currency.createdBy !== user.id) {
      return validationErrorResponse('只能删除您创建的自定义货币')
    }

    // 检查是否是本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    })

    if (userSettings?.baseCurrencyCode === currencyCode) {
      return validationErrorResponse('不能删除本位币，请先更改本位币设置')
    }

    // 检查是否有相关的交易记录
    const transactionCount = await prisma.transaction.count({
      where: {
        userId: user.id,
        currencyCode
      }
    })

    if (transactionCount > 0) {
      return validationErrorResponse(`该货币有 ${transactionCount} 条交易记录，不能删除`)
    }

    // 检查是否有相关的汇率设置
    const exchangeRateCount = await prisma.exchangeRate.count({
      where: {
        userId: user.id,
        OR: [
          { fromCurrency: currencyCode },
          { toCurrency: currencyCode }
        ]
      }
    })

    if (exchangeRateCount > 0) {
      return validationErrorResponse(`该货币有 ${exchangeRateCount} 条汇率设置，不能删除`)
    }

    // 使用事务删除货币和相关记录
    await prisma.$transaction(async (tx) => {
      // 删除用户货币记录
      await tx.userCurrency.deleteMany({
        where: {
          userId: user.id,
          currencyCode
        }
      })

      // 删除自定义货币
      await tx.currency.delete({
        where: { code: currencyCode }
      })
    })

    return successResponse({ message: '自定义货币删除成功' })
  } catch (error) {
    console.error('删除自定义货币失败:', error)
    return errorResponse('删除自定义货币失败', 500)
  }
}

/**
 * 更新自定义货币
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { currencyCode } = await params
    const body = await request.json()
    const { name, symbol } = body

    // 验证输入
    if (!name || !symbol) {
      return validationErrorResponse('名称和符号都不能为空')
    }

    // 检查货币是否存在且为用户创建的自定义货币
    const currency = await prisma.currency.findUnique({
      where: { code: currencyCode }
    })

    if (!currency) {
      return validationErrorResponse('货币不存在')
    }

    if (!currency.isCustom || currency.createdBy !== user.id) {
      return validationErrorResponse('只能修改您创建的自定义货币')
    }

    // 更新自定义货币
    const updatedCurrency = await prisma.currency.update({
      where: { code: currencyCode },
      data: {
        name: name.trim(),
        symbol: symbol.trim()
      }
    })

    return successResponse({
      currency: updatedCurrency,
      message: '自定义货币更新成功'
    })
  } catch (error) {
    console.error('更新自定义货币失败:', error)
    return errorResponse('更新自定义货币失败', 500)
  }
}
