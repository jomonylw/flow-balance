# 数据导入实时进度显示 Modal 设计文档

## 🎯 设计目标

为 Flow
Balance 数据导入功能设计并实现一个用户友好的实时进度显示 Modal，提供清晰的视觉反馈和良好的用户体验。

## 🏗️ 架构设计

### 1. 组件层次结构

```
ImportProgressModal
├── Modal (基础模态框)
├── ProgressBar (自定义进度条)
├── LoadingSpinner (加载动画)
└── 状态图标和文本
```

### 2. 数据流设计

```
后端进度API → 轮询机制 → 状态更新 → UI渲染
```

## 📊 功能特性

### 1. 实时进度显示

#### 进度信息

- **当前阶段**：验证数据 → 导入数据 → 完成/失败
- **进度百分比**：0-100% 的精确进度
- **处理数量**：当前处理项目数 / 总项目数
- **状态消息**：详细的当前操作描述

#### 视觉反馈

- **阶段图标**：不同阶段显示对应的图标和颜色
- **动态进度条**：平滑的动画效果和条纹显示
- **颜色编码**：蓝色(验证) → 绿色(导入) → 绿色(完成)/红色(失败)

### 2. 用户交互

#### 操作按钮

- **取消按钮**：进行中时可以取消导入
- **关闭按钮**：完成或失败后关闭对话框

#### 详细信息

- **可展开详情**：会话ID、当前阶段、处理项目数
- **错误信息**：失败时显示具体错误原因

### 3. 状态管理

#### 进度状态

```typescript
interface ImportProgress {
  stage: 'validating' | 'importing' | 'completed' | 'failed'
  current: number
  total: number
  percentage: number
  message: string
}
```

#### 阶段流程

1. **validating** - 验证数据完整性
2. **importing** - 执行数据导入
3. **completed** - 导入成功完成
4. **failed** - 导入失败

## 🎨 UI/UX 设计

### 1. 视觉设计

#### 布局结构

```
┌─────────────────────────────────┐
│           Modal Header          │
├─────────────────────────────────┤
│         Stage Icon              │
│       Stage Title               │
│      Progress Message           │
│                                 │
│    ████████████░░░░░░░░ 75%     │
│                                 │
│      Current / Total            │
│                                 │
│    ▼ Details (Expandable)       │
│                                 │
│    [Cancel]        [Close]      │
└─────────────────────────────────┘
```

#### 颜色方案

- **验证阶段**：蓝色主题 (#3B82F6)
- **导入阶段**：绿色主题 (#10B981)
- **完成状态**：绿色主题 (#10B981)
- **失败状态**：红色主题 (#EF4444)

#### 动画效果

- **进度条动画**：平滑的宽度变化 (300ms ease-out)
- **图标切换**：淡入淡出效果
- **条纹效果**：导入阶段显示动态条纹

### 2. 响应式设计

#### 屏幕适配

- **桌面端**：固定宽度 Modal (500px)
- **移动端**：全宽度适配，保持内边距
- **触摸优化**：按钮大小适合触摸操作

#### 主题支持

- **明暗主题**：完整的明暗模式适配
- **颜色对比**：确保可访问性标准

## 🔧 技术实现

### 1. 核心组件

#### ImportProgressModal.tsx

```typescript
interface ImportProgressModalProps {
  isOpen: boolean
  progress: ImportProgress | null
  sessionId: string | null
  onCancel: () => void
  onComplete: () => void
}
```

#### ProgressBar.tsx

```typescript
interface ProgressBarProps {
  percentage: number
  height?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
  animated?: boolean
  striped?: boolean
}
```

### 2. 状态管理

#### 轮询机制

```typescript
const startProgressPolling = (sessionId: string) => {
  const pollInterval = setInterval(async () => {
    const response = await fetch(`/api/user/data/import/progress?sessionId=${sessionId}`)
    const result = await response.json()

    if (response.ok) {
      setImportProgress(result.data)

      if (['completed', 'failed', 'cancelled'].includes(result.data.stage)) {
        clearInterval(pollInterval)
        // 处理完成状态
      }
    }
  }, 1000) // 每秒轮询
}
```

#### 错误处理

- **网络错误**：显示重试选项
- **超时处理**：5分钟后自动停止轮询
- **会话丢失**：提示用户刷新页面

### 3. 国际化支持

#### 翻译键值

```json
{
  "data.import.progress.title": "数据导入进度",
  "data.import.progress.validating": "验证数据",
  "data.import.progress.importing": "导入数据",
  "data.import.progress.completed": "导入完成",
  "data.import.progress.failed": "导入失败",
  "data.import.progress.details": "详细信息"
}
```

## 📈 性能优化

### 1. 渲染优化

#### 动画性能

- **CSS Transform**：使用 transform 而非 width 变化
- **防抖处理**：避免频繁的状态更新
- **条件渲染**：只在必要时渲染动画效果

#### 内存管理

- **定时器清理**：组件卸载时清理所有定时器
- **事件监听器**：及时移除事件监听器

### 2. 用户体验优化

#### 加载状态

- **即时反馈**：点击导入后立即显示进度 Modal
- **平滑过渡**：状态切换时的平滑动画
- **错误恢复**：网络错误时的自动重试机制

#### 可访问性

- **键盘导航**：支持 Tab 键导航
- **屏幕阅读器**：适当的 ARIA 标签
- **颜色对比**：符合 WCAG 标准

## 🚀 使用示例

### 1. 基本用法

```typescript
// 在 DataManagementSection 中使用
<ImportProgressModal
  isOpen={showProgressModal}
  progress={importProgress}
  sessionId={importSessionId}
  onCancel={handleCancelImport}
  onComplete={handleProgressComplete}
/>
```

### 2. 进度更新

```typescript
// 后端服务中的进度回调
if (options.onProgress) {
  options.onProgress({
    stage: 'importing',
    current: processedCount,
    total: totalCount,
    percentage: Math.round((processedCount / totalCount) * 100),
    message: `已导入 ${processedCount} / ${totalCount} 条记录`,
  })
}
```

## 🎉 设计亮点

### 1. 用户体验

- **实时反馈**：每秒更新的进度信息
- **清晰状态**：直观的阶段指示和进度显示
- **错误处理**：友好的错误提示和恢复机制

### 2. 视觉设计

- **现代界面**：简洁美观的设计风格
- **动画效果**：平滑的过渡和加载动画
- **主题一致**：与应用整体设计保持一致

### 3. 技术实现

- **高性能**：优化的渲染和动画性能
- **可维护**：清晰的组件结构和代码组织
- **可扩展**：易于添加新功能和自定义

这个设计提供了完整的数据导入进度显示解决方案，确保用户在导入大量数据时能够清楚地了解进度状态，并在需要时进行适当的操作。
