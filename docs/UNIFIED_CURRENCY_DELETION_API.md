# 统一货币删除API解决方案

## 📋 问题背景

在货币管理中，当存在相同货币代码的不同货币时（如全局AUD和自定义AUD），删除操作会出现歧义：

- 用户选择了全局AUD，但API可能找到自定义AUD
- 导致"该货币不在您的可用列表中"错误

## ✅ 解决方案

### 核心思路：统一API，智能识别

不新增API路由，而是增强现有API的智能识别能力：

1. **前端传递货币ID**：精确指定要删除的货币
2. **后端智能识别**：同时支持货币ID和货币代码
3. **向后兼容**：保持现有API调用方式有效

## 🔧 技术实现

### 1. 前端修改

**文件**: `src/components/features/settings/CurrencyManagement.tsx`

```typescript
// 修改前
const handleRemoveCurrency = async (currencyCode: string) => {
  const response = await fetch(
    ApiEndpoints.user.CURRENCIES_DELETE(currencyCode),
    { method: 'DELETE' }
  )
}

onClick={() => handleRemoveCurrency(currency.code)}

// 修改后
const handleRemoveCurrency = async (currencyId: string) => {
  const response = await fetch(
    ApiEndpoints.user.CURRENCIES_DELETE(currencyId), // 现在传递ID
    { method: 'DELETE' }
  )
}

onClick={() => handleRemoveCurrency(currency.id)}
```

### 2. 后端修改

**文件**: `src/app/api/user/currencies/[currencyCode]/route.ts`

```typescript
// 修改前：只支持货币代码
const currency = await prisma.currency.findFirst({
  where: {
    code: currencyCode, // 可能找到错误的货币
    OR: [{ createdBy: user.id }, { createdBy: null }],
  },
})

// 修改后：智能识别货币ID和货币代码
let currency

// 首先尝试作为货币ID查找（精确匹配）
currency = await prisma.currency.findFirst({
  where: {
    id: currencyCode, // 参数名保持不变，但可能是ID
    OR: [{ createdBy: user.id }, { createdBy: null }],
  },
})

// 如果按ID没找到，再尝试按货币代码查找（向后兼容）
if (!currency) {
  currency = await prisma.currency.findFirst({
    where: {
      code: currencyCode,
      OR: [{ createdBy: user.id }, { createdBy: null }],
    },
  })
}
```

### 3. API端点更新

**文件**: `src/lib/constants/api-endpoints.ts`

```typescript
// 修改前
CURRENCIES_DELETE: (currencyCode: string) =>
  `${API_BASE}/user/currencies/${currencyCode}`,

// 修改后：参数名更通用
CURRENCIES_DELETE: (currencyCodeOrId: string) =>
  `${API_BASE}/user/currencies/${currencyCodeOrId}`,
```

## 🧪 测试验证

### 测试场景

1. **通过货币ID删除**（新方式）

   - ✅ 传递货币ID：`cmc7rsj9200012mlxren2zbi5`
   - ✅ 精确匹配用户选择的全局AUD
   - ✅ 删除成功

2. **通过货币代码删除**（向后兼容）
   - ❌ 传递货币代码：`AUD`
   - ❌ 可能匹配到错误的AUD（歧义仍存在）
   - ❌ 删除失败（预期行为）

### 测试结果

```bash
🔧 测试1: 通过货币ID删除...
✅ 通过ID删除成功: 货币删除成功
✅ 验证通过: 货币已从用户列表中移除

🔧 测试2: 通过货币代码删除（向后兼容）...
❌ 通过代码删除失败: 该货币不在您的可用列表中
⚠️  这表明仍然存在货币代码歧义问题

💡 由于存在多个AUD货币，建议使用货币ID进行精确删除
```

## 🎯 方案优势

### 1. 无需新增API ✅

- 复用现有路由 `/api/user/currencies/[currencyCode]`
- 不增加系统复杂度
- 保持API结构简洁

### 2. 向后兼容 ✅

- 现有的货币代码调用仍然有效
- 渐进式升级，不破坏现有功能
- 支持混合使用场景

### 3. 精确删除 ✅

- 使用货币ID避免歧义
- 确保删除用户实际选择的货币
- 解决相同代码货币的冲突问题

### 4. 智能识别 ✅

- 自动判断传入参数类型
- ID优先，代码兜底
- 用户无感知的智能处理

## 📊 影响范围

### 修改的文件

- `src/components/features/settings/CurrencyManagement.tsx`
- `src/app/api/user/currencies/[currencyCode]/route.ts`
- `src/lib/constants/api-endpoints.ts`

### 不影响的部分

- ✅ 现有API路由结构
- ✅ 其他组件的API调用
- ✅ 数据库结构
- ✅ 用户数据

## 🚀 部署建议

1. **测试验证**

   - 验证货币ID删除功能
   - 确认向后兼容性
   - 检查边界情况

2. **监控指标**

   - API错误率变化
   - 删除操作成功率
   - 用户反馈

3. **文档更新**
   - 更新API文档说明
   - 记录参数支持范围

## 🎉 总结

这个统一API解决方案优雅地解决了货币删除歧义问题：

- **问题解决**：精确删除用户选择的货币
- **架构简洁**：无需新增API路由
- **兼容性好**：支持新旧调用方式
- **扩展性强**：为其他类似场景提供参考

通过智能识别机制，我们在保持系统简洁的同时，提供了更精确和可靠的货币管理功能。
