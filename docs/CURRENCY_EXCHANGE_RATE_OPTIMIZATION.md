# 货币及汇率优化方案

## 📋 优化概述

本次优化主要针对货币和汇率系统进行了两个重要改进：

1. **货币小数位数管理**：为每种货币配置合适的小数位数（0-10位）
2. **汇率自动生成**：基于用户输入的汇率自动生成反向汇率和传递汇率

## 🗄️ 数据库结构变更

### Currency 表增强

```sql
-- 添加小数位数字段
ALTER TABLE currencies ADD COLUMN decimalPlaces INTEGER NOT NULL DEFAULT 2;
```

**字段说明**：

- `decimalPlaces`: 货币小数位数（0-10），默认2位
- 常见设置：
  - 大部分货币：2位小数（USD, EUR, CNY等）
  - 日元、韩元：0位小数（JPY, KRW等）
  - 特殊货币：3位小数（BHD, KWD, OMR等）

### ExchangeRate 表增强

```sql
-- 添加汇率类型字段
ALTER TABLE exchange_rates ADD COLUMN type TEXT NOT NULL DEFAULT 'USER';

-- 添加源汇率ID字段
ALTER TABLE exchange_rates ADD COLUMN sourceRateId TEXT;
```

**字段说明**：

- `type`: 汇率类型
  - `USER`: 用户手动输入的汇率
  - `AUTO`: 系统自动生成的汇率
- `sourceRateId`: 源汇率ID，用于追踪自动生成汇率的来源

## 🔧 核心功能

### 1. 汇率自动生成服务

**文件位置**: `src/lib/services/exchange-rate-auto-generation.service.ts`

#### 反向汇率生成

- **功能**: 当用户输入 CNY → USD = 0.14 时，自动生成 USD → CNY = 7.14
- **算法**: 反向汇率 = 1 / 原汇率
- **标记**: 类型为 `AUTO`，包含源汇率引用

#### 传递汇率生成

- **功能**: 基于现有汇率通过中间货币计算新汇率
- **示例**: CNY → USD + JPY → USD 生成 CNY → JPY
- **算法**: CNY → JPY = (CNY → USD) × (USD → JPY)
- **智能路径**: 自动寻找最佳中间货币进行传递计算

### 2. 货币格式化服务

**文件位置**: `src/lib/services/currency-formatting.service.ts`

#### 精确格式化

- 基于货币的 `decimalPlaces` 配置进行格式化
- 支持缓存机制提高性能
- 提供批量格式化功能

#### 金额验证

- 验证输入金额的小数位数是否符合货币要求
- 自动修正超出精度的金额
- 提供默认金额生成功能

### 3. 前端组件增强

#### 汇率自动生成组件

**文件位置**: `src/components/features/settings/ExchangeRateAutoGeneration.tsx`

- 一键自动生成缺失汇率
- 显示生成结果统计
- 提供功能说明和注意事项

#### 汇率列表增强

- 显示汇率类型标签（用户/自动）
- 区分不同类型汇率的视觉样式
- 支持类型筛选和排序

## 🚀 使用方法

### 1. 运行数据库迁移

```bash
# 使用自定义迁移脚本
npx tsx scripts/run-currency-migration.ts

# 或使用 Prisma 迁移（需要先生成迁移文件）
npx prisma db push
```

### 2. 测试自动生成功能

```bash
# 运行测试脚本
npx tsx scripts/test-auto-exchange-rates.ts
```

### 3. 前端使用

#### 汇率管理页面

- 访问设置页面的汇率管理部分
- 使用"自动生成"按钮一键生成缺失汇率
- 查看汇率列表中的类型标签

#### API 调用

```typescript
// 自动生成汇率
const response = await fetch('/api/exchange-rates/auto-generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ effectiveDate: new Date().toISOString() }),
})

// 使用货币格式化服务
import { formatCurrencyAmount } from '@/lib/services/currency-formatting.service'

const formatted = await formatCurrencyAmount(1234.567, 'USD')
// 输出: $1,234.57

const formattedJPY = await formatCurrencyAmount(1234.567, 'JPY')
// 输出: ¥1,235 (自动处理0位小数)
```

## 📊 优化效果

### 1. 汇率覆盖率提升

- **反向汇率**: 每个用户输入汇率自动生成对应反向汇率
- **传递汇率**: 通过中间货币自动计算更多货币对汇率
- **覆盖率**: 从 N 个用户汇率扩展到最多 N×(N-1) 个汇率

### 2. 货币显示精度

- **精确显示**: 根据货币特性显示正确的小数位数
- **用户体验**: 避免不必要的小数位显示
- **国际化**: 符合各国货币的显示习惯

### 3. 系统智能化

- **自动维护**: 汇率数据自动保持一致性
- **减少工作量**: 用户只需输入必要的汇率
- **数据完整性**: 自动生成的汇率确保数据完整

## 🔍 注意事项

### 1. 数据一致性

- 自动生成的汇率会在源汇率变更时自动更新
- 删除用户汇率时会清理相关的自动生成汇率
- 系统确保不会覆盖已存在的汇率记录

### 2. 性能考虑

- 货币配置使用缓存机制，减少数据库查询
- 自动生成过程采用批量操作，提高效率
- 前端组件支持增量更新，避免全量刷新

### 3. 扩展性

- 汇率类型字段支持未来扩展更多类型
- 货币小数位数支持0-10位，满足各种需求
- 自动生成算法支持更复杂的传递路径计算

## 🎯 后续计划

1. **汇率历史管理**: 支持汇率历史版本和时间序列查询
2. **外部汇率源**: 集成第三方汇率API进行自动更新
3. **汇率预警**: 当汇率变化超过阈值时发送通知
4. **批量导入**: 支持从文件批量导入汇率数据
5. **汇率图表**: 可视化汇率变化趋势
