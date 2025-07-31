import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/services/auth.service'
import { prisma } from '@/lib/database/connection-manager'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api/response'
// import { getUserTranslator } from '@/lib/utils/server-i18n'
import { TransactionType } from '@prisma/client'
import { normalizeDateRange } from '@/lib/utils/date-range'
import { getAllCategoryIds } from '@/lib/services/category-summary/utils'
import { getTransactionStats } from '@/lib/database/queries/transaction-stats.queries'

// 注意：getDescendantCategoryIds 已替换为优化的 getAllCategoryIds 函数

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const categoryId = searchParams.get('categoryId')
    const currencyId = searchParams.get('currencyId')
    const type = searchParams.get('type') as TransactionType | null
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean) || []

    // 获取用户的基础货币设置
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
      include: { baseCurrency: true },
    })

    const baseCurrency = userSettings?.baseCurrency

    if (!baseCurrency) {
      return errorResponse('请先设置本位币', 400)
    }

    // 构建筛选条件
    const filters: any = {}

    if (accountId) {
      filters.accountId = accountId
    }

    if (categoryId) {
      // 获取该分类及其所有后代分类的ID（使用优化的CTE版本）
      const allCategoryIds = await getAllCategoryIds(prisma, categoryId)
      filters.categoryIds = allCategoryIds
    }

    if (currencyId) {
      filters.currencyId = currencyId
    }

    if (type) {
      // 确保指定的类型是收入或支出
      if (type === 'INCOME' || type === 'EXPENSE') {
        filters.type = type
      } else {
        // 如果指定了其他类型（如BALANCE），忽略该参数，使用默认筛选
        filters.type = ['INCOME', 'EXPENSE']
      }
    } else {
      // 默认只处理收入和支出类型的交易
      filters.type = ['INCOME', 'EXPENSE']
    }

    if (dateFrom || dateTo) {
      const { dateCondition } = normalizeDateRange(dateFrom, dateTo)
      if (dateCondition.gte) {
        filters.dateFrom = dateCondition.gte
      }
      if (dateCondition.lte) {
        filters.dateTo = dateCondition.lte
      }
    }

    if (search) {
      filters.search = search
    }

    if (tagIds.length > 0) {
      filters.tagIds = tagIds
    }

    // 使用优化的数据库聚合查询
    const stats = await getTransactionStats(user.id, filters, baseCurrency)

    return successResponse(stats)
  } catch (error) {
    console.error('Get transaction stats error:', error)
    return errorResponse('获取交易统计失败', 500)
  }
}
