# 智能表格货币格式化改进

## 📋 问题分析

### 🔍 原始问题

在智能表格的混合账户模式下，金额栏的货币格式化存在以下问题：

1. **固定货币格式化**：金额列使用固定的货币配置，无法根据选择的账户动态调整
2. **混合账户支持不足**：不同账户可能有不同的货币，但金额显示格式不会相应变化
3. **用户体验不一致**：用户选择不同货币的账户时，金额显示格式保持不变

### 🎯 改进目标

- ✅ 使用项目统一的格式化组件 `useUserCurrencyFormatter`
- ✅ 支持混合账户模式下的动态货币格式化
- ✅ 根据选择的账户自动调整金额的货币符号和小数位数
- ✅ 保持向后兼容性，不影响单一账户模式

## 🔧 技术实现

### 1. 新增货币格式化工具

**文件**: `src/lib/utils/smart-paste-currency.ts`

```typescript
/**
 * 获取金额列应该使用的货币信息
 * 优先级：行账户货币 > 列默认货币 > 系统默认
 */
export function getCurrencyFormatInfo(
  value: unknown,
  column: SmartPasteColumn,
  rowData: SmartPasteRowData,
  columns: SmartPasteColumn[]
): {
  currencyCode: string
  decimalPlaces: number
  shouldFormat: boolean
}
```

### 2. 智能货币格式化逻辑

**优先级顺序**：

1. **行账户货币**：如果当前行选择了账户，使用该账户的货币
2. **列默认货币**：如果没有选择账户，使用列配置的默认货币
3. **系统默认**：最后回退到系统默认货币（CNY）

### 3. 组件更新

#### SmartPasteCell 组件改进

```typescript
// 新增 columns 参数支持
interface SmartPasteCellProps {
  // ... 其他属性
  columns?: SmartPasteColumn[] // 所有列配置，用于混合账户模式
}

// 智能货币格式化
case 'currency':
  if (typeof value === 'number' && _rowData) {
    const formatInfo = getCurrencyFormatInfo(value, column, _rowData, columns)

    if (formatInfo.shouldFormat) {
      return formatCurrency(value, formatInfo.currencyCode, {
        precision: formatInfo.decimalPlaces,
        showSymbol: true,
      })
    }
  }
  return String(value)
```

## 🎨 用户体验改进

### 场景1：单一账户模式

```
选择账户：工资收入 (CNY)
金额显示：¥5,000.00
```

### 场景2：混合账户模式 - CNY账户

```
选择账户：银行存款 (CNY)
金额显示：¥10,000.00
```

### 场景3：混合账户模式 - USD账户

```
选择账户：美元储蓄 (USD)
金额显示：$1,500.00
```

### 场景4：混合账户模式 - 自定义小数位数

```
选择账户：比特币钱包 (BTC, 8位小数)
金额显示：₿0.12345678
```

## 🔄 工作流程

### 1. 账户选择变化时

1. 用户在账户列选择新账户
2. 系统获取该账户的货币信息
3. 自动更新同行金额列的显示格式
4. 保持数值不变，仅更新显示格式

### 2. 金额输入时

1. 用户输入金额数值
2. 系统检查当前行的账户选择
3. 根据账户货币自动格式化显示
4. 使用对应货币的小数位数设置

### 3. 数据验证

1. 验证金额格式是否符合所选账户的货币规则
2. 检查小数位数是否超出货币设置
3. 提供相应的验证提示信息

## 🛠️ 技术细节

### 类型安全

- 使用 TypeScript 严格类型检查
- 安全的类型断言处理账户数据
- 完整的错误处理和回退机制

### 性能优化

- 使用 `useCallback` 缓存格式化函数
- 避免不必要的重新计算
- 智能依赖项管理

### 向后兼容

- 保持现有 API 不变
- 新增参数为可选参数
- 渐进式增强功能

## 📊 测试场景

### 基础功能测试

- [x] 单一账户模式正常工作
- [x] 混合账户模式正确切换货币格式
- [x] 不同小数位数正确显示
- [x] 货币符号正确显示

### 边界情况测试

- [x] 账户未选择时的回退处理
- [x] 无效账户数据的处理
- [x] 货币信息缺失的处理
- [x] 数值类型验证

### 用户交互测试

- [x] 账户切换时金额格式实时更新
- [x] 复制粘贴功能正常工作
- [x] 键盘导航功能正常
- [x] 验证提示正确显示

## 🎯 总结

通过这次改进，智能表格的金额格式化功能得到了显著提升：

1. **统一性**：使用项目统一的 `useUserCurrencyFormatter` Hook
2. **智能性**：根据账户选择动态调整货币格式化
3. **灵活性**：支持不同货币和小数位数设置
4. **兼容性**：保持向后兼容，不影响现有功能

这个改进使得用户在处理多货币账户时能够获得更加直观和一致的体验。
