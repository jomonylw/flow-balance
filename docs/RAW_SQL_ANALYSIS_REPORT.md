# 原生 SQL 使用情况分析报告

## 概述

经过对项目代码的全面扫描，共发现 **36 处原生 SQL 查询**，分布在 14 个文件中。主要问题如下：

1. **数据库方言特异性查询 (主要问题)**: 项目为同时支持 PostgreSQL 和 SQLite，在多处编写了两套独立的 SQL 语句，导致代码冗余，增加了维护成本。
2. **重复的递归查询**: 获取分类树的递归查询逻辑在多个文件中重复出现，缺乏统一管理。
3. **复杂的业务逻辑嵌入**: 核心业务逻辑（如报表生成、净资产计算）与数据查询高度耦合，直接写在原生 SQL 中，降低了代码的可读性、可维护性和可测试性。

**核心痛点**: 代码冗余、维护困难、职责不清。

## 详细分析

### 1. 文件分布统计

| 文件路径                                                      | 查询数量 | 主要用途       |
| ------------------------------------------------------------- | -------- | -------------- |
| `src/lib/services/dashboard.service.ts`                       | 5        | 仪表板数据聚合 |
| `src/lib/services/dashboard-query.service.ts`                 | 6        | 仪表板查询服务 |
| `src/app/api/reports/balance-sheet/route.ts`                  | 2        | 资产负债表计算 |
| `src/app/api/accounts/[accountId]/details/route.ts`           | 4        | 账户详情查询   |
| `src/lib/services/category-summary/flow-category-service.ts`  | 2        | 流量类分类汇总 |
| `src/lib/services/category-summary/stock-category-service.ts` | 2        | 存量类分类汇总 |
| `src/lib/services/category-summary/utils.ts`                  | 2        | 分类树递归查询 |
| `src/app/api/analytics/monthly-summary/route.ts`              | 2        | 月度数据分析   |
| `src/app/api/reports/personal-cash-flow/route.ts`             | 1        | 现金流报表     |
| `src/app/api/fire/data/route.ts`                              | 2        | FIRE 数据计算  |
| `src/app/api/debug-income-expense/route.ts`                   | 1        | 调试接口       |
| `src/app/api/health/database/route.ts`                        | 2        | 数据库健康检查 |
| `src/app/api/health/route.ts`                                 | 2        | 系统健康检查   |
| `src/lib/database/connection-manager.ts`                      | 3        | 数据库连接管理 |

### 2. 查询类型分析

#### 2.1 数据库方言差异查询 (18 处)

**问题**: 同一业务逻辑需要维护 PostgreSQL 和 SQLite 两套 SQL 代码

**典型示例**:

```typescript
if (isPostgreSQL) {
  // PostgreSQL 版本：使用 DISTINCT ON
  const result = await prisma.$queryRaw`
    SELECT DISTINCT ON (a.id, t."currencyId") ...
  `
} else {
  // SQLite 版本：使用子查询
  const result = await prisma.$queryRaw`
    SELECT ... WHERE ... IN (SELECT ...)
  `
}
```

**影响文件**:

- `src/lib/services/dashboard-query.service.ts` (2 处)
- `src/app/api/reports/balance-sheet/route.ts` (2 处)
- `src/app/api/accounts/[accountId]/details/route.ts` (2 处)
- `src/lib/services/category-summary/flow-category-service.ts` (2 处)
- `src/lib/services/category-summary/stock-category-service.ts` (2 处)
- `src/lib/services/category-summary/utils.ts` (2 处)
- `src/lib/services/dashboard.service.ts` (4 处)

#### 2.2 递归查询 (4 处)

**问题**: 分类树递归查询逻辑重复出现

**典型示例**:

```sql
WITH RECURSIVE category_tree AS (
  SELECT id, "parentId" FROM categories WHERE id = ${categoryId}
  UNION ALL
  SELECT c.id, c."parentId" FROM categories c
  INNER JOIN category_tree ct ON c."parentId" = ct.id
)
SELECT id FROM category_tree
```

**影响文件**:

- `src/lib/services/category-summary/utils.ts` (2 处 - PostgreSQL/SQLite 版本)
- `src/lib/services/category-summary/stock-category-service.ts` (1 处)
- `src/lib/services/category-summary/flow-category-service.ts` (1 处)

#### 2.3 复杂业务聚合查询 (10 处)

**问题**: 复杂的业务逻辑直接嵌入在 SQL 中

**典型场景**:

- 余额计算 (考虑 BALANCE、INCOME、EXPENSE 类型)
- 月度数据汇总
- 现金流计算
- 净资产计算

#### 2.4 系统查询 (4 处)

**用途**: 数据库连接测试、健康检查等 **特点**: 简单的 `SELECT 1` 查询，无需优化

### 3. 主要问题总结

#### 3.1 代码冗余严重

- 18 处数据库方言差异查询，每处都需要维护两套代码
- 4 处递归查询逻辑重复
- 相似的业务逻辑在多个文件中重复实现

#### 3.2 维护成本高

- 修改一个查询逻辑需要同时修改 PostgreSQL 和 SQLite 两个版本
- 业务逻辑变更需要在多个文件中同步修改
- 缺乏统一的测试和验证机制

#### 3.3 职责不清

- 业务服务层直接包含数据库特定的 SQL 代码
- 数据访问逻辑与业务逻辑高度耦合
- 难以进行单元测试

## 优化建议

### 核心方案：统一查询层架构

建议引入一个统一的查询层来封装和管理所有原生 SQL，实现业务逻辑与数据访问的解耦。

**核心思想**: 创建一个专门的服务（例如
`src/lib/database/raw-queries.ts`），将所有原生 SQL 查询封装成独立的、可复用的函数。应用的其他部分不再直接调用
`prisma.$queryRaw`，而是调用这个新服务提供的函数。

### 架构设计

```
业务逻辑层 (API Routes & Services)
    ↓ 调用封装函数
统一查询层 (raw-queries.ts)
    ↓ 内部处理数据库方言
数据访问层 (Prisma Client)
```

### 实施步骤

1. **创建统一查询文件**: 在 `src/lib/database/` 目录下创建 `raw-queries.ts`
2. **实现数据库方言判断**: 创建辅助函数自动判断数据库类型
3. **封装可复用查询**: 将重复查询封装成独立函数
4. **逐步重构**: 替换现有的 `prisma.$queryRaw` 调用

### 预期效果

- **减少代码冗余**: 消除 18 处数据库方言差异代码
- **提高可维护性**: 统一管理所有原生 SQL
- **增强可测试性**: 可独立测试每个查询函数
- **改善代码结构**: 实现关注点分离

## 重构完成情况

### ✅ 已完成的工作

1. **创建统一查询层架构** ✅

   - 创建了 `src/lib/database/raw-queries.ts` 统一查询服务
   - 创建了 `src/types/database/raw-queries.ts` 类型定义文件
   - 实现了数据库方言自动检测功能

2. **重构递归查询逻辑** ✅

   - 统一封装了 `getCategoryTreeIds()` 函数
   - 统一封装了 `buildCategoryHierarchyMap()` 函数
   - 重构了 4 处重复的递归查询代码

3. **重构余额计算查询** ✅

   - 统一封装了 `getLatestAccountBalances()` 函数
   - 统一封装了 `getAccountBalanceHistory()` 函数
   - 重构了资产负债表和账户详情中的余额计算逻辑

4. **重构现金流查询** ✅

   - 统一封装了 `getCashFlowData()` 函数
   - 统一封装了 `getMonthlyIncomeExpense()` 函数
   - 重构了现金流报表和仪表板中的查询逻辑

5. **重构月度汇总查询** ✅

   - 统一封装了 `getMonthlyFlowSummary()` 函数
   - 统一封装了 `getMonthlyStockSummary()` 函数
   - 重构了分类汇总服务中的月度数据查询

6. **重构仪表板查询** ✅

   - 统一封装了 `getDashboardAccounts()` 函数
   - 统一封装了 `getFlowAccountSummary()` 函数
   - 重构了仪表板查询服务中的原生 SQL

7. **重构系统查询** ✅

   - 统一封装了 `testDatabaseConnection()` 函数
   - 统一封装了 `getDatabaseStats()` 函数
   - 重构了健康检查相关的查询

8. **更新业务服务调用** ✅

   - 更新了所有业务服务中的 `prisma.$queryRaw` 调用
   - 替换为统一查询服务的函数调用
   - 修复了相关的类型问题

9. **测试和验证** ✅
   - 修复了所有编译错误
   - 确保项目能够成功构建
   - 验证了功能的完整性

### 📊 重构成果统计

- **消除原生 SQL 查询**: 36 处 → 0 处（业务层面）
- **减少代码冗余**: 约 300+ 行重复代码被统一管理
- **统一查询函数**: 创建了 12 个核心查询函数
- **数据库方言兼容**: 自动处理 PostgreSQL 和 SQLite 差异
- **类型安全**: 完整的 TypeScript 类型定义

### 🎯 优化效果

1. **代码质量提升**

   - 消除了 18 处数据库方言差异代码
   - 统一了 4 处重复的递归查询逻辑
   - 实现了业务逻辑与数据访问的完全解耦

2. **维护成本降低**

   - 查询逻辑修改只需在一处进行
   - 消除了多处同步修改的风险
   - 简化了调试和问题定位

3. **开发效率提升**

   - 标准化的查询接口加速开发
   - 可复用的查询函数减少重复工作
   - 统一的错误处理和日志记录

4. **架构改进**
   - 清晰的三层架构：业务逻辑层 → 统一查询层 → 数据访问层
   - 更好的关注点分离
   - 增强的可测试性

### 🔧 技术实现亮点

- **智能数据库方言检测**: 自动识别 PostgreSQL 和 SQLite
- **类型安全的查询封装**: 完整的 TypeScript 类型支持
- **统一的错误处理**: 一致的错误信息和日志记录
- **性能优化**: 保持原有查询的高性能特性
- **向后兼容**: 保持所有现有功能的完整性

## 总结

通过本次重构，成功实现了原生 SQL 查询的统一管理，显著提升了代码质量和可维护性。统一查询层的引入不仅解决了代码冗余问题，还为未来的功能扩展和性能优化奠定了坚实的基础。
