# Flow Balance 日期格式化系统分析与统一方案

## 📋 项目概览

Flow Balance 是一个 Next.js + Prisma 个人财务管理应用，目前在设置页面提供了日期格式偏好选择，但该设置在应用中**基本未被实际使用**。本文档分析了项目中所有日期显示的使用情况，并提出统一的日期格式化解决方案。

## 🔍 当前日期格式设置状态

### ✅ 已实现部分
- **设置页面**：用户可选择日期格式偏好
  - `YYYY-MM-DD` (2024-01-01)
  - `DD/MM/YYYY` (01/01/2024)
  - `MM/DD/YYYY` (01/01/2024)
  - `DD-MM-YYYY` (01-01-2024)
- **数据存储**：设置保存到 `UserSettings.dateFormat` 字段
- **Context 管理**：通过 `UserDataContext` 提供用户设置

### ❌ 缺失部分
- **实际应用**：应用中的日期显示都是硬编码格式
- **统一Hook**：缺少类似 `useUserCurrencyFormatter` 的日期格式化Hook
- **用户体验**：用户设置的日期格式偏好无法生效

## 📊 项目中日期显示使用情况分析

### 1. 交易相关组件

#### 1.1 TransactionList.tsx
- **位置**：`src/components/features/transactions/TransactionList.tsx`
- **当前实现**：智能日期显示（今天/昨天/明天 + 相对日期）
- **问题**：最终回退到 `toLocaleDateString(undefined, {...})` 硬编码格式
- **影响范围**：所有交易记录列表

```typescript
// 当前实现（第272-276行）
return transactionDate.toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})
```

#### 1.2 TransactionFilters.tsx
- **位置**：`src/components/features/transactions/TransactionFilters.tsx`
- **当前实现**：使用原生 HTML `<input type="date">` 控件
- **问题**：日期输入控件格式固定，但显示可能不一致
- **影响范围**：交易筛选功能

### 2. 图表组件

#### 2.1 ECharts 图表日期轴
**涉及组件**：
- `StockAccountTrendChart.tsx` (第147-156行)
- `FlowAccountTrendChart.tsx` (第163-172行)
- `CashFlowChart.tsx` (第120-123行)
- `MonthlySummaryChart.tsx` (第98-101行)

**当前实现**：硬编码格式转换
```typescript
// 通用模式：YYYY-MM 转 YYYY/MM
formatter: function (value: string) {
  return value.replace('-', '/')
}

// 日期模式：显示月-日
const date = new Date(value)
return `${date.getMonth() + 1}/${date.getDate()}`
```

**问题**：
- 图表日期轴格式固定，不遵循用户偏好
- 多个组件重复相同的格式化逻辑
- 缺少国际化支持

### 3. 报表组件

#### 3.1 CashFlowCard.tsx
- **位置**：`src/components/features/reports/CashFlowCard.tsx`
- **当前实现**：使用 `date-fns` 库进行格式化
- **问题**：硬编码中英文格式，未使用用户设置

```typescript
// 第665-675行
{format(
  new Date(data.period.start),
  language === 'zh' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy',
  { locale: dateLocale }
)}
```

#### 3.2 BalanceSheetCard.tsx
- **位置**：`src/components/features/reports/BalanceSheetCard.tsx`
- **当前实现**：类似 CashFlowCard，硬编码格式
- **影响范围**：资产负债表报告

### 4. 账户相关组件

#### 4.1 LoanPaymentHistory.tsx
- **位置**：`src/components/features/accounts/LoanPaymentHistory.tsx`
- **当前实现**：使用 `date-fns` 固定格式 `yyyy-MM-dd`
- **问题**：完全忽略用户日期格式偏好

```typescript
// 第218-222行
const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'yyyy-MM-dd', { locale })
}
```

### 5. 设置和配置组件

#### 5.1 ExchangeRateList.tsx
- **位置**：`src/components/features/settings/ExchangeRateList.tsx`
- **当前实现**：使用 `toLocaleDateString(locale)` 但locale硬编码
- **影响范围**：汇率管理页面

#### 5.2 ProfileSettingsForm.tsx
- **位置**：`src/components/features/settings/ProfileSettingsForm.tsx`
- **当前实现**：`new Date(user.createdAt).toLocaleDateString()`
- **影响范围**：用户资料页面

### 6. 表单输入组件

#### 6.1 InputField.tsx
- **位置**：`src/components/ui/forms/InputField.tsx`
- **当前实现**：支持 `type="date"` 但无格式化逻辑
- **问题**：原生日期输入控件，格式由浏览器决定

#### 6.2 各种模态框中的日期输入
**涉及组件**：
- `QuickFlowTransactionModal.tsx`
- `QuickBalanceUpdateModal.tsx`
- 报表组件中的日期选择器

**当前实现**：使用 `toISOString().split('T')[0]` 获取 YYYY-MM-DD 格式
**问题**：输入格式固定，显示格式不一致

## 🎯 统一日期格式化方案

### 核心设计理念
1. **用户中心**：完全遵循用户在设置中选择的日期格式偏好
2. **统一管理**：创建类似 `useUserCurrencyFormatter` 的统一Hook
3. **智能适配**：支持不同场景的日期显示需求
4. **向后兼容**：渐进式迁移，不破坏现有功能

### 技术架构

#### 1. 核心Hook设计
```typescript
// src/hooks/useUserDateFormatter.ts
export function useUserDateFormatter() {
  const { userSettings } = useUserData()
  
  // 基础日期格式化
  const formatDate = (date: Date | string, options?: DateFormatOptions) => {
    // 根据用户设置的 dateFormat 进行格式化
  }
  
  // 智能日期显示（今天/昨天/相对日期）
  const formatSmartDate = (date: Date | string) => {
    // 保持现有的智能显示逻辑，但最终格式遵循用户设置
  }
  
  // 图表专用格式化
  const formatChartDate = (date: string, chartType: 'month' | 'day') => {
    // 为图表轴标签提供优化的格式
  }
  
  // 输入控件格式化
  const formatInputDate = (date: Date) => {
    // 为表单输入提供标准化格式
  }
  
  return {
    formatDate,
    formatSmartDate,
    formatChartDate,
    formatInputDate,
    userDateFormat: userSettings?.dateFormat || 'YYYY-MM-DD'
  }
}
```

#### 2. 支持的格式映射
```typescript
const DATE_FORMAT_MAPPING = {
  'YYYY-MM-DD': {
    dateFns: 'yyyy-MM-dd',
    display: '2024-01-01',
    separator: '-'
  },
  'DD/MM/YYYY': {
    dateFns: 'dd/MM/yyyy',
    display: '01/01/2024',
    separator: '/'
  },
  'MM/DD/YYYY': {
    dateFns: 'MM/dd/yyyy',
    display: '01/01/2024',
    separator: '/'
  },
  'DD-MM-YYYY': {
    dateFns: 'dd-MM-yyyy',
    display: '01-01-2024',
    separator: '-'
  }
}
```

### 实施计划

#### 阶段1：创建核心Hook（高优先级）
1. 创建 `useUserDateFormatter` Hook
2. 实现基础日期格式化功能
3. 添加单元测试

#### 阶段2：迁移关键组件（高优先级）
1. **TransactionList.tsx** - 交易记录日期显示
2. **报表组件** - CashFlowCard 和 BalanceSheetCard
3. **LoanPaymentHistory.tsx** - 贷款还款历史

#### 阶段3：迁移图表组件（中优先级）
1. 所有 ECharts 图表的日期轴格式化
2. 统一图表日期显示逻辑
3. 支持响应式日期格式

#### 阶段4：完善表单组件（中优先级）
1. 增强 InputField 组件的日期格式化
2. 统一模态框中的日期输入显示
3. 添加日期格式预览功能

#### 阶段5：优化和完善（低优先级）
1. 添加更多日期格式选项
2. 实现日期格式的实时预览
3. 性能优化和缓存机制

## 📈 预期效果

### 用户体验改进
1. **一致性**：整个应用中的日期显示格式统一
2. **个性化**：用户设置的日期格式偏好真正生效
3. **直观性**：日期显示符合用户的阅读习惯

### 开发体验改进
1. **维护性**：统一的日期格式化逻辑，减少重复代码
2. **扩展性**：易于添加新的日期格式选项
3. **一致性**：与现有的 `useUserCurrencyFormatter` 架构保持一致

### 技术债务清理
1. 移除各组件中重复的日期格式化逻辑
2. 统一日期库的使用（主要使用 date-fns）
3. 提高代码的可测试性和可维护性

## 🚀 下一步行动

1. **立即开始**：创建 `useUserDateFormatter` Hook 的基础实现
2. **优先迁移**：从 TransactionList 组件开始迁移
3. **逐步推进**：按照实施计划逐步迁移其他组件
4. **测试验证**：确保迁移后功能正常且用户设置生效

## 💻 技术实现细节

### 依赖库分析
项目当前使用的日期相关依赖：
- **date-fns**: `^4.1.0` - 主要日期处理库
- **原生 Date API** - 基础日期操作
- **HTML date input** - 表单日期输入控件

### Hook 实现示例

```typescript
// src/hooks/useUserDateFormatter.ts
import { useUserData } from '@/contexts/providers/UserDataContext'
import { format, parseISO } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useCallback, useMemo } from 'react'

interface DateFormatOptions {
  includeTime?: boolean
  relative?: boolean // 是否使用相对时间（今天/昨天）
  chartFormat?: 'month' | 'day' | 'year'
}

export function useUserDateFormatter() {
  const { userSettings } = useUserData()
  const { language } = useLanguage()

  // 获取 date-fns locale
  const dateLocale = useMemo(() => {
    return language === 'zh' ? zhCN : enUS
  }, [language])

  // 用户日期格式映射
  const formatMapping = useMemo(() => {
    const userFormat = userSettings?.dateFormat || 'YYYY-MM-DD'

    const mappings = {
      'YYYY-MM-DD': 'yyyy-MM-dd',
      'DD/MM/YYYY': 'dd/MM/yyyy',
      'MM/DD/YYYY': 'MM/dd/yyyy',
      'DD-MM-YYYY': 'dd-MM-yyyy'
    }

    return mappings[userFormat as keyof typeof mappings] || 'yyyy-MM-dd'
  }, [userSettings?.dateFormat])

  // 基础日期格式化
  const formatDate = useCallback((
    date: Date | string,
    options: DateFormatOptions = {}
  ): string => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date

      if (options.relative) {
        return formatSmartDate(dateObj)
      }

      if (options.chartFormat) {
        return formatChartDate(dateObj, options.chartFormat)
      }

      let formatString = formatMapping
      if (options.includeTime) {
        formatString += ' HH:mm'
      }

      return format(dateObj, formatString, { locale: dateLocale })
    } catch (error) {
      console.error('Date formatting error:', error)
      return 'Invalid Date'
    }
  }, [formatMapping, dateLocale])

  // 智能日期显示（保持现有逻辑）
  const formatSmartDate = useCallback((date: Date): string => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // 使用国际化文本
    if (diffDays === 0) return '今天' // 应该从 i18n 获取
    if (diffDays === -1) return '昨天'
    if (diffDays === 1) return '明天'
    if (diffDays > 1 && diffDays <= 7) return `${diffDays}天后`
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)}天前`

    // 超出范围使用用户设置的格式
    return format(date, formatMapping, { locale: dateLocale })
  }, [formatMapping, dateLocale])

  // 图表专用格式化
  const formatChartDate = useCallback((
    date: Date,
    chartType: 'month' | 'day' | 'year'
  ): string => {
    const userFormat = userSettings?.dateFormat || 'YYYY-MM-DD'
    const separator = userFormat.includes('/') ? '/' : '-'

    switch (chartType) {
      case 'month':
        return format(date, `yyyy${separator}MM`)
      case 'day':
        // 根据用户格式调整日期显示
        if (userFormat.startsWith('DD')) {
          return format(date, `dd${separator}MM`)
        } else if (userFormat.startsWith('MM')) {
          return format(date, `MM${separator}dd`)
        } else {
          return format(date, `MM${separator}dd`)
        }
      case 'year':
        return format(date, 'yyyy')
      default:
        return format(date, formatMapping)
    }
  }, [userSettings?.dateFormat, formatMapping])

  // 表单输入专用格式化
  const formatInputDate = useCallback((date: Date): string => {
    // HTML date input 始终需要 YYYY-MM-DD 格式
    return format(date, 'yyyy-MM-dd')
  }, [])

  // 解析用户输入的日期
  const parseUserDate = useCallback((dateString: string): Date | null => {
    try {
      // 根据用户格式解析日期字符串
      const userFormat = userSettings?.dateFormat || 'YYYY-MM-DD'

      // 这里需要实现反向解析逻辑
      // 暂时使用标准解析
      return parseISO(dateString) || new Date(dateString)
    } catch {
      return null
    }
  }, [userSettings?.dateFormat])

  return {
    formatDate,
    formatSmartDate,
    formatChartDate,
    formatInputDate,
    parseUserDate,
    userDateFormat: userSettings?.dateFormat || 'YYYY-MM-DD',
    dateLocale
  }
}
```

### 迁移示例

#### 1. TransactionList 组件迁移

```typescript
// 修改前
const formatDate = (date: string | Date) => {
  // ... 现有逻辑 ...
  return transactionDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// 修改后
const { formatSmartDate } = useUserDateFormatter()

const formatDate = (date: string | Date) => {
  return formatSmartDate(typeof date === 'string' ? new Date(date) : date)
}
```

#### 2. 图表组件迁移

```typescript
// 修改前
axisLabel: {
  formatter: function (value: string) {
    return value.replace('-', '/')
  }
}

// 修改后
const { formatChartDate } = useUserDateFormatter()

axisLabel: {
  formatter: function (value: string) {
    return formatChartDate(new Date(value), 'month')
  }
}
```

#### 3. 报表组件迁移

```typescript
// 修改前
{format(
  new Date(data.period.start),
  language === 'zh' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy',
  { locale: dateLocale }
)}

// 修改后
const { formatDate } = useUserDateFormatter()

{formatDate(new Date(data.period.start))}
```

## 🧪 测试策略

### 单元测试
```typescript
// src/hooks/__tests__/useUserDateFormatter.test.ts
describe('useUserDateFormatter', () => {
  test('应该根据用户设置格式化日期', () => {
    // 测试不同日期格式设置
  })

  test('应该正确处理智能日期显示', () => {
    // 测试今天/昨天/明天逻辑
  })

  test('应该为图表提供正确的格式', () => {
    // 测试图表专用格式化
  })
})
```

### 集成测试
- 验证设置页面的日期格式选择能够在其他页面生效
- 测试不同语言环境下的日期显示
- 确保日期输入控件与显示格式的一致性

## 📋 迁移检查清单

### 高优先级组件
- [ ] `TransactionList.tsx` - 交易记录日期显示
- [ ] `CashFlowCard.tsx` - 现金流报表日期
- [ ] `BalanceSheetCard.tsx` - 资产负债表日期
- [ ] `LoanPaymentHistory.tsx` - 贷款还款历史

### 中优先级组件
- [ ] `StockAccountTrendChart.tsx` - 图表日期轴
- [ ] `FlowAccountTrendChart.tsx` - 图表日期轴
- [ ] `CashFlowChart.tsx` - 图表日期轴
- [ ] `MonthlySummaryChart.tsx` - 图表日期轴
- [ ] `ExchangeRateList.tsx` - 汇率日期显示

### 低优先级组件
- [ ] `ProfileSettingsForm.tsx` - 用户资料日期
- [ ] 各种模态框中的日期输入
- [ ] 开发和测试页面中的日期显示

## 🎯 成功指标

1. **功能完整性**：用户设置的日期格式在所有页面生效
2. **代码质量**：移除重复的日期格式化代码
3. **用户体验**：日期显示一致且符合用户习惯
4. **性能表现**：格式化性能不低于现有实现
5. **测试覆盖**：核心功能有完整的单元测试

这个统一的日期格式化系统将显著提升 Flow Balance 应用的用户体验和代码质量，让用户的日期格式偏好真正在整个应用中生效。
