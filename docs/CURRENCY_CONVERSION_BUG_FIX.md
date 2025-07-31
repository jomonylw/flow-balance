# 分类汇总 API 货币转换问题修复报告

## 问题描述

在重构分类汇总 API 后，出现了严重的货币转换错误：

### 症状

- USD 余额显示 $100.00，但折算成 CNY 也显示 ¥100.00
- 银行账户显示 $100.00 ≈ ¥100.00，汇率错误地显示为 1:1
- 所有非本位币的金额都以 1:1 的汇率进行转换

### 预期行为

- $100.00 应该按照正确汇率（约1:7）转换为 ≈ ¥700.00
- 货币转换应该使用数据库中存储的正确汇率

## 根本原因分析

### 问题根源

重构后的代码在调用 `convertMultipleCurrencies` 函数时，**参数格式错误**。

### 详细分析

#### 1. 函数签名期望

```typescript
// src/lib/services/currency.service.ts:87-92
export async function convertMultipleCurrencies(
  userId: string,
  amounts: Array<{ amount: number; currency: string }>, // ← 期望 currency 字段
  baseCurrency: string,
  asOfDate?: Date
): Promise<ConversionResult[]>
```

#### 2. 重构后的错误调用

```typescript
// 错误的参数格式
const conversionRequests: Array<{
  amount: number
  fromCurrency: string // ← 错误：应该是 currency
}> = []

for (const [currency, amount] of Object.entries(accountData.amounts)) {
  if (amount !== 0 && currency !== baseCurrency.code) {
    conversionRequests.push({
      amount,
      fromCurrency: currency, // ← 错误：应该是 currency: currency
    })
  }
}
```

#### 3. 导致的后果

- `convertMultipleCurrencies` 函数接收到的参数中 `currency` 字段为 `undefined`
- 汇率查询失败，返回默认汇率 1
- 所有货币转换都按照 1:1 的比例进行

## 修复方案

### 修复内容

将参数格式从 `{amount, fromCurrency}` 修正为 `{amount, currency}`：

```typescript
// 修复后的正确格式
const conversionRequests: Array<{
  amount: number
  currency: string // ✅ 正确：使用 currency 字段
}> = []

for (const [currency, amount] of Object.entries(accountData.amounts)) {
  if (amount !== 0 && currency !== baseCurrency.code) {
    conversionRequests.push({
      amount,
      currency: currency, // ✅ 正确：传递 currency 字段
    })
  }
}
```

### 修复的文件

1. `src/lib/services/category-summary/stock-category-service.ts` (第419-436行)
2. `src/lib/services/category-summary/flow-category-service.ts` (第355-372行)

## 验证方法

### 1. 检查调试日志

在开发环境中，`cache.service.ts` 会输出汇率异常警告：

```typescript
console.warn(
  `⚠️ [DEBUG] 汇率异常: ${currency} → ${baseCurrency}, rate=${exchangeRate}, amount=${amount}`
)
```

修复后，这个警告应该消失。

### 2. 前端验证

- 检查分类详情页面的货币分布显示
- 确认非本位币金额正确转换为本位币
- 验证汇率显示不再是 1:1

### 3. API 测试

```bash
# 调用分类汇总 API
curl -b cookies.txt "http://localhost:3001/api/categories/{categoryId}/summary?timeRange=lastYear"

# 检查返回数据中的 converted 字段是否正确
```

## 经验教训

### 1. 参数格式一致性

- 在重构时必须严格检查函数调用的参数格式
- TypeScript 类型检查在这种情况下可能不够严格

### 2. 测试覆盖

- 货币转换功能需要端到端测试
- 应该包含多币种场景的测试用例

### 3. 调试工具

- 开发环境的调试日志非常有价值
- 应该保留关键业务逻辑的调试输出

## 预防措施

### 1. 代码审查

- 重构时重点检查外部函数调用的参数格式
- 确保参数名称和类型完全匹配

### 2. 自动化测试

- 添加货币转换的单元测试
- 包含边界情况和错误处理测试

### 3. 类型安全

- 考虑使用更严格的 TypeScript 配置
- 使用接口而不是内联类型定义

## 修复状态

✅ **已修复**: 参数格式错误已纠正 ✅ **已验证**: TypeScript 编译通过 🔄
**待测试**: 需要用户验证修复效果

## 后续行动

1. **立即**: 用户测试修复效果
2. **短期**: 添加货币转换的自动化测试
3. **长期**: 改进代码审查流程，防止类似问题再次发生
