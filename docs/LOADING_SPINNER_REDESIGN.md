# LoadingSpinner 重新设计文档

## 📋 概述

重新设计了 LoadingSpinner 组件，使其更符合项目的主题样式，实现了扁平、美观、和谐、统一的设计理念。

## 🎨 设计特点

### 1. 扁平设计

- 使用简洁的几何形状和渐变效果
- 避免过度装饰，保持现代感
- 统一的圆角和间距设计

### 2. 主题和谐

- 完美适配明暗主题
- 使用项目的颜色系统（CSS 变量）
- 自动响应主题切换

### 3. 多种动画样式

- **spin**: 圆锥渐变旋转效果（默认）
- **pulse**: 脉冲动画效果
- **dots**: 三点波浪动画
- **bars**: 柱状波动动画
- **ring**: 环形边框旋转

### 4. 丰富的配置选项

- 5种尺寸：`xs`, `sm`, `md`, `lg`, `xl`
- 5种颜色：`primary`, `secondary`, `muted`, `white`, `current`
- 支持内联显示和居中显示
- 支持自定义文本和国际化

## 🔧 API 接口

### LoadingSpinner 组件

```typescript
interface LoadingSpinnerProps {
  /** 尺寸大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** 自定义类名 */
  className?: string
  /** 是否显示文本 */
  showText?: boolean
  /** 自定义文本 */
  text?: string
  /** 颜色主题 */
  color?: 'primary' | 'secondary' | 'white' | 'current' | 'muted'
  /** 是否为内联显示 */
  inline?: boolean
  /** 动画样式 */
  variant?: 'spin' | 'pulse' | 'dots' | 'bars' | 'ring'
}
```

### LoadingSpinnerSVG 组件

```typescript
interface LoadingSpinnerSVGProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  color?: 'primary' | 'secondary' | 'white' | 'current' | 'muted'
  variant?: 'ring' | 'dots' | 'bars'
}
```

## 📝 使用示例

### 基础用法

```tsx
// 默认加载器
<LoadingSpinner />

// 带文本的加载器
<LoadingSpinner showText />
<LoadingSpinner showText text="处理中..." />

// 不同样式
<LoadingSpinner variant="pulse" size="lg" />
<LoadingSpinner variant="dots" color="secondary" />
<LoadingSpinner variant="bars" color="muted" />
```

### 内联使用

```tsx
<p>
  正在加载数据 <LoadingSpinner inline size='sm' />
</p>
```

### 按钮中使用

```tsx
<button disabled={loading}>
  {loading ? (
    <>
      <LoadingSpinnerSVG size='sm' color='white' />
      加载中...
    </>
  ) : (
    '提交'
  )}
</button>
```

### 不同主题

```tsx
// 主要颜色
<LoadingSpinner color="primary" />

// 次要颜色
<LoadingSpinner color="secondary" />

// 静音颜色
<LoadingSpinner color="muted" />

// 白色（深色背景使用）
<LoadingSpinner color="white" />

// 当前文本颜色
<LoadingSpinner color="current" />
```

## 🎯 技术实现

### 1. 主题颜色系统

- 使用 `useTheme` hook 获取当前主题
- 动态计算主题相关的颜色值
- 支持 RGB 颜色值和渐变效果

### 2. 动画实现

- CSS 动画关键帧定义在 `globals.css`
- 使用 `conic-gradient` 实现圆锥渐变
- 支持多种动画时序和延迟

### 3. 国际化支持

- 使用 `useLanguage` hook 获取翻译
- 默认文本使用 `common.loading` 翻译键
- 支持自定义文本覆盖

### 4. 响应式设计

- 尺寸映射适配不同屏幕
- 支持内联和块级显示模式
- 自适应文本大小

## 🔄 迁移指南

### 旧代码模式

```tsx
// 旧的实现
<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />

// SVG 版本
<svg className="animate-spin h-4 w-4">
  <circle className="opacity-25" />
  <path className="opacity-75" />
</svg>
```

### 新代码模式

```tsx
// 新的统一实现
<LoadingSpinner size="md" />

// SVG 版本
<LoadingSpinnerSVG size="sm" />
```

## 📊 已更新的组件

以下组件已更新使用新的 LoadingSpinner：

### 图表组件

- `StockAccountTrendChart.tsx`
- `FlowAccountTrendChart.tsx`

### 账户卡片

- `StockAccountSummaryCard.tsx`
- `FlowAccountSummaryCard.tsx`

### 设置组件

- `ChangePasswordForm.tsx`
- `DataManagementSection.tsx`

## 🎉 设计收益

### 1. 视觉统一性

- 所有加载状态使用统一的设计语言
- 与项目整体风格保持一致
- 更好的品牌识别度

### 2. 用户体验

- 更流畅的动画效果
- 更清晰的加载状态指示
- 更好的可访问性

### 3. 开发效率

- 统一的 API 接口
- 减少重复代码
- 更容易维护和扩展

### 4. 主题适配

- 完美的明暗主题支持
- 自动响应主题切换
- 一致的颜色表现

## 🔮 未来扩展

### 可能的增强功能

1. 添加更多动画样式
2. 支持自定义动画速度
3. 添加进度百分比显示
4. 支持骨架屏模式
5. 添加声音提示选项

### 性能优化

1. 使用 CSS-in-JS 优化
2. 动画性能监控
3. 减少重绘和回流
4. 内存使用优化
