# 数据更新联动优化方案

## 概述

本方案解决了应用中数据更新时的联动更新问题，实现了：

1. 更新余额/增加交易后相关面板的数据自动刷新
2. 左侧侧边栏金额的实时更新（只更新相关账户，不刷新整个树结构）
3. 添加子分类&账户后，树结构的自动刷新

## 核心组件

### 1. DataUpdateManager (src/utils/DataUpdateManager.ts)

统一的数据更新事件管理器，提供：

- **事件类型定义**：余额更新、交易操作、账户操作、分类操作等
- **发布订阅模式**：组件可以订阅感兴趣的事件类型
- **事件队列处理**：确保事件按顺序处理，避免竞态条件
- **便捷方法**：提供常用事件的快捷发布方法

```typescript
// 发布余额更新事件
await publishBalanceUpdate(accountId, { newBalance, currencyCode })

// 发布交易创建事件
await publishTransactionCreate(accountId, categoryId, { transaction })
```

### 2. useDataUpdateListener Hook (src/hooks/useDataUpdateListener.ts)

简化组件中对数据更新事件的监听：

- **通用监听器**：`useDataUpdateListener`
- **专用监听器**：`useBalanceUpdateListener`、`useTransactionListener`等
- **自动清理**：组件卸载时自动取消订阅
- **过滤支持**：可按账户ID、分类ID等过滤事件

```typescript
// 监听余额更新事件
useBalanceUpdateListener(
  async event => {
    await refreshData()
  },
  [accountId]
)
```

### 3. UserDataContext 增强

增加了强制刷新余额数据的能力：

- **fetchBalances(force?: boolean)**：支持强制刷新参数
- **refreshBalances()**：专门的强制刷新方法
- **updateAccountBalance()**：单个账户余额的实时更新

## 实现的联动更新

### 1. 余额更新联动

**触发场景**：

- QuickBalanceUpdateModal 成功更新余额
- BalanceUpdateModal 成功更新余额

**联动效果**：

- 发布 `balance-update` 事件
- 左侧侧边栏相关账户金额实时更新
- StockCategoryDetailView 重新获取汇总数据和交易记录
- Dashboard 重新获取概览数据

**实现方式**：

```typescript
// 在模态框成功回调中
await publishBalanceUpdate(accountId, {
  newBalance,
  currencyCode,
  transaction: result.transaction,
})
```

### 2. 交易操作联动

**触发场景**：

- SimpleFlowTransactionModal 创建/更新交易
- TransactionFormModal 创建/更新交易

**联动效果**：

- 发布 `transaction-create/update` 事件
- FlowCategoryDetailView 重新获取汇总数据和交易记录
- Dashboard 重新获取概览数据
- 左侧侧边栏相关账户金额更新

**实现方式**：

```typescript
// 交易创建成功后
await publishTransactionCreate(accountId, categoryId, {
  transaction: result.transaction,
  amount,
  currencyCode,
})
```

### 3. 账户/分类创建联动

**触发场景**：

- CategoryTreeItem 添加子分类
- CategoryTreeItem 添加账户

**联动效果**：

- 发布 `category-create/account-create` 事件
- OptimizedCategoryAccountTree 刷新分类/账户数据
- 左侧侧边栏树结构更新

**实现方式**：

```typescript
// 分类创建成功后
await publishCategoryCreate(parentCategoryId, {
  newCategory: result.data,
  parentCategory: category,
})
```

### 4. 侧边栏智能更新

**OptimizedCategoryAccountTree** 组件监听所有数据更新事件：

```typescript
useAllDataListener(async event => {
  const { type, silent } = event

  switch (type) {
    case 'balance-update':
    case 'transaction-create':
    case 'transaction-update':
    case 'transaction-delete':
      // 强制刷新余额数据
      await refreshBalances()
      break

    case 'account-create':
    case 'account-update':
    case 'account-delete':
      // 刷新账户数据和余额数据
      await refreshAccounts()
      await refreshBalances()
      break

    case 'category-create':
    case 'category-update':
    case 'category-delete':
      // 刷新分类数据
      await refreshCategories()
      break
  }
})
```

## 性能优化

### 1. 事件队列处理

- 避免同时处理多个事件造成的竞态条件
- 批量处理事件，提高性能

### 2. 智能刷新策略

- 根据事件类型决定刷新范围
- 避免不必要的全量数据刷新
- 支持静默更新（不显示加载状态）

### 3. 内存管理

- 自动清理监听器，避免内存泄漏
- 事件处理异常不会影响其他监听器

## 兼容性

### 向后兼容

- 保持对旧事件系统（window.dispatchEvent）的兼容
- 现有组件可以逐步迁移到新系统

### 渐进式升级

- 新系统与现有代码并存
- 可以选择性地为特定组件启用新的数据更新机制

## 测试

提供了 `DataUpdateTest` 组件用于测试数据更新系统：

- 模拟各种数据更新事件
- 实时显示事件处理日志
- 验证监听器是否正常工作

## 使用示例

### 在组件中监听数据更新

```typescript
import { useBalanceUpdateListener } from '@/hooks/useDataUpdateListener'

function MyComponent() {
  // 监听特定账户的余额更新
  useBalanceUpdateListener(async (event) => {
    console.log('Balance updated:', event.data)
    await refreshComponentData()
  }, [accountId])

  return <div>...</div>
}
```

### 发布数据更新事件

```typescript
import { publishTransactionCreate } from '@/utils/DataUpdateManager'

async function handleCreateTransaction() {
  const result = await createTransaction(data)

  if (result.success) {
    // 发布事件，触发相关组件更新
    await publishTransactionCreate(accountId, categoryId, {
      transaction: result.transaction,
    })
  }
}
```

## 总结

这个数据更新联动优化方案提供了：

1. **统一的事件管理**：所有数据更新都通过统一的事件系统处理
2. **精确的更新控制**：只更新需要更新的组件和数据
3. **良好的性能**：避免不必要的全量刷新
4. **易于维护**：清晰的事件流和组件职责
5. **可扩展性**：容易添加新的事件类型和监听器

通过这个方案，应用的数据一致性和用户体验都得到了显著提升。
