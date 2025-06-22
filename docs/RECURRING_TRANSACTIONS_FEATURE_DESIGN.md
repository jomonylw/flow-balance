# 🔄 定期交易功能设计方案

## 📋 功能概述

### 业务需求分析

基于用户需求，在现有的 FlowTransactionModal 和 FlowAccountDetailView 中增加定期交易功能：

1. **FlowTransactionModal 增强**：

   - 添加"定期交易"复选框
   - 点击后展开定期交易选项面板
   - 支持多种常见周期设置
   - 提交后批量生成交易记录

2. **FlowAccountDetailView 增强**：
   - 显示该账户的定期交易记录
   - 展示开始/结束时间、期数等信息
   - 提供删除定期交易功能

### 核心价值

- **减少重复操作**：一次设置，自动生成多笔交易
- **提高记录准确性**：避免遗忘定期收支
- **财务规划支持**：预测未来现金流
- **用户体验优化**：在现有界面中无缝集成

## 🔄 业务流程描述

### 1. 创建定期交易的完整流程

**用户操作流程**：

1. 用户在账户详情页点击"添加交易"按钮，打开FlowTransactionModal
2. 用户填写基本交易信息：金额、描述、日期、备注、标签等
3. 用户勾选"定期交易"复选框，系统展开定期交易选项面板
4. 用户设置定期交易参数：
   - 选择频率（每日/每周/每月/每季度/每年）
   - 设置间隔数（如每2周、每3个月）
   - 根据频率设置具体执行时间（如每月15日、每周三）
   - 选择结束条件（无限期/指定结束日期/执行指定次数）
5. 用户点击"保存"按钮提交表单

**系统处理流程**：

1. 前端验证表单数据的完整性和合法性
2. 将数据发送到后端API `/api/recurring-transactions`
3. 后端验证用户权限和数据有效性
4. 创建定期交易模板记录，保存到 `recurring_transactions` 表
5. 如果有标签，创建标签关联记录到 `recurring_transaction_tags` 表
6. **重要修正**：只创建定期交易模板，不立即生成交易记录
7. 设置 `nextDate` 为第一次应该执行的日期（通常是开始日期）
8. 设置 `currentCount` 为 0（尚未执行任何交易）
9. 返回成功响应，前端显示成功提示并刷新页面
10. **后续执行**：通过定时任务或手动触发来生成实际的交易记录

**业务规则**：

- 开始日期不能早于当前日期
- 结束日期必须晚于开始日期
- 执行次数必须大于0
- 每月日期设置不能超过28日（避免2月份问题）
- 系统会自动处理闰年和月份天数差异

### 2. 查看定期交易的流程

**用户操作流程**：

1. 用户进入账户详情页（FlowAccountDetailView）
2. 系统自动加载并显示该账户的所有定期交易记录
3. 用户可以查看每个定期交易的详细信息：
   - 交易描述和金额
   - 执行频率和间隔
   - 下次执行日期
   - 已执行次数和总次数
   - 当前状态（活跃/暂停/已完成）

**系统处理流程**：

1. 页面加载时调用API `/api/accounts/{accountId}/recurring-transactions`
2. 后端查询该账户下所有定期交易记录
3. 包含关联的账户、分类、货币、标签信息
4. 按创建时间倒序返回数据
5. 前端渲染定期交易列表，支持响应式布局

**显示逻辑**：

- 如果没有定期交易，显示空状态提示
- 已暂停的定期交易显示为灰色
- 已完成的定期交易显示完成状态
- 移动端和桌面端采用不同的布局方式

### 3. 修改定期交易状态的流程

**暂停/恢复操作流程**：

1. 用户在定期交易列表中点击"暂停"或"恢复"按钮
2. 系统调用API `/api/recurring-transactions/{id}/toggle`
3. 后端切换定期交易的 `isActive` 状态
4. 如果是暂停操作，停止生成未来的交易记录
5. 如果是恢复操作，重新开始按计划生成交易记录
6. 返回更新后的定期交易信息
7. 前端更新显示状态和按钮文本

**业务规则**：

- 暂停的定期交易不会生成新的交易记录
- 已生成的历史交易记录不受影响
- 恢复时会重新计算下次执行日期
- 已完成的定期交易不能恢复

### 4. 删除定期交易的流程

**用户操作流程**：

1. 用户在定期交易列表中点击"删除"按钮
2. 系统弹出确认对话框，说明删除的影响范围
3. 用户确认删除操作

**系统处理流程**：

1. 调用API `/api/recurring-transactions/{id}`，使用DELETE方法
2. 后端验证用户权限和定期交易存在性
3. 删除所有未来的相关交易记录（日期>=当前日期）
4. 删除定期交易的标签关联记录
5. 删除定期交易模板记录
6. 返回成功响应
7. 前端从列表中移除该项并显示成功提示

**业务规则**：

- 只删除未来的交易记录，保留历史记录
- 删除操作不可逆，需要用户确认
- 删除后相关的统计数据会自动更新

## 📊 数据处理逻辑

### 1. 定期交易执行逻辑重新设计

**核心设计原则**：

- 定期交易模板只存储规则，不预生成交易记录
- 通过定时任务或按需触发来生成实际交易
- `nextDate` 和 `currentCount` 字段在每次生成交易后更新

**执行模式选择**：

**模式一：定时任务执行（推荐）**

```javascript
// 每日凌晨执行的定时任务
async function processRecurringTransactions() {
  const today = new Date()

  // 查找所有需要执行的定期交易
  const dueRecurringTransactions = await prisma.recurringTransaction.findMany({
    where: {
      isActive: true,
      nextDate: { lte: today },
      OR: [{ endDate: null }, { endDate: { gte: today } }],
      OR: [{ maxOccurrences: null }, { currentCount: { lt: prisma.raw('maxOccurrences') } }],
    },
  })

  for (const recurring of dueRecurringTransactions) {
    // 生成交易记录
    await createTransactionFromRecurring(recurring)

    // 更新下次执行日期和计数
    await updateRecurringTransaction(recurring)
  }
}
```

**模式二：按需生成（备选）**

- 用户查看账户时检查并生成遗漏的交易
- 用户登录时批量处理所有账户
- 提供手动"同步"按钮

**日期计算逻辑**：

- **每日**：nextDate + 间隔天数
- **每周**：nextDate + 间隔周数
- **每月**：nextDate + 间隔月数，处理月末边界
- **每季度**：nextDate + 间隔季度数
- **每年**：nextDate + 间隔年数

**字段更新逻辑**：

```sql
-- 生成交易后更新定期交易记录
UPDATE recurring_transactions
SET
  nextDate = 计算的下次执行日期,
  currentCount = currentCount + 1,
  updatedAt = NOW()
WHERE id = ?;
```

## 🔄 nextDate 和 currentCount 更新机制详解

### 1. 字段含义和作用

**nextDate 字段**：

- **含义**：下一次应该执行（生成交易）的日期
- **初始值**：创建定期交易时，通常设置为开始日期
- **更新时机**：每次成功生成交易记录后
- **计算方式**：基于当前 nextDate + 频率间隔

**currentCount 字段**：

- **含义**：已经成功生成的交易记录数量
- **初始值**：创建时设置为 0
- **更新时机**：每次成功生成交易记录后 +1
- **作用**：用于判断是否达到最大执行次数限制

### 2. 具体更新流程

**定时任务执行流程**：

```javascript
async function executeRecurringTransaction(recurringId) {
  const recurring = await prisma.recurringTransaction.findUnique({
    where: { id: recurringId },
  })

  if (!recurring || !recurring.isActive) {
    return
  }

  // 检查是否已达到结束条件
  if (recurring.endDate && recurring.nextDate > recurring.endDate) {
    return
  }

  if (recurring.maxOccurrences && recurring.currentCount >= recurring.maxOccurrences) {
    return
  }

  // 使用事务确保数据一致性
  await prisma.$transaction(async tx => {
    // 1. 创建交易记录
    await tx.transaction.create({
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
        recurringTransactionId: recurring.id,
      },
    })

    // 2. 计算下次执行日期
    const nextDate = calculateNextDate(recurring.nextDate, recurring)

    // 3. 更新定期交易记录
    await tx.recurringTransaction.update({
      where: { id: recurring.id },
      data: {
        nextDate: nextDate,
        currentCount: recurring.currentCount + 1,
        updatedAt: new Date(),
      },
    })

    // 4. 处理标签关联
    if (recurring.tags && recurring.tags.length > 0) {
      const transaction = await tx.transaction.findFirst({
        where: {
          recurringTransactionId: recurring.id,
          date: recurring.nextDate,
        },
      })

      await tx.transactionTag.createMany({
        data: recurring.tags.map(tag => ({
          transactionId: transaction.id,
          tagId: tag.tagId,
        })),
      })
    }
  })
}
```

### 3. 日期计算算法

**calculateNextDate 函数实现**：

```javascript
function calculateNextDate(currentDate, recurring) {
  const { frequency, interval, dayOfMonth, dayOfWeek, monthOfYear } = recurring
  let nextDate = new Date(currentDate)

  switch (frequency) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + interval)
      break

    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + interval * 7)
      // 如果指定了星期几，调整到正确的星期
      if (dayOfWeek !== null) {
        const currentDayOfWeek = nextDate.getDay()
        const daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7
        nextDate.setDate(nextDate.getDate() + daysToAdd)
      }
      break

    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + interval)
      // 如果指定了每月几号，调整日期
      if (dayOfMonth !== null) {
        const lastDayOfMonth = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate()
        nextDate.setDate(Math.min(dayOfMonth, lastDayOfMonth))
      }
      break

    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + interval * 3)
      if (dayOfMonth !== null) {
        const lastDayOfMonth = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate()
        nextDate.setDate(Math.min(dayOfMonth, lastDayOfMonth))
      }
      break

    case 'YEARLY':
      nextDate.setFullYear(nextDate.getFullYear() + interval)
      if (monthOfYear !== null) {
        nextDate.setMonth(monthOfYear - 1)
      }
      if (dayOfMonth !== null) {
        const lastDayOfMonth = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + 1,
          0
        ).getDate()
        nextDate.setDate(Math.min(dayOfMonth, lastDayOfMonth))
      }
      break
  }

  return nextDate
}
```

### 4. 边界情况处理

**月末日期处理**：

```javascript
// 处理月末日期，如31号在2月不存在的情况
function adjustDateForMonth(date, targetDay) {
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return Math.min(targetDay, lastDayOfMonth)
}
```

**闰年处理**：

```javascript
// 处理2月29日在非闰年的情况
function adjustForLeapYear(date) {
  if (date.getMonth() === 1 && date.getDate() === 29) {
    const year = date.getFullYear()
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
    if (!isLeapYear) {
      date.setDate(28)
    }
  }
  return date
}
```

### 5. 状态检查和自动完成

**完成状态检查**：

```javascript
async function checkAndMarkCompleted(recurringId) {
  const recurring = await prisma.recurringTransaction.findUnique({
    where: { id: recurringId },
  })

  let shouldComplete = false

  // 检查是否达到结束日期
  if (recurring.endDate && recurring.nextDate > recurring.endDate) {
    shouldComplete = true
  }

  // 检查是否达到最大执行次数
  if (recurring.maxOccurrences && recurring.currentCount >= recurring.maxOccurrences) {
    shouldComplete = true
  }

  if (shouldComplete) {
    await prisma.recurringTransaction.update({
      where: { id: recurringId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })
  }
}
```

### 6. 错误处理和重试机制

**执行失败处理**：

```javascript
async function executeWithRetry(recurringId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await executeRecurringTransaction(recurringId)
      return // 成功执行，退出重试循环
    } catch (error) {
      console.error(`定期交易执行失败 (尝试 ${attempt}/${maxRetries}):`, error)

      if (attempt === maxRetries) {
        // 最后一次尝试失败，记录错误日志
        await logRecurringTransactionError(recurringId, error)

        // 可选：暂停有问题的定期交易
        await prisma.recurringTransaction.update({
          where: { id: recurringId },
          data: {
            isActive: false,
            notes: `自动暂停：执行失败 - ${error.message}`,
          },
        })
      } else {
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }
}
```

这样设计的好处：

1. **数据一致性**：每次只生成一笔交易，避免批量操作的复杂性
2. **可控性**：可以精确控制执行时机和频率
3. **可恢复性**：如果某次执行失败，不会影响整个序列
4. **可监控性**：可以清楚地跟踪每个定期交易的执行状态
5. **灵活性**：可以随时暂停、恢复或修改定期交易规则

### 2. 状态管理逻辑

**定期交易状态**：

- **活跃（Active）**：正常执行，会生成新的交易记录
- **暂停（Paused）**：用户手动暂停，不生成新记录
- **已完成（Completed）**：达到结束条件，自动停止

**状态转换规则**：

- 活跃 → 暂停：用户手动操作
- 暂停 → 活跃：用户手动操作
- 活跃 → 已完成：系统自动判断（达到结束日期或次数）
- 已完成状态不可逆转

### 3. 数据同步机制

**实时更新策略**：

- 创建定期交易后立即刷新交易列表
- 删除定期交易后立即更新相关统计
- 状态变更后实时更新显示

**数据一致性保证**：

- 使用数据库事务处理复杂操作
- 定期检查数据完整性
- 提供数据修复工具（管理员功能）

## 🔧 增删改查详细处理

### 1. 创建（Create）操作详解

**前端处理流程**：

1. **表单数据收集**：

   - 基础交易信息：金额、描述、日期、备注
   - 定期设置：频率、间隔、具体时间设置
   - 结束条件：无限期/结束日期/执行次数
   - 标签选择：支持多选标签

2. **数据验证**：

   - 必填字段检查：金额、描述、开始日期、频率
   - 数据格式验证：金额为正数、日期格式正确
   - 业务逻辑验证：结束日期晚于开始日期、执行次数大于0
   - 特殊规则验证：月份日期不超过28、星期选择有效

3. **提交处理**：
   - 构造完整的请求数据结构
   - 发送POST请求到 `/api/recurring-transactions`
   - 处理响应结果和错误信息
   - 成功后刷新页面数据

**后端处理流程**：

1. **请求验证**：

   - 用户身份验证：检查登录状态和权限
   - 参数完整性验证：必填字段存在性检查
   - 数据类型验证：金额、日期、枚举值格式检查
   - 业务规则验证：账户归属、分类匹配、货币一致性

2. **数据处理**：

   - 计算首次执行日期：通常等于开始日期
   - 创建定期交易记录：插入主表数据，设置 nextDate 和 currentCount=0
   - 处理标签关联：批量插入标签关系
   - **不立即生成交易**：等待定时任务或按需触发

3. **事务管理**：
   - 开启数据库事务
   - 按顺序执行所有数据库操作
   - 如果任何步骤失败，回滚所有操作
   - 成功后提交事务

**错误处理机制**：

- 参数错误：返回400状态码和具体错误信息
- 权限错误：返回401状态码
- 业务逻辑错误：返回422状态码和业务错误描述
- 系统错误：返回500状态码，记录详细日志

### 2. 查询（Read）操作详解

**单个账户查询流程**：

1. **请求处理**：

   - 接收账户ID参数
   - 验证用户对该账户的访问权限
   - 构造查询条件

2. **数据查询**：

   - 查询该账户下的所有定期交易
   - 包含关联数据：账户信息、分类信息、货币信息
   - 包含标签关联：定期交易的所有标签
   - 按创建时间倒序排列

3. **数据处理**：
   - 计算每个定期交易的状态（活跃/暂停/已完成）
   - 格式化金额和日期显示
   - 计算下次执行时间的友好显示
   - 统计已执行次数和剩余次数

**列表显示逻辑**：

1. **状态判断**：

   - 检查 `isActive` 字段确定是否暂停
   - 比较当前日期和 `endDate` 确定是否过期
   - 比较 `currentCount` 和 `maxOccurrences` 确定是否完成

2. **时间显示**：

   - 下次执行日期：格式化为用户友好的日期格式
   - 已完成状态：显示"已完成"而不是日期
   - 暂停状态：显示"已暂停"提示

3. **响应式适配**：
   - 移动端：垂直布局，重要信息优先显示
   - 桌面端：水平布局，信息更加详细
   - 操作按钮：根据屏幕大小调整样式

### 3. 更新（Update）操作详解

**状态切换处理**：

1. **暂停操作**：

   - 用户点击"暂停"按钮
   - 发送PATCH请求到 `/api/recurring-transactions/{id}/toggle`
   - 后端将 `isActive` 设置为 `false`
   - 停止生成未来的交易记录
   - 返回更新后的状态

2. **恢复操作**：
   - 用户点击"恢复"按钮
   - 发送相同的toggle请求
   - 后端将 `isActive` 设置为 `true`
   - 重新计算下次执行日期
   - 可能需要补充生成遗漏的交易记录

**数据更新逻辑**：

1. **权限验证**：

   - 确认用户拥有该定期交易的操作权限
   - 检查定期交易是否存在且未被删除

2. **状态更新**：

   - 切换 `isActive` 状态
   - 更新 `updatedAt` 时间戳
   - 如果是恢复操作，可能需要重新计算 `nextDate`

3. **关联处理**：
   - 暂停时不影响已生成的交易记录
   - 恢复时检查是否需要补充生成交易
   - 更新相关的统计信息

**业务规则**：

- 已完成的定期交易不能恢复
- 暂停操作立即生效，不影响当天已生成的交易
- 恢复操作会重新开始按计划生成交易

### 4. 删除（Delete）操作详解

**删除确认流程**：

1. **用户确认**：

   - 显示删除确认对话框
   - 明确说明删除的影响范围
   - 用户必须明确确认才能继续

2. **影响范围说明**：
   - 将删除定期交易模板
   - 将删除所有未来的相关交易记录
   - 历史交易记录将保留
   - 操作不可逆转

**后端删除处理**：

1. **权限和存在性验证**：

   - 验证用户身份和权限
   - 确认定期交易存在且属于当前用户
   - 检查是否有其他约束条件

2. **关联数据清理**：

   - 删除未来的交易记录（`date >= 当前日期`）
   - 删除这些交易记录的标签关联
   - 删除定期交易的标签关联
   - 最后删除定期交易主记录

3. **事务处理**：
   - 使用数据库事务确保数据一致性
   - 按正确的顺序删除关联数据
   - 如果任何步骤失败，回滚所有操作

**数据清理策略**：

1. **保留历史数据**：

   - 已发生的交易记录保持不变
   - 保留这些交易的标签和分类信息
   - 只是移除与定期交易的关联

2. **清理未来数据**：

   - 删除所有未来日期的相关交易
   - 清理这些交易的所有关联数据
   - 确保不留下孤立的数据记录

3. **统计更新**：
   - 删除后自动重新计算账户统计
   - 更新相关的图表和报表数据
   - 确保数据的一致性和准确性

**错误处理和回滚**：

- 如果删除过程中出现错误，完全回滚所有操作
- 记录详细的错误日志用于问题排查
- 向用户返回友好的错误信息
- 提供重试机制或联系支持的建议

## 🚨 异常处理和边界情况

### 1. 用户输入异常处理

**日期相关异常**：

1. **无效日期输入**：

   - 用户输入不存在的日期（如2月30日）
   - 系统自动调整为该月的最后一天
   - 显示友好提示："已自动调整为2月28日"

2. **过去日期输入**：

   - 开始日期早于当前日期
   - 系统警告但允许创建
   - 会立即生成从开始日期到当前的所有交易

3. **结束日期早于开始日期**：
   - 显示错误提示，阻止提交
   - 高亮显示错误字段
   - 提供修正建议

**金额相关异常**：

1. **负数或零金额**：

   - 显示错误提示："金额必须大于0"
   - 阻止表单提交
   - 焦点自动回到金额输入框

2. **超大金额**：
   - 设置合理的上限（如1亿）
   - 超出时显示警告确认
   - 记录异常操作日志

**频率设置异常**：

1. **月份日期超出范围**：

   - 用户设置每月31日，但某些月份没有31日
   - 系统自动调整为该月最后一天
   - 在界面上显示调整说明

2. **间隔设置异常**：
   - 间隔为0或负数时显示错误
   - 间隔过大（如每1000年）时显示警告
   - 提供常用间隔的快捷选择

### 2. 系统异常处理

**数据库异常**：

1. **连接失败**：

   - 显示"系统暂时不可用"提示
   - 提供重试按钮
   - 自动保存用户输入的表单数据

2. **事务失败**：

   - 完全回滚所有操作
   - 记录详细错误日志
   - 向用户显示通用错误信息

3. **数据冲突**：
   - 并发操作导致的数据冲突
   - 提示用户刷新页面重试
   - 保护数据完整性

**网络异常**：

1. **请求超时**：

   - 显示加载状态指示器
   - 超时后显示重试选项
   - 避免重复提交

2. **网络中断**：
   - 检测网络状态
   - 离线时禁用相关功能
   - 网络恢复后自动重试

### 3. 业务逻辑异常

**账户状态异常**：

1. **账户被删除**：

   - 定期交易关联的账户被删除
   - 自动暂停相关的定期交易
   - 通知用户处理方案

2. **货币变更**：
   - 账户货币发生变更
   - 检查定期交易的货币一致性
   - 提供货币转换选项

**权限异常**：

1. **用户权限变更**：

   - 用户失去账户访问权限
   - 立即停止相关定期交易
   - 清理用户数据

2. **账户共享冲突**：
   - 多用户共享账户的权限冲突
   - 按权限级别处理操作
   - 记录操作审计日志

## 👥 用户交互流程详解

### 1. 首次使用引导

**功能发现流程**：

1. **界面提示**：

   - 在FlowTransactionModal中显示"定期交易"选项
   - 提供简短的功能说明文字
   - 使用图标和颜色突出显示

2. **操作引导**：

   - 用户首次勾选时显示简要说明
   - 解释定期交易的作用和好处
   - 提供常见使用场景示例

3. **设置帮助**：
   - 在复杂选项旁边提供帮助图标
   - 点击显示详细说明和示例
   - 提供预设模板快速设置

**学习曲线优化**：

1. **渐进式展示**：

   - 基础选项默认显示
   - 高级选项折叠隐藏
   - 根据用户选择动态展开

2. **智能默认值**：
   - 根据交易类型提供合理默认值
   - 工资类交易默认每月
   - 日常支出默认每周

### 2. 日常使用流程

**快速创建流程**：

1. **模板化操作**：

   - 记住用户的常用设置
   - 提供快速设置按钮
   - 支持从历史记录复制设置

2. **批量操作**：
   - 支持同时创建多个定期交易
   - 提供批量编辑功能
   - 支持批量暂停/恢复

**监控和管理**：

1. **状态概览**：

   - 在账户页面显示定期交易摘要
   - 突出显示需要注意的状态
   - 提供快速操作入口

2. **执行提醒**：
   - 可选的执行通知功能
   - 异常情况的主动提醒
   - 定期交易即将结束的提醒

### 3. 错误恢复流程

**操作失败处理**：

1. **失败反馈**：

   - 清晰的错误信息显示
   - 具体的失败原因说明
   - 可行的解决方案建议

2. **数据恢复**：
   - 保留用户输入的表单数据
   - 提供重试机制
   - 支持离线数据暂存

**误操作处理**：

1. **操作确认**：

   - 重要操作需要二次确认
   - 清晰说明操作后果
   - 提供撤销选项（如适用）

2. **数据保护**：
   - 删除操作的安全确认
   - 重要数据的备份机制
   - 操作日志的完整记录

## 📈 性能优化策略

### 1. 数据加载优化

**分页和懒加载**：

1. **列表分页**：

   - 定期交易列表支持分页
   - 默认显示最近的记录
   - 支持按需加载更多

2. **关联数据优化**：
   - 使用数据库JOIN减少查询次数
   - 缓存常用的关联数据
   - 异步加载非关键信息

**缓存策略**：

1. **前端缓存**：

   - 缓存用户的定期交易列表
   - 缓存账户和分类信息
   - 智能的缓存失效机制

2. **后端缓存**：
   - 缓存复杂的计算结果
   - 缓存频繁查询的数据
   - 使用Redis等缓存系统

### 2. 批量操作优化

**交易生成优化**：

1. **批量插入**：

   - 使用数据库的批量插入功能
   - 减少数据库连接次数
   - 优化SQL语句性能

2. **异步处理**：
   - 大量交易生成使用后台任务
   - 显示进度指示器
   - 完成后通知用户

**数据同步优化**：

1. **增量更新**：

   - 只更新变化的数据
   - 使用时间戳判断数据新旧
   - 减少不必要的网络传输

2. **实时同步**：
   - 使用WebSocket等技术
   - 实时更新界面状态
   - 多设备数据同步

## 🏗️ 技术架构设计

### 1. 数据库设计

#### 1.1 定期交易模板表 (recurring_transactions)

```sql
CREATE TABLE "recurring_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- INCOME/EXPENSE
    "amount" DECIMAL NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,

    -- 周期性设置
    "frequency" TEXT NOT NULL, -- DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY
    "interval" INTEGER NOT NULL DEFAULT 1, -- 间隔数，如每2周
    "dayOfMonth" INTEGER, -- 每月的第几天（1-31）
    "dayOfWeek" INTEGER, -- 每周的第几天（0-6，0为周日）
    "monthOfYear" INTEGER, -- 每年的第几月（1-12）

    -- 时间范围
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME, -- 可选，null表示无限期
    "nextDate" DATETIME NOT NULL, -- 下次执行日期

    -- 状态控制
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxOccurrences" INTEGER, -- 最大执行次数，null表示无限制
    "currentCount" INTEGER NOT NULL DEFAULT 0, -- 已执行次数

    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    -- 外键约束
    CONSTRAINT "recurring_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "recurring_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE,
    CONSTRAINT "recurring_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT,
    CONSTRAINT "recurring_transactions_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies" ("code") ON DELETE RESTRICT
);
```

#### 1.2 定期交易标签关联表

```sql
CREATE TABLE "recurring_transaction_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recurringTransactionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "recurring_transaction_tags_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "recurring_transactions" ("id") ON DELETE CASCADE,
    CONSTRAINT "recurring_transaction_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE
);
```

#### 1.3 交易表增强

在现有 transactions 表中添加字段：

```sql
ALTER TABLE "transactions" ADD COLUMN "recurringTransactionId" TEXT;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurringTransactionId_fkey"
    FOREIGN KEY ("recurringTransactionId") REFERENCES "recurring_transactions" ("id") ON DELETE SET NULL;
```

### 2. TypeScript 类型定义

#### 2.1 核心类型

```typescript
// 周期频率枚举
export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

// 定期交易接口
export interface RecurringTransaction {
  id: string
  userId: string
  accountId: string
  categoryId: string
  currencyCode: string
  type: 'INCOME' | 'EXPENSE'
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

// 定期交易表单数据
export interface RecurringTransactionFormData {
  frequency: RecurrenceFrequency
  interval: number
  dayOfMonth?: number
  dayOfWeek?: number
  monthOfYear?: number
  startDate: string
  endDate?: string
  maxOccurrences?: number
  tagIds: string[]
}
```

### 3. UI 组件设计

#### 3.1 FlowTransactionModal 增强

在现有表单中添加定期交易选项：

```typescript
// 新增状态
const [isRecurring, setIsRecurring] = useState(false)
const [recurringData, setRecurringData] = useState<RecurringTransactionFormData>({
  frequency: RecurrenceFrequency.MONTHLY,
  interval: 1,
  startDate: new Date().toISOString().split('T')[0],
  tagIds: [],
})
```

#### 3.2 定期交易选项面板组件

```typescript
interface RecurringOptionsProps {
  data: RecurringTransactionFormData
  onChange: (data: RecurringTransactionFormData) => void
  errors?: Record<string, string>
}

export function RecurringOptions({ data, onChange, errors }: RecurringOptionsProps) {
  // 周期选择、间隔设置、日期选择等UI逻辑
}
```

#### 3.3 FlowAccountDetailView 增强

添加定期交易管理区域：

```typescript
// 新增状态
const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
const [isRecurringLoading, setIsRecurringLoading] = useState(true)

// 新增组件
function RecurringTransactionsList({
  recurringTransactions,
  onDelete,
  onToggleActive,
}: RecurringTransactionsListProps) {
  // 定期交易列表展示逻辑
}
```

## 🔧 实现细节

### 1. 前端实现

#### 1.1 FlowTransactionModal 修改

1. **添加定期交易复选框**：

   - 位置：在标签选择区域下方
   - 样式：与现有UI风格保持一致
   - 交互：点击展开/收起定期交易选项

2. **定期交易选项面板**：

   - 周期选择：下拉菜单（每日/每周/每月/每季度/每年）
   - 间隔设置：数字输入框
   - 具体日期设置：根据周期类型动态显示
   - 结束条件：日期选择或次数限制

3. **表单验证增强**：
   - 定期交易数据验证
   - 日期逻辑验证
   - 次数限制验证

#### 1.2 FlowAccountDetailView 修改

1. **新增定期交易区域**：

   - 位置：在账户摘要卡片和趋势图表之间
   - 标题：定期交易记录
   - 内容：定期交易列表

2. **定期交易列表组件**：
   - 显示：描述、金额、周期、下次执行时间、状态
   - 操作：暂停/恢复、删除
   - 样式：卡片式布局，支持响应式

### 2. 后端实现

#### 2.1 API 端点设计

```typescript
// 创建定期交易
POST /api/recurring-transactions
{
  accountId: string
  categoryId: string
  currencyCode: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  notes?: string
  recurringData: RecurringTransactionFormData
}

// 获取账户的定期交易
GET /api/accounts/{accountId}/recurring-transactions

// 删除定期交易
DELETE /api/recurring-transactions/{id}

// 暂停/恢复定期交易
PATCH /api/recurring-transactions/{id}/toggle
```

#### 2.2 服务层实现

```typescript
class RecurringTransactionService {
  // 创建定期交易并生成初始交易记录
  async createRecurringTransaction(
    data: CreateRecurringTransactionData
  ): Promise<RecurringTransaction>

  // 生成指定期间的交易记录
  async generateTransactions(recurringId: string, endDate: Date): Promise<Transaction[]>

  // 计算下次执行日期
  calculateNextDate(recurring: RecurringTransaction): Date

  // 删除定期交易及相关的未来交易
  async deleteRecurringTransaction(id: string): Promise<void>
}
```

### 3. 数据库迁移

#### 3.1 Prisma Schema 更新

```prisma
model RecurringTransaction {
  id           String   @id @default(cuid())
  userId       String
  accountId    String
  categoryId   String
  currencyCode String
  type         TransactionType
  amount       Decimal
  description  String
  notes        String?

  frequency      String  // RecurrenceFrequency
  interval       Int     @default(1)
  dayOfMonth     Int?
  dayOfWeek      Int?
  monthOfYear    Int?

  startDate      DateTime
  endDate        DateTime?
  nextDate       DateTime

  isActive       Boolean @default(true)
  maxOccurrences Int?
  currentCount   Int     @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user         User                      @relation(fields: [userId], references: [id], onDelete: Cascade)
  account      Account                   @relation(fields: [accountId], references: [id])
  category     Category                  @relation(fields: [categoryId], references: [id])
  currency     Currency                  @relation(fields: [currencyCode], references: [code])
  tags         RecurringTransactionTag[]
  transactions Transaction[]

  @@map("recurring_transactions")
}
```

## 📱 用户界面设计

### 1. FlowTransactionModal 界面

```
┌─────────────────────────────────────┐
│ 添加收入交易 - 工资账户              │
├─────────────────────────────────────┤
│ [金额输入] [日期选择]               │
│ [描述输入]                          │
│ [备注输入]                          │
│ [标签选择]                          │
│                                     │
│ ☐ 定期交易                         │
│ ┌─ 定期交易选项 ─────────────────┐  │
│ │ 频率: [每月 ▼]  间隔: [1] 月   │  │
│ │ 执行日期: 每月 [15] 日         │  │
│ │ 开始日期: [2024-01-15]        │  │
│ │ 结束条件: ○ 无限期 ○ 指定日期  │  │
│ │          ○ 执行次数 [12] 次   │  │
│ └───────────────────────────────┘  │
│                                     │
│ [取消] [保存]                      │
└─────────────────────────────────────┘
```

### 2. FlowAccountDetailView 界面

```
┌─────────────────────────────────────┐
│ 工资账户                            │
├─────────────────────────────────────┤
│ [账户摘要卡片]                      │
│                                     │
│ 📊 趋势图表                        │
│                                     │
│ 🔄 定期交易记录                    │
│ ┌─────────────────────────────────┐ │
│ │ 💰 月薪收入                    │ │
│ │ ¥8,000.00 • 每月15日           │ │
│ │ 下次: 2024-02-15 • 已执行: 3次 │ │
│ │ [暂停] [删除]                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📋 交易记录                        │
│ [交易列表]                          │
└─────────────────────────────────────┘
```

## 🚀 实施计划

### 阶段一：数据库和类型定义（1-2天）

1. 创建 Prisma 迁移文件
2. 更新 TypeScript 类型定义
3. 更新数据库 schema

### 阶段二：后端 API 开发（2-3天）

1. 实现定期交易 CRUD API
2. 实现交易生成服务
3. 添加数据验证和错误处理

### 阶段三：前端组件开发（3-4天）

1. 修改 FlowTransactionModal
2. 创建定期交易选项组件
3. 修改 FlowAccountDetailView
4. 创建定期交易列表组件

### 阶段四：集成测试和优化（1-2天）

1. 端到端功能测试
2. UI/UX 优化
3. 性能优化
4. 错误处理完善

## 📝 注意事项

### 1. 用户体验考虑

- 定期交易选项默认收起，避免界面复杂
- 提供常用周期的快捷选择
- 清晰的日期和次数显示
- 友好的错误提示

### 2. 数据一致性

- 删除定期交易时处理关联的未来交易
- 修改定期交易时更新相关交易记录
- 确保日期计算的准确性

### 3. 性能优化

- 批量生成交易记录
- 合理的分页和缓存策略
- 避免频繁的数据库查询

### 4. 扩展性考虑

- 预留自定义周期的扩展空间
- 支持复杂的日期规则
- 考虑时区处理

这个设计方案在现有架构基础上，以最小的侵入性实现定期交易功能，既满足用户需求，又保持了代码的整洁性和可维护性。

## 💻 详细代码实现

### 1. 数据库迁移文件

#### 1.1 创建定期交易表

```sql
-- prisma/migrations/xxx_add_recurring_transactions/migration.sql
-- CreateTable
CREATE TABLE "recurring_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "frequency" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "monthOfYear" INTEGER,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "nextDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxOccurrences" INTEGER,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recurring_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recurring_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recurring_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "recurring_transactions_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recurring_transaction_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recurringTransactionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "recurring_transaction_tags_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "recurring_transactions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recurring_transaction_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "recurring_transaction_tags_recurringTransactionId_tagId_key" ON "recurring_transaction_tags"("recurringTransactionId", "tagId");

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "recurringTransactionId" TEXT;

-- CreateIndex
CREATE INDEX "transactions_recurringTransactionId_idx" ON "transactions"("recurringTransactionId");
```

### 2. TypeScript 类型定义文件

#### 2.1 核心类型 (src/types/core/recurring.ts)

```typescript
export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export interface RecurringTransaction {
  id: string
  userId: string
  accountId: string
  categoryId: string
  currencyCode: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  notes?: string | null

  frequency: RecurrenceFrequency
  interval: number
  dayOfMonth?: number | null
  dayOfWeek?: number | null
  monthOfYear?: number | null

  startDate: Date
  endDate?: Date | null
  nextDate: Date

  isActive: boolean
  maxOccurrences?: number | null
  currentCount: number

  createdAt: Date
  updatedAt: Date

  account?: Account
  category?: Category
  currency?: Currency
  tags?: RecurringTransactionTag[]
  transactions?: Transaction[]
}

export interface RecurringTransactionTag {
  id: string
  recurringTransactionId: string
  tagId: string
  tag: Tag
}

export interface RecurringTransactionFormData {
  frequency: RecurrenceFrequency
  interval: number
  dayOfMonth?: number
  dayOfWeek?: number
  monthOfYear?: number
  startDate: string
  endDate?: string
  maxOccurrences?: number
  tagIds: string[]
}

export interface CreateRecurringTransactionData {
  accountId: string
  categoryId: string
  currencyCode: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  notes?: string
  recurringData: RecurringTransactionFormData
}
```

### 3. 后端服务实现

#### 3.1 定期交易服务 (src/lib/services/recurring-transaction.service.ts)

```typescript
import { prisma } from '@/lib/prisma'
import {
  RecurrenceFrequency,
  RecurringTransaction,
  CreateRecurringTransactionData,
} from '@/types/core/recurring'
import { addDays, addWeeks, addMonths, addQuarters, addYears, isBefore, isAfter } from 'date-fns'

export class RecurringTransactionService {
  /**
   * 创建定期交易
   */
  static async createRecurringTransaction(
    userId: string,
    data: CreateRecurringTransactionData
  ): Promise<RecurringTransaction> {
    const { recurringData, ...transactionData } = data

    // 设置首次执行日期（通常等于开始日期）
    const startDate = new Date(recurringData.startDate)
    const nextDate = new Date(startDate) // 首次执行日期就是开始日期

    // 创建定期交易记录（只创建模板，不生成交易）
    const recurringTransaction = await prisma.recurringTransaction.create({
      data: {
        userId,
        ...transactionData,
        frequency: recurringData.frequency,
        interval: recurringData.interval,
        dayOfMonth: recurringData.dayOfMonth,
        dayOfWeek: recurringData.dayOfWeek,
        monthOfYear: recurringData.monthOfYear,
        startDate,
        endDate: recurringData.endDate ? new Date(recurringData.endDate) : null,
        nextDate, // 设置为开始日期，等待定时任务执行
        maxOccurrences: recurringData.maxOccurrences,
        currentCount: 0, // 初始执行次数为0
        tags: {
          create: recurringData.tagIds.map(tagId => ({
            tagId,
          })),
        },
      },
      include: {
        account: true,
        category: true,
        currency: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    // 不立即生成交易记录，等待定时任务或按需触发
    return recurringTransaction
  }

  /**
   * 计算下次执行日期
   */
  static calculateNextDate(
    currentDate: Date,
    recurringData: Partial<RecurringTransactionFormData>
  ): Date {
    const { frequency, interval = 1, dayOfMonth, dayOfWeek, monthOfYear } = recurringData

    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        return addDays(currentDate, interval)

      case RecurrenceFrequency.WEEKLY:
        return addWeeks(currentDate, interval)

      case RecurrenceFrequency.MONTHLY:
        let nextMonth = addMonths(currentDate, interval)
        if (dayOfMonth) {
          nextMonth.setDate(Math.min(dayOfMonth, this.getDaysInMonth(nextMonth)))
        }
        return nextMonth

      case RecurrenceFrequency.QUARTERLY:
        return addQuarters(currentDate, interval)

      case RecurrenceFrequency.YEARLY:
        let nextYear = addYears(currentDate, interval)
        if (monthOfYear) {
          nextYear.setMonth(monthOfYear - 1)
          if (dayOfMonth) {
            nextYear.setDate(Math.min(dayOfMonth, this.getDaysInMonth(nextYear)))
          }
        }
        return nextYear

      default:
        throw new Error(`Unsupported frequency: ${frequency}`)
    }
  }

  /**
   * 执行单次定期交易（由定时任务调用）
   */
  static async executeRecurringTransaction(recurringTransactionId: string): Promise<boolean> {
    const recurringTransaction = await prisma.recurringTransaction.findUnique({
      where: { id: recurringTransactionId },
      include: { tags: true },
    })

    if (!recurringTransaction || !recurringTransaction.isActive) {
      return false
    }

    const today = new Date()

    // 检查是否到了执行时间
    if (recurringTransaction.nextDate > today) {
      return false
    }

    // 检查是否已达到结束条件
    if (
      recurringTransaction.endDate &&
      recurringTransaction.nextDate > recurringTransaction.endDate
    ) {
      // 自动标记为完成
      await prisma.recurringTransaction.update({
        where: { id: recurringTransactionId },
        data: { isActive: false },
      })
      return false
    }

    if (
      recurringTransaction.maxOccurrences &&
      recurringTransaction.currentCount >= recurringTransaction.maxOccurrences
    ) {
      // 自动标记为完成
      await prisma.recurringTransaction.update({
        where: { id: recurringTransactionId },
        data: { isActive: false },
      })
      return false
    }

    // 使用事务确保数据一致性
    await prisma.$transaction(async tx => {
      // 1. 创建交易记录
      const transaction = await tx.transaction.create({
        data: {
          userId: recurringTransaction.userId,
          accountId: recurringTransaction.accountId,
          categoryId: recurringTransaction.categoryId,
          currencyCode: recurringTransaction.currencyCode,
          type: recurringTransaction.type,
          amount: recurringTransaction.amount,
          description: recurringTransaction.description,
          notes: recurringTransaction.notes,
          date: recurringTransaction.nextDate,
          recurringTransactionId: recurringTransaction.id,
        },
      })

      // 2. 添加标签关联
      if (recurringTransaction.tags.length > 0) {
        await tx.transactionTag.createMany({
          data: recurringTransaction.tags.map(tag => ({
            transactionId: transaction.id,
            tagId: tag.tagId,
          })),
        })
      }

      // 3. 计算下次执行日期
      const nextDate = this.calculateNextDate(recurringTransaction.nextDate, recurringTransaction)

      // 4. 更新定期交易记录
      await tx.recurringTransaction.update({
        where: { id: recurringTransactionId },
        data: {
          nextDate: nextDate,
          currentCount: recurringTransaction.currentCount + 1,
          updatedAt: new Date(),
        },
      })
    })

    return true
  }

  /**
   * 批量执行所有到期的定期交易（定时任务入口）
   */
  static async processAllDueRecurringTransactions(): Promise<{
    processed: number
    failed: number
    errors: string[]
  }> {
    const today = new Date()
    const errors: string[] = []
    let processed = 0
    let failed = 0

    // 查找所有需要执行的定期交易
    const dueRecurringTransactions = await prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        nextDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
    })

    for (const recurring of dueRecurringTransactions) {
      try {
        // 检查执行次数限制
        if (recurring.maxOccurrences && recurring.currentCount >= recurring.maxOccurrences) {
          continue
        }

        const success = await this.executeRecurringTransaction(recurring.id)
        if (success) {
          processed++
        }
      } catch (error) {
        failed++
        errors.push(`定期交易 ${recurring.id} 执行失败: ${error.message}`)
        console.error(`定期交易执行失败:`, error)
      }
    }

    return { processed, failed, errors }
  }

  /**
   * 获取月份天数
   */
  private static getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  /**
   * 获取账户的定期交易
   */
  static async getAccountRecurringTransactions(
    userId: string,
    accountId: string
  ): Promise<RecurringTransaction[]> {
    return await prisma.recurringTransaction.findMany({
      where: {
        userId,
        accountId,
      },
      include: {
        account: true,
        category: true,
        currency: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * 删除定期交易
   */
  static async deleteRecurringTransaction(
    userId: string,
    recurringTransactionId: string
  ): Promise<void> {
    // 删除未来的交易记录
    await prisma.transaction.deleteMany({
      where: {
        recurringTransactionId,
        userId,
        date: {
          gte: new Date(),
        },
      },
    })

    // 删除定期交易记录
    await prisma.recurringTransaction.delete({
      where: {
        id: recurringTransactionId,
        userId,
      },
    })
  }

  /**
   * 切换定期交易状态
   */
  static async toggleRecurringTransaction(
    userId: string,
    recurringTransactionId: string
  ): Promise<RecurringTransaction> {
    const recurringTransaction = await prisma.recurringTransaction.findUnique({
      where: { id: recurringTransactionId, userId },
    })

    if (!recurringTransaction) {
      throw new Error('定期交易不存在')
    }

    return await prisma.recurringTransaction.update({
      where: { id: recurringTransactionId },
      data: {
        isActive: !recurringTransaction.isActive,
      },
      include: {
        account: true,
        category: true,
        currency: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })
  }
}
```

### 4. API 路由实现

#### 4.1 定期交易 API (src/app/api/recurring-transactions/route.ts)

```typescript
import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { RecurringTransactionService } from '@/lib/services/recurring-transaction.service'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { accountId, categoryId, currencyCode, type, amount, description, notes, recurringData } =
      body

    // 验证必填字段
    if (
      !accountId ||
      !categoryId ||
      !currencyCode ||
      !type ||
      !amount ||
      !description ||
      !recurringData
    ) {
      return errorResponse('请填写所有必填字段', 400)
    }

    // 验证金额
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return errorResponse('金额必须是大于0的数字', 400)
    }

    // 验证定期交易数据
    const { frequency, interval, startDate } = recurringData
    if (!frequency || !interval || !startDate) {
      return errorResponse('请填写完整的定期交易信息', 400)
    }

    const recurringTransaction = await RecurringTransactionService.createRecurringTransaction(
      user.id,
      {
        accountId,
        categoryId,
        currencyCode,
        type,
        amount: parseFloat(amount),
        description,
        notes,
        recurringData,
      }
    )

    return successResponse({
      recurringTransaction,
    })
  } catch (error) {
    console.error('创建定期交易失败:', error)
    return errorResponse('创建定期交易失败')
  }
}
```

#### 4.2 账户定期交易 API (src/app/api/accounts/[id]/recurring-transactions/route.ts)

```typescript
import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { RecurringTransactionService } from '@/lib/services/recurring-transaction.service'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api-response'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: accountId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const recurringTransactions = await RecurringTransactionService.getAccountRecurringTransactions(
      user.id,
      accountId
    )

    return successResponse({
      recurringTransactions,
    })
  } catch (error) {
    console.error('获取定期交易失败:', error)
    return errorResponse('获取定期交易失败')
  }
}
```

### 5. 前端组件实现

#### 5.1 定期交易选项组件 (src/components/features/recurring/RecurringOptions.tsx)

```typescript
'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from 'next-themes'
import InputField from '@/components/ui/forms/InputField'
import SelectField from '@/components/ui/forms/SelectField'
import { RecurrenceFrequency, RecurringTransactionFormData } from '@/types/core/recurring'

interface RecurringOptionsProps {
  data: RecurringTransactionFormData
  onChange: (data: RecurringTransactionFormData) => void
  errors?: Record<string, string>
}

export default function RecurringOptions({ data, onChange, errors }: RecurringOptionsProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()

  const frequencyOptions = [
    { value: RecurrenceFrequency.DAILY, label: t('recurring.frequency.daily') },
    { value: RecurrenceFrequency.WEEKLY, label: t('recurring.frequency.weekly') },
    { value: RecurrenceFrequency.MONTHLY, label: t('recurring.frequency.monthly') },
    { value: RecurrenceFrequency.QUARTERLY, label: t('recurring.frequency.quarterly') },
    { value: RecurrenceFrequency.YEARLY, label: t('recurring.frequency.yearly') }
  ]

  const handleChange = (field: keyof RecurringTransactionFormData, value: any) => {
    onChange({
      ...data,
      [field]: value
    })
  }

  const renderFrequencySpecificFields = () => {
    switch (data.frequency) {
      case RecurrenceFrequency.WEEKLY:
        return (
          <SelectField
            name="dayOfWeek"
            label={t('recurring.day.of.week')}
            value={data.dayOfWeek?.toString() || ''}
            onChange={(e) => handleChange('dayOfWeek', parseInt(e.target.value))}
            options={[
              { value: '0', label: t('day.sunday') },
              { value: '1', label: t('day.monday') },
              { value: '2', label: t('day.tuesday') },
              { value: '3', label: t('day.wednesday') },
              { value: '4', label: t('day.thursday') },
              { value: '5', label: t('day.friday') },
              { value: '6', label: t('day.saturday') }
            ]}
            error={errors?.dayOfWeek}
          />
        )

      case RecurrenceFrequency.MONTHLY:
      case RecurrenceFrequency.QUARTERLY:
        return (
          <InputField
            type="number"
            name="dayOfMonth"
            label={t('recurring.day.of.month')}
            value={data.dayOfMonth?.toString() || ''}
            onChange={(e) => handleChange('dayOfMonth', parseInt(e.target.value))}
            min={1}
            max={31}
            placeholder="15"
            error={errors?.dayOfMonth}
          />
        )

      case RecurrenceFrequency.YEARLY:
        return (
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              name="monthOfYear"
              label={t('recurring.month.of.year')}
              value={data.monthOfYear?.toString() || ''}
              onChange={(e) => handleChange('monthOfYear', parseInt(e.target.value))}
              options={[
                { value: '1', label: t('month.january') },
                { value: '2', label: t('month.february') },
                { value: '3', label: t('month.march') },
                { value: '4', label: t('month.april') },
                { value: '5', label: t('month.may') },
                { value: '6', label: t('month.june') },
                { value: '7', label: t('month.july') },
                { value: '8', label: t('month.august') },
                { value: '9', label: t('month.september') },
                { value: '10', label: t('month.october') },
                { value: '11', label: t('month.november') },
                { value: '12', label: t('month.december') }
              ]}
              error={errors?.monthOfYear}
            />
            <InputField
              type="number"
              name="dayOfMonth"
              label={t('recurring.day.of.month')}
              value={data.dayOfMonth?.toString() || ''}
              onChange={(e) => handleChange('dayOfMonth', parseInt(e.target.value))}
              min={1}
              max={31}
              placeholder="15"
              error={errors?.dayOfMonth}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`border rounded-lg p-4 space-y-4 ${
      resolvedTheme === 'dark'
        ? 'border-gray-600 bg-gray-700/50'
        : 'border-gray-200 bg-gray-50'
    }`}>
      <h4 className="font-medium text-gray-900 dark:text-gray-100">
        {t('recurring.options')}
      </h4>

      {/* 频率和间隔 */}
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          name="frequency"
          label={t('recurring.frequency')}
          value={data.frequency}
          onChange={(e) => handleChange('frequency', e.target.value as RecurrenceFrequency)}
          options={frequencyOptions}
          error={errors?.frequency}
        />
        <InputField
          type="number"
          name="interval"
          label={t('recurring.interval')}
          value={data.interval.toString()}
          onChange={(e) => handleChange('interval', parseInt(e.target.value))}
          min={1}
          placeholder="1"
          error={errors?.interval}
        />
      </div>

      {/* 频率特定字段 */}
      {renderFrequencySpecificFields()}

      {/* 开始日期 */}
      <InputField
        type="date"
        name="startDate"
        label={t('recurring.start.date')}
        value={data.startDate}
        onChange={(e) => handleChange('startDate', e.target.value)}
        error={errors?.startDate}
        required
      />

      {/* 结束条件 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('recurring.end.condition')}
        </label>

        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="endCondition"
              value="never"
              checked={!data.endDate && !data.maxOccurrences}
              onChange={() => {
                handleChange('endDate', undefined)
                handleChange('maxOccurrences', undefined)
              }}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('recurring.never.end')}
            </span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="endCondition"
              value="date"
              checked={!!data.endDate}
              onChange={() => {
                handleChange('endDate', new Date().toISOString().split('T')[0])
                handleChange('maxOccurrences', undefined)
              }}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('recurring.end.by.date')}
            </span>
            {data.endDate && (
              <input
                type="date"
                value={data.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="ml-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
              />
            )}
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="endCondition"
              value="count"
              checked={!!data.maxOccurrences}
              onChange={() => {
                handleChange('maxOccurrences', 12)
                handleChange('endDate', undefined)
              }}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('recurring.end.after.count')}
            </span>
            {data.maxOccurrences && (
              <input
                type="number"
                value={data.maxOccurrences}
                onChange={(e) => handleChange('maxOccurrences', parseInt(e.target.value))}
                min={1}
                className="ml-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm w-20"
              />
            )}
            {data.maxOccurrences && (
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('recurring.times')}
              </span>
            )}
          </label>
        </div>
      </div>
    </div>
  )
}
```

#### 5.2 定期交易列表组件 (src/components/features/recurring/RecurringTransactionsList.tsx)

```typescript
'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from 'next-themes'
import { useToast } from '@/contexts/providers/ToastContext'
import ConfirmationModal from '@/components/ui/feedback/ConfirmationModal'
import { RecurringTransaction } from '@/types/core/recurring'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

interface RecurringTransactionsListProps {
  recurringTransactions: RecurringTransaction[]
  onDelete: (id: string) => void
  onToggleActive: (id: string) => void
  currencySymbol: string
}

export default function RecurringTransactionsList({
  recurringTransactions,
  onDelete,
  onToggleActive,
  currencySymbol
}: RecurringTransactionsListProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const { showSuccess } = useToast()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingId) {
      onDelete(deletingId)
      setDeletingId(null)
      setShowDeleteConfirm(false)
      showSuccess(t('recurring.delete.success'))
    }
  }

  const getFrequencyText = (recurring: RecurringTransaction) => {
    const { frequency, interval } = recurring
    const baseText = t(`recurring.frequency.${frequency.toLowerCase()}`)

    if (interval === 1) {
      return baseText
    }

    return t('recurring.every.interval', { interval, frequency: baseText })
  }

  const getNextDateText = (recurring: RecurringTransaction) => {
    if (!recurring.isActive) {
      return t('recurring.paused')
    }

    if (recurring.endDate && new Date(recurring.nextDate) > new Date(recurring.endDate)) {
      return t('recurring.completed')
    }

    if (recurring.maxOccurrences && recurring.currentCount >= recurring.maxOccurrences) {
      return t('recurring.completed')
    }

    return format(new Date(recurring.nextDate), 'yyyy-MM-dd')
  }

  if (recurringTransactions.length === 0) {
    return (
      <div className={`text-center py-8 ${
        resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <div className="text-4xl mb-2">🔄</div>
        <p>{t('recurring.no.transactions')}</p>
        <p className="text-sm mt-1">{t('recurring.no.transactions.hint')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {recurringTransactions.map((recurring) => (
          <div
            key={recurring.id}
            className={`border rounded-lg p-4 ${
              resolvedTheme === 'dark'
                ? 'border-gray-600 bg-gray-700/30'
                : 'border-gray-200 bg-white'
            } ${!recurring.isActive ? 'opacity-60' : ''}`}
          >
            {/* 移动端布局 */}
            <div className="sm:hidden space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {recurring.type === 'INCOME' ? '💰' : '💸'}
                    </span>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {recurring.description}
                    </h4>
                  </div>
                  <p className={`text-lg font-semibold mt-1 ${
                    recurring.type === 'INCOME'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(recurring.amount, currencySymbol)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onToggleActive(recurring.id)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      recurring.isActive
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    }`}
                  >
                    {recurring.isActive ? t('common.pause') : t('common.resume')}
                  </button>
                  <button
                    onClick={() => handleDeleteClick(recurring.id)}
                    className="px-3 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('recurring.frequency')}:
                  </span>
                  <div className="font-medium">
                    {getFrequencyText(recurring)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('recurring.next.date')}:
                  </span>
                  <div className="font-medium">
                    {getNextDateText(recurring)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('recurring.executed.count')}:
                  </span>
                  <div className="font-medium">
                    {recurring.currentCount}
                    {recurring.maxOccurrences && ` / ${recurring.maxOccurrences}`}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('recurring.status')}:
                  </span>
                  <div className={`font-medium ${
                    recurring.isActive
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {recurring.isActive ? t('recurring.active') : t('recurring.paused')}
                  </div>
                </div>
              </div>
            </div>

            {/* 桌面端布局 */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <span className="text-xl">
                  {recurring.type === 'INCOME' ? '💰' : '💸'}
                </span>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {recurring.description}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getFrequencyText(recurring)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className={`text-lg font-semibold ${
                    recurring.type === 'INCOME'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(recurring.amount, currencySymbol)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('recurring.next')}: {getNextDateText(recurring)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('recurring.executed')}
                  </p>
                  <p className="font-medium">
                    {recurring.currentCount}
                    {recurring.maxOccurrences && ` / ${recurring.maxOccurrences}`}
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => onToggleActive(recurring.id)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      recurring.isActive
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    }`}
                  >
                    {recurring.isActive ? t('common.pause') : t('common.resume')}
                  </button>
                  <button
                    onClick={() => handleDeleteClick(recurring.id)}
                    className="px-3 py-1 rounded text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 删除确认对话框 */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title={t('recurring.delete.confirm.title')}
        message={t('recurring.delete.confirm.message')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
      />
    </>
  )
}
```

#### 5.3 FlowTransactionModal 修改要点

在现有的 FlowTransactionModal 中需要添加以下内容：

```typescript
// 新增导入
import RecurringOptions from '@/components/features/recurring/RecurringOptions'
import { RecurrenceFrequency, RecurringTransactionFormData } from '@/types/core/recurring'

// 新增状态
const [isRecurring, setIsRecurring] = useState(false)
const [recurringData, setRecurringData] = useState<RecurringTransactionFormData>({
  frequency: RecurrenceFrequency.MONTHLY,
  interval: 1,
  startDate: new Date().toISOString().split('T')[0],
  tagIds: []
})
const [recurringErrors, setRecurringErrors] = useState<Record<string, string>>({})

// 修改表单验证函数
const validateForm = () => {
  const newErrors: Record<string, string> = {}
  const newRecurringErrors: Record<string, string> = {}

  // 原有验证逻辑...

  // 定期交易验证
  if (isRecurring) {
    if (!recurringData.frequency) {
      newRecurringErrors.frequency = t('recurring.validation.frequency.required')
    }
    if (!recurringData.interval || recurringData.interval < 1) {
      newRecurringErrors.interval = t('recurring.validation.interval.required')
    }
    if (!recurringData.startDate) {
      newRecurringErrors.startDate = t('recurring.validation.start.date.required')
    }

    // 根据频率验证特定字段
    if (recurringData.frequency === RecurrenceFrequency.WEEKLY && !recurringData.dayOfWeek) {
      newRecurringErrors.dayOfWeek = t('recurring.validation.day.of.week.required')
    }
    if ((recurringData.frequency === RecurrenceFrequency.MONTHLY ||
         recurringData.frequency === RecurrenceFrequency.QUARTERLY) &&
        !recurringData.dayOfMonth) {
      newRecurringErrors.dayOfMonth = t('recurring.validation.day.of.month.required')
    }
    if (recurringData.frequency === RecurrenceFrequency.YEARLY) {
      if (!recurringData.monthOfYear) {
        newRecurringErrors.monthOfYear = t('recurring.validation.month.of.year.required')
      }
      if (!recurringData.dayOfMonth) {
        newRecurringErrors.dayOfMonth = t('recurring.validation.day.of.month.required')
      }
    }
  }

  setErrors(newErrors)
  setRecurringErrors(newRecurringErrors)
  return Object.keys(newErrors).length === 0 && Object.keys(newRecurringErrors).length === 0
}

// 修改提交处理函数
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!validateForm()) {
    return
  }

  setIsLoading(true)

  try {
    const submitData = {
      accountId: account.id,
      categoryId: account.category.id,
      currencyCode: accountCurrency,
      type: account.category?.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
      amount: parseFloat(formData.amount),
      description: formData.description.trim(),
      notes: formData.notes.trim(),
      date: formData.date,
      tagIds: formData.tagIds,
      // 添加定期交易数据
      ...(isRecurring && {
        recurringData: {
          ...recurringData,
          tagIds: formData.tagIds
        }
      })
    }

    const url = isRecurring
      ? '/api/recurring-transactions'
      : transaction
        ? `/api/transactions/${transaction.id}`
        : '/api/transactions'

    const method = transaction ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submitData),
    })

    const result = await response.json()

    if (result.success) {
      const successMessage = isRecurring
        ? t('recurring.create.success')
        : transaction
          ? t('transaction.modal.update.success')
          : t('transaction.modal.create.success')

      showSuccess(successMessage)
      onSuccess()
      onClose()
    } else {
      // 错误处理...
    }
  } catch (error) {
    // 错误处理...
  } finally {
    setIsLoading(false)
  }
}

// 在表单中添加定期交易选项（在标签选择后）
{/* 定期交易选项 */}
{!transaction && (
  <div className="space-y-4">
    <div className="flex items-center">
      <input
        type="checkbox"
        id="isRecurring"
        checked={isRecurring}
        onChange={(e) => setIsRecurring(e.target.checked)}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <label htmlFor="isRecurring" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('recurring.enable')}
      </label>
    </div>

    {isRecurring && (
      <RecurringOptions
        data={recurringData}
        onChange={setRecurringData}
        errors={recurringErrors}
      />
    )}
  </div>
)}
```

### 6. 国际化配置

#### 6.1 中文翻译 (src/locales/zh.json)

```json
{
  "recurring": {
    "enable": "定期交易",
    "options": "定期交易选项",
    "frequency": "频率",
    "interval": "间隔",
    "start.date": "开始日期",
    "end.condition": "结束条件",
    "never.end": "无限期",
    "end.by.date": "指定结束日期",
    "end.after.count": "执行指定次数",
    "times": "次",
    "day.of.week": "星期",
    "day.of.month": "日期",
    "month.of.year": "月份",
    "next.date": "下次执行",
    "executed.count": "已执行次数",
    "status": "状态",
    "active": "活跃",
    "paused": "已暂停",
    "completed": "已完成",
    "next": "下次",
    "executed": "已执行",
    "no.transactions": "暂无定期交易",
    "no.transactions.hint": "在添加交易时勾选"定期交易"来创建",
    "create.success": "定期交易创建成功",
    "delete.success": "定期交易删除成功",
    "delete.confirm.title": "删除定期交易",
    "delete.confirm.message": "确定要删除这个定期交易吗？这将同时删除所有未来的相关交易记录。",
    "frequency.daily": "每日",
    "frequency.weekly": "每周",
    "frequency.monthly": "每月",
    "frequency.quarterly": "每季度",
    "frequency.yearly": "每年",
    "every.interval": "每 {interval} {frequency}",
    "validation.frequency.required": "请选择频率",
    "validation.interval.required": "请输入有效的间隔",
    "validation.start.date.required": "请选择开始日期",
    "validation.day.of.week.required": "请选择星期",
    "validation.day.of.month.required": "请选择日期",
    "validation.month.of.year.required": "请选择月份"
  },
  "day": {
    "sunday": "周日",
    "monday": "周一",
    "tuesday": "周二",
    "wednesday": "周三",
    "thursday": "周四",
    "friday": "周五",
    "saturday": "周六"
  },
  "month": {
    "january": "一月",
    "february": "二月",
    "march": "三月",
    "april": "四月",
    "may": "五月",
    "june": "六月",
    "july": "七月",
    "august": "八月",
    "september": "九月",
    "october": "十月",
    "november": "十一月",
    "december": "十二月"
  }
}
```

#### 6.2 英文翻译 (src/locales/en.json)

```json
{
  "recurring": {
    "enable": "Recurring Transaction",
    "options": "Recurring Options",
    "frequency": "Frequency",
    "interval": "Interval",
    "start.date": "Start Date",
    "end.condition": "End Condition",
    "never.end": "Never End",
    "end.by.date": "End by Date",
    "end.after.count": "End after Count",
    "times": "times",
    "day.of.week": "Day of Week",
    "day.of.month": "Day of Month",
    "month.of.year": "Month of Year",
    "next.date": "Next Date",
    "executed.count": "Executed Count",
    "status": "Status",
    "active": "Active",
    "paused": "Paused",
    "completed": "Completed",
    "next": "Next",
    "executed": "Executed",
    "no.transactions": "No recurring transactions",
    "no.transactions.hint": "Check 'Recurring Transaction' when adding transactions to create one",
    "create.success": "Recurring transaction created successfully",
    "delete.success": "Recurring transaction deleted successfully",
    "delete.confirm.title": "Delete Recurring Transaction",
    "delete.confirm.message": "Are you sure you want to delete this recurring transaction? This will also delete all future related transaction records.",
    "frequency.daily": "Daily",
    "frequency.weekly": "Weekly",
    "frequency.monthly": "Monthly",
    "frequency.quarterly": "Quarterly",
    "frequency.yearly": "Yearly",
    "every.interval": "Every {interval} {frequency}",
    "validation.frequency.required": "Please select frequency",
    "validation.interval.required": "Please enter valid interval",
    "validation.start.date.required": "Please select start date",
    "validation.day.of.week.required": "Please select day of week",
    "validation.day.of.month.required": "Please select day of month",
    "validation.month.of.year.required": "Please select month of year"
  },
  "day": {
    "sunday": "Sunday",
    "monday": "Monday",
    "tuesday": "Tuesday",
    "wednesday": "Wednesday",
    "thursday": "Thursday",
    "friday": "Friday",
    "saturday": "Saturday"
  },
  "month": {
    "january": "January",
    "february": "February",
    "march": "March",
    "april": "April",
    "may": "May",
    "june": "June",
    "july": "July",
    "august": "August",
    "september": "September",
    "october": "October",
    "november": "November",
    "december": "December"
  }
}
```

## 🎯 总结

这个定期交易功能设计方案具有以下特点：

### ✅ 优势

1. **无缝集成**：在现有组件基础上扩展，保持UI一致性
2. **功能完整**：支持多种周期模式和灵活的结束条件
3. **用户友好**：直观的界面设计和清晰的操作流程
4. **数据安全**：完整的验证和错误处理机制
5. **性能优化**：批量操作和合理的数据结构设计

### 🔧 技术亮点

1. **类型安全**：完整的TypeScript类型定义
2. **响应式设计**：支持移动端和桌面端
3. **国际化支持**：完整的多语言配置
4. **模块化设计**：组件可复用和易维护

### 📈 扩展性

1. **预留扩展空间**：支持更复杂的周期规则
2. **插件化架构**：易于添加新的频率类型
3. **API设计**：RESTful风格，易于集成

这个方案在满足用户需求的同时，保持了代码的整洁性和可维护性，为Flow
Balance应用增加了重要的自动化功能。

## 🎯 nextDate 和 currentCount 更新机制总结

### 核心设计理念

经过重新设计，我们采用了**模板+定时执行**的模式来解决您提出的问题：

### 1. 创建阶段

```javascript
// 用户创建定期交易时
const recurringTransaction = {
  nextDate: startDate, // 设置为开始日期
  currentCount: 0, // 初始执行次数为0
  isActive: true, // 激活状态
}
// 不立即生成任何交易记录
```

### 2. 执行阶段

```javascript
// 定时任务每日检查
if (recurring.nextDate <= today && recurring.isActive) {
  // 生成一笔交易记录
  await createTransaction(recurring)

  // 更新字段
  await updateRecurring({
    nextDate: calculateNextDate(recurring.nextDate, recurring),
    currentCount: recurring.currentCount + 1,
  })
}
```

### 3. 字段更新逻辑

**nextDate 更新**：

- 创建时：设置为 `startDate`
- 每次执行后：`nextDate = calculateNextDate(当前nextDate, 定期规则)`
- 暂停时：保持不变
- 恢复时：可能需要重新计算

**currentCount 更新**：

- 创建时：设置为 `0`
- 每次执行后：`currentCount = currentCount + 1`
- 用于判断是否达到 `maxOccurrences` 限制

### 4. 执行时机选择

**推荐方案：定时任务**

```javascript
// 每日凌晨执行
cron.schedule('0 0 * * *', async () => {
  await RecurringTransactionService.processAllDueRecurringTransactions()
})
```

**备选方案：按需执行**

```javascript
// 用户查看账户时触发
async function loadAccountData(accountId) {
  // 先执行到期的定期交易
  await processAccountRecurringTransactions(accountId)
  // 再加载交易数据
  return await loadTransactions(accountId)
}
```

### 5. 优势对比

| 方面       | 原设计（批量生成） | 新设计（定时执行）   |
| ---------- | ------------------ | -------------------- |
| 数据一致性 | 复杂，需要避免重复 | 简单，每次只生成一笔 |
| 字段更新   | 批量更新，逻辑复杂 | 单次更新，逻辑清晰   |
| 错误恢复   | 部分失败难处理     | 单笔失败不影响其他   |
| 性能影响   | 创建时可能很慢     | 分散到每日执行       |
| 可控性     | 一次性生成，难调整 | 可随时暂停/恢复      |

### 6. 实际运行示例

**场景**：用户创建每月15日的工资收入，金额8000元

```javascript
// Day 1: 用户创建定期交易（1月10日创建）
{
  startDate: '2024-01-15',
  nextDate: '2024-01-15',    // 等待1月15日执行
  currentCount: 0,
  maxOccurrences: 12         // 执行12次
}

// Day 6: 定时任务执行（1月15日）
// 生成交易记录：2024-01-15, 8000元
{
  nextDate: '2024-02-15',    // 更新为下月15日
  currentCount: 1,           // 执行次数+1
}

// Day 37: 定时任务执行（2月15日）
// 生成交易记录：2024-02-15, 8000元
{
  nextDate: '2024-03-15',    // 更新为下月15日
  currentCount: 2,           // 执行次数+1
}

// ... 继续执行直到 currentCount = 12
// Day 365: 达到最大次数，自动停止
{
  nextDate: '2025-01-15',    // 虽然计算了下次日期
  currentCount: 12,          // 已达到最大次数
  isActive: false            // 自动设置为非活跃
}
```

### 7. 关键优势

这样设计的好处：

1. **逻辑清晰**：每个字段的含义和更新时机都很明确
2. **数据准确**：避免了批量操作可能导致的数据不一致
3. **易于维护**：单次执行的逻辑比批量处理简单得多
4. **用户友好**：可以实时看到定期交易的执行状态
5. **错误隔离**：单笔交易失败不会影响其他定期交易

这个重新设计的方案完美解决了您提出的 `nextDate` 和 `currentCount`
字段更新问题，使整个定期交易系统更加可靠和易于理解。

## 🔄 用户登录时的定期交易同步机制

### 1. 需求分析

**核心需求**：

- 用户打开网站时自动触发定期交易更新
- 需要状态字段防止重复触发
- 生成记录可能耗时，需要异步处理
- 完成后返回最新更新时间，存储到 UserDataContext
- 后续访问无需重复触发

### 2. 数据库设计扩展

#### 2.1 用户设置表扩展

```sql
-- 扩展 user_settings 表
ALTER TABLE "user_settings" ADD COLUMN "lastRecurringSync" DATETIME;
ALTER TABLE "user_settings" ADD COLUMN "recurringProcessingStatus" TEXT DEFAULT 'idle';
-- 状态: 'idle', 'processing', 'completed', 'failed'
```

#### 2.2 定期交易处理日志表

```sql
CREATE TABLE "recurring_processing_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    "processedCount" INTEGER DEFAULT 0,
    "failedCount" INTEGER DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "recurring_processing_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX "recurring_processing_logs_userId_status_idx" ON "recurring_processing_logs"("userId", "status");
CREATE INDEX "recurring_processing_logs_startTime_idx" ON "recurring_processing_logs"("startTime");
```

### 3. API 接口设计

#### 3.1 触发同步接口

```typescript
// POST /api/recurring-transactions/sync
interface SyncRecurringTransactionsRequest {
  force?: boolean // 强制重新同步，忽略状态检查
}

interface SyncRecurringTransactionsResponse {
  success: boolean
  status: 'already_synced' | 'started' | 'processing' | 'completed' | 'failed'
  lastSyncTime?: string
  processedCount?: number
  failedCount?: number
  estimatedDuration?: number // 预估完成时间（秒）
  message?: string
}
```

#### 3.2 查询同步状态接口

```typescript
// GET /api/recurring-transactions/sync/status
interface SyncStatusResponse {
  success: boolean
  status: 'idle' | 'processing' | 'completed' | 'failed'
  lastSyncTime?: string
  currentProgress?: {
    processed: number
    total: number
    percentage: number
  }
  estimatedTimeRemaining?: number
}
```

### 4. 后端服务实现

#### 4.1 同步服务类

```typescript
// src/lib/services/recurring-sync.service.ts
export class RecurringSyncService {
  /**
   * 触发用户的定期交易同步
   */
  static async triggerUserSync(
    userId: string,
    force: boolean = false
  ): Promise<SyncRecurringTransactionsResponse> {
    // 1. 检查用户设置和当前状态
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    if (!userSettings) {
      throw new Error('用户设置不存在')
    }

    // 2. 检查是否需要同步
    if (!force && !this.needsSync(userSettings)) {
      return {
        success: true,
        status: 'already_synced',
        lastSyncTime: userSettings.lastRecurringSync?.toISOString(),
        message: '已是最新状态，无需同步',
      }
    }

    // 3. 检查是否正在处理中
    if (userSettings.recurringProcessingStatus === 'processing') {
      const currentLog = await this.getCurrentProcessingLog(userId)
      return {
        success: true,
        status: 'processing',
        estimatedDuration: this.estimateRemainingTime(currentLog),
        message: '正在处理中，请稍候',
      }
    }

    // 4. 开始异步处理
    this.startAsyncProcessing(userId)

    return {
      success: true,
      status: 'started',
      message: '开始处理定期交易同步',
    }
  }

  /**
   * 判断是否需要同步
   */
  private static needsSync(userSettings: any): boolean {
    if (!userSettings.lastRecurringSync) {
      return true // 从未同步过
    }

    const lastSync = new Date(userSettings.lastRecurringSync)
    const now = new Date()
    const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

    // 超过6小时未同步则需要同步
    return hoursSinceLastSync > 6
  }

  /**
   * 异步处理定期交易
   */
  private static async startAsyncProcessing(userId: string): Promise<void> {
    // 不等待结果，立即返回
    setImmediate(async () => {
      try {
        await this.processUserRecurringTransactions(userId)
      } catch (error) {
        console.error(`用户 ${userId} 定期交易处理失败:`, error)
      }
    })
  }

  /**
   * 处理用户的所有定期交易
   */
  static async processUserRecurringTransactions(userId: string): Promise<void> {
    // 1. 更新状态为处理中
    await prisma.userSettings.update({
      where: { userId },
      data: { recurringProcessingStatus: 'processing' },
    })

    // 2. 创建处理日志
    const log = await prisma.recurringProcessingLog.create({
      data: {
        userId,
        startTime: new Date(),
        status: 'processing',
      },
    })

    let processedCount = 0
    let failedCount = 0
    let errorMessage = ''

    try {
      // 3. 获取用户的所有活跃定期交易
      const recurringTransactions = await prisma.recurringTransaction.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: { tags: true },
      })

      // 4. 逐个处理定期交易
      for (const recurring of recurringTransactions) {
        try {
          const result = await this.processRecurringTransactionForUser(recurring)
          if (result.generated > 0) {
            processedCount += result.generated
          }
        } catch (error) {
          failedCount++
          console.error(`定期交易 ${recurring.id} 处理失败:`, error)
          if (!errorMessage) {
            errorMessage = error.message
          }
        }
      }

      // 5. 更新完成状态
      await prisma.$transaction(async tx => {
        await tx.userSettings.update({
          where: { userId },
          data: {
            recurringProcessingStatus: 'completed',
            lastRecurringSync: new Date(),
          },
        })

        await tx.recurringProcessingLog.update({
          where: { id: log.id },
          data: {
            endTime: new Date(),
            status: 'completed',
            processedCount,
            failedCount,
            errorMessage: errorMessage || null,
          },
        })
      })
    } catch (error) {
      // 6. 处理失败
      await prisma.$transaction(async tx => {
        await tx.userSettings.update({
          where: { userId },
          data: { recurringProcessingStatus: 'failed' },
        })

        await tx.recurringProcessingLog.update({
          where: { id: log.id },
          data: {
            endTime: new Date(),
            status: 'failed',
            processedCount,
            failedCount,
            errorMessage: error.message,
          },
        })
      })

      throw error
    }
  }

  /**
   * 处理单个定期交易，生成所有遗漏的交易记录
   */
  private static async processRecurringTransactionForUser(
    recurring: any
  ): Promise<{ generated: number }> {
    let generated = 0
    const today = new Date()

    // 持续生成直到追上当前日期
    while (recurring.nextDate <= today && recurring.isActive) {
      // 检查结束条件
      if (recurring.endDate && recurring.nextDate > recurring.endDate) {
        await prisma.recurringTransaction.update({
          where: { id: recurring.id },
          data: { isActive: false },
        })
        break
      }

      if (recurring.maxOccurrences && recurring.currentCount >= recurring.maxOccurrences) {
        await prisma.recurringTransaction.update({
          where: { id: recurring.id },
          data: { isActive: false },
        })
        break
      }

      // 生成交易记录
      await prisma.$transaction(async tx => {
        // 创建交易
        const transaction = await tx.transaction.create({
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
            recurringTransactionId: recurring.id,
          },
        })

        // 添加标签
        if (recurring.tags.length > 0) {
          await tx.transactionTag.createMany({
            data: recurring.tags.map(tag => ({
              transactionId: transaction.id,
              tagId: tag.tagId,
            })),
          })
        }

        // 更新定期交易
        const nextDate = RecurringTransactionService.calculateNextDate(
          recurring.nextDate,
          recurring
        )

        await tx.recurringTransaction.update({
          where: { id: recurring.id },
          data: {
            nextDate,
            currentCount: recurring.currentCount + 1,
          },
        })

        // 更新本地对象以便下次循环使用
        recurring.nextDate = nextDate
        recurring.currentCount += 1
      })

      generated++
    }

    return { generated }
  }

  /**
   * 获取同步状态
   */
  static async getSyncStatus(userId: string): Promise<SyncStatusResponse> {
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    if (!userSettings) {
      throw new Error('用户设置不存在')
    }

    const status = userSettings.recurringProcessingStatus || 'idle'

    if (status === 'processing') {
      const currentLog = await this.getCurrentProcessingLog(userId)
      const progress = await this.calculateProgress(userId)

      return {
        success: true,
        status: 'processing',
        currentProgress: progress,
        estimatedTimeRemaining: this.estimateRemainingTime(currentLog),
      }
    }

    return {
      success: true,
      status: status as any,
      lastSyncTime: userSettings.lastRecurringSync?.toISOString(),
    }
  }

  /**
   * 获取当前处理日志
   */
  private static async getCurrentProcessingLog(userId: string) {
    return await prisma.recurringProcessingLog.findFirst({
      where: {
        userId,
        status: 'processing',
      },
      orderBy: { startTime: 'desc' },
    })
  }

  /**
   * 计算处理进度
   */
  private static async calculateProgress(userId: string) {
    const totalRecurring = await prisma.recurringTransaction.count({
      where: { userId, isActive: true },
    })

    const currentLog = await this.getCurrentProcessingLog(userId)
    const processed = currentLog?.processedCount || 0

    return {
      processed,
      total: totalRecurring,
      percentage: totalRecurring > 0 ? Math.round((processed / totalRecurring) * 100) : 0,
    }
  }

  /**
   * 估算剩余时间
   */
  private static estimateRemainingTime(log: any): number {
    if (!log || !log.startTime) return 0

    const elapsed = Date.now() - new Date(log.startTime).getTime()
    const processed = log.processedCount || 0

    if (processed === 0) return 60 // 默认估算1分钟

    const avgTimePerItem = elapsed / processed
    const remaining = Math.max(0, (log.total || 10) - processed)

    return Math.round((remaining * avgTimePerItem) / 1000) // 返回秒数
  }
}
```

### 5. 前端集成 - UserDataContext 扩展

#### 5.1 Context 状态扩展

```typescript
// src/contexts/providers/UserDataContext.tsx
interface UserDataContextType {
  // ... 现有属性

  // 新增定期交易同步相关
  lastRecurringSync: Date | null
  recurringProcessingStatus: 'idle' | 'processing' | 'completed' | 'failed'
  syncRecurringTransactions: (force?: boolean) => Promise<void>
  getSyncStatus: () => Promise<SyncStatusResponse>

  // 同步状态
  isSyncing: boolean
  syncProgress: {
    processed: number
    total: number
    percentage: number
  } | null
}
```

#### 5.2 Context 实现

```typescript
export function UserDataProvider({ children }: { children: React.ReactNode }) {
  // ... 现有状态

  const [lastRecurringSync, setLastRecurringSync] = useState<Date | null>(null)
  const [recurringProcessingStatus, setRecurringProcessingStatus] = useState<string>('idle')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<any>(null)

  // 初始化时触发同步
  useEffect(() => {
    if (user && !lastRecurringSync) {
      syncRecurringTransactions()
    }
  }, [user])

  // 同步定期交易
  const syncRecurringTransactions = async (force: boolean = false) => {
    if (isSyncing) return

    setIsSyncing(true)
    try {
      const response = await fetch('/api/recurring-transactions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })

      const result = await response.json()

      if (result.success) {
        if (result.status === 'started' || result.status === 'processing') {
          // 开始轮询状态
          pollSyncStatus()
        } else if (result.lastSyncTime) {
          setLastRecurringSync(new Date(result.lastSyncTime))
          setRecurringProcessingStatus('completed')
        }
      }
    } catch (error) {
      console.error('同步定期交易失败:', error)
      setRecurringProcessingStatus('failed')
    } finally {
      setIsSyncing(false)
    }
  }

  // 轮询同步状态
  const pollSyncStatus = async () => {
    const poll = async () => {
      try {
        const response = await fetch('/api/recurring-transactions/sync/status')
        const result = await response.json()

        if (result.success) {
          setRecurringProcessingStatus(result.status)

          if (result.currentProgress) {
            setSyncProgress(result.currentProgress)
          }

          if (result.status === 'completed') {
            setLastRecurringSync(new Date(result.lastSyncTime))
            setSyncProgress(null)
            // 刷新相关数据
            await loadAccounts()
            return // 停止轮询
          } else if (result.status === 'failed') {
            setSyncProgress(null)
            return // 停止轮询
          }
        }

        // 继续轮询
        setTimeout(poll, 2000) // 每2秒查询一次
      } catch (error) {
        console.error('查询同步状态失败:', error)
        setTimeout(poll, 5000) // 出错时5秒后重试
      }
    }

    poll()
  }

  const getSyncStatus = async () => {
    const response = await fetch('/api/recurring-transactions/sync/status')
    return await response.json()
  }

  // ... 返回 Context 值
}
```

### 6. API 路由实现

#### 6.1 同步触发接口

```typescript
// src/app/api/recurring-transactions/sync/route.ts
import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { RecurringSyncService } from '@/lib/services/recurring-sync.service'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { force = false } = body

    const result = await RecurringSyncService.triggerUserSync(user.id, force)

    return successResponse(result)
  } catch (error) {
    console.error('触发定期交易同步失败:', error)
    return errorResponse('同步失败', 500)
  }
}
```

#### 6.2 状态查询接口

```typescript
// src/app/api/recurring-transactions/sync/status/route.ts
import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { RecurringSyncService } from '@/lib/services/recurring-sync.service'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const result = await RecurringSyncService.getSyncStatus(user.id)

    return successResponse(result)
  } catch (error) {
    console.error('查询同步状态失败:', error)
    return errorResponse('查询失败', 500)
  }
}
```

## 🏦 贷款合约管理功能设计

### 1. 需求分析

**核心功能**：

- 在负债账户中创建贷款合约信息
- 自动更新余额信息（本金减少）
- 自动生成支出交易（利息和本金还款）
- 支持不同的还款方式（等额本息、等额本金、先息后本等）

### 2. 数据库设计

#### 2.1 表复用性分析

**复用 recurring_transactions 表的可行性**：

- ✅ **优势**：基础字段可复用（金额、频率、日期等）
- ❌ **劣势**：贷款合约有特殊字段（利率、本金、还款方式等）
- ❌ **复杂性**：贷款逻辑比简单定期交易复杂得多

**结论**：建议新建专门的贷款合约表，但可以复用定期交易的执行机制。

#### 2.2 贷款合约表设计

```sql
CREATE TABLE "loan_contracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL, -- 关联的负债账户
    "currencyCode" TEXT NOT NULL,

    -- 贷款基本信息
    "contractName" TEXT NOT NULL, -- 合约名称，如"房贷"、"车贷"
    "loanAmount" DECIMAL NOT NULL, -- 贷款总额
    "currentBalance" DECIMAL NOT NULL, -- 当前余额（剩余本金）
    "interestRate" DECIMAL NOT NULL, -- 年利率（如0.045表示4.5%）
    "loanTerm" INTEGER NOT NULL, -- 贷款期限（月数）

    -- 还款信息
    "repaymentType" TEXT NOT NULL, -- 还款方式: 'EQUAL_PAYMENT', 'EQUAL_PRINCIPAL', 'INTEREST_ONLY'
    "monthlyPayment" DECIMAL, -- 月供金额（等额本息时固定）
    "startDate" DATETIME NOT NULL, -- 开始还款日期
    "endDate" DATETIME NOT NULL, -- 预计结束日期
    "nextPaymentDate" DATETIME NOT NULL, -- 下次还款日期

    -- 状态信息
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentPeriod" INTEGER NOT NULL DEFAULT 0, -- 当前期数
    "totalPeriods" INTEGER NOT NULL, -- 总期数

    -- 分类设置
    "principalCategoryId" TEXT, -- 本金还款的支出分类
    "interestCategoryId" TEXT, -- 利息支出的分类

    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    -- 外键约束
    CONSTRAINT "loan_contracts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "loan_contracts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE,
    CONSTRAINT "loan_contracts_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies" ("code") ON DELETE RESTRICT,
    CONSTRAINT "loan_contracts_principalCategoryId_fkey" FOREIGN KEY ("principalCategoryId") REFERENCES "categories" ("id") ON DELETE SET NULL,
    CONSTRAINT "loan_contracts_interestCategoryId_fkey" FOREIGN KEY ("interestCategoryId") REFERENCES "categories" ("id") ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX "loan_contracts_userId_idx" ON "loan_contracts"("userId");
CREATE INDEX "loan_contracts_accountId_idx" ON "loan_contracts"("accountId");
CREATE INDEX "loan_contracts_nextPaymentDate_idx" ON "loan_contracts"("nextPaymentDate");
```

#### 2.3 贷款还款记录表

```sql
CREATE TABLE "loan_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanContractId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" INTEGER NOT NULL, -- 期数
    "paymentDate" DATETIME NOT NULL,

    -- 还款金额分解
    "principalAmount" DECIMAL NOT NULL, -- 本金部分
    "interestAmount" DECIMAL NOT NULL, -- 利息部分
    "totalAmount" DECIMAL NOT NULL, -- 总还款金额

    -- 余额信息
    "remainingBalance" DECIMAL NOT NULL, -- 还款后剩余本金

    -- 关联的交易记录
    "principalTransactionId" TEXT, -- 本金还款交易ID
    "interestTransactionId" TEXT, -- 利息支付交易ID
    "balanceTransactionId" TEXT, -- 余额调整交易ID

    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_payments_loanContractId_fkey" FOREIGN KEY ("loanContractId") REFERENCES "loan_contracts" ("id") ON DELETE CASCADE,
    CONSTRAINT "loan_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "loan_payments_principalTransactionId_fkey" FOREIGN KEY ("principalTransactionId") REFERENCES "transactions" ("id") ON DELETE SET NULL,
    CONSTRAINT "loan_payments_interestTransactionId_fkey" FOREIGN KEY ("interestTransactionId") REFERENCES "transactions" ("id") ON DELETE SET NULL,
    CONSTRAINT "loan_payments_balanceTransactionId_fkey" FOREIGN KEY ("balanceTransactionId") REFERENCES "transactions" ("id") ON DELETE SET NULL
);

-- 创建索引和唯一约束
CREATE UNIQUE INDEX "loan_payments_loanContractId_period_key" ON "loan_payments"("loanContractId", "period");
CREATE INDEX "loan_payments_paymentDate_idx" ON "loan_payments"("paymentDate");
```

#### 2.4 扩展 transactions 表

```sql
-- 为交易表添加贷款相关字段
ALTER TABLE "transactions" ADD COLUMN "loanContractId" TEXT;
ALTER TABLE "transactions" ADD COLUMN "loanPaymentId" TEXT;

-- 添加外键约束
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_loanContractId_fkey"
    FOREIGN KEY ("loanContractId") REFERENCES "loan_contracts" ("id") ON DELETE SET NULL;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_loanPaymentId_fkey"
    FOREIGN KEY ("loanPaymentId") REFERENCES "loan_payments" ("id") ON DELETE SET NULL;

-- 创建索引
CREATE INDEX "transactions_loanContractId_idx" ON "transactions"("loanContractId");
```

### 3. TypeScript 类型定义

#### 3.1 贷款合约类型

```typescript
// src/types/core/loan.ts
export enum RepaymentType {
  EQUAL_PAYMENT = 'EQUAL_PAYMENT', // 等额本息
  EQUAL_PRINCIPAL = 'EQUAL_PRINCIPAL', // 等额本金
  INTEREST_ONLY = 'INTEREST_ONLY', // 先息后本
}

export interface LoanContract {
  id: string
  userId: string
  accountId: string
  currencyCode: string

  // 贷款基本信息
  contractName: string
  loanAmount: number
  currentBalance: number
  interestRate: number
  loanTerm: number

  // 还款信息
  repaymentType: RepaymentType
  monthlyPayment?: number
  startDate: Date
  endDate: Date
  nextPaymentDate: Date

  // 状态信息
  isActive: boolean
  currentPeriod: number
  totalPeriods: number

  // 分类设置
  principalCategoryId?: string
  interestCategoryId?: string

  createdAt: Date
  updatedAt: Date

  // 关联数据
  account?: Account
  currency?: Currency
  principalCategory?: Category
  interestCategory?: Category
  payments?: LoanPayment[]
}

export interface LoanPayment {
  id: string
  loanContractId: string
  userId: string
  period: number
  paymentDate: Date

  principalAmount: number
  interestAmount: number
  totalAmount: number
  remainingBalance: number

  principalTransactionId?: string
  interestTransactionId?: string
  balanceTransactionId?: string

  createdAt: Date
}

export interface CreateLoanContractData {
  accountId: string
  currencyCode: string
  contractName: string
  loanAmount: number
  interestRate: number
  loanTerm: number
  repaymentType: RepaymentType
  startDate: string
  principalCategoryId?: string
  interestCategoryId?: string
}

export interface LoanCalculationResult {
  monthlyPayment: number
  totalInterest: number
  totalPayment: number
  schedule: {
    period: number
    principalAmount: number
    interestAmount: number
    totalAmount: number
    remainingBalance: number
  }[]
}
```

### 4. 贷款服务实现

#### 4.1 贷款计算服务

```typescript
// src/lib/services/loan-calculation.service.ts
export class LoanCalculationService {
  /**
   * 计算等额本息还款
   */
  static calculateEqualPayment(
    principal: number,
    annualRate: number,
    termMonths: number
  ): LoanCalculationResult {
    const monthlyRate = annualRate / 12
    const monthlyPayment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) /
      (Math.pow(1 + monthlyRate, termMonths) - 1)

    const schedule = []
    let remainingBalance = principal
    let totalInterest = 0

    for (let period = 1; period <= termMonths; period++) {
      const interestAmount = remainingBalance * monthlyRate
      const principalAmount = monthlyPayment - interestAmount
      remainingBalance -= principalAmount
      totalInterest += interestAmount

      schedule.push({
        period,
        principalAmount: Math.round(principalAmount * 100) / 100,
        interestAmount: Math.round(interestAmount * 100) / 100,
        totalAmount: Math.round(monthlyPayment * 100) / 100,
        remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100),
      })
    }

    return {
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayment: Math.round((principal + totalInterest) * 100) / 100,
      schedule,
    }
  }

  /**
   * 计算等额本金还款
   */
  static calculateEqualPrincipal(
    principal: number,
    annualRate: number,
    termMonths: number
  ): LoanCalculationResult {
    const monthlyRate = annualRate / 12
    const monthlyPrincipal = principal / termMonths

    const schedule = []
    let remainingBalance = principal
    let totalInterest = 0

    for (let period = 1; period <= termMonths; period++) {
      const interestAmount = remainingBalance * monthlyRate
      const principalAmount = monthlyPrincipal
      const totalAmount = principalAmount + interestAmount
      remainingBalance -= principalAmount
      totalInterest += interestAmount

      schedule.push({
        period,
        principalAmount: Math.round(principalAmount * 100) / 100,
        interestAmount: Math.round(interestAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100),
      })
    }

    return {
      monthlyPayment: schedule[0].totalAmount, // 首期还款金额
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayment: Math.round((principal + totalInterest) * 100) / 100,
      schedule,
    }
  }

  /**
   * 计算先息后本还款
   */
  static calculateInterestOnly(
    principal: number,
    annualRate: number,
    termMonths: number
  ): LoanCalculationResult {
    const monthlyRate = annualRate / 12
    const monthlyInterest = principal * monthlyRate

    const schedule = []
    let totalInterest = 0

    for (let period = 1; period <= termMonths; period++) {
      const isLastPeriod = period === termMonths
      const principalAmount = isLastPeriod ? principal : 0
      const interestAmount = monthlyInterest
      const totalAmount = principalAmount + interestAmount
      const remainingBalance = isLastPeriod ? 0 : principal

      totalInterest += interestAmount

      schedule.push({
        period,
        principalAmount: Math.round(principalAmount * 100) / 100,
        interestAmount: Math.round(interestAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        remainingBalance: Math.round(remainingBalance * 100) / 100,
      })
    }

    return {
      monthlyPayment: Math.round(monthlyInterest * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayment: Math.round((principal + totalInterest) * 100) / 100,
      schedule,
    }
  }

  /**
   * 根据还款方式计算贷款
   */
  static calculateLoan(
    principal: number,
    annualRate: number,
    termMonths: number,
    repaymentType: RepaymentType
  ): LoanCalculationResult {
    switch (repaymentType) {
      case RepaymentType.EQUAL_PAYMENT:
        return this.calculateEqualPayment(principal, annualRate, termMonths)
      case RepaymentType.EQUAL_PRINCIPAL:
        return this.calculateEqualPrincipal(principal, annualRate, termMonths)
      case RepaymentType.INTEREST_ONLY:
        return this.calculateInterestOnly(principal, annualRate, termMonths)
      default:
        throw new Error(`不支持的还款方式: ${repaymentType}`)
    }
  }
}
```

#### 4.2 贷款合约服务

```typescript
// src/lib/services/loan-contract.service.ts
export class LoanContractService {
  /**
   * 创建贷款合约
   */
  static async createLoanContract(
    userId: string,
    data: CreateLoanContractData
  ): Promise<LoanContract> {
    const {
      accountId,
      currencyCode,
      contractName,
      loanAmount,
      interestRate,
      loanTerm,
      repaymentType,
      startDate,
      principalCategoryId,
      interestCategoryId,
    } = data

    // 1. 验证账户类型
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        category: {
          type: 'LIABILITY', // 必须是负债账户
        },
      },
      include: { category: true },
    })

    if (!account) {
      throw new Error('账户不存在或不是负债账户')
    }

    // 2. 计算还款计划
    const calculation = LoanCalculationService.calculateLoan(
      loanAmount,
      interestRate,
      loanTerm,
      repaymentType
    )

    // 3. 计算结束日期
    const start = new Date(startDate)
    const endDate = new Date(start)
    endDate.setMonth(endDate.getMonth() + loanTerm)

    // 4. 创建贷款合约
    const loanContract = await prisma.loanContract.create({
      data: {
        userId,
        accountId,
        currencyCode,
        contractName,
        loanAmount,
        currentBalance: loanAmount,
        interestRate,
        loanTerm,
        repaymentType,
        monthlyPayment: calculation.monthlyPayment,
        startDate: start,
        endDate,
        nextPaymentDate: start,
        totalPeriods: loanTerm,
        principalCategoryId,
        interestCategoryId,
      },
      include: {
        account: true,
        currency: true,
        principalCategory: true,
        interestCategory: true,
      },
    })

    // 5. 创建初始余额调整交易（增加负债）
    await prisma.transaction.create({
      data: {
        userId,
        accountId,
        categoryId: account.categoryId,
        currencyCode,
        type: 'BALANCE',
        amount: loanAmount,
        description: `${contractName} - 贷款放款`,
        notes: `贷款合约: ${contractName}`,
        date: start,
        loanContractId: loanContract.id,
      },
    })

    return loanContract
  }

  /**
   * 处理贷款还款（由定时任务调用）
   */
  static async processLoanPayment(loanContractId: string): Promise<boolean> {
    const loanContract = await prisma.loanContract.findUnique({
      where: { id: loanContractId },
      include: {
        account: true,
        principalCategory: true,
        interestCategory: true,
      },
    })

    if (!loanContract || !loanContract.isActive) {
      return false
    }

    const today = new Date()

    // 检查是否到了还款日期
    if (loanContract.nextPaymentDate > today) {
      return false
    }

    // 检查是否已完成所有还款
    if (loanContract.currentPeriod >= loanContract.totalPeriods) {
      await prisma.loanContract.update({
        where: { id: loanContractId },
        data: { isActive: false },
      })
      return false
    }

    // 计算当期还款金额
    const calculation = LoanCalculationService.calculateLoan(
      loanContract.loanAmount,
      loanContract.interestRate,
      loanContract.loanTerm,
      loanContract.repaymentType as RepaymentType
    )

    const currentPeriod = loanContract.currentPeriod + 1
    const paymentInfo = calculation.schedule[currentPeriod - 1]

    if (!paymentInfo) {
      throw new Error(`无法找到第${currentPeriod}期的还款信息`)
    }

    // 使用事务处理还款
    await prisma.$transaction(async tx => {
      // 1. 创建还款记录
      const loanPayment = await tx.loanPayment.create({
        data: {
          loanContractId,
          userId: loanContract.userId,
          period: currentPeriod,
          paymentDate: loanContract.nextPaymentDate,
          principalAmount: paymentInfo.principalAmount,
          interestAmount: paymentInfo.interestAmount,
          totalAmount: paymentInfo.totalAmount,
          remainingBalance: paymentInfo.remainingBalance,
        },
      })

      // 2. 创建利息支出交易
      let interestTransactionId = null
      if (paymentInfo.interestAmount > 0) {
        const interestTransaction = await tx.transaction.create({
          data: {
            userId: loanContract.userId,
            accountId: loanContract.accountId,
            categoryId: loanContract.interestCategoryId || loanContract.account.categoryId,
            currencyCode: loanContract.currencyCode,
            type: 'EXPENSE',
            amount: paymentInfo.interestAmount,
            description: `${loanContract.contractName} - 第${currentPeriod}期利息`,
            notes: `贷款合约: ${loanContract.contractName}`,
            date: loanContract.nextPaymentDate,
            loanContractId,
            loanPaymentId: loanPayment.id,
          },
        })
        interestTransactionId = interestTransaction.id
      }

      // 3. 创建本金还款交易（如果有本金部分）
      let principalTransactionId = null
      if (paymentInfo.principalAmount > 0) {
        const principalTransaction = await tx.transaction.create({
          data: {
            userId: loanContract.userId,
            accountId: loanContract.accountId,
            categoryId: loanContract.principalCategoryId || loanContract.account.categoryId,
            currencyCode: loanContract.currencyCode,
            type: 'EXPENSE',
            amount: paymentInfo.principalAmount,
            description: `${loanContract.contractName} - 第${currentPeriod}期本金`,
            notes: `贷款合约: ${loanContract.contractName}`,
            date: loanContract.nextPaymentDate,
            loanContractId,
            loanPaymentId: loanPayment.id,
          },
        })
        principalTransactionId = principalTransaction.id
      }

      // 4. 创建余额调整交易（减少负债余额）
      let balanceTransactionId = null
      if (paymentInfo.principalAmount > 0) {
        const balanceTransaction = await tx.transaction.create({
          data: {
            userId: loanContract.userId,
            accountId: loanContract.accountId,
            categoryId: loanContract.account.categoryId,
            currencyCode: loanContract.currencyCode,
            type: 'BALANCE',
            amount: -paymentInfo.principalAmount, // 负数表示减少负债
            description: `${loanContract.contractName} - 第${currentPeriod}期本金还款`,
            notes: `贷款合约: ${loanContract.contractName}`,
            date: loanContract.nextPaymentDate,
            loanContractId,
            loanPaymentId: loanPayment.id,
          },
        })
        balanceTransactionId = balanceTransaction.id
      }

      // 5. 更新还款记录的交易ID
      await tx.loanPayment.update({
        where: { id: loanPayment.id },
        data: {
          principalTransactionId,
          interestTransactionId,
          balanceTransactionId,
        },
      })

      // 6. 更新贷款合约状态
      const nextPaymentDate = new Date(loanContract.nextPaymentDate)
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)

      const isCompleted = currentPeriod >= loanContract.totalPeriods

      await tx.loanContract.update({
        where: { id: loanContractId },
        data: {
          currentBalance: paymentInfo.remainingBalance,
          currentPeriod,
          nextPaymentDate: isCompleted ? loanContract.endDate : nextPaymentDate,
          isActive: !isCompleted,
        },
      })
    })

    return true
  }

  /**
   * 获取账户的贷款合约
   */
  static async getAccountLoanContracts(userId: string, accountId: string): Promise<LoanContract[]> {
    return await prisma.loanContract.findMany({
      where: {
        userId,
        accountId,
      },
      include: {
        account: true,
        currency: true,
        principalCategory: true,
        interestCategory: true,
        payments: {
          orderBy: { period: 'desc' },
          take: 5, // 只返回最近5期的还款记录
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * 删除贷款合约
   */
  static async deleteLoanContract(userId: string, loanContractId: string): Promise<void> {
    // 删除未来的相关交易记录
    await prisma.transaction.deleteMany({
      where: {
        loanContractId,
        userId,
        date: {
          gte: new Date(),
        },
      },
    })

    // 删除贷款合约（级联删除还款记录）
    await prisma.loanContract.delete({
      where: {
        id: loanContractId,
        userId,
      },
    })
  }
}
```

### 5. 统一同步服务扩展

#### 5.1 扩展 RecurringSyncService

```typescript
// 扩展 src/lib/services/recurring-sync.service.ts
export class RecurringSyncService {
  // ... 现有方法

  /**
   * 处理用户的所有定期交易和贷款合约（扩展版本）
   */
  static async processUserRecurringTransactions(userId: string): Promise<void> {
    // 1. 更新状态为处理中
    await prisma.userSettings.update({
      where: { userId },
      data: { recurringProcessingStatus: 'processing' },
    })

    // 2. 创建处理日志
    const log = await prisma.recurringProcessingLog.create({
      data: {
        userId,
        startTime: new Date(),
        status: 'processing',
      },
    })

    let processedCount = 0
    let failedCount = 0
    let errorMessage = ''

    try {
      // 3. 处理定期交易
      const recurringResult = await this.processRecurringTransactions(userId)
      processedCount += recurringResult.processed
      failedCount += recurringResult.failed

      // 4. 处理贷款合约
      const loanResult = await this.processLoanContracts(userId)
      processedCount += loanResult.processed
      failedCount += loanResult.failed

      if (recurringResult.errors.length > 0 || loanResult.errors.length > 0) {
        errorMessage = [...recurringResult.errors, ...loanResult.errors].join('; ')
      }

      // 5. 更新完成状态
      await prisma.$transaction(async tx => {
        await tx.userSettings.update({
          where: { userId },
          data: {
            recurringProcessingStatus: 'completed',
            lastRecurringSync: new Date(),
          },
        })

        await tx.recurringProcessingLog.update({
          where: { id: log.id },
          data: {
            endTime: new Date(),
            status: 'completed',
            processedCount,
            failedCount,
            errorMessage: errorMessage || null,
          },
        })
      })
    } catch (error) {
      // 6. 处理失败
      await prisma.$transaction(async tx => {
        await tx.userSettings.update({
          where: { userId },
          data: { recurringProcessingStatus: 'failed' },
        })

        await tx.recurringProcessingLog.update({
          where: { id: log.id },
          data: {
            endTime: new Date(),
            status: 'failed',
            processedCount,
            failedCount,
            errorMessage: error.message,
          },
        })
      })

      throw error
    }
  }

  /**
   * 处理定期交易
   */
  private static async processRecurringTransactions(userId: string): Promise<{
    processed: number
    failed: number
    errors: string[]
  }> {
    const errors: string[] = []
    let processed = 0
    let failed = 0

    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: { tags: true },
    })

    for (const recurring of recurringTransactions) {
      try {
        const result = await this.processRecurringTransactionForUser(recurring)
        processed += result.generated
      } catch (error) {
        failed++
        errors.push(`定期交易 ${recurring.id} 处理失败: ${error.message}`)
        console.error(`定期交易处理失败:`, error)
      }
    }

    return { processed, failed, errors }
  }

  /**
   * 处理贷款合约
   */
  private static async processLoanContracts(userId: string): Promise<{
    processed: number
    failed: number
    errors: string[]
  }> {
    const errors: string[] = []
    let processed = 0
    let failed = 0

    const today = new Date()

    // 获取需要处理的贷款合约
    const loanContracts = await prisma.loanContract.findMany({
      where: {
        userId,
        isActive: true,
        nextPaymentDate: { lte: today },
      },
    })

    for (const loanContract of loanContracts) {
      try {
        // 可能需要处理多期还款（如果用户很久没登录）
        let currentContract = loanContract
        while (currentContract.nextPaymentDate <= today && currentContract.isActive) {
          const success = await LoanContractService.processLoanPayment(currentContract.id)
          if (success) {
            processed++
            // 重新获取更新后的合约信息
            currentContract =
              (await prisma.loanContract.findUnique({
                where: { id: currentContract.id },
              })) || currentContract
          } else {
            break // 无法继续处理
          }
        }
      } catch (error) {
        failed++
        errors.push(`贷款合约 ${loanContract.id} 处理失败: ${error.message}`)
        console.error(`贷款合约处理失败:`, error)
      }
    }

    return { processed, failed, errors }
  }

  /**
   * 批量处理所有用户的定期交易和贷款合约（全局定时任务）
   */
  static async processAllUsersRecurringData(): Promise<{
    processedUsers: number
    totalRecurringProcessed: number
    totalLoansProcessed: number
    errors: string[]
  }> {
    const today = new Date()
    const errors: string[] = []
    let processedUsers = 0
    let totalRecurringProcessed = 0
    let totalLoansProcessed = 0

    // 1. 处理定期交易
    const dueRecurringTransactions = await prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        nextDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      include: { tags: true },
    })

    const recurringUserIds = new Set(dueRecurringTransactions.map(r => r.userId))

    for (const recurring of dueRecurringTransactions) {
      try {
        const success = await RecurringTransactionService.executeRecurringTransaction(recurring.id)
        if (success) {
          totalRecurringProcessed++
        }
      } catch (error) {
        errors.push(`定期交易 ${recurring.id} 执行失败: ${error.message}`)
      }
    }

    // 2. 处理贷款合约
    const dueLoanContracts = await prisma.loanContract.findMany({
      where: {
        isActive: true,
        nextPaymentDate: { lte: today },
      },
    })

    const loanUserIds = new Set(dueLoanContracts.map(l => l.userId))

    for (const loanContract of dueLoanContracts) {
      try {
        const success = await LoanContractService.processLoanPayment(loanContract.id)
        if (success) {
          totalLoansProcessed++
        }
      } catch (error) {
        errors.push(`贷款合约 ${loanContract.id} 处理失败: ${error.message}`)
      }
    }

    // 3. 统计处理的用户数
    const allUserIds = new Set([...recurringUserIds, ...loanUserIds])
    processedUsers = allUserIds.size

    return {
      processedUsers,
      totalRecurringProcessed,
      totalLoansProcessed,
      errors,
    }
  }
}
```

### 6. 前端集成 - 贷款合约管理

#### 6.1 贷款合约组件

```typescript
// src/components/features/loans/LoanContractsList.tsx
interface LoanContractsListProps {
  loanContracts: LoanContract[]
  onDelete: (id: string) => void
  currencySymbol: string
}

export default function LoanContractsList({
  loanContracts,
  onDelete,
  currencySymbol
}: LoanContractsListProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()

  if (loanContracts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🏦</div>
        <p className="text-gray-500 dark:text-gray-400">
          {t('loan.no.contracts')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {loanContracts.map((contract) => (
        <div
          key={contract.id}
          className={`border rounded-lg p-4 ${
            resolvedTheme === 'dark'
              ? 'border-gray-600 bg-gray-700/30'
              : 'border-gray-200 bg-white'
          }`}
        >
          {/* 贷款合约信息显示 */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🏦</span>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  {contract.contractName}
                </h4>
                <span className={`px-2 py-1 rounded text-xs ${
                  contract.isActive
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                }`}>
                  {contract.isActive ? t('loan.active') : t('loan.completed')}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('loan.total.amount')}:
                  </span>
                  <div className="font-medium">
                    {formatCurrency(contract.loanAmount, currencySymbol)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('loan.remaining.balance')}:
                  </span>
                  <div className="font-medium text-red-600 dark:text-red-400">
                    {formatCurrency(contract.currentBalance, currencySymbol)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('loan.interest.rate')}:
                  </span>
                  <div className="font-medium">
                    {(contract.interestRate * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('loan.progress')}:
                  </span>
                  <div className="font-medium">
                    {contract.currentPeriod}/{contract.totalPeriods}
                  </div>
                </div>
              </div>

              {contract.isActive && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('loan.next.payment')}:
                  </span>
                  <span className="ml-1 font-medium">
                    {format(new Date(contract.nextPaymentDate), 'yyyy-MM-dd')}
                  </span>
                  {contract.monthlyPayment && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="font-medium">
                        {formatCurrency(contract.monthlyPayment, currencySymbol)}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onDelete(contract.id)}
                className="px-3 py-1 rounded text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### 7. API 路由实现

#### 7.1 贷款合约 API

```typescript
// src/app/api/loan-contracts/route.ts
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const loanContract = await LoanContractService.createLoanContract(user.id, body)

    return successResponse({ loanContract })
  } catch (error) {
    console.error('创建贷款合约失败:', error)
    return errorResponse('创建失败')
  }
}

// src/app/api/accounts/[id]/loan-contracts/route.ts
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: accountId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const loanContracts = await LoanContractService.getAccountLoanContracts(user.id, accountId)

    return successResponse({ loanContracts })
  } catch (error) {
    console.error('获取贷款合约失败:', error)
    return errorResponse('获取失败')
  }
}
```

## 📋 功能整合总结

### 1. 用户登录同步机制

**核心特性**：

- ✅ 用户打开网站时自动触发同步
- ✅ 状态字段防止重复触发
- ✅ 异步处理，避免阻塞用户界面
- ✅ 完成后更新 UserDataContext
- ✅ 智能判断是否需要同步（6小时间隔）

**实现要点**：

```typescript
// 用户登录时自动调用
useEffect(() => {
  if (user && !lastRecurringSync) {
    syncRecurringTransactions()
  }
}, [user])

// 同步状态管理
const [recurringProcessingStatus, setRecurringProcessingStatus] = useState('idle')
// 状态: 'idle', 'processing', 'completed', 'failed'
```

### 2. 贷款合约功能

**设计决策**：

- ❌ **不复用** recurring_transactions 表
- ✅ **新建** loan_contracts 表
- ✅ **复用** 执行机制和同步服务

**原因分析**：

1. **字段差异大**：贷款有利率、本金、还款方式等特殊字段
2. **业务逻辑复杂**：需要计算本息分离、余额更新等
3. **扩展性更好**：独立表结构便于后续功能扩展
4. **数据清晰**：避免在通用表中混合不同业务逻辑

### 3. 统一处理架构

**处理流程**：

```
用户登录 → 触发同步API → 检查状态 → 异步处理
                                    ↓
                            处理定期交易 + 处理贷款合约
                                    ↓
                            更新状态 → 返回结果 → 更新Context
```

**优势**：

- 统一的状态管理
- 统一的错误处理
- 统一的进度跟踪
- 统一的用户体验

### 4. 数据库设计总览

**新增表结构**：

1. `user_settings` 扩展：添加同步状态字段
2. `recurring_processing_logs`：处理日志表
3. `loan_contracts`：贷款合约表
4. `loan_payments`：贷款还款记录表
5. `transactions` 扩展：添加贷款关联字段

**关系图**：

```
users
├── user_settings (扩展同步字段)
├── recurring_processing_logs
├── recurring_transactions (现有)
├── loan_contracts (新增)
│   └── loan_payments (新增)
└── transactions (扩展贷款字段)
```

### 5. 前端集成要点

**UserDataContext 扩展**：

- 同步状态管理
- 进度跟踪
- 自动触发机制
- 轮询状态更新

**新增组件**：

- LoanContractsList：贷款合约列表
- LoanContractModal：贷款合约创建/编辑
- SyncStatusIndicator：同步状态指示器

### 6. API 接口总览

**定期交易同步**：

- `POST /api/recurring-transactions/sync` - 触发同步
- `GET /api/recurring-transactions/sync/status` - 查询状态

**贷款合约管理**：

- `POST /api/loan-contracts` - 创建贷款合约
- `GET /api/accounts/{id}/loan-contracts` - 获取账户贷款合约
- `DELETE /api/loan-contracts/{id}` - 删除贷款合约

## 🚀 实施建议

### 阶段一：基础同步机制（2-3天）

1. 扩展数据库表结构
2. 实现 RecurringSyncService
3. 创建同步 API 接口
4. 扩展 UserDataContext

### 阶段二：贷款合约功能（3-4天）

1. 创建贷款相关数据表
2. 实现贷款计算和服务类
3. 创建贷款管理 API
4. 开发前端贷款组件

### 阶段三：集成测试（1-2天）

1. 端到端功能测试
2. 性能测试和优化
3. 错误处理完善
4. 用户体验优化

### 关键技术点

1. **异步处理**：使用 `setImmediate` 避免阻塞
2. **状态管理**：防止重复触发和并发问题
3. **事务处理**：确保数据一致性
4. **错误隔离**：单个失败不影响整体
5. **进度跟踪**：实时反馈处理状态

这个设计方案完美解决了您提出的两个需求：

1. ✅ 用户登录时的智能同步机制
2. ✅ 贷款合约的独立管理功能

同时保持了系统的整体一致性和可扩展性。

```

```

```

```
