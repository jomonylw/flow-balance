/**
 * 分类汇总服务统一入口
 */

export * from './types'
export * from './utils'
export { getStockCategorySummary } from './stock-category-service'
export { getFlowCategorySummary } from './flow-category-service'

import { getStockCategorySummary, MonthlyReport } from './stock-category-service'
import { getFlowCategorySummary } from './flow-category-service'
import { CategorySummaryResponse } from './types'

/**
 * 根据分类类型获取对应的汇总数据
 * @param categoryId 分类ID
 * @param userId 用户ID
 * @param categoryType 分类类型
 * @returns 分类汇总数据
 */
export async function getCategorySummary(
  categoryId: string,
  userId: string,
  categoryType: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
): Promise<MonthlyReport[] | { children: any[]; accounts: any[] }> {
  if (categoryType === 'ASSET' || categoryType === 'LIABILITY') {
    return await getStockCategorySummary(categoryId, userId)
  } else {
    return await getFlowCategorySummary(categoryId, userId)
  }
}
