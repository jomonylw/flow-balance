# Chart Component Separation - MonthlySummaryChart 重构

## 概述

本次重构将原本的 `MonthlySummaryChart` 组件分离为两个专门的组件，以实现更好的关注点分离和代码维护性。

## 问题分析

### 原始问题
- **混合职责**: `MonthlySummaryChart` 组件同时处理流量类（收支）和存量类（余额）图表
- **复杂条件逻辑**: 使用 `chartType` 属性在不同渲染方法间切换
- **不同数据结构**: 流量图表使用 `MonthlyData`，存量图表使用 `StockMonthlyData`
- **不同汇总计算**: 流量图表显示收入/支出/净收支，存量图表显示账户余额

### 设计目标
- **清晰的职责分离**: 每个组件专注于一种图表类型
- **简化的组件逻辑**: 移除复杂的条件渲染
- **类型特定的接口**: 为每种图表类型提供专门的 TypeScript 接口
- **更好的维护性**: 更容易测试和维护

## 实现方案

### 1. 新组件结构

#### FlowMonthlySummaryChart (流量类图表)
- **用途**: 显示收入/支出/净收支的月度汇总
- **数据类型**: `MonthlyData` 接口
- **图表类型**: 柱状图 + 折线图组合
- **汇总信息**: 总收入、总支出、净收支

#### StockMonthlySummaryChart (存量类图表)
- **用途**: 显示账户余额的月度汇总
- **数据类型**: `StockMonthlyData` 接口
- **图表类型**: 堆叠柱状图
- **汇总信息**: 当前总余额、平均余额、账户数量

### 2. 文件结构

```
src/components/charts/
├── MonthlySummaryChart.tsx          # 已弃用，保留向后兼容
├── FlowMonthlySummaryChart.tsx      # 新增：流量类图表
└── StockMonthlySummaryChart.tsx     # 新增：存量类图表
```

### 3. 接口定义

#### FlowMonthlySummaryChart Props
```typescript
interface FlowMonthlySummaryChartProps {
  monthlyData: MonthlyData
  baseCurrency: Currency
  title?: string
  height?: number
}
```

#### StockMonthlySummaryChart Props
```typescript
interface StockMonthlySummaryChartProps {
  stockMonthlyData: StockMonthlyData
  baseCurrency: Currency
  title?: string
  height?: number
}
```

## 迁移指南

### 更新导入语句

#### 流量类分类页面 (FlowCategoryDetailView)
```typescript
// 修改前
import MonthlySummaryChart from '@/components/charts/MonthlySummaryChart'

// 修改后
import FlowMonthlySummaryChart from '@/components/charts/FlowMonthlySummaryChart'
```

#### 存量类分类页面 (StockCategoryDetailView)
```typescript
// 修改前
import MonthlySummaryChart from '@/components/charts/MonthlySummaryChart'

// 修改后
import StockMonthlySummaryChart from '@/components/charts/StockMonthlySummaryChart'
```

### 更新组件使用

#### 流量类图表使用
```typescript
// 修改前
<MonthlySummaryChart
  monthlyData={chartData}
  baseCurrency={baseCurrencyForChart}
  title={`${category.name} - ${t('category.monthly.cash.flow.summary')}`}
  height={400}
  chartType="flow"
/>

// 修改后
<FlowMonthlySummaryChart
  monthlyData={chartData}
  baseCurrency={baseCurrencyForChart}
  title={`${category.name} - ${t('category.monthly.cash.flow.summary')}`}
  height={400}
/>
```

#### 存量类图表使用
```typescript
// 修改前
<MonthlySummaryChart
  stockMonthlyData={monthlyData.monthlyData}
  baseCurrency={baseCurrencyForChart}
  title={`${category.name} - ${t('category.monthly.balance.summary')}`}
  height={400}
  chartType="stock"
/>

// 修改后
<StockMonthlySummaryChart
  stockMonthlyData={monthlyData.monthlyData}
  baseCurrency={baseCurrencyForChart}
  title={`${category.name} - ${t('category.monthly.balance.summary')}`}
  height={400}
/>
```

## 技术细节

### 1. TypeScript 类型修复
- 修复了 ECharts tooltip formatter 的类型问题
- 使用 `any` 类型处理 ECharts 复杂的回调参数类型

### 2. 功能保持
- 保留了所有原有的图表功能和样式
- 保持了响应式设计和交互性
- 维持了数据汇总显示

### 3. 向后兼容性
- 原始 `MonthlySummaryChart` 组件标记为 `@deprecated`
- 保留组件以避免破坏现有代码
- 建议逐步迁移到新组件

## 优势

### 1. 代码质量提升
- **单一职责原则**: 每个组件只负责一种图表类型
- **减少复杂性**: 移除了条件渲染逻辑
- **更好的类型安全**: 专门的 TypeScript 接口

### 2. 维护性改善
- **更容易测试**: 每个组件可以独立测试
- **更清晰的代码**: 减少了混淆和复杂性
- **更好的可读性**: 组件名称明确表达用途

### 3. 扩展性增强
- **独立演进**: 每种图表类型可以独立添加功能
- **专门优化**: 可以针对特定图表类型进行优化
- **更好的重用**: 组件更容易在其他地方重用

## 测试验证

### 构建测试
- ✅ TypeScript 编译通过
- ✅ Next.js 构建成功
- ✅ 无运行时错误

### 功能测试
- ✅ 流量类图表正常显示
- ✅ 存量类图表正常显示
- ✅ 数据汇总计算正确
- ✅ 响应式设计工作正常

## 后续计划

1. **逐步移除旧组件**: 在确认所有使用都已迁移后，移除 `MonthlySummaryChart`
2. **添加单元测试**: 为新组件添加专门的测试用例
3. **性能优化**: 针对特定图表类型进行性能优化
4. **功能增强**: 为每种图表类型添加专门的功能

## 总结

本次重构成功地将复杂的 `MonthlySummaryChart` 组件分离为两个专门的组件，实现了更好的代码组织和维护性。新的组件结构更符合单一职责原则，为后续的功能开发和维护奠定了良好的基础。
