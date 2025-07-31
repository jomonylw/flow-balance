# 统一查询层架构设计

## 设计目标

1. **消除代码冗余**: 统一管理所有原生 SQL 查询，消除数据库方言差异导致的重复代码
2. **实现关注点分离**: 将数据访问逻辑与业务逻辑解耦
3. **提高可维护性**: 集中管理查询逻辑，便于修改和测试
4. **增强可复用性**: 创建可复用的查询函数，避免重复实现

## 核心架构

### 三层架构模式

```
┌─────────────────────────────────────┐
│     业务逻辑层 (Business Layer)      │
│  API Routes & Service Functions     │
└─────────────────┬───────────────────┘
                  │ 调用封装函数
┌─────────────────▼───────────────────┐
│     统一查询层 (Query Layer)        │
│    src/lib/database/raw-queries.ts │
└─────────────────┬───────────────────┘
                  │ 内部处理数据库方言
┌─────────────────▼───────────────────┐
│     数据访问层 (Data Layer)         │
│        Prisma Client               │
└─────────────────────────────────────┘
```

## 文件结构设计

### 主文件: `src/lib/database/raw-queries.ts`

```typescript
// 数据库方言检测
export function getDatabaseDialect(): 'postgresql' | 'sqlite'

// 分类树查询
export async function getCategoryTreeIds(categoryId: string): Promise<string[]>
export async function buildCategoryHierarchyMap(
  userId: string,
  categoryTypes?: string[]
): Promise<CategoryHierarchyMap>

// 余额计算查询
export async function getLatestAccountBalances(
  userId: string,
  asOfDate: Date
): Promise<AccountBalanceResult[]>
export async function getAccountBalanceHistory(
  accountId: string,
  userId: string
): Promise<BalanceHistoryResult[]>
export async function getAssetLiabilityBalances(
  userId: string,
  monthEnd: Date
): Promise<AssetLiabilityResult>

// 现金流查询
export async function getCashFlowData(userId: string, dateCondition: any): Promise<CashFlowResult[]>
export async function getMonthlyIncomeExpense(
  userId: string,
  targetDate: Date
): Promise<IncomeExpenseResult[]>

// 月度汇总查询
export async function getMonthlyFlowSummary(
  categoryId: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<MonthlyFlowResult[]>
export async function getMonthlyStockSummary(
  categoryId: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<MonthlyStockResult[]>

// 系统查询
export async function testDatabaseConnection(): Promise<boolean>
export async function getDatabaseStats(): Promise<DatabaseStatsResult | null>
```

### 类型定义文件: `src/types/database/raw-queries.ts`

```typescript
// 查询结果类型定义
export interface AccountBalanceResult {
  accountId: string
  currencyCode: string
  currencySymbol: string
  currencyName: string
  finalBalance: number
}

export interface CashFlowResult {
  categoryId: string
  categoryName: string
  categoryType: string
  accountId: string
  accountName: string
  currencyCode: string
  currencySymbol: string
  currencyName: string
  transactionType: string
  totalAmount: number
  transactionCount: number
}

// ... 其他类型定义
```

## 核心功能模块

### 1. 数据库方言检测模块

**功能**: 自动检测当前使用的数据库类型，为查询函数提供方言选择依据

```typescript
export function getDatabaseDialect(): 'postgresql' | 'sqlite' {
  const databaseUrl = process.env.DATABASE_URL || ''
  return databaseUrl.includes('postgresql') || databaseUrl.includes('postgres')
    ? 'postgresql'
    : 'sqlite'
}
```

### 2. 分类树查询模块

**解决问题**: 消除 4 处重复的递归查询逻辑

**核心函数**:

- `getCategoryTreeIds()`: 获取分类及其所有子分类的 ID 列表
- `buildCategoryHierarchyMap()`: 构建分类层级关系映射

**优化效果**:

- 统一递归查询逻辑
- 支持 PostgreSQL 和 SQLite 两种方言
- 提供内存缓存优化

### 3. 余额计算查询模块

**解决问题**: 统一 10 处复杂的余额计算逻辑

**核心函数**:

- `getLatestAccountBalances()`: 获取账户最新余额
- `getAccountBalanceHistory()`: 获取账户余额历史
- `getAssetLiabilityBalances()`: 获取资产负债余额汇总

**业务逻辑**:

- 处理 BALANCE、INCOME、EXPENSE 三种交易类型
- 支持多货币余额计算
- 考虑时间范围过滤

### 4. 现金流查询模块

**解决问题**: 统一现金流相关的复杂查询

**核心函数**:

- `getCashFlowData()`: 获取现金流数据
- `getMonthlyIncomeExpense()`: 获取月度收支数据

### 5. 月度汇总查询模块

**解决问题**: 统一月度数据汇总逻辑

**核心函数**:

- `getMonthlyFlowSummary()`: 流量类分类月度汇总
- `getMonthlyStockSummary()`: 存量类分类月度汇总

### 6. 系统查询模块

**功能**: 数据库连接测试和健康检查

**核心函数**:

- `testDatabaseConnection()`: 测试数据库连接
- `getDatabaseStats()`: 获取数据库统计信息

## 实施策略

### 阶段 1: 基础框架搭建

1. 创建 `raw-queries.ts` 文件
2. 实现数据库方言检测功能
3. 定义核心类型接口

### 阶段 2: 核心查询迁移

1. 迁移分类树递归查询 (优先级最高，重复最多)
2. 迁移余额计算查询 (业务核心)
3. 迁移现金流查询

### 阶段 3: 业务服务重构

1. 更新 `dashboard.service.ts`
2. 更新报表相关 API
3. 更新分类汇总服务

### 阶段 4: 测试和优化

1. 编写单元测试
2. 性能测试和优化
3. 文档更新

## 预期收益

### 代码质量提升

- **减少代码行数**: 预计减少 200+ 行重复代码
- **提高可读性**: 业务逻辑更清晰，职责分离明确
- **增强可测试性**: 查询逻辑可独立测试

### 维护成本降低

- **统一修改点**: 查询逻辑修改只需在一处进行
- **减少错误风险**: 消除多处同步修改的风险
- **简化调试**: 集中的查询逻辑便于问题定位

### 开发效率提升

- **代码复用**: 新功能可直接使用现有查询函数
- **快速开发**: 标准化的查询接口加速开发
- **知识共享**: 统一的查询层便于团队协作

## 风险控制

### 兼容性风险

- **渐进式迁移**: 逐步替换现有查询，确保功能稳定
- **向后兼容**: 保留原有接口直到完全迁移完成

### 性能风险

- **基准测试**: 迁移前后进行性能对比
- **查询优化**: 利用统一管理的优势进行查询优化

### 测试覆盖

- **单元测试**: 为每个查询函数编写测试
- **集成测试**: 确保业务逻辑正确性
- **数据库兼容性测试**: 验证 PostgreSQL 和 SQLite 的兼容性

## 下一步行动

1. 创建基础文件结构
2. 实现数据库方言检测
3. 迁移分类树查询逻辑
4. 逐步重构业务服务
5. 完善测试和文档
