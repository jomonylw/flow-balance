# 贷款合约国际化修复

## 问题描述

用户反馈贷款合约自动生成的交易记录中的描述和备注包含硬编码的中文文本，没有进行国际化处理。具体问题包括：

1. **本金还款记录**：描述中包含硬编码的 `"本金"` 文本
2. **利息支出记录**：描述中包含硬编码的 `"利息"` 文本
3. **余额更新记录**：描述中包含硬编码的 `"余额更新"` 文本

### 示例问题

```
房贷 - 第100期本金     ← "本金" 是硬编码中文
房贷 - 第100期利息     ← "利息" 是硬编码中文
房贷 - 第100期余额更新  ← "余额更新" 是硬编码中文
```

在英文环境下，这些文本仍然显示为中文，影响用户体验。

## 解决方案

### 1. 添加翻译键值

在翻译文件中添加了三个新的键值对：

**中文翻译 (`public/locales/zh/common.json`)**：

```json
{
  "loan.type.principal": "本金",
  "loan.type.interest": "利息",
  "loan.type.balance.update": "余额更新"
}
```

**英文翻译 (`public/locales/en/common.json`)**：

```json
{
  "loan.type.principal": "Principal",
  "loan.type.interest": "Interest",
  "loan.type.balance.update": "Balance Update"
}
```

### 2. 修改服务端代码

在 `src/lib/services/loan-contract.service.ts` 中，将硬编码的中文文本替换为国际化调用：

**修改前**：

```typescript
type: '本金'
type: '利息'
type: '余额更新'
```

**修改后**：

```typescript
type: t('loan.type.principal')
type: t('loan.type.interest')
type: t('loan.type.balance.update')
```

### 3. 具体修改位置

1. **第1221行** - 本金还款交易描述
2. **第1274行** - 利息支出交易描述
3. **第1325行** - 余额更新交易描述

## 修复效果

### 中文环境

```
房贷 - 第100期本金
房贷 - 第100期利息
房贷 - 第100期余额更新
```

### 英文环境

```
Mortgage - Period 100 Principal
Mortgage - Period 100 Interest
Mortgage - Period 100 Balance Update
```

## 技术实现

### 服务端国际化

使用了现有的服务端国际化工具：

```typescript
import { createServerTranslator } from '@/lib/utils/server-i18n'

// 创建服务端翻译函数
const t = createServerTranslator()

// 在交易生成时使用
description: t('loan.contract.template.default.description', {
  contractName: contractFields.contractName,
  period: loanPayment.period,
  type: t('loan.type.principal'), // 国际化的类型文本
})
```

### 嵌套翻译调用

由于需要在翻译参数中使用另一个翻译结果，采用了嵌套调用的方式：

```typescript
type: t('loan.type.principal') // 内层翻译
```

这确保了类型文本根据用户的语言设置正确显示。

## 测试验证

创建了测试脚本 `scripts/test-loan-i18n.js` 进行验证：

### 测试内容

1. **翻译键值检查**：验证所有必需的翻译键值都已添加到中英文翻译文件中
2. **源代码检查**：验证硬编码文本已移除，国际化调用已正确添加

### 测试结果

```
📊 测试结果汇总:
==================================================
翻译键值检查: ✅ 通过
源代码硬编码检查: ✅ 通过
==================================================
总计: 2 个测试
通过: 2 个
失败: 0 个

🎉 所有测试通过！贷款合约国际化修复成功。
```

## 影响范围

### 受影响的功能

1. **贷款合约自动生成交易**：所有新生成的贷款相关交易记录
2. **还款记录处理**：本金、利息、余额更新交易的描述文本
3. **多语言支持**：中文和英文环境下的正确显示

### 向后兼容性

- ✅ 现有的贷款合约数据不受影响
- ✅ 已生成的交易记录保持不变
- ✅ 只影响新生成的交易记录

## 注意事项

### 用户自定义模板

用户自定义的交易模板中仍然使用 `{期数}` 占位符，这是一个已知的限制：

```typescript
// 用户模板中的占位符仍然是中文
contractFields.transactionDescription.replace('{期数}', period.toString())
```

这个问题需要单独的改进任务来解决，涉及：

- 多语言占位符支持
- 现有模板数据迁移
- 向后兼容性考虑

### 服务端国际化

所有修改都在服务端进行，确保：

- 交易记录在数据库中以正确的语言存储
- 不依赖客户端的语言设置
- 服务端API响应包含正确的本地化文本

## 完成状态

✅ **硬编码文本移除** - 完全移除服务端硬编码中文  
✅ **翻译键值添加** - 完整的中英文翻译支持  
✅ **代码修改** - 正确的国际化调用实现  
✅ **测试验证** - 全部测试通过  
✅ **文档更新** - 完整的修复文档

贷款合约自动生成的交易记录现在完全支持国际化，用户可以根据语言设置看到相应语言的交易描述和备注。
