# 统一重复检查服务设计文档

## 背景

在分析定期交易和贷款合约的重复检查逻辑时，发现两者存在相似的模式但实现不一致，容易导致检查逻辑混乱。为了解决这个问题，我们设计了统一的重复检查服务。

## 问题分析

### 原有问题

1. **重复代码**：定期交易和贷款合约都有各自的日期标准化方法
2. **逻辑不一致**：两个服务的检查逻辑略有差异，容易产生bug
3. **维护困难**：修改检查逻辑需要在多个地方同步更新
4. **测试复杂**：需要为每个服务单独编写测试

### 共同模式

1. **日期标准化**：都需要将日期标准化为 YYYY-MM-DD 格式
2. **重复检查**：都需要检查指定日期是否已存在记录
3. **并发安全**：都需要在事务内进行二次检查
4. **批量处理**：都需要过滤已存在的记录

## 解决方案

### 统一检查服务架构

```
DuplicateCheckService
├── 核心功能
│   ├── normalizeDate() - 日期标准化
│   ├── normalizeDateRange() - 日期范围标准化
│   ├── checkDuplicates() - 统一重复检查入口
│   └── checkConcurrency() - 统一并发检查入口
├── 定期交易专用
│   └── checkRecurringTransactionDuplicates()
├── 贷款合约专用
│   └── checkLoanPaymentDuplicates()
├── 并发检查
│   ├── checkRecurringTransactionConcurrency()
│   └── checkLoanPaymentConcurrency()
└── 工具方法
    ├── filterExistingDates() - 过滤已存在日期
    └── isDateExists() - 检查日期是否存在
```

## 核心特性

### 1. 统一的日期标准化

```typescript
static normalizeDate(date: Date): string {
  // 使用本地时间的年月日，避免UTC转换导致的日期偏移
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return year + '-' +
         String(month).padStart(2, '0') + '-' +
         String(day).padStart(2, '0')
}
```

### 2. 类型安全的检查配置

```typescript
interface DuplicateCheckConfig {
  type: CheckType
  userId: string
  dateRange: {
    startDate: Date
    endDate: Date
  }
  // 定期交易相关
  recurringTransactionId?: string
  // 贷款合约相关
  loanContractId?: string
  loanPaymentId?: string
}
```

### 3. 统一的检查结果

```typescript
interface DuplicateCheckResult {
  existingDates: Set<string>
  conflictingRecords: Array<{
    id: string
    date: Date
    status?: string
  }>
}
```

## 使用方式

### 定期交易检查

```typescript
const duplicateCheckResult = await DuplicateCheckService.checkDuplicates({
  type: CheckType.RECURRING_TRANSACTION,
  userId: recurring.userId,
  recurringTransactionId: recurring.id,
  dateRange: {
    startDate: currentDate,
    endDate: endDate,
  },
})

const existingDatesSet = duplicateCheckResult.existingDates
```

### 贷款合约检查

```typescript
const concurrencyCheck = await DuplicateCheckService.checkConcurrency(tx, {
  type: CheckType.LOAN_PAYMENT,
  userId: loanContract.userId,
  loanContractId: loanContract.id,
  loanPaymentId: loanPaymentId,
  dateRange: {
    startDate: loanPayment.paymentDate,
    endDate: loanPayment.paymentDate,
  },
})
```

## 实现细节

### 1. 日期范围标准化

```typescript
static normalizeDateRange(startDate: Date, endDate: Date): {
  normalizedStartDate: Date
  normalizedEndDate: Date
} {
  // 开始日期设置为当天的开始时间
  const normalizedStartDate = new Date(startDate)
  normalizedStartDate.setHours(0, 0, 0, 0)

  // 结束日期设置为当天的结束时间
  const normalizedEndDate = new Date(endDate)
  normalizedEndDate.setHours(23, 59, 59, 999)

  return { normalizedStartDate, normalizedEndDate }
}
```

### 2. 并发安全检查

- **定期交易**：检查事务内是否有新创建的同日期交易
- **贷款合约**：检查还款记录状态是否被其他进程修改

### 3. 类型区分处理

使用枚举类型区分不同的检查场景：

```typescript
export enum CheckType {
  RECURRING_TRANSACTION = 'RECURRING_TRANSACTION',
  LOAN_PAYMENT = 'LOAN_PAYMENT',
}
```

## 迁移过程

### 1. FutureDataGenerationService 迁移

- ✅ 移除重复的 `normalizeDate()` 方法
- ✅ 使用 `DuplicateCheckService.checkDuplicates()` 替代原有查询逻辑
- ✅ 使用 `DuplicateCheckService.checkConcurrency()` 进行并发检查
- ✅ 使用 `DuplicateCheckService.filterExistingDates()` 过滤记录

### 2. LoanContractService 迁移

- ✅ 移除重复的 `normalizeDate()` 方法
- ✅ 使用 `DuplicateCheckService.checkConcurrency()` 替代原有状态检查
- ✅ 保持原有的业务逻辑不变

## 测试覆盖

### 单元测试

- ✅ 日期标准化功能测试
- ✅ 日期范围标准化测试
- ✅ 日期存在检查测试
- ✅ 过滤功能测试
- ✅ 与原有方法的一致性测试

### 集成测试

- 定期交易重复检查测试
- 贷款合约并发检查测试
- 边界情况测试

## 优势

### 1. 代码复用

- 消除了重复的日期处理逻辑
- 统一了检查模式和错误处理

### 2. 一致性保证

- 所有检查都使用相同的日期标准化方法
- 统一的并发安全机制

### 3. 易于维护

- 修改检查逻辑只需要在一个地方进行
- 新增检查类型只需要扩展枚举和添加对应方法

### 4. 类型安全

- 使用 TypeScript 接口确保配置正确
- 编译时检查防止配置错误

### 5. 测试友好

- 统一的测试接口
- 易于模拟和验证

## 扩展性

### 新增检查类型

1. 在 `CheckType` 枚举中添加新类型
2. 实现对应的检查方法
3. 在统一入口中添加分支处理
4. 编写相应的测试

### 新增检查功能

- 可以轻松添加新的检查维度（如用户权限、业务规则等）
- 支持自定义检查逻辑
- 保持向后兼容性

## 实施状态

### ✅ 已完成

- 创建统一的 `DuplicateCheckService`
- 重构 `FutureDataGenerationService` 使用统一检查
- 重构 `LoanContractService` 使用统一检查
- 修复变量名冲突问题
- 完整的单元测试覆盖
- 编译验证通过

### 🔧 修复的问题

1. **变量名冲突**：修复了 `future-data-generation.service.ts` 中 `normalizedEndDate` 重复定义的问题
2. **PrismaClient 导入**：修复了统一检查服务中的 PrismaClient 导入问题
3. **类型安全**：确保所有接口和类型定义正确

## 总结

统一重复检查服务成功解决了原有的代码重复和逻辑不一致问题，提供了：

1. **统一的接口**：所有重复检查都通过同一个服务进行
2. **一致的行为**：确保所有检查使用相同的日期处理逻辑
3. **并发安全**：提供了可靠的并发检查机制
4. **易于扩展**：支持新增检查类型和功能
5. **完整测试**：确保功能的正确性和稳定性
6. **编译通过**：所有代码修改都通过了 TypeScript 编译检查

这个设计为系统的可维护性和可扩展性奠定了良好的基础，成功解决了检查逻辑混乱的问题。
