# 多账户智能粘贴功能设计与实现

## 🎯 功能概述

成功实现了支持多账户的智能粘贴批量处理功能，解决了在全局交易页面进行批量编辑时需要处理不同账户交易的需求。

### 核心功能

1. **动态账户列显示** - 根据使用场景自动显示或隐藏账户选择列
2. **顶部账户选择器** - 提供统一的账户选择，支持混合账户模式
3. **智能界面切换** - 根据选择状态自动调整表格列配置
4. **多账户数据处理** - 支持批量处理来自不同账户的交易记录

## 🏗️ 设计架构

### 使用场景分析

```
单账户场景 (账户详情页面)
├── 所有交易属于同一账户
├── 隐藏表格中的账户列
├── 顶部显示固定账户选择器
└── 简化的批量处理流程

多账户场景 (全局交易页面)
├── 交易来自不同账户
├── 显示表格中的账户列
├── 顶部提供"混合账户"选项
└── 复杂的账户关联处理
```

### 界面状态管理

```typescript
// 核心状态控制
const showAccountColumn =
  showAccountSelector && (!selectedAccountFromDropdown || selectedAccountFromDropdown === 'mixed')

// 动态列配置
const columns = createTransactionColumns(accountType, currency, {
  includeAccountColumn: showAccountColumn,
})
```

## 🔧 技术实现

### 1. 动态列配置系统

#### createTransactionColumns 函数扩展

```typescript
export function createTransactionColumns(
  accountType: AccountType,
  defaultCurrency?: CurrencyInfo,
  options?: {
    includeAccountColumn?: boolean // 新增选项
  }
): SmartPasteColumn[]
```

#### 账户列动态插入

```typescript
// 根据选项决定是否包含账户列
if (options?.includeAccountColumn) {
  const accountColumn: SmartPasteColumn = {
    key: 'account',
    title: '账户',
    dataType: 'account',
    width: 150,
    isRequired: true,
    isReadOnly: false,
    editMode: 'dropdown',
    validation: { required: true },
    defaultValue: null,
    placeholder: '请选择账户',
    helpText: '选择交易账户',
  }

  // 在描述列之后插入账户列
  baseColumns.splice(3, 0, accountColumn)
}
```

### 2. 顶部账户选择器

#### 混合账户模式支持

```typescript
<select
  value={showAccountSelector ? (selectedAccountFromDropdown || 'mixed') : (currentAccount?.id || '')}
  onChange={handleAccountChange}
>
  {showAccountSelector && (
    <option value="mixed">混合账户（在表格中选择）</option>
  )}
  {availableAccounts.map(account => (
    <option key={account.id} value={account.id}>
      {account.name} ({account.currency?.symbol || '¥'})
    </option>
  ))}
</select>
```

#### 动态提示文本

```typescript
<div className="text-sm text-gray-500 dark:text-gray-400">
  {showAccountSelector
    ? (selectedAccountFromDropdown ? '所有交易将记录到此账户' : '在表格中为每笔交易选择账户')
    : '所有交易将记录到此账户'
  }
</div>
```

### 3. 数据处理逻辑

#### 批量编辑数据预填充

```typescript
// 获取选中的交易记录用于编辑
const getSelectedTransactionsForEdit = () => {
  return transactions
    .filter(t => selectedTransactions.has(t.id))
    .map(t => ({
      id: t.id,
      date: dateString,
      amount: t.amount,
      description: t.description,
      notes: t.notes,
      tags:
        t.tags?.map(transactionTag => ({
          id: transactionTag.tag.id,
          name: transactionTag.tag.name,
        })) || [],
      // 多账户模式下包含账户信息
      account: showAccountSelector
        ? {
            id: t.account.id,
            name: t.account.name,
            categoryId: t.account.categoryId,
            category: {
              type: t.account.category.type as AccountType,
            },
          }
        : undefined,
    }))
}
```

#### 提交时账户ID获取

```typescript
// 录入模式：批量创建交易
const transactions = validData.map(row => {
  // 获取账户ID：优先从表格中获取，否则使用当前选择的账户
  const accountId = showAccountColumn
    ? (row.cells.account?.value as string)
    : selectedAccountFromDropdown || currentAccount?.id || ''

  // 根据账户ID查找对应的账户信息
  const targetAccount = showAccountColumn
    ? accounts.find(acc => acc.id === accountId)
    : currentAccount

  return {
    accountId,
    categoryId: targetAccount.categoryId,
    currencyCode: targetAccount.currency?.code || 'CNY',
    // ...其他字段
  }
})
```

### 4. 组件接口扩展

#### TransactionList 组件

```typescript
interface TransactionListProps {
  // 原有属性...

  // 智能粘贴相关属性
  showAccountSelector?: boolean // 是否显示多账户支持
  accountType?: AccountType
  selectedAccount?: SimpleAccount
  onSmartPasteSuccess?: () => void
}
```

#### SmartPasteModal 组件

```typescript
interface SmartPasteModalProps {
  // 原有属性...

  showAccountSelector?: boolean // 是否显示多账户支持
  editingTransactions?: Array<{
    // 基础交易信息...
    account?: {
      id: string
      name: string
      categoryId: string
      category: { type: AccountType }
    }
  }>
}
```

## 🎨 用户体验设计

### 界面状态切换

1. **单账户模式**

   - 顶部显示固定账户选择器
   - 表格中不显示账户列
   - 提示文本："所有交易将记录到此账户"

2. **多账户混合模式**

   - 顶部显示"混合账户（在表格中选择）"
   - 表格中显示账户选择列
   - 提示文本："在表格中为每笔交易选择账户"

3. **多账户统一模式**
   - 顶部选择具体账户
   - 表格中隐藏账户列
   - 提示文本："所有交易将记录到此账户"

### 视觉反馈

- **账户列显示/隐藏** - 平滑的列宽度调整
- **提示文本变化** - 实时更新操作说明
- **数据重置** - 切换模式时自动清空表格数据

## 📊 使用场景

### 1. 账户详情页面（单账户）

```typescript
<TransactionList
  // 基础属性...
  showAccountSelector={false}  // 不显示多账户支持
  accountType={account.category.type}
  selectedAccount={account}
  onSmartPasteSuccess={handleRefresh}
/>
```

### 2. 全局交易页面（多账户）

```typescript
<TransactionList
  // 基础属性...
  showAccountSelector={true}   // 显示多账户支持
  onSmartPasteSuccess={handleRefresh}
/>
```

### 3. 分类详情页面（多账户）

```typescript
<TransactionList
  // 基础属性...
  showAccountSelector={true}   // 显示多账户支持
  accountType={category.type}  // 限制账户类型
  onSmartPasteSuccess={handleRefresh}
/>
```

## 🔄 数据流程

### 批量录入流程

```
用户选择模式 → 配置表格列 → 输入数据 → 验证处理 → 提交创建
    ↓
混合账户模式: 每行选择账户 → 分别获取账户信息 → 批量创建
统一账户模式: 使用顶部账户 → 统一账户信息 → 批量创建
```

### 批量编辑流程

```
选择交易记录 → 预填充数据 → 包含账户信息 → 修改数据 → 逐个更新
    ↓
多账户编辑: 保持原账户关联 → 分别更新不同账户的交易
单账户编辑: 统一账户处理 → 批量更新同账户交易
```

## 🎯 核心优势

1. **灵活适配** - 同一组件支持单账户和多账户场景
2. **智能切换** - 根据使用场景自动调整界面和逻辑
3. **数据完整** - 完整保留账户关联信息
4. **用户友好** - 清晰的视觉提示和操作指导
5. **性能优化** - 按需显示列，减少不必要的渲染

## 📝 总结

通过实现多账户智能粘贴功能，我们成功解决了以下问题：

1. **场景适配** - 单一组件支持多种使用场景
2. **数据完整性** - 正确处理跨账户的交易数据
3. **用户体验** - 智能的界面切换和清晰的操作指导
4. **代码复用** - 最大化组件复用，减少代码重复

这个功能为用户提供了强大而灵活的批量数据处理能力，无论是在单账户还是多账户场景下，都能提供一致且高效的操作体验。
