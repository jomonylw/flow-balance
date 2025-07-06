# 货币精确选择功能修复

## 📋 问题描述

在货币管理界面中，当存在相同货币代码的不同货币时（如全局AUD和自定义AUD），用户无论点击哪个"添加"按钮，系统都会优先添加自定义货币，而不是用户实际点击的那个货币。

### 问题原因

1. **前端传递货币代码**：前端只传递 `currencyCode`，没有传递具体的货币ID
2. **后端优先级逻辑**：后端使用 `findFirst` + `orderBy: { createdBy: 'desc' }`
   总是优先选择自定义货币
3. **用户体验问题**：用户无法精确选择想要的货币版本

## ✅ 解决方案

### 1. 前端修改

**文件**: `src/components/features/settings/CurrencyManagement.tsx`

```typescript
// 修改前
const handleAddCurrency = async (currencyCode: string) => {
  // ...
  body: JSON.stringify({ currencyCode }),
}

onClick={() => handleAddCurrency(currency.code)}

// 修改后
const handleAddCurrency = async (currencyId: string) => {
  // ...
  body: JSON.stringify({ currencyId }),
}

onClick={() => handleAddCurrency(currency.id)}
```

### 2. 后端修改

**文件**: `src/app/api/user/currencies/route.ts`

```typescript
// 修改前
const { currencyCode } = body
const currency = await prisma.currency.findFirst({
  where: { code: currencyCode, ... },
  orderBy: { createdBy: 'desc' }, // 总是优先自定义货币
})

// 修改后
const { currencyId, currencyCode } = body

let currency
if (currencyId) {
  // 优先使用货币ID（精确匹配）
  currency = await prisma.currency.findFirst({
    where: { id: currencyId, ... },
  })
} else {
  // 向后兼容：使用货币代码
  currency = await prisma.currency.findFirst({
    where: { code: currencyCode, ... },
    orderBy: { createdBy: 'desc' },
  })
}
```

## 🧪 测试验证

### 测试场景

1. **精确选择测试**

   - ✅ 点击全局AUD → 添加全局Australian Dollar
   - ✅ 点击自定义AUD → 添加自定义bbbbm
   - ✅ 每次都添加用户实际点击的货币

2. **重复代码检测**

   - ✅ 已选择全局AUD后，尝试添加自定义AUD被阻止
   - ✅ 错误信息准确显示

3. **向后兼容性**
   - ✅ 仍支持通过货币代码添加（保持原有优先级逻辑）
   - ✅ 新旧API调用方式都能正常工作

### 测试结果

```bash
🧪 使用 AUD 进行测试...

📝 测试添加全局货币: Australian Dollar (ID: cmc7rsj9200012mlxren2zbi5)
✅ 成功添加全局货币
✅ 验证通过: 添加的货币ID为 cmc7rsj9200012mlxren2zbi5

📝 测试添加自定义货币: bbbbm (ID: cmc8v609200499rxgkve1b73u)
✅ 成功添加自定义货币
✅ 验证通过: 添加的货币ID为 cmc8v609200499rxgkve1b73u

📝 测试重复代码检测...
✅ 重复检测正常工作: 您已选择了货币代码为 AUD 的其他货币，同一货币代码只能选择一次
```

## 🎯 修复效果

### Before (修复前)

- 🔴 点击全局AUD → 添加自定义AUD
- 🔴 点击自定义AUD → 添加自定义AUD
- 🔴 用户无法选择全局版本

### After (修复后)

- ✅ 点击全局AUD → 添加全局AUD
- ✅ 点击自定义AUD → 添加自定义AUD
- ✅ 用户可以精确选择任意版本

## 📝 技术细节

### API参数变更

**新增支持**:

- `currencyId`: 货币ID（优先使用，精确匹配）

**保持兼容**:

- `currencyCode`: 货币代码（向后兼容，使用优先级逻辑）

### 验证逻辑

重复代码检测逻辑保持不变：

- 仍然按货币代码检测重复
- 确保同一用户不能选择相同代码的多个货币
- 错误信息准确反映冲突情况

### 数据库查询优化

```sql
-- 精确匹配（新方式）
SELECT * FROM currencies WHERE id = ? AND (createdBy = ? OR createdBy IS NULL)

-- 代码匹配（兼容方式）
SELECT * FROM currencies WHERE code = ? AND (createdBy = ? OR createdBy IS NULL)
ORDER BY createdBy DESC
```

## 🚀 部署影响

- ✅ **向后兼容**：旧的API调用仍然有效
- ✅ **无数据迁移**：不需要修改现有数据
- ✅ **渐进升级**：前端更新后立即生效
- ✅ **零停机时间**：可以热更新部署

## 📊 用户体验提升

1. **精确控制**：用户可以选择想要的具体货币版本
2. **视觉一致**：点击哪个就添加哪个，符合用户预期
3. **错误减少**：避免意外添加错误的货币版本
4. **功能完整**：重复检测等安全机制仍然有效
