import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response'

/**
 * 获取单个汇率详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = params

    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: {
        id,
        userId: user.id
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true
      }
    })

    if (!exchangeRate) {
      return errorResponse('汇率记录不存在', 404)
    }

    // 序列化 Decimal 类型
    const serializedRate = {
      ...exchangeRate,
      rate: parseFloat(exchangeRate.rate.toString())
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = params
    const body = await request.json()
    const { rate, effectiveDate, notes } = body

    // 验证汇率是否属于当前用户
    const existingRate = await prisma.exchangeRate.findFirst({
      where: {
        id,
        userId: user.id
      }
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
            fromCurrency: existingRate.fromCurrency,
            toCurrency: existingRate.toCurrency,
            effectiveDate: parsedDate,
            id: { not: id }
          }
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
        ...(notes !== undefined && { notes: notes || null })
      },
      include: {
        fromCurrencyRef: true,
        toCurrencyRef: true
      }
    })

    // 序列化 Decimal 类型
    const serializedRate = {
      ...updatedRate,
      rate: parseFloat(updatedRate.rate.toString())
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = params

    // 验证汇率是否属于当前用户
    const existingRate = await prisma.exchangeRate.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!existingRate) {
      return errorResponse('汇率记录不存在', 404)
    }

    // 删除汇率
    await prisma.exchangeRate.delete({
      where: { id }
    })

    return successResponse(null, '汇率删除成功')
  } catch (error) {
    console.error('删除汇率失败:', error)
    return errorResponse('删除汇率失败', 500)
  }
}
