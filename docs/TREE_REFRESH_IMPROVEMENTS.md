# 树状结构菜单刷新机制改进

## 改进概述

针对添加/删除分类/子类/账户时的树状结构菜单刷新机制进行了全面优化，使其更加精确、高效，并保持展开状态。

## 主要改进

### 1. 精确的数据刷新策略

**OptimizedCategoryAccountTree.tsx**

- 改进了数据更新监听逻辑，根据不同的事件类型采用不同的刷新策略
- 添加了详细的日志记录，便于调试和监控
- 支持自定义数据变化事件和标准数据更新事件

**刷新策略：**

- `balance-update`, `transaction-*`: 只刷新余额数据
- `account-*`: 刷新账户数据和余额数据
- `category-*`: 刷新分类数据和账户数据（因为账户的分类信息可能变化）

### 2. 事件发布机制优化

**CategoryTreeItem.tsx**

- 添加分类删除事件发布：`publishCategoryDelete`
- 修改添加子分类逻辑，使用非静默模式刷新
- 提供更详细的事件数据，包括删除的分类信息和父分类ID

**AccountTreeItem.tsx**

- 添加账户删除事件发布：`publishAccountDelete`
- 提供删除的账户信息，便于其他组件响应

**NavigationSidebar.tsx**

- 添加顶级分类创建事件发布：`publishCategoryCreate`
- 统一事件发布和刷新逻辑

### 3. 展开状态保持

通过以下机制保持树状结构的展开状态：

- 使用 localStorage 持久化展开状态
- 精确的数据刷新，避免不必要的重新渲染
- 保持现有的展开/收起控制逻辑

## 技术实现细节

### 数据更新流程

1. **用户操作** → 2. **API调用** → 3. **事件发布** → 4. **数据刷新** → 5. **UI更新**

```
添加分类 → POST /api/categories → publishCategoryCreate → refreshCategories + refreshAccounts → 树状结构更新
删除分类 → DELETE /api/categories/[id] → publishCategoryDelete → refreshCategories + refreshAccounts → 树状结构更新
添加账户 → POST /api/accounts → publishAccountCreate → refreshAccounts + refreshBalances → 树状结构更新
删除账户 → DELETE /api/accounts/[id] → publishAccountDelete → refreshAccounts + refreshBalances → 树状结构更新
```

### 事件系统

使用双重事件系统确保兼容性：

1. **DataUpdateManager**: 标准的数据更新事件系统
2. **CustomEvent**: 自定义事件系统，用于组件间通信

### 日志记录

添加了详细的控制台日志，便于开发和调试：

- 事件接收日志
- 数据刷新操作日志
- 错误处理日志

## 预期效果

1. **精确刷新**: 只刷新必要的数据，提高性能
2. **状态保持**: 展开状态在操作后得到保持
3. **实时更新**: 添加/删除操作后立即反映在树状结构中
4. **错误处理**: 更好的错误处理和用户反馈
5. **调试友好**: 详细的日志记录便于问题排查

## 测试建议

1. **添加顶级分类**: 验证树状结构立即更新
2. **添加子分类**: 验证父分类展开状态保持，新子分类出现
3. **删除分类**: 验证分类从树状结构中移除，相关账户处理正确
4. **添加账户**: 验证账户出现在正确分类下
5. **删除账户**: 验证账户从树状结构中移除
6. **展开状态**: 验证操作前后展开状态保持一致
7. **搜索功能**: 验证搜索状态下的操作正常
8. **错误场景**: 验证网络错误、权限错误等场景的处理

## 兼容性

- 保持与现有代码的完全兼容性
- 不影响其他组件的正常功能
- 支持移动端和桌面端
