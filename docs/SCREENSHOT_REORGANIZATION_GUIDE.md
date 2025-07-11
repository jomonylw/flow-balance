# 📸 截图文件重新组织指南

## 🎯 目标

将现有的截图文件重新组织，使其能够根据当前主题（明亮/暗色）和语言自动选择合适的图片，避免主题不一致造成的视觉突兀。

## 📁 新的文件命名规范

### 格式

```
{功能名}-{主题}-{语言}.png
```

### 主题值

- `light` - 明亮主题
- `dark` - 暗色主题

### 语言值

- `zh` - 中文
- `en` - 英文

## 📋 完整的文件清单

### 1. 产品展示部分 (ProductShowcaseSection)

这些图片会根据当前页面主题和语言动态切换：

```
dashboard-overview-light-zh.png    # 仪表板概览 - 明亮主题 - 中文
dashboard-overview-light-en.png    # 仪表板概览 - 明亮主题 - 英文
dashboard-overview-dark-zh.png     # 仪表板概览 - 暗色主题 - 中文
dashboard-overview-dark-en.png     # 仪表板概览 - 暗色主题 - 英文

financial-reports-light-zh.png     # 财务报表 - 明亮主题 - 中文
financial-reports-light-en.png     # 财务报表 - 明亮主题 - 英文
financial-reports-dark-zh.png      # 财务报表 - 暗色主题 - 中文
financial-reports-dark-en.png      # 财务报表 - 暗色主题 - 英文

fire-calculator-light-zh.png       # FIRE计算器 - 明亮主题 - 中文
fire-calculator-light-en.png       # FIRE计算器 - 明亮主题 - 英文
fire-calculator-dark-zh.png        # FIRE计算器 - 暗色主题 - 中文
fire-calculator-dark-en.png        # FIRE计算器 - 暗色主题 - 英文

smart-paste-light-zh.png           # 智能粘贴 - 明亮主题 - 中文
smart-paste-light-en.png           # 智能粘贴 - 明亮主题 - 英文
smart-paste-dark-zh.png            # 智能粘贴 - 暗色主题 - 中文
smart-paste-dark-en.png            # 智能粘贴 - 暗色主题 - 英文
```

### 2. 主题对比部分 (ThemeShowcaseSection)

这些图片用于展示明亮vs暗色主题对比，也会根据当前页面主题调整：

```
theme-light-light-zh.png           # 明亮主题截图 - 在明亮页面显示 - 中文
theme-light-light-en.png           # 明亮主题截图 - 在明亮页面显示 - 英文
theme-light-dark-zh.png            # 明亮主题截图 - 在暗色页面显示 - 中文
theme-light-dark-en.png            # 明亮主题截图 - 在暗色页面显示 - 英文

theme-dark-light-zh.png            # 暗色主题截图 - 在明亮页面显示 - 中文
theme-dark-light-en.png            # 暗色主题截图 - 在明亮页面显示 - 英文
theme-dark-dark-zh.png             # 暗色主题截图 - 在暗色页面显示 - 中文
theme-dark-dark-en.png             # 暗色主题截图 - 在暗色页面显示 - 英文
```

### 3. 国际化对比部分 (主题感知)

这些图片用于展示中英文界面对比，也会根据当前页面主题调整：

```
interface-zh-light.png             # 中文界面截图 - 明亮主题
interface-zh-dark.png              # 中文界面截图 - 暗色主题
interface-en-light.png             # 英文界面截图 - 明亮主题
interface-en-dark.png              # 英文界面截图 - 暗色主题
```

## 🔄 从现有文件迁移

### 当前文件结构

```
dashboard-overview-en.png
dashboard-overview-zh.png
financial-reports-en.png
financial-reports-zh.png
fire-calculator-en.png
fire-calculator-zh.png
smart-paste-en.png
smart-paste-zh.png
theme-dark-en.png
theme-dark-zh.png
theme-light-en.png
theme-light-zh.png
interface-en.png
interface-zh.png
```

### 迁移步骤

#### 步骤 1: 确定现有图片的主题

首先确定您现有的图片是明亮主题还是暗色主题：

- 如果背景是白色/浅色 → 明亮主题
- 如果背景是深色 → 暗色主题

#### 步骤 2: 重命名现有文件

假设现有图片是明亮主题，重命名：

```bash
# 产品展示部分
dashboard-overview-zh.png → dashboard-overview-light-zh.png
dashboard-overview-en.png → dashboard-overview-light-en.png
financial-reports-zh.png → financial-reports-light-zh.png
financial-reports-en.png → financial-reports-light-en.png
fire-calculator-zh.png → fire-calculator-light-zh.png
fire-calculator-en.png → fire-calculator-light-en.png
smart-paste-zh.png → smart-paste-light-zh.png
smart-paste-en.png → smart-paste-light-en.png

# 主题对比部分
theme-light-zh.png → theme-light-light-zh.png
theme-light-en.png → theme-light-light-en.png
theme-dark-zh.png → theme-dark-light-zh.png
theme-dark-en.png → theme-dark-light-en.png

# 国际化对比部分
interface-zh.png → interface-zh-light.png
interface-en.png → interface-en-light.png
```

#### 步骤 3: 创建暗色主题版本

为每个功能创建暗色主题版本的截图：

```
dashboard-overview-dark-zh.png
dashboard-overview-dark-en.png
financial-reports-dark-zh.png
financial-reports-dark-en.png
fire-calculator-dark-zh.png
fire-calculator-dark-en.png
smart-paste-dark-zh.png
smart-paste-dark-en.png
theme-light-dark-zh.png
theme-light-dark-en.png
theme-dark-dark-zh.png
theme-dark-dark-en.png
interface-zh-dark.png
interface-en-dark.png
```

## 💡 最佳实践

### 图片质量要求

- **分辨率**: 至少 1200px 宽度，保持高清晰度
- **格式**: PNG 格式，支持透明度
- **压缩**: 适当压缩以平衡质量和加载速度

### 主题一致性

- **明亮主题图片**: 白色/浅色背景，深色文字
- **暗色主题图片**: 深色背景，浅色文字
- **UI元素**: 确保按钮、卡片等UI元素与主题保持一致

### 内容一致性

- 相同功能的不同主题版本应该显示相同的内容
- 只有颜色主题不同，布局和数据应该保持一致
- 确保文字清晰可读

## 🚀 验证效果

完成文件重新组织后：

1. 重启开发服务器: `pnpm dev`
2. 打开浏览器访问主页
3. 切换主题（明亮/暗色）观察图片是否正确切换
4. 切换语言（中文/英文）观察图片是否正确切换
5. 确认图片与当前页面主题保持一致

## 🔧 技术实现

代码已经修改为支持新的文件结构：

- `ProductShowcaseSection.tsx`: 根据 `resolvedTheme` 和 `language` 动态生成图片路径
- `ThemeShowcaseSection.tsx`: 特殊处理主题对比部分，确保始终显示正确的对比效果

图片路径生成逻辑：

```typescript
const getImagePath = (imageName: string) => {
  return `/images/screenshots/${imageName}-${resolvedTheme}-${language}.png`
}
```
