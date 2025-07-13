# 数据导入性能优化报告

## 🎯 优化目标

针对数据导入服务中大量交易记录导入的效率问题，实施批量导入优化，显著提升导入性能。

## 📊 问题分析

### 原有问题：

1. **逐条插入交易记录**：使用 `for` 循环逐条调用 `tx.transaction.create()`
2. **逐条插入标签关联**：每个交易的标签关联也是逐条插入
3. **频繁数据库查询**：在循环中重复进行货币查找等操作
4. **批次大小不合理**：虽然有分批处理，但仍然是逐条插入
5. **缺乏性能监控**：无法了解导入操作的实际性能表现

### 性能影响：

- **大量数据库往返**：每条交易需要多次数据库操作
- **事务时间过长**：逐条插入导致事务执行时间过长
- **内存使用不当**：没有充分利用批量操作的优势
- **用户体验差**：大量数据导入时响应缓慢

## 🚀 优化方案

### 1. 批量插入优化

#### 交易记录批量导入：

```typescript
// 使用 createManyAndReturn 批量创建交易
const createdTransactions = await tx.transaction.createManyAndReturn({
  data: validTransactions,
})

// 批量创建标签关联
await tx.transactionTag.createMany({
  data: tagAssociations,
})
```

#### 定期交易批量导入：

```typescript
// 批量创建定期交易
const createdRecurringTransactions = await tx.recurringTransaction.createManyAndReturn({
  data: validRecurringTransactions.map(rt => rt.data),
})
```

#### 贷款合约批量导入：

```typescript
// 批量创建贷款合约
const createdLoanContracts = await tx.loanContract.createManyAndReturn({
  data: validLoanContracts.map(loan => loan.data),
})
```

#### 贷款还款记录批量导入：

```typescript
// 批量创建贷款还款记录
const createdLoanPayments = await tx.loanPayment.createManyAndReturn({
  data: validLoanPayments.map(payment => payment.data),
})
```

### 2. 数据预处理优化

#### 货币映射预处理：

```typescript
// 批量查找缺失的货币，避免循环中重复查询
const missingCurrencyIds = new Set<string>()
for (const transaction of transactions) {
  if (!currencyIdMapping[transaction.currencyId] && transaction.currencyCode) {
    missingCurrencyIds.add(transaction.currencyCode)
  }
}

const additionalCurrencies = await tx.currency.findMany({
  where: {
    code: { in: Array.from(missingCurrencyIds) },
    OR: [{ createdBy: null }, { createdBy: userId }],
  },
})
```

#### 数据验证前置：

```typescript
// 预处理批次数据，过滤无效交易
const validTransactions: any[] = []
const transactionTagsToCreate: Array<{ transactionIndex: number; tagIds: string[] }> = []

// 在批量插入前完成所有验证和数据准备
```

### 3. 专用连接管理

#### 导入专用连接：

```typescript
import { executeImportTransaction } from '@/lib/database/connection-manager'

// 使用统一连接管理器的导入事务，针对大量数据导入进行优化
await executeImportTransaction(async tx => {
  // 导入操作
})
```

#### 连接配置优化：

- 事务超时时间：5分钟
- 查询超时时间：5分钟
- 专用连接池配置

### 4. 性能监控

#### 性能日志：

```typescript
private static logPerformance(operation: string, startTime: number, count: number): void {
  const duration = Date.now() - startTime
  const rate = count > 0 ? Math.round(count / (duration / 1000)) : 0
  console.log(`📊 ${operation}: ${count} 条记录，耗时 ${duration}ms，速率 ${rate} 条/秒`)
}
```

### 5. 错误处理优化

#### 回退机制：

```typescript
try {
  // 尝试批量插入
  const createdTransactions = await tx.transaction.createManyAndReturn({
    data: validTransactions,
  })
} catch (error) {
  // 如果批量插入失败，回退到逐条插入以获得更详细的错误信息
  console.warn('批量插入失败，回退到逐条插入:', error)
  await this.importTransactionsFallback(/* 参数 */)
}
```

#### 重复数据处理：

```typescript
// 注意：Prisma 的 createMany() 不支持 skipDuplicates 参数
// 重复数据的处理通过以下方式实现：
// 1. 数据预处理时过滤重复项
// 2. 数据库唯一约束自动防止重复
// 3. 事务回滚确保数据一致性
await tx.transactionTag.createMany({
  data: tagAssociations, // 已经过滤的数据
})
```

## 📈 性能提升预期

### 批量大小优化：

- **原来**：100条/批次，逐条插入
- **现在**：500条/批次，批量插入

### 数据库操作减少：

- **交易插入**：从 N 次操作减少到 1 次批量操作
- **标签关联**：从 N×M 次操作减少到 1 次批量操作
- **货币查询**：从循环中的重复查询改为预处理批量查询

### 已优化的数据类型：

1. ✅ **交易记录（Transactions）** - 最重要的优化
2. ✅ **定期交易（Recurring Transactions）**
3. ✅ **贷款合约（Loan Contracts）**
4. ✅ **贷款还款记录（Loan Payments）**

### 暂未优化的数据类型（原因分析）：

- **分类（Categories）** - 涉及层级关系和重复检查逻辑
- **标签（Tags）** - 涉及重复检查和重命名逻辑
- **账户（Accounts）** - 涉及重复检查和重命名逻辑
- **交易模板（Transaction Templates）** - 涉及重复检查和重命名逻辑

### 预期性能提升：

- **小量数据（<1000条）**：提升 3-5 倍
- **中量数据（1000-10000条）**：提升 5-10 倍
- **大量数据（>10000条）**：提升 10-20 倍

## 🔧 实施细节

### 1. 批次大小调整

```typescript
const BATCH_SIZE = 500 // 从100增加到500
```

### 2. ID映射优化

```typescript
// 使用更高效的ID映射策略
for (let k = 0; k < createdTransactions.length; k++) {
  const originalTransaction = batch.find(
    t =>
      accountIdMapping[t.accountId] === validTransactions[k].accountId &&
      t.description === validTransactions[k].description &&
      new Date(t.date).getTime() === validTransactions[k].date.getTime() &&
      new Decimal(t.amount).equals(validTransactions[k].amount)
  )

  if (originalTransaction) {
    transactionIdMapping[originalTransaction.id] = createdTransactions[k].id
  }
}
```

### 3. 标签关联批量处理

```typescript
// 收集所有标签关联，一次性批量插入
const tagAssociations: Array<{ transactionId: string; tagId: string }> = []

for (const tagInfo of transactionTagsToCreate) {
  const createdTransaction = createdTransactions[tagInfo.transactionIndex]
  if (createdTransaction) {
    for (const tagId of tagInfo.tagIds) {
      tagAssociations.push({
        transactionId: createdTransaction.id,
        tagId,
      })
    }
  }
}

if (tagAssociations.length > 0) {
  await tx.transactionTag.createMany({
    data: tagAssociations,
  })
}
```

## 🎉 优化成果

### 主要改进：

1. ✅ **批量插入**：交易记录、定期交易、贷款合约、贷款还款记录都使用批量操作
2. ✅ **预处理优化**：货币查询等操作前置，避免循环中重复查询
3. ✅ **专用连接**：使用导入专用的数据库连接配置
4. ✅ **性能监控**：添加详细的性能日志和统计
5. ✅ **错误处理**：实现批量插入失败时的回退机制
6. ✅ **批次优化**：增大批次大小，提高吞吐量
7. ✅ **全面覆盖**：优化了所有主要的大批量数据导入场景

### 代码质量提升：

- 更好的错误处理和日志记录
- 清晰的性能监控和统计
- 健壮的回退机制
- 优化的内存使用

这些优化将显著提升数据导入的性能，特别是在处理大量交易记录时，用户将体验到明显的速度提升。
