# PageContainer 暗色主题实现

## 概述
为 `PageContainer` 组件及其相关子组件添加了完整的暗色主题支持，确保在暗色模式下具有良好的视觉体验和可读性。

## 主题系统架构

### 1. 主题上下文 (ThemeContext)
项目已有完整的主题系统：
- **主题选项**: `light` | `dark` | `system`
- **自动检测**: 支持系统主题自动切换
- **持久化**: 主题设置保存到 localStorage 和用户设置
- **实时切换**: 支持运行时主题切换

### 2. CSS 变量系统
使用 CSS 变量实现主题切换：
```css
:root {
  --color-background: #ffffff;
  --color-foreground: #171717;
  /* 更多变量... */
}

.dark {
  --color-background: #0f172a;
  --color-foreground: #f8fafc;
  /* 暗色主题变量... */
}
```

### 3. Tailwind CSS 暗色模式
配置了 Tailwind CSS v4 的暗色模式：
```css
@custom-variant dark (&:where(.dark, .dark *));
```

## PageContainer 暗色主题实现

### 1. 主标题和副标题
**修改前：**
```tsx
<h1 className={`font-bold text-gray-900 ${getTextSize('3xl')}`}>
  {title}
</h1>
<p className={`mt-2 text-gray-600 ${getTextSize('base')}`}>
  {subtitle}
</p>
```

**修改后：**
```tsx
<h1 className={`font-bold text-gray-900 dark:text-gray-100 ${getTextSize('3xl')}`}>
  {title}
</h1>
<p className={`mt-2 text-gray-600 dark:text-gray-400 ${getTextSize('base')}`}>
  {subtitle}
</p>
```

### 2. 面包屑导航 (Breadcrumb)
**分隔符图标：**
```tsx
<svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500 mx-1">
```

**链接样式：**
```tsx
<a className={`inline-flex items-center font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 ${getTextSize('sm')}`}>
```

**当前页面样式：**
```tsx
<span className={`inline-flex items-center font-medium text-gray-500 dark:text-gray-400 ${getTextSize('sm')}`}>
```

### 3. 响应式按钮 (ResponsiveButton)
**Primary 按钮：**
```tsx
primary: 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400'
```

**Secondary 按钮：**
```tsx
secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500 dark:focus:ring-gray-400'
```

**Danger 按钮：**
```tsx
danger: 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 dark:focus:ring-red-400'
```

**Ghost 按钮：**
```tsx
ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500 dark:focus:ring-gray-400 border border-gray-300 dark:border-gray-600'
```

## 颜色设计原则

### 1. 对比度保证
- **明亮模式**: 深色文字 (gray-900) + 浅色背景
- **暗色模式**: 浅色文字 (gray-100) + 深色背景
- 确保 WCAG AA 级别的对比度标准

### 2. 层次结构
- **主标题**: `text-gray-900` → `dark:text-gray-100`
- **副标题**: `text-gray-600` → `dark:text-gray-400`
- **辅助文字**: `text-gray-500` → `dark:text-gray-400`

### 3. 交互状态
- **悬停状态**: 提供明显的视觉反馈
- **焦点状态**: 使用 ring 样式突出显示
- **禁用状态**: 降低透明度保持一致性

## 使用示例

### 基础用法
```tsx
<PageContainer
  title="页面标题"
  subtitle="页面副标题"
>
  {/* 页面内容 */}
</PageContainer>
```

### 带操作按钮
```tsx
<PageContainer
  title="页面标题"
  subtitle="页面副标题"
  actions={
    <ResponsiveButton variant="primary" onClick={handleAction}>
      操作按钮
    </ResponsiveButton>
  }
>
  {/* 页面内容 */}
</PageContainer>
```

### 带面包屑导航
```tsx
<PageContainer
  title="页面标题"
  subtitle="页面副标题"
  breadcrumb={
    <Breadcrumb
      items={[
        { label: '首页', href: '/' },
        { label: '当前页面' }
      ]}
    />
  }
>
  {/* 页面内容 */}
</PageContainer>
```

## 测试验证

### 1. 功能测试
- ✅ 主题切换正常工作
- ✅ 所有页面布局保持一致
- ✅ 响应式设计在暗色模式下正常
- ✅ 交互状态在暗色模式下清晰可见

### 2. 视觉测试
- ✅ 文字对比度符合可访问性标准
- ✅ 颜色层次清晰合理
- ✅ 暗色模式下无刺眼的亮色元素
- ✅ 品牌色彩在暗色模式下保持识别度

### 3. 兼容性测试
- ✅ 与现有组件样式兼容
- ✅ 不影响其他页面的主题表现
- ✅ 主题切换无闪烁现象

## 后续优化建议

### 1. 内容区域暗色主题
虽然 PageContainer 本身已支持暗色主题，但页面内容区域（如卡片、表格等）可能需要进一步优化：
- 为 Dashboard 中的统计卡片添加暗色主题
- 为 Reports 页面的表格和图表添加暗色主题
- 为 Transactions 页面的列表和过滤器添加暗色主题

### 2. 图表组件暗色主题
- ECharts 图表的暗色主题配置
- 图表背景色和文字颜色适配

### 3. 模态框和弹窗
- 确保所有模态框在暗色模式下的表现
- 优化弹窗的背景遮罩效果

## 总结

PageContainer 组件现在已经完全支持暗色主题，提供了：
- **一致的视觉体验**: 所有页面标题、副标题、导航元素在暗色模式下保持一致
- **良好的可访问性**: 符合对比度标准，确保可读性
- **完整的交互反馈**: 按钮、链接等交互元素在暗色模式下有清晰的状态变化
- **响应式适配**: 在不同设备和屏幕尺寸下都能正常工作

这为整个应用的暗色主题奠定了坚实的基础，用户现在可以在明亮和暗色主题之间自由切换，享受一致的用户体验。
