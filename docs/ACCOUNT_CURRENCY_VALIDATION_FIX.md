# 账户删除和货币转换验证修复

## 问题描述

用户反馈需要检查以下场景的验证逻辑：

1. **账户删除时** - 需要检查账户是否还有定期交易设置和贷款合约
2. **账户货币转换时** - 需要检查是否有定期交易设置和贷款合约，因为这些功能的货币需要和账户的货币一致

## 问题分析

### 账户删除验证
经过检查，账户删除API (`src/app/api/accounts/[accountId]/route.ts` DELETE方法) 已经正确实现了所有必要的验证：

- ✅ 检查交易记录
- ✅ 检查交易模板
- ✅ 检查定期交易设置
- ✅ 检查贷款合约（作为贷款账户）
- ✅ 检查贷款合约（作为还款账户）

### 账户货币转换验证
发现账户更新API在货币转换时只检查了交易记录，**缺少对定期交易设置和贷款合约的检查**。

## 修复方案

### 1. 增强账户查询
修改账户查询以包含相关的关联数据：

```typescript
// 修改前：只包含 transactions
include: {
  currency: true,
  transactions: {
    select: { id: true },
    take: 1,
  },
}

// 修改后：包含所有相关关联
include: {
  currency: true,
  transactions: {
    select: { id: true },
    take: 1,
  },
  recurringTransactions: {
    select: { id: true, description: true },
    take: 5,
  },
  loanContracts: {
    select: { id: true, contractName: true },
    take: 5,
  },
  paymentLoanContracts: {
    select: { id: true, contractName: true },
    take: 5,
  },
}
```

### 2. 添加定期交易设置验证
```typescript
// 检查账户是否有定期交易设置
const hasRecurringTransactions = existingAccount.recurringTransactions.length > 0

if (hasRecurringTransactions) {
  const recurringNames = existingAccount.recurringTransactions
    .map(rt => rt.description)
    .slice(0, 3)
    .join('、')
  const moreCount = existingAccount.recurringTransactions.length - 3
  const nameText = moreCount > 0 ? `${recurringNames}等${existingAccount.recurringTransactions.length}个` : recurringNames
  
  return errorResponse(
    `账户存在定期交易设置（${nameText}），无法更换货币。请先删除或转移相关定期交易设置。`,
    400
  )
}
```

### 3. 添加贷款合约验证（作为贷款账户）
```typescript
// 检查账户是否有贷款合约（作为贷款账户）
const hasLoanContracts = existingAccount.loanContracts.length > 0

if (hasLoanContracts) {
  const contractNames = existingAccount.loanContracts
    .map(lc => lc.contractName)
    .slice(0, 3)
    .join('、')
  const moreCount = existingAccount.loanContracts.length - 3
  const nameText = moreCount > 0 ? `${contractNames}等${existingAccount.loanContracts.length}个` : contractNames
  
  return errorResponse(
    `账户存在贷款合约（${nameText}），无法更换货币。请先删除或转移相关贷款合约。`,
    400
  )
}
```

### 4. 添加还款账户验证
```typescript
// 检查账户是否有贷款合约（作为还款账户）
const hasPaymentLoanContracts = existingAccount.paymentLoanContracts.length > 0

if (hasPaymentLoanContracts) {
  const contractNames = existingAccount.paymentLoanContracts
    .map(lc => lc.contractName)
    .slice(0, 3)
    .join('、')
  const moreCount = existingAccount.paymentLoanContracts.length - 3
  const nameText = moreCount > 0 ? `${contractNames}等${existingAccount.paymentLoanContracts.length}个` : contractNames
  
  return errorResponse(
    `账户被贷款合约用作还款账户（${nameText}），无法更换货币。请先删除或转移相关贷款合约。`,
    400
  )
}
```

## 修复文件

- `src/app/api/accounts/[accountId]/route.ts` - 账户更新API的PUT方法

## 测试验证

### 1. 数据库层面验证
创建了测试脚本 `scripts/test-account-currency-validation.ts` 来验证：
- ✅ 定期交易设置检查
- ✅ 贷款合约检查（作为贷款账户）
- ✅ 还款账户检查（作为还款账户）
- ✅ 账户删除验证

### 2. API层面验证
创建了测试脚本 `scripts/test-api-currency-validation.ts` 来验证：
- ✅ 贷款账户的货币转换验证逻辑
- ✅ 还款账户的货币转换验证逻辑
- ✅ 错误信息格式化正确

### 3. 测试结果
所有测试都通过，验证逻辑工作正常：

```
📊 测试结果汇总:
==================================================
1. 定期交易设置检查: ✅ 通过
2. 贷款合约检查: ✅ 通过
3. 贷款合约货币转换验证: ✅ 通过
4. 还款账户检查: ✅ 通过
5. 还款账户货币转换验证: ✅ 通过
6. 账户删除验证: ✅ 通过
==================================================
总计: 6 个测试
通过: 6 个
失败: 0 个
```

## 特性

### 1. 完整的验证覆盖
- 交易记录验证
- 定期交易设置验证
- 贷款合约验证（双向：贷款账户和还款账户）

### 2. 友好的错误信息
- 提供具体的合约名称或定期交易描述
- 当数量较多时显示"等X个"的格式
- 给出明确的解决建议

### 3. 性能优化
- 只获取必要的字段（id, description, contractName）
- 限制查询数量（take: 5）避免大量数据传输

## 数据一致性保证

通过这些验证，确保了：

1. **定期交易设置** - 货币与账户货币保持一致
2. **贷款合约** - 贷款账户和还款账户的货币保持一致
3. **数据完整性** - 避免因货币不匹配导致的数据错误

## 总结

✅ **问题已完全解决**
- 账户删除验证：原本就已完整实现
- 账户货币转换验证：已添加完整的定期交易设置和贷款合约检查

✅ **验证逻辑完整**
- 覆盖所有相关的关联数据
- 提供清晰的错误信息
- 性能优化良好

✅ **测试充分**
- 数据库层面验证
- API层面验证
- 真实数据测试
