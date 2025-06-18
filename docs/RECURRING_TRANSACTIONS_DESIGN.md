# 🔄 周期性交易记录功能设计及实现文档

## 📋 功能概述

### 业务需求

设计一个周期性交易记录系统，支持用户一次性设置后自动生成重复交易，解决以下实际场景：

**收入类场景**：

- 工资收入：每月固定日期
- 投资分红：每季度固定日期
- 租金收入：每月固定日期

**支出类场景**：

- 房租支出：每月固定日期
- 保险费用：每年固定日期
- 水电费：每月固定日期
- 贷款还款：每月固定日期

**存量类场景**：

- 定期存款：每月/每季度转账
- 投资定投：每月固定金额
- 债务偿还：每月固定金额

### 核心价值

1. **减少重复操作**：一次设置，自动生成
2. **提高记录准确性**：避免遗忘或错误
3. **财务规划支持**：预测未来现金流
4. **灵活性**：支持多种周期模式

## 🏗️ 系统架构设计

### 1. 数据库设计

#### 1.1 周期性交易模板表 (recurring_transactions)

```sql
CREATE TABLE recurring_transactions (
  id VARCHAR(25) PRIMARY KEY,
  user_id VARCHAR(25) NOT NULL,
  account_id VARCHAR(25) NOT NULL,
  category_id VARCHAR(25) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  type ENUM('INCOME', 'EXPENSE', 'BALANCE') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description VARCHAR(200) NOT NULL,
  notes TEXT,

  -- 周期性设置
  frequency ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY') NOT NULL,
  interval_value INT DEFAULT 1, -- 间隔数（如每2周、每3个月）
  day_of_month INT, -- 每月的第几天（1-31）
  day_of_week INT, -- 每周的第几天（0-6，0为周日）
  month_of_year INT, -- 每年的第几月（1-12）

  -- 时间范围
  start_date DATE NOT NULL,
  end_date DATE, -- 可选，null表示无限期
  next_date DATE NOT NULL, -- 下次执行日期

  -- 状态控制
  is_active BOOLEAN DEFAULT TRUE,
  max_occurrences INT, -- 最大执行次数
  current_count INT DEFAULT 0, -- 已执行次数

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (currency_code) REFERENCES currencies(code)
);
```

#### 1.2 周期性交易标签关联表 (recurring_transaction_tags)

```sql
CREATE TABLE recurring_transaction_tags (
  id VARCHAR(25) PRIMARY KEY,
  recurring_transaction_id VARCHAR(25) NOT NULL,
  tag_id VARCHAR(25) NOT NULL,

  FOREIGN KEY (recurring_transaction_id) REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE KEY unique_recurring_tag (recurring_transaction_id, tag_id)
);
```

#### 1.3 交易表扩展 (transactions)

```sql
-- 在现有 transactions 表中添加字段
ALTER TABLE transactions ADD COLUMN recurring_template_id VARCHAR(25);
ALTER TABLE transactions ADD COLUMN is_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE transactions ADD FOREIGN KEY (recurring_template_id) REFERENCES recurring_transactions(id);
```

### 2. TypeScript 类型定义

#### 2.1 核心类型

```typescript
// 周期频率枚举
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

// 周期性交易模板
export interface RecurringTransaction {
  id: string
  userId: string
  accountId: string
  categoryId: string
  currencyCode: string
  type: TransactionType
  amount: number
  description: string
  notes?: string | null

  // 周期性设置
  frequency: RecurrenceFrequency
  interval: number
  dayOfMonth?: number | null
  dayOfWeek?: number | null
  monthOfYear?: number | null

  // 时间范围
  startDate: Date
  endDate?: Date | null
  nextDate: Date

  // 状态控制
  isActive: boolean
  maxOccurrences?: number | null
  currentCount: number

  createdAt: Date
  updatedAt: Date

  // 关联数据
  account: Account
  category: Category
  currency: Currency
  tags: RecurringTransactionTag[]
  transactions: Transaction[]
}

// 周期性交易表单数据
export interface RecurringTransactionFormData {
  accountId: string
  type: TransactionType
  amount: number
  description: string
  notes?: string

  // 周期性设置
  frequency: RecurrenceFrequency
  interval: number
  dayOfMonth?: number
  dayOfWeek?: number
  monthOfYear?: number

  // 时间范围
  startDate: string
  endDate?: string

  // 状态控制
  maxOccurrences?: number

  // 标签
  tagIds?: string[]
}
```

## 🎯 功能实现方案

### 1. 用户界面设计

#### 1.1 周期性交易创建表单

**表单字段设计**：

- **基础信息**：账户、金额、描述、备注
- **周期设置**：频率、间隔、具体日期
- **时间范围**：开始日期、结束日期（可选）
- **执行控制**：最大次数（可选）
- **标签选择**：支持多标签

**智能表单逻辑**：

```typescript
// 根据频率动态显示相关字段
const getFrequencyFields = (frequency: RecurrenceFrequency) => {
  switch (frequency) {
    case 'DAILY':
      return ['interval'] // 每N天
    case 'WEEKLY':
      return ['interval', 'dayOfWeek'] // 每N周的周几
    case 'MONTHLY':
      return ['interval', 'dayOfMonth'] // 每N月的第几天
    case 'QUARTERLY':
      return ['dayOfMonth'] // 每季度的第几天
    case 'YEARLY':
      return ['monthOfYear', 'dayOfMonth'] // 每年几月几日
  }
}
```

#### 1.2 周期性交易管理界面

**列表展示**：

- 模板基本信息（账户、金额、描述、频率）
- 下次执行时间
- 执行状态（活跃/暂停）
- 已执行次数/总次数
- 操作按钮（编辑、暂停/启用、删除、立即执行）

**筛选功能**：

- 按账户筛选
- 按状态筛选（活跃/暂停/已完成）
- 按频率筛选
- 按下次执行时间排序

### 2. 后端服务实现

#### 2.1 API 路由设计

```typescript
// /api/recurring-transactions
GET / api / recurring - transactions // 获取用户的周期性交易列表
POST / api / recurring - transactions // 创建新的周期性交易
GET / api / recurring - transactions / [id] // 获取特定周期性交易详情
PUT / api / recurring - transactions / [id] // 更新周期性交易
DELETE / api / recurring - transactions / [id] // 删除周期性交易
POST / api / recurring - transactions / [id] / execute // 立即执行一次
PUT / api / recurring - transactions / [id] / toggle // 切换启用/暂停状态
```

#### 2.2 核心服务类

```typescript
// 周期性交易服务
export class RecurringTransactionService {
  // 计算下次执行日期
  static calculateNextDate(
    currentDate: Date,
    frequency: RecurrenceFrequency,
    interval: number,
    dayOfMonth?: number,
    dayOfWeek?: number,
    monthOfYear?: number
  ): Date {
    // 实现各种频率的日期计算逻辑
  }

  // 生成交易记录
  static async generateTransaction(
    recurringTransaction: RecurringTransaction
  ): Promise<Transaction> {
    // 基于模板生成实际交易记录
  }

  // 检查并执行到期的周期性交易
  static async processScheduledTransactions(): Promise<void> {
    // 定时任务执行逻辑
  }
}
```

### 3. 自动执行机制

#### 3.1 定时任务设计

**执行策略**：

- 每日凌晨检查当天需要执行的周期性交易
- 支持补偿机制：如果系统停机，重启后补执行遗漏的交易
- 事务保证：确保交易生成和模板更新的原子性

**实现方案**：

```typescript
// 使用 node-cron 实现定时任务
import cron from 'node-cron'

// 每日凌晨1点执行
cron.schedule('0 1 * * *', async () => {
  await RecurringTransactionService.processScheduledTransactions()
})

// 处理逻辑
async function processScheduledTransactions() {
  const today = new Date()

  // 查找今天需要执行的周期性交易
  const dueTransactions = await prisma.recurringTransaction.findMany({
    where: {
      isActive: true,
      nextDate: {
        lte: today,
      },
      OR: [{ endDate: null }, { endDate: { gte: today } }],
      OR: [
        { maxOccurrences: null },
        { currentCount: { lt: prisma.recurringTransaction.fields.maxOccurrences } },
      ],
    },
    include: {
      account: true,
      category: true,
      currency: true,
      tags: { include: { tag: true } },
    },
  })

  // 逐个执行
  for (const recurring of dueTransactions) {
    await executeRecurringTransaction(recurring)
  }
}
```

#### 3.2 交易生成逻辑

```typescript
async function executeRecurringTransaction(recurring: RecurringTransaction) {
  const transaction = await prisma.$transaction(async tx => {
    // 1. 生成交易记录
    const newTransaction = await tx.transaction.create({
      data: {
        userId: recurring.userId,
        accountId: recurring.accountId,
        categoryId: recurring.categoryId,
        currencyCode: recurring.currencyCode,
        type: recurring.type,
        amount: recurring.amount,
        description: recurring.description,
        notes: recurring.notes,
        date: recurring.nextDate,
        recurringTemplateId: recurring.id,
        isGenerated: true,
        tags: {
          create: recurring.tags.map(rt => ({
            tagId: rt.tagId,
          })),
        },
      },
    })

    // 2. 更新周期性交易模板
    const nextDate = RecurringTransactionService.calculateNextDate(
      recurring.nextDate,
      recurring.frequency,
      recurring.interval,
      recurring.dayOfMonth,
      recurring.dayOfWeek,
      recurring.monthOfYear
    )

    const newCount = recurring.currentCount + 1
    const shouldDeactivate =
      (recurring.maxOccurrences && newCount >= recurring.maxOccurrences) ||
      (recurring.endDate && nextDate > recurring.endDate)

    await tx.recurringTransaction.update({
      where: { id: recurring.id },
      data: {
        nextDate: nextDate,
        currentCount: newCount,
        isActive: !shouldDeactivate,
      },
    })

    return newTransaction
  })

  // 3. 发布事件通知
  await publishTransactionCreate(recurring.accountId, recurring.categoryId, {
    transaction,
    amount: recurring.amount,
    currencyCode: recurring.currencyCode,
  })
}
```

## 🎨 用户体验设计

### 1. 创建流程优化

#### 1.1 智能默认值

- **频率预设**：根据账户类型推荐常用频率
  - 工资账户 → 月度
  - 房租账户 → 月度
  - 保险账户 → 年度
- **日期智能**：根据当前日期和频率计算合理的开始日期
- **金额记忆**：记住用户在该账户的常用金额

#### 1.2 表单验证增强

```typescript
const validateRecurringForm = (data: RecurringTransactionFormData) => {
  const errors: Record<string, string> = {}

  // 基础验证
  if (!data.amount || data.amount <= 0) {
    errors.amount = '金额必须大于0'
  }

  // 周期性验证
  if (data.frequency === 'MONTHLY' && (!data.dayOfMonth || data.dayOfMonth > 31)) {
    errors.dayOfMonth = '请选择有效的月份日期'
  }

  if (data.frequency === 'WEEKLY' && (data.dayOfWeek === undefined || data.dayOfWeek > 6)) {
    errors.dayOfWeek = '请选择有效的星期'
  }

  // 日期逻辑验证
  if (data.endDate && new Date(data.endDate) <= new Date(data.startDate)) {
    errors.endDate = '结束日期必须晚于开始日期'
  }

  return errors
}
```

### 2. 管理界面设计

#### 2.1 状态可视化

- **执行状态图标**：

  - 🟢 活跃中
  - ⏸️ 已暂停
  - ✅ 已完成
  - ⚠️ 异常（如账户被删除）

- **进度显示**：
  - 进度条显示执行次数
  - 下次执行倒计时
  - 历史执行记录链接

#### 2.2 批量操作

- 批量暂停/启用
- 批量删除
- 批量修改标签
- 导出周期性交易配置

### 3. 移动端适配

#### 3.1 简化创建流程

- 分步骤表单，减少单页字段数量
- 大按钮设计，便于触摸操作
- 智能键盘类型（数字键盘用于金额输入）

#### 3.2 快速操作

- 滑动操作：左滑暂停，右滑立即执行
- 长按显示快捷菜单
- 下拉刷新更新执行状态

## 🔧 技术实现细节

### 1. 日期计算算法

#### 1.1 复杂日期处理

```typescript
class DateCalculator {
  // 处理月末日期问题（如1月31日 + 1个月 = 2月28/29日）
  static addMonths(date: Date, months: number): Date {
    const result = new Date(date)
    const originalDay = result.getDate()

    result.setMonth(result.getMonth() + months)

    // 如果日期发生了变化（如31号变成了下月1号），调整到月末
    if (result.getDate() !== originalDay) {
      result.setDate(0) // 设置为上个月的最后一天
    }

    return result
  }

  // 计算下一个工作日
  static getNextBusinessDay(date: Date): Date {
    const result = new Date(date)
    const dayOfWeek = result.getDay()

    if (dayOfWeek === 0) {
      // 周日
      result.setDate(result.getDate() + 1)
    } else if (dayOfWeek === 6) {
      // 周六
      result.setDate(result.getDate() + 2)
    }

    return result
  }
}
```

#### 1.2 时区处理

- 使用用户本地时区进行日期计算
- 服务器端统一使用UTC时间存储
- 前端显示时转换为用户时区

### 2. 性能优化

#### 2.1 数据库优化

```sql
-- 为定时任务查询添加索引
CREATE INDEX idx_recurring_next_date ON recurring_transactions(next_date, is_active);
CREATE INDEX idx_recurring_user_active ON recurring_transactions(user_id, is_active);

-- 为交易查询添加索引
CREATE INDEX idx_transaction_recurring ON transactions(recurring_template_id, date);
```

#### 2.2 缓存策略

- 用户的周期性交易列表缓存（Redis）
- 下次执行时间预计算缓存
- 频繁查询的账户信息缓存

### 3. 错误处理与恢复

#### 3.1 异常情况处理

```typescript
const handleRecurringTransactionError = async (recurring: RecurringTransaction, error: Error) => {
  // 记录错误日志
  console.error(`周期性交易执行失败: ${recurring.id}`, error)

  // 根据错误类型决定处理策略
  if (error.message.includes('账户不存在')) {
    // 暂停该周期性交易
    await prisma.recurringTransaction.update({
      where: { id: recurring.id },
      data: { isActive: false },
    })

    // 通知用户
    await sendNotification(recurring.userId, {
      type: 'recurring_transaction_paused',
      message: `周期性交易"${recurring.description}"因账户异常已暂停`,
    })
  } else {
    // 其他错误，延迟重试
    await scheduleRetry(recurring.id, error)
  }
}
```

#### 3.2 数据一致性保证

- 使用数据库事务确保交易生成和模板更新的原子性
- 定期检查数据一致性，修复异常状态
- 提供手动修复工具

## 📊 监控与分析

### 1. 系统监控指标

#### 1.1 执行监控

- 每日执行成功率
- 执行延迟时间
- 失败原因分析
- 系统负载监控

#### 1.2 用户行为分析

- 周期性交易创建频率
- 最受欢迎的周期设置
- 用户暂停/删除原因
- 功能使用热力图

### 2. 报表功能

#### 2.1 用户报表

- 周期性交易执行历史
- 预期现金流预测
- 周期性交易统计分析
- 自动化节省时间统计

#### 2.2 管理报表

- 系统执行效率报告
- 用户使用情况分析
- 错误趋势分析
- 性能优化建议

## 🚀 实施计划

### 阶段一：核心功能开发（2-3周）

1. 数据库设计和迁移
2. 基础API开发
3. 核心服务类实现
4. 基础UI组件开发

### 阶段二：用户界面完善（1-2周）

1. 创建表单优化
2. 管理界面开发
3. 移动端适配
4. 用户体验优化

### 阶段三：自动化和监控（1周）

1. 定时任务实现
2. 错误处理机制
3. 监控系统集成
4. 性能优化

### 阶段四：测试和发布（1周）

1. 单元测试编写
2. 集成测试
3. 用户验收测试
4. 生产环境部署

## 📝 总结

周期性交易记录功能将显著提升Flow Balance的用户体验，通过自动化重复性财务操作，帮助用户：

1. **提高效率**：减少90%的重复录入工作
2. **增强准确性**：避免遗忘和输入错误
3. **改善规划**：提供未来现金流预测
4. **简化管理**：统一管理所有周期性财务活动

该功能设计充分考虑了Flow
Balance现有的存量/流量账户体系，与当前架构无缝集成，为用户提供专业、可靠的财务管理工具。

```

```
