# LoadingScreen 国际化实现文档

## 📋 概述

为 `LoadingScreen`
组件实现了完整的国际化处理，支持多语言、主题适配和多种加载样式，提供了更好的用户体验和开发体验。

## 🌍 国际化特性

### 1. 多语言支持

- 集成 `useLanguage` hook，自动获取当前语言设置
- 支持中文和英文翻译
- 在翻译加载期间提供合适的回退文本

### 2. 预定义消息类型

提供了 9 种预定义的消息类型，每种都有对应的翻译键：

| 消息类型        | 翻译键                 | 中文            | 英文                              |
| --------------- | ---------------------- | --------------- | --------------------------------- |
| `loading`       | `common.loading`       | 加载中...       | Loading...                        |
| `redirecting`   | `common.redirecting`   | 正在重定向...   | Redirecting...                    |
| `processing`    | `common.processing`    | 处理中...       | Processing...                     |
| `initializing`  | `common.initializing`  | 正在初始化...   | Initializing...                   |
| `preparing`     | `common.preparing`     | 正在准备...     | Preparing...                      |
| `loading-data`  | `common.loading.data`  | 正在加载数据... | Loading data...                   |
| `loading-page`  | `common.loading.page`  | 正在加载页面... | Loading page...                   |
| `loading-app`   | `common.loading.app`   | 正在启动应用... | Starting application...           |
| `auth-checking` | `auth.checking.status` | 检查认证状态... | Checking authentication status... |

### 3. 智能回退机制

- 当翻译正在加载时，根据当前主题提供合适的默认文本
- 避免显示翻译键值给用户
- 确保在任何情况下都有可读的文本显示

## 🎨 增强功能

### 1. 多种动画样式

- **spin**: 圆锥渐变旋转效果（默认）
- **pulse**: 脉冲动画效果
- **dots**: 三点波浪动画
- **bars**: 柱状波动动画
- **ring**: 环形边框旋转

### 2. 应用标题显示

- 可选择显示应用标题和副标题
- 适用于应用启动页面等场景
- 支持国际化的副标题文本

### 3. 灵活的配置选项

- 自定义消息文本覆盖预定义类型
- 可控制背景显示
- 支持自定义样式类名

## 🔧 API 接口

```typescript
interface LoadingScreenProps {
  /** 自定义消息文本 */
  message?: string
  /** 预定义的消息类型 */
  messageType?:
    | 'loading'
    | 'redirecting'
    | 'processing'
    | 'initializing'
    | 'preparing'
    | 'loading-data'
    | 'loading-page'
    | 'loading-app'
    | 'auth-checking'
  /** 加载器样式 */
  variant?: 'spin' | 'pulse' | 'dots' | 'bars' | 'ring'
  /** 是否显示应用标题 */
  showAppTitle?: boolean
  /** 自定义类名 */
  className?: string
  /** 是否显示背景 */
  showBackground?: boolean
}
```

## 📝 使用示例

### 基础用法

```tsx
// 默认加载屏幕
<LoadingScreen />

// 指定消息类型（推荐）
<LoadingScreen messageType="auth-checking" />

// 自定义消息（覆盖翻译）
<LoadingScreen message="正在同步您的数据..." />
```

### 不同场景的使用

```tsx
// 认证检查
<LoadingScreen messageType="auth-checking" variant="pulse" />

// 页面重定向
<LoadingScreen messageType="redirecting" variant="dots" />

// 应用启动
<LoadingScreen
  messageType="loading-app"
  showAppTitle={true}
  variant="spin"
/>

// 数据处理
<LoadingScreen messageType="processing" variant="bars" />
```

### 高级配置

```tsx
// 完整配置
<LoadingScreen
  messageType='loading-data'
  variant='pulse'
  showAppTitle={false}
  showBackground={true}
  className='custom-loading'
/>
```

## 🔄 迁移指南

### 旧的使用方式

```tsx
// 旧代码 - 硬编码文本
<LoadingScreen message="加载中..." />
<LoadingScreen message={t('common.loading') || '加载中...'} />
```

### 新的推荐方式

```tsx
// 新代码 - 使用消息类型
<LoadingScreen messageType="loading" />
<LoadingScreen messageType="auth-checking" />
```

## 📊 已更新的组件

以下组件已更新使用新的国际化 LoadingScreen：

### 1. 登录页面 (`src/app/login/page.tsx`)

```tsx
// 组件初始化
<LoadingScreen messageType="initializing" />

// 翻译加载
<LoadingScreen messageType="loading" />

// 认证检查
<LoadingScreen messageType="auth-checking" variant="pulse" />

// 重定向
<LoadingScreen messageType="redirecting" variant="dots" />
```

### 2. 认证守卫 (`src/components/auth/AuthGuard.tsx`)

```tsx
// 认证检查
<LoadingScreen messageType="auth-checking" variant="pulse" />

// 重定向
<LoadingScreen messageType="redirecting" variant="dots" />
```

### 3. 认证上下文 (`src/contexts/providers/AuthContext.tsx`)

```tsx
// 认证状态检查
<LoadingScreen messageType='auth-checking' variant='pulse' />
```

## 🎯 设计收益

### 1. 用户体验提升

- **一致性**: 所有加载状态使用统一的设计和文本
- **国际化**: 自动适配用户的语言设置
- **视觉效果**: 多种动画样式提供更好的视觉反馈

### 2. 开发体验改善

- **类型安全**: TypeScript 支持，减少错误
- **易于维护**: 集中管理加载文本和样式
- **简化代码**: 减少重复的翻译调用

### 3. 性能优化

- **智能回退**: 避免翻译加载时的闪烁
- **CSS 动画**: 使用高性能的 CSS 动画
- **按需渲染**: 根据场景选择合适的组件

## 🔮 未来扩展

### 可能的增强功能

1. **进度指示**: 添加进度百分比显示
2. **自定义图标**: 支持自定义加载图标
3. **声音提示**: 可选的音频反馈
4. **动画控制**: 更细粒度的动画控制选项

### 国际化扩展

1. **更多语言**: 支持更多语言版本
2. **地区化**: 根据地区调整显示格式
3. **RTL 支持**: 支持从右到左的语言

## 📈 技术实现

### 1. 翻译键管理

- 在 `public/locales/zh/common.json` 和 `public/locales/en/common.json` 中添加翻译
- 使用语义化的键名，便于理解和维护
- 认证相关翻译放在 `auth.json` 中

### 2. 智能文本选择

```typescript
const getMessageText = () => {
  // 自定义消息优先
  if (message) return message

  // 翻译加载中时的回退
  if (languageLoading) {
    return resolvedTheme === 'dark' ? 'Loading...' : '加载中...'
  }

  // 根据消息类型获取翻译
  switch (messageType) {
    case 'auth-checking':
      return t('auth.checking.status')
    case 'loading':
      return t('common.loading')
    // ... 其他类型
  }
}
```

### 3. 主题适配

- 自动检测当前主题
- 在翻译未加载时提供主题相关的回退文本
- 确保在明暗主题下都有良好的显示效果

## ✅ 验证清单

- [x] 所有预定义消息类型都有对应的翻译
- [x] 翻译加载期间有合适的回退机制
- [x] 支持自定义消息覆盖
- [x] 主题适配正常工作
- [x] TypeScript 类型定义完整
- [x] 现有组件已更新使用新API
- [x] 演示页面展示所有功能
- [x] 文档完整且准确
