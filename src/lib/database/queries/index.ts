/**
 * 统一查询层 - 模块化入口文件
 *
 * 此文件统一导出所有查询模块的函数，为应用的其他部分提供单一、稳定的入口点。
 * 即使未来内部文件结构调整，调用方的代码也无需修改。
 */

// 分类相关查询
export * from './category.queries'

// 账户和余额相关查询
export * from './account.queries'

// 报表和现金流相关查询
export * from './report.queries'

// 仪表板相关查询
export * from './dashboard.queries'

// 系统和健康检查相关查询
export * from './system.queries'

// 余额历史相关查询 (优化版)
export * from './balance-history.queries'

// 分类树相关查询 (优化版)
export * from './category-tree.queries'

// 交易统计相关查询 (优化版)
export * from './transaction-stats.queries'

// 新增的重构模块
export * from './analytics.queries'
export * from './fire.queries'
export * from './debug.queries'
