# 高频数据库查询分析与缓存优化建议

## 🎯 分析概述

通过对项目代码的深入分析，我发现了多个高频数据库查询场景，这些场景都可以通过 Next.js 缓存进一步优化。

## 📊 高频查询场景分析

### 1. 用户认证相关 (🔥🔥🔥 极高频)

#### 问题场景

- `getCurrentUser()` 在每个 API 请求中都被调用
- 每次都查询用户信息和设置
- 包含用户设置和本位币的关联查询

#### 当前实现

```typescript
// src/lib/services/auth.service.ts
export async function getCurrentUser() {
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      settings: {
        include: {
          baseCurrency: true,
        },
      },
    },
  })
}
```

#### 优化建议

```typescript
export const getCurrentUser = nextCache(
  async () => {
    // 现有逻辑
  },
  ['get-current-user'],
  {
    revalidate: CACHE.USER_DATA_TTL / 1000,
    tags: [CACHE_TAGS.USER_SETTINGS],
  }
)
```

### 2. 仪表板数据聚合 (🔥🔥🔥 极高频)

#### 问题场景

- 仪表板汇总需要查询所有账户和交易
- 净资产计算需要大量数据聚合
- 现金流统计涉及复杂的时间范围查询

#### 当前实现

```typescript
// src/lib/services/dashboard.service.ts
export async function getUserAccountsForCalculation(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    include: {
      category: true,
      transactions: {
        include: {
          currency: true,
        },
      },
    },
  })
}
```

#### 优化建议

```typescript
export const getUserAccountsForCalculation = nextCache(
  async (userId: string) => {
    // 现有逻辑
  },
  ['get-user-accounts-calculation'],
  {
    revalidate: CACHE.CHART_DATA_TTL / 1000,
    tags: [CACHE_TAGS.USER_ACCOUNTS, CACHE_TAGS.DASHBOARD_DATA],
  }
)
```

### 3. 树状结构数据 (🔥🔥 高频)

#### 问题场景

- 侧边栏需要完整的分类+账户树状结构
- 每次页面导航都可能触发查询
- 数据结构相对稳定，变更频率低

#### 当前实现

```typescript
// src/app/api/tree-structure/route.ts
const [categories, accounts] = await Promise.all([
  prisma.category.findMany({
    where: { userId: user.id },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  }),
  prisma.account.findMany({
    where: { userId: user.id },
    include: {
      category: { select: { id: true, name: true, type: true } },
      currency: { select: { code: true } },
    },
    orderBy: { name: 'asc' },
  }),
])
```

#### 优化建议

```typescript
export const getTreeStructureData = nextCache(
  async (userId: string) => {
    // 现有逻辑
  },
  ['get-tree-structure'],
  {
    revalidate: CACHE.USER_DATA_TTL / 1000,
    tags: [CACHE_TAGS.TREE_STRUCTURE, CACHE_TAGS.USER_ACCOUNTS, CACHE_TAGS.USER_CATEGORIES],
  }
)
```

### 4. 账户余额计算 (🔥🔥 高频)

#### 问题场景

- 账户余额页面需要计算所有账户余额
- 涉及大量交易数据的聚合计算
- 需要货币转换到本位币

#### 当前实现

```typescript
// src/app/api/accounts/balances/route.ts
const accounts = await prisma.account.findMany({
  where: whereCondition,
  include: {
    category: true,
    transactions: {
      include: { currency: true },
      orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
    },
  },
  orderBy: { name: 'asc' },
})
```

#### 优化建议

```typescript
export const getAccountBalances = nextCache(
  async (userId: string, options: BalanceOptions) => {
    // 现有逻辑
  },
  ['get-account-balances'],
  {
    revalidate: CACHE.CHART_DATA_TTL / 1000,
    tags: [CACHE_TAGS.ACCOUNT_BALANCES, CACHE_TAGS.USER_ACCOUNTS],
  }
)
```

### 5. 标签和分类查询 (🔥 中频)

#### 问题场景

- 标签列表在多个页面被频繁查询
- 分类数据在表单和页面中重复使用
- 数据相对稳定，变更频率低

#### 当前实现

```typescript
// src/app/api/tags/route.ts
const tags = await prisma.tag.findMany({
  where: { userId: user.id },
  orderBy: { name: 'asc' },
  include: {
    _count: { select: { transactions: true } },
  },
})
```

#### 优化建议

```typescript
export const getUserTags = nextCache(
  async (userId: string) => {
    // 现有逻辑
  },
  ['get-user-tags'],
  {
    revalidate: CACHE.USER_DATA_TTL / 1000,
    tags: [CACHE_TAGS.USER_TAGS],
  }
)
```

## 🚀 优化实施优先级

### 第一优先级 (立即实施)

1. **用户认证缓存** - 影响所有 API 请求
2. **货币服务缓存** - 已完成 ✅
3. **树状结构缓存** - 影响导航体验

### 第二优先级 (近期实施)

1. **仪表板数据缓存** - 提升首页加载速度
2. **账户余额缓存** - 优化余额页面性能
3. **基础数据缓存** - 标签、分类等

### 第三优先级 (长期优化)

1. **交易统计缓存** - 复杂聚合查询
2. **图表数据缓存** - 历史趋势数据
3. **导出数据缓存** - 大量数据查询

## 📈 预期性能提升

### 用户认证优化

- **查询减少**: 90%+ (缓存命中时)
- **响应时间**: 从 20-50ms 降至 1-3ms
- **影响范围**: 所有 API 请求

### 仪表板优化

- **查询减少**: 80%+ (复杂聚合查询)
- **响应时间**: 从 200-500ms 降至 50-100ms
- **影响范围**: 首页加载体验

### 树状结构优化

- **查询减少**: 95%+ (数据变更频率低)
- **响应时间**: 从 50-100ms 降至 2-5ms
- **影响范围**: 侧边栏导航

## 🔧 实施建议

### 1. 创建专门的缓存服务

```typescript
// src/lib/services/cache.service.ts
import { unstable_cache as nextCache, revalidateTag } from 'next/cache'
import { CACHE } from '@/lib/constants/app-config'

// 扩展的缓存标签
export const CACHE_TAGS = {
  // 现有标签...
  USER_AUTH: 'user-auth',
  DASHBOARD_SUMMARY: 'dashboard-summary',
  TREE_STRUCTURE: 'tree-structure',
  ACCOUNT_BALANCES: 'account-balances',
  USER_TAGS: 'user-tags',
  USER_CATEGORIES: 'user-categories',
} as const

// 缓存失效函数
export function revalidateUserDataCache(userId?: string) {
  revalidateTag(CACHE_TAGS.USER_AUTH)
  revalidateTag(CACHE_TAGS.USER_SETTINGS)
  revalidateTag(CACHE_TAGS.TREE_STRUCTURE)
  // ... 其他相关标签
}
```

### 2. 分阶段实施

#### 阶段一：基础数据缓存

- 用户认证
- 用户设置
- 树状结构

#### 阶段二：业务数据缓存

- 账户余额
- 仪表板汇总
- 标签分类

#### 阶段三：复杂查询缓存

- 图表数据
- 统计报表
- 导出功能

### 3. 监控和调优

```typescript
// 添加缓存性能监控
const cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
}

// 在缓存函数中添加统计
export const monitoredCache = (key: string, fn: Function) => {
  return nextCache(
    async (...args) => {
      try {
        const result = await fn(...args)
        cacheStats.hits++
        return result
      } catch (error) {
        cacheStats.errors++
        throw error
      }
    },
    [key],
    {
      /* cache options */
    }
  )
}
```

## ⚠️ 注意事项

### 1. 缓存一致性

- 确保数据更新时及时清除相关缓存
- 使用合适的缓存标签进行精确失效
- 避免缓存时间过长导致数据不一致

### 2. 内存管理

- 监控缓存内存使用情况
- 设置合理的 TTL 时间
- 考虑缓存数据的大小

### 3. 错误处理

- 缓存失败时的降级策略
- 避免缓存错误数据
- 提供缓存清除的手动机制

## 📋 实施检查清单

- [ ] 分析完成高频查询场景
- [ ] 设计缓存标签体系
- [ ] 实施用户认证缓存
- [ ] 实施树状结构缓存
- [ ] 实施仪表板数据缓存
- [ ] 添加缓存失效机制
- [ ] 性能测试和验证
- [ ] 监控和调优

通过系统性的缓存优化，预期可以将整体 API 响应时间减少 60-80%，显著提升用户体验。
