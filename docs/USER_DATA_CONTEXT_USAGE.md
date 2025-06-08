# UserDataContext 使用指南

## 概述

UserDataContext 是一个集中管理用户数据的Context系统，用于解决Flow Balance应用中大量重复API调用的性能问题。

## 主要功能

### 🎯 **集中数据管理**
- 用户登录后一次性获取所有用户设置数据
- 统一管理：currencies、tags、accounts、categories、userSettings
- 避免组件间重复API调用

### 🔄 **数据同步**
- 提供数据更新方法，保持Context与服务器数据同步
- 支持增删改操作的本地状态更新
- 自动处理数据依赖关系

### 📊 **性能优化**
- 减少API调用从 **72个** 到 **5个**（初始化时）
- 智能缓存账户交易记录状态
- 按需刷新特定数据类型

## 使用方法

### 1. 基本用法

```typescript
import { useUserData } from '@/contexts/UserDataContext'

function MyComponent() {
  const { 
    currencies, 
    tags, 
    accounts, 
    categories, 
    userSettings,
    isLoading,
    error 
  } = useUserData()

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>错误: {error}</div>

  return (
    <div>
      <h3>用户货币: {currencies.length}</h3>
      <h3>标签数量: {tags.length}</h3>
      <h3>账户数量: {accounts.length}</h3>
    </div>
  )
}
```

### 2. 数据更新

```typescript
function AccountManager() {
  const { 
    accounts, 
    updateAccount, 
    addAccount, 
    removeAccount 
  } = useUserData()

  const handleRename = async (accountId: string, newName: string) => {
    // 1. 调用API更新服务器数据
    const response = await fetch(`/api/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: newName })
    })

    if (response.ok) {
      // 2. 更新Context中的数据（可选，如果需要立即反映）
      const updatedAccount = accounts.find(a => a.id === accountId)
      if (updatedAccount) {
        updateAccount({ ...updatedAccount, name: newName })
      }
    }
  }
}
```

### 3. 获取基础货币

```typescript
function BalanceDisplay() {
  const { getBaseCurrency } = useUserData()
  
  const baseCurrency = getBaseCurrency()
  const symbol = baseCurrency?.symbol || '¥'
  
  return <span>{symbol}1000.00</span>
}
```

### 4. 检查账户交易记录

```typescript
import { useAccountTransactions } from '@/hooks/useAccountTransactions'

function AccountItem({ accountId }: { accountId: string }) {
  const { hasTransactions, isLoading } = useAccountTransactions(accountId)
  
  return (
    <div>
      {isLoading ? '检查中...' : hasTransactions ? '有交易记录' : '无交易记录'}
    </div>
  )
}
```

### 5. 数据刷新

```typescript
function DataManager() {
  const { 
    refreshAll, 
    refreshAccounts, 
    refreshTags,
    lastUpdated 
  } = useUserData()

  return (
    <div>
      <p>最后更新: {lastUpdated?.toLocaleString()}</p>
      <button onClick={refreshAll}>刷新所有数据</button>
      <button onClick={refreshAccounts}>只刷新账户</button>
      <button onClick={refreshTags}>只刷新标签</button>
    </div>
  )
}
```

## API参考

### 数据属性
- `currencies: Currency[]` - 用户可用货币
- `tags: Tag[]` - 用户标签
- `accounts: Account[]` - 用户账户
- `categories: Category[]` - 用户分类
- `userSettings: UserSettings | null` - 用户设置
- `isLoading: boolean` - 加载状态
- `error: string | null` - 错误信息
- `lastUpdated: Date | null` - 最后更新时间

### 刷新方法
- `refreshAll()` - 刷新所有数据
- `refreshCurrencies()` - 刷新货币数据
- `refreshTags()` - 刷新标签数据
- `refreshAccounts()` - 刷新账户数据
- `refreshCategories()` - 刷新分类数据
- `refreshUserSettings()` - 刷新用户设置

### 更新方法
- `updateTag(tag)` - 更新标签
- `addTag(tag)` - 添加标签
- `removeTag(tagId)` - 删除标签
- `updateAccount(account)` - 更新账户
- `addAccount(account)` - 添加账户
- `removeAccount(accountId)` - 删除账户
- `updateCategory(category)` - 更新分类
- `addCategory(category)` - 添加分类
- `removeCategory(categoryId)` - 删除分类
- `updateUserSettings(settings)` - 更新用户设置

### 工具方法
- `getBaseCurrency()` - 获取基础货币
- `setAccountHasTransactions(accountId, hasTransactions)` - 设置账户交易记录缓存

## 性能优化效果

### 优化前
```
每次页面刷新:
- 12个AccountTreeItem × 6个API = 72个API调用
- 多个CategoryTreeItem × 2个API = 额外API调用
- 总计: 80+ API调用
```

### 优化后
```
应用初始化时:
- 1次 /api/user/currencies
- 1次 /api/tags  
- 1次 /api/accounts
- 1次 /api/categories
- 1次 /api/user/settings
- 总计: 5个API调用

后续操作:
- 按需调用 /api/accounts/{id}/transactions?limit=1 (带缓存)
- 数据修改时的同步调用
```

### 性能提升
- **API调用减少**: 80+ → 5 (减少94%)
- **页面加载速度**: 显著提升
- **用户体验**: 更流畅的交互
- **服务器负载**: 大幅降低

## 注意事项

1. **Provider位置**: UserDataProvider必须包装在需要使用数据的组件外层
2. **数据同步**: 修改数据后记得调用相应的更新方法
3. **错误处理**: 始终检查isLoading和error状态
4. **缓存策略**: 账户交易记录使用智能缓存，避免重复检查

## 迁移指南

### 从旧的API调用迁移

**旧代码:**
```typescript
const [currencies, setCurrencies] = useState([])

useEffect(() => {
  fetch('/api/user/currencies')
    .then(res => res.json())
    .then(data => setCurrencies(data.data?.currencies || []))
}, [])
```

**新代码:**
```typescript
const { currencies } = useUserData()
// 数据自动可用，无需额外的useEffect
```

这个Context系统大幅提升了Flow Balance应用的性能，同时简化了组件间的数据管理。
