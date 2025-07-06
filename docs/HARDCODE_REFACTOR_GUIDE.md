# 硬编码重构指南

## 🎯 概述

本文档提供了项目中硬编码问题的系统性解决方案，建立了统一的常量管理体系，提升代码的可维护性和类型安全性。

## 🔍 发现的硬编码问题

### 1. 字符串字面量联合类型

```typescript
// ❌ 硬编码问题
type CategoryType = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
type Theme = 'light' | 'dark' | 'system'
```

### 2. 组件内硬编码常量

```typescript
// ❌ 硬编码问题
const ACCOUNT_TYPES = [
  { value: 'ASSET', label: '资产' },
  { value: 'LIABILITY', label: '负债' },
  // ...
]
```

### 3. 分散的颜色定义

```typescript
// ❌ 硬编码问题
const colors = {
  ASSET: '#3b82f6',
  LIABILITY: '#f97316',
  // 在多个文件中重复定义
}
```

### 4. 货币符号硬编码

```typescript
// ❌ 硬编码问题
const currencySymbols = {
  CNY: '¥',
  USD: '$',
  // 在多个地方重复
}
```

## ✅ 解决方案

### 1. 统一常量定义

创建了 `src/types/core/constants.ts` 文件，统一管理所有常量：

```typescript
// ✅ 使用枚举替代字符串字面量
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

// ✅ 统一的配置对象
export const ACCOUNT_TYPE_CONFIGS: Record<AccountType, AccountTypeConfig> = {
  [AccountType.ASSET]: {
    value: AccountType.ASSET,
    labelKey: 'category.type.asset',
    descriptionKey: 'category.settings.asset.description',
    colorClass: 'text-blue-600 dark:text-blue-400',
    defaultColor: '#3b82f6',
  },
  // ...
}
```

### 2. 常量管理器

创建了 `src/lib/utils/constants-manager.ts` 提供类型安全的访问方法：

```typescript
// ✅ 类型安全的常量访问
export class ConstantsManager {
  static getAccountTypeConfigs(): AccountTypeConfig[] {
    return Object.values(ACCOUNT_TYPE_CONFIGS)
  }

  static isStockAccount(type: string): boolean {
    return isStockAccountType(type)
  }

  static getCurrencySymbol(currencyCode: string): string {
    return CURRENCY_SYMBOLS[currencyCode] || currencyCode
  }
}
```

## 🔧 重构步骤

### 步骤 1: 更新类型定义

```typescript
// 在 src/types/core/index.ts 中
import { AccountType, TransactionType, Theme, Language } from './constants'

// 使用枚举类型替代字符串字面量联合类型
export type { AccountType, TransactionType, Theme, Language }
```

### 步骤 2: 更新组件

```typescript
// ❌ 重构前
const ACCOUNT_TYPES = [
  {
    value: 'ASSET',
    label: t('category.type.asset'),
    // ...
  },
]

// ✅ 重构后
import { ConstantsManager } from '@/lib/utils/constants-manager'

const accountTypeConfigs = ConstantsManager.getAccountTypeConfigs()
```

### 步骤 3: 更新验证 Schema

```typescript
// ❌ 重构前
export const CategoryCreateSchema = z.object({
  type: z.enum(['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE']),
})

// ✅ 重构后
import { ConstantsManager } from '@/lib/utils/constants-manager'

export const CategoryCreateSchema = z.object({
  type: z.enum(ConstantsManager.getZodAccountTypeEnum()),
})
```

### 步骤 4: 更新颜色管理

```typescript
// ❌ 重构前
const DEFAULT_COLORS = {
  ASSET: '#3b82f6',
  LIABILITY: '#f97316',
  // ...
}

// ✅ 重构后
import { ConstantsManager } from '@/lib/utils/constants-manager'

const color = ConstantsManager.getAccountTypeColor(AccountType.ASSET)
```

## 📋 重构检查清单

### 组件重构

- [ ] 移除组件内硬编码常量数组
- [ ] 使用 `ConstantsManager` 获取配置
- [ ] 更新类型导入为枚举类型
- [ ] 验证类型安全性

### 验证 Schema 重构

- [ ] 更新 Zod Schema 使用枚举
- [ ] 使用 `ConstantsManager.getZodXxxEnum()` 方法
- [ ] 确保验证逻辑一致性

### 颜色管理重构

- [ ] 统一使用 `ConstantsManager.getAccountTypeColor()`
- [ ] 移除重复的颜色定义
- [ ] 更新图表颜色使用统一序列

### API 路由重构

- [ ] 更新 API 验证使用枚举
- [ ] 使用类型守卫函数验证输入
- [ ] 确保错误处理一致性

## 🎯 最佳实践

### 1. 枚举优于字符串字面量联合类型

```typescript
// ✅ 推荐：使用枚举
enum Status {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// ❌ 避免：字符串字面量联合类型
type Status = 'pending' | 'approved' | 'rejected'
```

### 2. 配置对象优于硬编码数组

```typescript
// ✅ 推荐：配置对象
const STATUS_CONFIGS = {
  [Status.PENDING]: {
    label: 'status.pending',
    color: '#f59e0b',
    icon: 'clock',
  },
}

// ❌ 避免：硬编码数组
const statuses = [{ value: 'pending', label: '待处理', color: '#f59e0b' }]
```

### 3. 类型守卫函数

```typescript
// ✅ 推荐：类型守卫
function isValidStatus(value: string): value is Status {
  return Object.values(Status).includes(value as Status)
}

// ❌ 避免：字符串比较
function isValidStatus(value: string): boolean {
  return ['pending', 'approved', 'rejected'].includes(value)
}
```

### 4. 常量管理器模式

```typescript
// ✅ 推荐：统一管理器
class ConfigManager {
  static getStatusConfig(status: Status) {
    return STATUS_CONFIGS[status]
  }
}

// ❌ 避免：分散的工具函数
function getStatusColor(status: string) {
  /* ... */
}
function getStatusLabel(status: string) {
  /* ... */
}
```

## 🚀 迁移计划

### 阶段 1: 基础设施（已完成）

- [x] 创建常量定义文件
- [x] 创建常量管理器
- [x] 建立类型守卫函数

### 阶段 2: 核心组件重构

- [ ] 重构 `CategorySettingsModal.tsx`
- [ ] 重构验证 Schema
- [ ] 重构颜色管理工具

### 阶段 3: API 路由重构

- [ ] 更新 API 验证逻辑
- [ ] 统一错误处理
- [ ] 更新类型定义

### 阶段 4: 测试和验证

- [ ] 运行类型检查
- [ ] 执行单元测试
- [ ] 验证功能完整性

## 🔍 验证工具

### 检查硬编码的命令

```bash
# 检查字符串字面量联合类型
grep -r "'ASSET'\|'LIABILITY'\|'INCOME'\|'EXPENSE'" src/

# 检查硬编码颜色
grep -r "#[0-9a-fA-F]\{6\}" src/

# 检查重复常量定义
grep -r "const.*ACCOUNT_TYPES\|const.*CURRENCY_SYMBOLS" src/
```

### 自动化检查脚本

```bash
# 运行类型检查
pnpm type-check

# 运行 ESLint 检查
pnpm lint

# 运行自定义重复代码检查
node scripts/check-duplicate-types.js
```

## 📚 相关文档

- [TypeScript 枚举最佳实践](https://www.typescriptlang.org/docs/handbook/enums.html)
- [代码质量检查清单](./CODE_QUALITY_CHECKLIST.md)
- [开发标准文档](./CODE_GUIDE_DOC/DEVELOPMENT_STANDARDS.md)
