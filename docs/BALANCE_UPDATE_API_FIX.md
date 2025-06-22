# 余额更新 API 修复总结

## 🎯 问题描述

用户在尝试更新账户余额时遇到 Prisma 验证错误：

```
Error [PrismaClientValidationError]:
Invalid `prisma.currency.findUnique()` invocation
Argument `where` of type CurrencyWhereUniqueInput needs at least one of `id` or `createdBy_code` arguments.
```

**错误原因**：在货币模型迁移后，`Currency` 模型的主键从 `code` 改为 `id`，并使用复合唯一键
`createdBy_code`，但余额更新 API 仍在使用旧的查询方式。

## 🔍 问题分析

### 数据库模型变更

```sql
-- 旧模型（已废弃）
Currency.code: String @id

-- 新模型（当前）
Currency.id: String @id @default(cuid())
Currency.code: String
Currency.createdBy: String?
@@unique([createdBy, code], name: "createdBy_code")
```

### 受影响的 API

1. **余额更新 API** (`/api/balance-update`)
2. **余额历史查询 API** (`/api/balance-update` GET)

## 🔧 修复方案

### 1. 修复货币查询逻辑

#### 问题代码

```typescript
// ❌ 错误：使用了废弃的查询方式
const currency = await prisma.currency.findUnique({
  where: { code: currencyCode },
})
```

#### 修复后

```typescript
// ✅ 修复：使用新的查询方式
const currency = await prisma.currency.findFirst({
  where: {
    code: currencyCode,
    OR: [{ createdBy: user.id }, { createdBy: null }],
  },
})
```

### 2. 修复交易数据字段引用

#### 问题代码

```typescript
// ❌ 错误：使用了废弃的字段
const transactionData = {
  currencyCode, // 应该是 currencyId
  // ...
}
```

#### 修复后

```typescript
// ✅ 修复：使用正确的字段
const transactionData = {
  currencyId: currency.id,
  // ...
}
```

### 3. 修复交易历史查询

#### 问题代码

```typescript
// ❌ 错误：直接使用 currencyCode 字段
if (currencyCode) {
  whereClause.currencyCode = currencyCode
}
```

#### 修复后

```typescript
// ✅ 修复：通过关联查询过滤货币
if (currencyCode) {
  whereClause.currency = {
    code: currencyCode,
    OR: [{ createdBy: user.id }, { createdBy: null }],
  }
}
```

## 📋 修复的文件列表

### 主要修复文件

1. `src/app/api/balance-update/route.ts`
   - 修复 POST 方法中的货币查询逻辑
   - 修复交易数据的字段引用
   - 修复 GET 方法中的货币过滤逻辑

### 修复的具体位置

#### 第一处：货币验证查询（第73-81行）

```typescript
// 修复前
const currency = await prisma.currency.findUnique({
  where: { code: currencyCode },
})

// 修复后
const currency = await prisma.currency.findFirst({
  where: {
    code: currencyCode,
    OR: [{ createdBy: user.id }, { createdBy: null }],
  },
})
```

#### 第二处：交易数据字段（第142行）

```typescript
// 修复前
currencyCode,

// 修复后
currencyId: currency.id,
```

#### 第三处：交易历史查询过滤（第267-276行）

```typescript
// 修复前
if (currencyCode) {
  whereClause.currencyCode = currencyCode
}

// 修复后
if (currencyCode) {
  whereClause.currency = {
    code: currencyCode,
    OR: [{ createdBy: user.id }, { createdBy: null }],
  }
}
```

#### 第四处：余额历史货币信息（第433-441行）

```typescript
// 修复前
currency: currencyCode
  ? await prisma.currency.findUnique({
      where: { code: currencyCode },
    })
  : null,

// 修复后
currency: currencyCode
  ? await prisma.currency.findFirst({
      where: {
        code: currencyCode,
        OR: [
          { createdBy: user.id },
          { createdBy: null }
        ]
      },
    })
  : null,
```

## 🎯 修复原理

### 用户级别货币隔离

新的查询逻辑支持用户级别的货币隔离：

- **全局货币**：`createdBy: null`，所有用户都可以使用
- **用户自定义货币**：`createdBy: user.id`，只有创建者可以使用

### 查询优先级

使用 `OR` 条件确保用户可以访问：

1. 自己创建的自定义货币
2. 系统提供的全局货币

### 数据一致性

确保所有货币相关的查询都使用统一的逻辑，避免数据不一致的问题。

## 🚀 修复效果

### 修复前

- 余额更新操作失败，返回 500 错误
- Prisma 验证错误阻止正常功能

### 修复后

- 余额更新功能正常工作
- 支持用户级别的货币隔离
- 数据查询逻辑统一

### 验证方法

1. 创建新的资产或负债账户
2. 尝试更新账户余额
3. 检查是否成功创建 BALANCE 类型的交易记录
4. 验证余额历史查询功能

## 🔍 相关技术细节

### Prisma 查询差异

```typescript
// findUnique: 需要唯一键
findUnique({ where: { id: 'xxx' } })
findUnique({ where: { createdBy_code: { createdBy: 'xxx', code: 'yyy' } } })

// findFirst: 更灵活的查询
findFirst({ where: { code: 'xxx', createdBy: null } })
```

### 数据库约束

```prisma
model Currency {
  id        String  @id @default(cuid())
  code      String
  createdBy String?

  @@unique([createdBy, code], name: "createdBy_code")
}
```

## 📊 影响范围

### 修复的功能

- ✅ 账户余额更新
- ✅ 余额历史查询
- ✅ 用户级别货币隔离
- ✅ 数据一致性保证

### 不受影响的功能

- ✅ 其他货币相关 API
- ✅ 交易创建和查询
- ✅ 汇率管理功能
- ✅ 账户管理功能

## 🎉 总结

成功修复了余额更新 API 中的货币查询问题，确保：

1. **功能正常**：余额更新和历史查询功能完全正常
2. **数据安全**：支持用户级别的货币隔离
3. **代码一致**：统一的货币查询逻辑
4. **向前兼容**：支持新的数据库模型结构

所有修复都已验证，余额更新功能现在可以正常使用！🎉
