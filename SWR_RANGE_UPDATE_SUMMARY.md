# 安全提取率 (SWR) 范围修改总结

## 🎯 修改概述

已成功将安全提取率 (Safe Withdrawal Rate, SWR) 的滑动范围从原来的不同范围统一修改为 **1.0% - 10.0%**。

## 📝 修改详情

### 1. **设置页面滑块范围修改**
**文件**: `src/components/settings/PreferencesForm.tsx`

**修改前**:
```typescript
min={0}
max={20}
```

**修改后**:
```typescript
min={1.0}
max={10.0}
```

### 2. **FIRE页面控制面板滑块范围修改**
**文件**: `src/components/fire/CockpitControls.tsx`

**修改前**:
```typescript
// 滑块
min="2"
max="7"

// 输入框
min="2"
max="7"
```

**修改后**:
```typescript
// 滑块
min="1.0"
max="10.0"

// 输入框
min="1.0"
max="10.0"
```

### 3. **中文翻译文件更新**
**文件**: `public/locales/zh/preferences.json`

**修改内容**:
- `preferences.fire.swr.help`: "用于计算 FIRE 目标的年度安全提取率，范围 1.0%-10.0%"
- `preferences.fire.swr.range.note`: "您可以根据个人风险偏好调整这个比例：保守投资者可选择 2.5-3.5%，激进投资者可选择 4.5-6%，极端情况可达 10%。"

**文件**: `public/locales/zh/fire.json`

**修改内容**:
- `fire.cockpit.safe.withdrawal.rate.description`: "计划每年从资产中提取多少？(范围 1.0%-10.0%，经典理论为4%)"

### 4. **英文翻译文件更新**
**文件**: `public/locales/en/preferences.json`

**修改内容**:
- `preferences.fire.swr.help`: "Annual safe withdrawal rate used to calculate FIRE targets, range 1.0%-10.0%"
- `preferences.fire.swr.range.note`: "You can adjust this rate based on your personal risk preference: conservative investors may choose 2.5-3.5%, aggressive investors may choose 4.5-6%, extreme cases up to 10%."

**文件**: `public/locales/en/fire.json`

**修改内容**:
- `fire.cockpit.safe.withdrawal.rate.description`: "How much do you plan to withdraw annually from your assets? (Range 1.0%-10.0%, classic theory is 4%)"

## 🎨 用户体验改进

### 1. **统一的范围标准**
- 设置页面和FIRE页面现在使用相同的范围 (1.0% - 10.0%)
- 消除了不同页面间的不一致性

### 2. **更灵活的配置选项**
- **保守投资者**: 2.5% - 3.5%
- **经典理论**: 4.0% (默认值)
- **激进投资者**: 4.5% - 6.0%
- **极端情况**: 最高可达 10.0%

### 3. **清晰的说明文字**
- 在帮助文本中明确显示范围
- 提供不同风险偏好的建议值
- 保留经典4%理论的说明

## 🔧 技术细节

### 滑块配置
```typescript
// 统一配置
min: 1.0
max: 10.0
step: 0.1
formatValue: (value) => `${value.toFixed(1)}%`
```

### 输入框配置
```typescript
// 统一配置
type: "number"
min: "1.0"
max: "10.0"
step: "0.1"
```

## 📊 影响范围

### 直接影响的组件
1. **PreferencesForm.tsx** - 设置页面的FIRE配置
2. **CockpitControls.tsx** - FIRE页面的参数控制面板

### 影响的翻译文件
1. **zh/preferences.json** - 中文设置翻译
2. **en/preferences.json** - 英文设置翻译
3. **zh/fire.json** - 中文FIRE翻译
4. **en/fire.json** - 英文FIRE翻译

## ✅ 验证结果

### 构建测试
- ✅ TypeScript 编译通过
- ✅ Next.js 构建成功
- ✅ 无语法错误
- ✅ 无类型错误

### 功能验证
- ✅ 设置页面滑块范围正确 (1.0% - 10.0%)
- ✅ FIRE页面滑块范围正确 (1.0% - 10.0%)
- ✅ 输入框验证范围正确
- ✅ 翻译文本更新正确
- ✅ 中英文说明文字一致

## 🎯 用户操作指南

### 在设置页面
1. 进入 **设置 → 偏好设置**
2. 启用 **"显示 FIRE 面板"**
3. 调整 **"安全提取率 (SWR)"** 滑块 (1.0% - 10.0%)
4. 查看详细的范围说明和建议

### 在FIRE页面
1. 访问 **FIRE 征途** 页面
2. 在 **"未来掌控面板"** 中找到 **"安全提取率 (SWR)"**
3. 使用滑块或输入框调整值 (1.0% - 10.0%)
4. 实时查看对FIRE目标和日期的影响

## 📈 建议的使用场景

### 保守策略 (2.5% - 3.5%)
- 适合风险厌恶型投资者
- 追求更高的资金安全性
- 需要更多资产才能达到FIRE目标

### 经典策略 (4.0%)
- 基于Trinity Study的经典理论
- 平衡风险和收益
- 大多数FIRE计划者的选择

### 激进策略 (4.5% - 6.0%)
- 适合风险承受能力较强的投资者
- 可以更早达到FIRE目标
- 需要更积极的投资组合管理

### 极端策略 (6.0% - 10.0%)
- 适合特殊情况或短期目标
- 需要非常谨慎的风险管理
- 可能需要额外的收入来源

## 🔄 后续优化建议

1. **动态建议系统**: 根据用户的投资组合和风险偏好自动推荐SWR值
2. **历史回测**: 提供基于历史数据的成功率分析
3. **情景分析**: 允许用户测试不同SWR值下的多种情景
4. **风险警告**: 当SWR超过5%时显示风险提示

---

**修改完成时间**: 2024年12月
**构建状态**: ✅ 成功
**测试状态**: ✅ 通过
