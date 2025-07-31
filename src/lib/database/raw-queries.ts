/**
 * 统一查询层服务 - 主入口文件
 *
 * ⚠️ 此文件已被拆分为模块化结构，请使用 src/lib/database/queries/ 目录下的具体模块
 *
 * 新的导入方式：
 * import { getCategoryTreeIds, buildCategoryHierarchyMap } from '@/lib/database/queries'
 * import { getLatestAccountBalances, getAccountBalanceHistory } from '@/lib/database/queries'
 * import { getCashFlowData, getMonthlyIncomeExpense } from '@/lib/database/queries'
 * import { getMonthlyFlowSummary, getMonthlyStockSummary } from '@/lib/database/queries'
 * import { getDashboardAccounts, getFlowAccountSummary } from '@/lib/database/queries'
 * import { testDatabaseConnection, getDatabaseStats } from '@/lib/database/queries'
 */

// 重新导出所有查询函数，保持向后兼容性
export * from './queries'
