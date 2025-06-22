# useUserCurrencyFormatter Hook 小数位数支持改进

## 🎯 改进概述

成功为 `useUserCurrencyFormatter` Hook 添加了完整的货币小数位数（decimal
places）支持，实现了智能的货币格式化功能。

## 🔍 原有问题分析

### 1. **忽略货币配置的小数位数**

- 原代码使用固定的默认值 `2` 或用户传入的 `precision`
- 没有使用货币本身的 `decimalPlaces` 配置
- 导致所有货币都显示相同的小数位数

### 2. **getCurrencyInfo 返回不完整**

- 缺少 `decimalPlaces` 字段
- 回退对象不符合 `SimpleCurrency` 接口规范

### 3. **原始金额显示精度问题**

- 在显示原始金额时也使用了固定精度
- 没有根据原始货币的小数位数配置进行格式化

## 🚀 改进实现

### 1. **智能小数位数检测**

#### 主要格式化函数改进

```typescript
// ✅ 改进后：智能小数位数检测
const decimalPlaces = options?.precision ?? currency?.decimalPlaces ?? 2

const formattedNumber = amount.toLocaleString(locale, {
  minimumFractionDigits: decimalPlaces,
  maximumFractionDigits: decimalPlaces,
})
```

**优先级顺序**：

1. 用户指定的 `precision` 参数（最高优先级）
2. 货币配置的 `decimalPlaces` 字段
3. 默认值 `2`（回退选项）

### 2. **原始金额智能格式化**

```typescript
// ✅ 原始金额也使用对应货币的小数位数
const originalDecimalPlaces = options?.precision ?? originalCurrencyInfo?.decimalPlaces ?? 2
const originalFormatted = options.originalAmount.toLocaleString(locale, {
  minimumFractionDigits: originalDecimalPlaces,
  maximumFractionDigits: originalDecimalPlaces,
})
```

### 3. **新增实用函数**

#### getCurrencyDecimalPlaces

```typescript
/**
 * 获取货币小数位数
 * @param currencyCode 货币代码
 * @returns 小数位数
 */
const getCurrencyDecimalPlaces = useCallback(
  (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode)
    return currency?.decimalPlaces ?? 2
  },
  [currencies]
)
```

#### formatCurrencyAuto

```typescript
/**
 * 智能格式化货币金额（自动使用货币的小数位数配置）
 * @param amount 金额
 * @param currencyCode 货币代码
 * @param showSymbol 是否显示货币符号，默认true
 * @returns 格式化后的货币字符串
 */
const formatCurrencyAuto = useCallback(
  (amount: number, currencyCode: string, showSymbol: boolean = true) => {
    return formatCurrency(amount, currencyCode, { showSymbol })
  },
  [formatCurrency]
)
```

### 4. **增强的 formatNumber 函数**

```typescript
/**
 * 格式化数字（不带货币符号）
 * @param value 数值
 * @param decimalsOrCurrency 小数位数或货币代码
 * @returns 格式化的数字字符串
 */
const formatNumber = useCallback(
  (value: number, decimalsOrCurrency?: number | string) => {
    const locale = getUserLocale()

    // 确定小数位数
    let decimals: number
    if (typeof decimalsOrCurrency === 'string') {
      // 如果传入的是货币代码，使用该货币的小数位数
      decimals = getCurrencyDecimalPlaces(decimalsOrCurrency)
    } else {
      // 如果传入的是数字或undefined，使用指定值或默认值2
      decimals = decimalsOrCurrency ?? 2
    }

    return value.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  },
  [getUserLocale, getCurrencyDecimalPlaces]
)
```

### 5. **完善的 getCurrencyInfo 函数**

```typescript
const getCurrencyInfo = useCallback(
  (currencyCode: string) => {
    return (
      currencies.find(c => c.code === currencyCode) || {
        id: '',
        code: currencyCode,
        symbol: currencyCode,
        name: currencyCode,
        decimalPlaces: 2, // 默认2位小数
        isCustom: false,
        createdBy: null,
      }
    )
  },
  [currencies]
)
```

## 📋 新增功能列表

### 新增函数

1. **getCurrencyDecimalPlaces**: 获取指定货币的小数位数
2. **formatCurrencyAuto**: 智能格式化货币（自动使用货币配置）

### 增强的现有函数

1. **formatCurrency**: 支持智能小数位数检测
2. **formatNumber**: 支持货币代码参数，自动使用对应小数位数
3. **getCurrencyInfo**: 返回完整的货币信息对象

## 🎨 使用示例

### 基础用法

```typescript
const { formatCurrency, formatCurrencyAuto, getCurrencyDecimalPlaces } = useUserCurrencyFormatter()

// 自动使用货币配置的小数位数
formatCurrency(1234.5678, 'USD') // $1,234.57 (USD默认2位)
formatCurrency(1234.5678, 'JPY') // ¥1,235 (JPY默认0位)
formatCurrency(1234.5678, 'BTC') // ₿1,234.56780000 (BTC默认8位)

// 简化的自动格式化
formatCurrencyAuto(1234.5678, 'USD') // $1,234.57
formatCurrencyAuto(1234.5678, 'JPY') // ¥1,235

// 获取货币小数位数
getCurrencyDecimalPlaces('USD') // 2
getCurrencyDecimalPlaces('JPY') // 0
getCurrencyDecimalPlaces('BTC') // 8
```

### 高级用法

```typescript
// 覆盖默认小数位数
formatCurrency(1234.5678, 'USD', { precision: 4 }) // $1,234.5678

// 显示原始金额（各自使用对应货币的小数位数）
formatCurrency(1234.57, 'USD', {
  showOriginal: true,
  originalAmount: 8765.4321,
  originalCurrency: 'JPY',
}) // $1,234.57 (原: ¥8,765)

// 格式化数字（使用货币代码）
formatNumber(1234.5678, 'BTC') // 1,234.56780000
formatNumber(1234.5678, 2) // 1,234.57
```

## 🔧 技术特点

### 1. **向后兼容**

- 所有现有的 API 调用都保持兼容
- 新功能通过可选参数和新函数提供

### 2. **智能回退**

- 优雅处理缺失的货币信息
- 提供合理的默认值

### 3. **性能优化**

- 使用 `useCallback` 优化函数性能
- 避免不必要的重新计算

### 4. **类型安全**

- 完整的 TypeScript 类型支持
- 符合现有接口规范

## 🎯 实际应用场景

### 1. **多货币显示**

```typescript
// 不同货币自动使用正确的小数位数
formatCurrencyAuto(100, 'USD') // $100.00
formatCurrencyAuto(100, 'JPY') // ¥100
formatCurrencyAuto(0.001, 'BTC') // ₿0.00100000
```

### 2. **交易记录显示**

```typescript
// 原始金额和转换金额都使用正确的精度
formatCurrency(convertedAmount, baseCurrency, {
  showOriginal: true,
  originalAmount: originalAmount,
  originalCurrency: originalCurrency,
})
```

### 3. **数据表格格式化**

```typescript
// 表格中的数字列可以根据货币类型自动调整精度
transactions.map(tx => ({
  ...tx,
  formattedAmount: formatNumber(tx.amount, tx.currencyCode),
}))
```

## 📊 改进效果

### 用户体验提升

- ✅ 货币显示更加准确和专业
- ✅ 不同货币类型显示合适的精度
- ✅ 减少视觉混乱和信息冗余

### 开发体验提升

- ✅ 更简单的 API 调用
- ✅ 智能的默认行为
- ✅ 更好的类型安全

### 系统一致性

- ✅ 全局统一的货币格式化规则
- ✅ 基于用户配置的智能显示
- ✅ 符合国际化标准

所有改进都已完成并经过测试，现在 Hook 提供了完整的货币小数位数支持！🎉
