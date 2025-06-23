# 颜色系统使用指南

## 概述

本项目建立了统一的颜色管理系统，用于替代硬编码的颜色值，提高代码的可维护性和一致性。

## 颜色常量

### 基础颜色 (COLORS)

```typescript
import { COLORS } from '@/types/core/constants'

// 主色调
COLORS.PRIMARY // #3b82f6 - 主要颜色
COLORS.SECONDARY // #6b7280 - 次要颜色
COLORS.SUCCESS // #10b981 - 成功状态
COLORS.WARNING // #f59e0b - 警告状态
COLORS.ERROR // #ef4444 - 错误状态
COLORS.INFO // #06b6d4 - 信息状态

// 灰度色阶
COLORS.GRAY_50 // #f9fafb - 最浅灰
COLORS.GRAY_100 // #f3f4f6
// ... 到 GRAY_900

// 语义化颜色
COLORS.BACKGROUND // #ffffff - 背景色
COLORS.TEXT // #111827 - 文本色
COLORS.BORDER // #e5e7eb - 边框色

// 透明度变体
COLORS.PRIMARY_10 // rgba(59, 130, 246, 0.1)
COLORS.SUCCESS_20 // rgba(16, 185, 129, 0.2)
```

## 颜色管理器 (ColorManager)

### 基础用法

```typescript
import ColorManager from '@/lib/utils/color'

// 获取账户颜色
const accountColor = ColorManager.getAccountColor(accountId, customColor, accountType)

// 获取主题相关颜色
const bgColor = ColorManager.getThemeColor('background', isDark)

// 获取语义化颜色
const successColor = ColorManager.getSemanticColor('success')

// 获取带透明度的颜色
const primaryWithOpacity = ColorManager.getColorWithOpacity('primary', 20)

// 获取灰度颜色
const grayColor = ColorManager.getGrayColor(500)
```

### 高级功能

```typescript
// 生成图表颜色
const chartColors = ColorManager.generateChartColors(items, getItemColor)

// 智能颜色分配（避免相似颜色）
const smartColors = ColorManager.generateSmartChartColors(items, getItemColor)

// 获取对比文本颜色
const textColor = ColorManager.getContrastTextColor(backgroundColor)

// 调整颜色透明度
const transparentColor = ColorManager.adjustColorAlpha('#3b82f6', 0.5)

// 生成颜色渐变
const gradient = ColorManager.generateColorGradient('#3b82f6', 5)
```

## 最佳实践

### ✅ 推荐做法

```typescript
// 使用颜色常量
const buttonStyle = {
  backgroundColor: COLORS.PRIMARY,
  color: COLORS.BACKGROUND,
  border: `1px solid ${COLORS.BORDER}`,
}

// 使用颜色管理器
const accountColor = ColorManager.getAccountColor(account.id, account.color, account.type)

// 使用语义化颜色
const statusColor = ColorManager.getSemanticColor(isSuccess ? 'success' : 'error')
```

### ❌ 避免做法

```typescript
// 避免硬编码颜色值
const buttonStyle = {
  backgroundColor: '#3b82f6', // ❌ 硬编码
  color: '#ffffff', // ❌ 硬编码
  border: '1px solid #e5e7eb', // ❌ 硬编码
}

// 避免直接使用十六进制值
const color = '#ef4444' // ❌ 应该使用 COLORS.ERROR
```

## 迁移指南

### 替换硬编码颜色

1. **识别硬编码颜色**

   ```bash
   # 查找硬编码颜色
   grep -r "#[0-9a-fA-F]\{6\}" src/
   ```

2. **替换为颜色常量**

   ```typescript
   // 之前
   backgroundColor: '#3b82f6'

   // 之后
   backgroundColor: COLORS.PRIMARY
   ```

3. **使用颜色管理器**

   ```typescript
   // 之前
   const color = account.color || '#6b7280'

   // 之后
   const color = ColorManager.getAccountColor(account.id, account.color, account.type)
   ```

### 组件重构示例

```typescript
// 之前
const Card = ({ type }: { type: 'success' | 'error' }) => (
  <div style={{
    backgroundColor: type === 'success' ? '#10b981' : '#ef4444',
    color: '#ffffff',
    border: '1px solid #e5e7eb'
  }}>
    Content
  </div>
)

// 之后
const Card = ({ type }: { type: 'success' | 'error' }) => (
  <div style={{
    backgroundColor: ColorManager.getSemanticColor(type),
    color: COLORS.BACKGROUND,
    border: `1px solid ${COLORS.BORDER}`
  }}>
    Content
  </div>
)
```

## 主题支持

颜色系统支持深色主题：

```typescript
// 获取主题相关颜色
const backgroundColor = ColorManager.getThemeColor('background', isDarkMode)
const textColor = ColorManager.getThemeColor('text', isDarkMode)
const borderColor = ColorManager.getThemeColor('border', isDarkMode)
```

## 扩展颜色系统

如需添加新颜色，请在 `src/types/core/constants.ts` 中的 `COLORS` 对象中添加：

```typescript
export const COLORS = {
  // 现有颜色...

  // 新增颜色
  CUSTOM_BLUE: '#1e40af',
  CUSTOM_GREEN: '#059669',
} as const
```

## 工具和检查

项目包含自动化工具来检查硬编码颜色：

```bash
# 运行硬编码检查
node scripts/check-hardcode-issues.js
```

这将识别项目中的硬编码颜色值并提供修复建议。
