# 货币系统优化实施指南

## 🎯 核心原则：优先使用用户设置

基于对Flow
Balance项目的分析，货币系统的核心问题是**未充分利用UserDataContext中的用户设置信息**。本指南提供具体的实施步骤。

## 📋 当前问题总结

### 1. 数据来源不统一

- 硬编码货币符号映射 vs 数据库中的货币信息
- 硬编码语言设置 vs 用户的语言偏好
- 硬编码默认货币 vs 用户设置的本位币

### 2. 忽略用户个性化设置

- 用户设置了本位币，但组件仍使用硬编码默认值
- 用户选择了语言，但格式化仍使用固定locale
- 用户配置了可用货币，但某些地方显示所有货币

## 🚀 优化实施步骤

### 步骤1: 创建统一的货币格式化Hook

```typescript
// src/hooks/useUserCurrencyFormatter.ts
import { useUserData } from '@/contexts/UserDataContext'
import { useCallback } from 'react'

export function useUserCurrencyFormatter() {
  const { currencies, userSettings } = useUserData()

  const formatCurrency = useCallback(
    (
      amount: number,
      currencyCode: string,
      options?: {
        showSymbol?: boolean
        precision?: number
      }
    ) => {
      // 使用用户的语言设置
      const locale = userSettings?.language === 'zh' ? 'zh-CN' : 'en-US'

      // 从用户可用货币中获取符号
      const currency = currencies.find(c => c.code === currencyCode)
      const symbol = currency?.symbol || currencyCode

      const formattedNumber = amount.toLocaleString(locale, {
        minimumFractionDigits: options?.precision ?? 2,
        maximumFractionDigits: options?.precision ?? 2,
      })

      return options?.showSymbol === false ? formattedNumber : `${symbol}${formattedNumber}`
    },
    [currencies, userSettings?.language]
  )

  const getCurrencySymbol = useCallback(
    (currencyCode: string) => {
      const currency = currencies.find(c => c.code === currencyCode)
      return currency?.symbol || currencyCode
    },
    [currencies]
  )

  return { formatCurrency, getCurrencySymbol }
}
```

### 步骤2: 修改重复符号映射的组件

#### BalanceSheetCard.tsx 优化

```typescript
// ❌ 删除重复的符号映射
const getCurrencySymbol = (currencyCode: string) => {
  const symbolMap: Record<string, string> = {
    /* 21种货币 */
  }
  return symbolMap[currencyCode] || currencyCode
}

// ✅ 使用统一的Hook
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'

function BalanceSheetCard() {
  const { formatCurrency } = useUserCurrencyFormatter()

  // 直接使用formatCurrency，自动处理符号和本地化
  const formattedAmount = formatCurrency(amount, currencyCode)
}
```

#### CashFlowCard.tsx 优化

```typescript
// ❌ 删除重复的符号映射和格式化逻辑
const getCurrencySymbol = (currencyCode: string) => {
  /* 重复代码 */
}
const formatCurrency = (amount: number, currency: SimpleCurrency) => {
  /* 重复逻辑 */
}

// ✅ 使用统一的Hook
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'

function CashFlowCard() {
  const { formatCurrency } = useUserCurrencyFormatter()
  // 统一的格式化逻辑，自动使用用户设置
}
```

### 步骤3: 移除硬编码默认货币

#### QuickBalanceUpdateModal.tsx 优化

```typescript
// ❌ 硬编码默认货币
const baseCurrency = getBaseCurrency() || {
  code: 'CNY',
  symbol: '¥',
  name: '人民币',
}

// ✅ 使用用户设置，提供合理回退
const { getBaseCurrency, userSettings } = useUserData()
const baseCurrency = getBaseCurrency()

if (!baseCurrency) {
  // 引导用户设置本位币
  return <CurrencySetupPrompt />
}
```

### 步骤4: 统一语言设置的使用

#### 所有格式化逻辑统一

```typescript
// ❌ 硬编码语言设置
amount.toLocaleString('zh-CN', {
  /* options */
})

// ❌ 部分组件的动态设置
const locale = language === 'zh' ? 'zh-CN' : 'en-US'

// ✅ 统一使用用户设置
const { userSettings } = useUserData()
const locale = userSettings?.language === 'zh' ? 'zh-CN' : 'en-US'
```

### 步骤5: 创建设置缺失的提示组件

```typescript
// src/components/ui/prompts/CurrencySetupPrompt.tsx
import { useUserData } from '@/contexts/UserDataContext'
import { useLanguage } from '@/contexts/LanguageContext'

export function CurrencySetupPrompt() {
  const { t } = useLanguage()
  const { userSettings } = useUserData()

  if (userSettings?.baseCurrency) {
    return null // 已设置本位币
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h3 className="text-yellow-800 font-medium">
        {t('currency.setup.required')}
      </h3>
      <p className="text-yellow-700 text-sm mt-1">
        {t('currency.setup.description')}
      </p>
      <button
        onClick={() => router.push('/settings?tab=preferences')}
        className="mt-2 text-yellow-800 underline text-sm"
      >
        {t('currency.setup.action')}
      </button>
    </div>
  )
}
```

## 📊 具体修改清单

### 高优先级修改 (立即执行)

1. **BalanceSheetCard.tsx**

   - 删除 `getCurrencySymbol` 函数 (第199-225行)
   - 删除 `formatCurrency` 函数 (第227-233行)
   - 使用 `useUserCurrencyFormatter` Hook

2. **CashFlowCard.tsx**

   - 删除 `getCurrencySymbol` 函数 (第248-274行)
   - 删除 `formatCurrency` 函数 (第230-236行)
   - 使用 `useUserCurrencyFormatter` Hook

3. **QuickBalanceUpdateModal.tsx**

   - 移除硬编码默认货币 (第39-43行)
   - 添加本位币缺失检查

4. **TransactionList.tsx**
   - 更新 `getAmountDisplay` 函数使用用户语言设置
   - 使用 `useUserCurrencyFormatter` Hook

### 中优先级修改 (后续执行)

1. **DashboardContent.tsx**

   - 统一使用 `getBaseCurrency()`
   - 移除硬编码的 'zh-CN' locale

2. **MonthlySummaryChart.tsx**

   - 图表工具提示使用用户语言设置
   - 统一货币符号获取逻辑

3. **StockAccountSummaryCard.tsx**
   - 统一格式化逻辑
   - 使用用户设置的语言

## 🎯 预期效果

### 1. 数据一致性

- 所有货币符号来自数据库，与用户设置保持一致
- 格式化标准统一，基于用户语言偏好

### 2. 用户体验

- 个性化显示：基于用户的本位币和语言设置
- 设置变更立即生效：修改语言或本位币后UI自动更新

### 3. 代码质量

- 消除重复代码：移除3处重复的货币符号映射
- 统一API：所有组件使用相同的格式化逻辑
- 易于维护：货币相关逻辑集中管理

## ⚠️ 注意事项

1. **向后兼容性**: 确保修改不影响现有功能
2. **错误处理**: 用户设置缺失时提供合理的回退机制
3. **性能考虑**: Hook使用useCallback避免不必要的重新计算
4. **测试覆盖**: 修改后需要测试各种用户设置组合

这个优化将显著提升Flow Balance的用户体验一致性和个性化程度。
