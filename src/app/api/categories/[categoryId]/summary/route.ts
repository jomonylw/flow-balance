import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api/response'
import { getStockCategorySummary } from '@/lib/services/category-summary/stock-category-service'
import { getFlowCategorySummary } from '@/lib/services/category-summary/flow-category-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const { categoryId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // 验证分类是否属于当前用户并获取分类类型
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    })

    if (!category) {
      return notFoundResponse('分类不存在')
    }

    // 根据分类类型调用对应的服务
    let summaryData
    if (category.type === 'ASSET' || category.type === 'LIABILITY') {
      summaryData = await getStockCategorySummary(categoryId, user.id)
    } else if (category.type === 'INCOME' || category.type === 'EXPENSE') {
      summaryData = await getFlowCategorySummary(categoryId, user.id)
    } else {
      return errorResponse('分类类型未设置或无效', 400)
    }

    return successResponse(summaryData)
  } catch (error) {
    console.error('Get category summary error:', error)
    return errorResponse('获取分类汇总失败', 500)
  }
}
