# 流量图表饼状图功能

## 功能概述

在现有的 `FlowMonthlySummaryChart` 组件基础上，新增了饼状图功能，实现柱状图与饼状图的交互联动。

## 功能特性

### 1. 默认显示

- 饼状图默认显示最新月份各个分类的占比
- 自动根据收入/支出类型显示相应数据

### 2. 交互联动

- **柱状图点击**：点击柱状图某个月份的柱形，饼状图会切换显示该月份的数据占比
- **单向交互**：饼状图仅用于数据展示，不会影响柱状图的显示状态

### 3. 视觉设计

- 饼状图使用与柱状图相同的颜色方案，确保视觉一致性
- 支持深色/浅色主题切换
- 响应式布局，适配不同屏幕尺寸
- 优化的布局设计，避免标题与图表重叠
- 大尺寸饼状图设计，提供清晰的数据可视化效果
- 简洁的设计，去除图例显示，数据标签直接显示在饼状图上

## 使用方法

### 基本用法

```tsx
import FlowMonthlySummaryChart from '@/components/features/charts/FlowMonthlySummaryChart'

// 不显示饼状图（默认行为）
<FlowMonthlySummaryChart
  monthlyData={monthlyData}
  baseCurrency={baseCurrency}
  title="月度现金流汇总"
  height={400}
  accounts={accounts}
/>

// 显示饼状图
<FlowMonthlySummaryChart
  monthlyData={monthlyData}
  baseCurrency={baseCurrency}
  title="月度现金流汇总"
  height={600}
  showPieChart={true}
  accounts={accounts}
/>
```

### 参数说明

| 参数           | 类型                 | 默认值  | 说明                     |
| -------------- | -------------------- | ------- | ------------------------ |
| `monthlyData`  | `FlowMonthlyData`    | -       | 月度数据                 |
| `baseCurrency` | `SimpleCurrency`     | -       | 基础货币                 |
| `title`        | `string`             | -       | 图表标题                 |
| `height`       | `number`             | `400`   | 图表总高度               |
| `showPieChart` | `boolean`            | `false` | 是否显示饼状图           |
| `accounts`     | `LocalFlowAccount[]` | `[]`    | 账户信息（用于颜色配置） |

## 布局说明

当 `showPieChart=true` 时：

- 柱状图占用总高度的 60%
- 饼状图占用总高度的 40%
- 两个图表之间有 16px 的间距

建议将总高度设置为 600px 以获得最佳显示效果。

## 技术实现

### 核心组件

- 使用 ECharts 5.6.0 实现图表渲染
- 支持图表间的事件通信
- 使用 React Hooks 管理状态

### 状态管理

- `selectedMonth`: 当前选中的月份（用于饼状图显示）
- `highlightedCategory`: 当前高亮的分类（用于柱状图高亮）

### 事件处理

- 柱状图点击事件：更新 `selectedMonth` 状态
- 饼状图点击事件：更新 `highlightedCategory` 状态并触发柱状图高亮

## 国际化支持

新增了以下国际化键值：

- `chart.category.breakdown`: 分类占比
- `chart.pie.click.hint`: 交互提示文本

## 兼容性

- 向后兼容：现有使用 `FlowMonthlySummaryChart` 的地方无需修改
- 新功能：通过 `showPieChart` 参数控制是否启用饼状图功能

## 示例应用

目前已在以下页面启用饼状图功能：

- 流量分类详情页面 (`FlowCategoryDetailView.tsx`)

## 未来扩展

可以考虑的功能扩展：

1. 添加饼状图的时间范围选择器
2. 支持饼状图的数据导出功能
3. 添加更多的图表交互动画效果
4. 支持饼状图的数据筛选功能
