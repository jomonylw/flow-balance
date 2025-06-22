import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/api/response'
import { generateAutoExchangeRates } from '@/lib/services/exchange-rate-auto-generation.service'

/**
 * 获取单个汇率详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = await params

    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    if (!exchangeRate) {
      return errorResponse('汇率记录不存在', 404)
    }

    // 序列化 Decimal 类型并添加货币代码字段
    const serializedRate = {
      ...exchangeRate,
      rate: parseFloat(exchangeRate.rate.toString()),
      fromCurrency: exchangeRate.fromCurrencyRef?.code || '',
      toCurrency: exchangeRate.toCurrencyRef?.code || '',
    }

    return successResponse(serializedRate)
  } catch (error) {
    console.error('获取汇率详情失败:', error)
    return errorResponse('获取汇率详情失败', 500)
  }
}

/**
 * 更新汇率
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await request.json()
    const { rate, effectiveDate, notes } = body

    // 验证汇率是否属于当前用户
    const existingRate = await prisma.exchangeRate.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existingRate) {
      return errorResponse('汇率记录不存在', 404)
    }

    // 验证汇率值
    if (rate !== undefined) {
      const rateValue = parseFloat(rate)
      if (isNaN(rateValue) || rateValue <= 0) {
        return validationErrorResponse('汇率必须是大于0的数字')
      }
    }

    // 验证日期
    let parsedDate
    if (effectiveDate) {
      parsedDate = new Date(effectiveDate)
      if (isNaN(parsedDate.getTime())) {
        return validationErrorResponse('无效的生效日期')
      }

      // 检查新日期是否与其他记录冲突
      if (parsedDate.getTime() !== existingRate.effectiveDate.getTime()) {
        const conflictingRate = await prisma.exchangeRate.findFirst({
          where: {
            userId: user.id,
            fromCurrencyId: existingRate.fromCurrencyId,
            toCurrencyId: existingRate.toCurrencyId,
            effectiveDate: parsedDate,
            id: { not: id },
          },
        })

        if (conflictingRate) {
          return validationErrorResponse('该日期已存在相同货币对的汇率记录')
        }
      }
    }

    // 更新汇率
    const updatedRate = await prisma.exchangeRate.update({
      where: { id },
      data: {
        ...(rate !== undefined && { rate: parseFloat(rate) }),
        ...(effectiveDate && { effectiveDate: parsedDate }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true,
      },
    })

    // 序列化 Decimal 类型并添加货币代码字段
    const serializedRate = {
      ...updatedRate,
      rate: parseFloat(updatedRate.rate.toString()),
      fromCurrency: updatedRate.fromCurrencyRef?.code || '',
      toCurrency: updatedRate.toCurrencyRef?.code || '',
    }

    // 只有当更新的是用户输入汇率时，才触发自动重新生成
    if (existingRate.type === 'USER') {
      try {
        // 清理所有自动生成的汇率，然后重新生成
        await prisma.exchangeRate.deleteMany({
          where: {
            userId: user.id,
            type: 'AUTO',
          },
        })

        // 重新生成所有自动汇率（使用当前日期，确保能找到所有用户汇率）
        await generateAutoExchangeRates(user.id)
      } catch (error) {
        console.error('自动重新生成汇率失败:', error)
        // 不影响主要操作，只记录错误
      }
    }

    return successResponse(serializedRate, '汇率更新成功')
  } catch (error) {
    console.error('更新汇率失败:', error)
    return errorResponse('更新汇率失败', 500)
  }
}

/**
 * 删除汇率
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = await params

    // 验证汇率是否属于当前用户
    const existingRate = await prisma.exchangeRate.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existingRate) {
      return errorResponse('汇率记录不存在', 404)
    }

    // 删除汇率
    await prisma.exchangeRate.delete({
      where: { id },
    })

    // 只有当删除的是用户输入汇率时，才触发自动重新生成
    if (existingRate.type === 'USER') {
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
        console.error('自动重新生成汇率失败:', error)
        // 不影响主要操作，只记录错误
      }
    }

    return successResponse(null, '汇率删除成功')
  } catch (error) {
    console.error('删除汇率失败:', error)
    return errorResponse('删除汇率失败', 500)
  }
}
