# 重复数据处理策略

## 🎯 问题背景

在数据导入和批量操作中，由于 Prisma 的 `createMany()` 方法不支持 `skipDuplicates`
参数，我们需要实现自定义的重复数据处理策略。

## 📊 数据库约束分析

### TransactionTag 表约束

```sql
-- 复合唯一约束：同一交易不能重复添加同一标签
@@unique([transactionId, tagId])
```

### 重复数据的影响

- ❌ **没有处理重复数据时**：数据库抛出唯一约束错误，整个批量操作失败
- ✅ **正确处理重复数据后**：跳过重复项，继续处理其他数据

## 🚀 解决方案

### 1. 三层防护机制

#### 第一层：数据预处理去重

```typescript
/**
 * 移除重复的标签关联
 */
private static removeDuplicateTagAssociations(
  tagAssociations: Array<{ transactionId: string; tagId: string }>
): Array<{ transactionId: string; tagId: string }> {
  const seen = new Set<string>()
  const unique: Array<{ transactionId: string; tagId: string }> = []

  for (const association of tagAssociations) {
    const key = `${association.transactionId}-${association.tagId}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(association)
    }
  }

  return unique
}
```

#### 第二层：批量插入 + 错误捕获

```typescript
try {
  // 尝试批量插入
  await tx.transactionTag.createMany({
    data: uniqueTagAssociations,
  })
} catch (error) {
  // 如果失败，回退到逐条插入
  await this.createTagAssociationsIndividually(tx, uniqueTagAssociations, result)
}
```

#### 第三层：逐条插入 + 重复检测

```typescript
/**
 * 逐条创建标签关联（处理重复数据）
 */
private static async createTagAssociationsIndividually(
  tx: any,
  tagAssociations: Array<{ transactionId: string; tagId: string }>,
  result: ImportResult
): Promise<void> {
  let successCount = 0
  let skipCount = 0

  for (const association of tagAssociations) {
    try {
      await tx.transactionTag.create({
        data: association,
      })
      successCount++
    } catch (error) {
      // 检查是否是唯一约束错误
      if (error instanceof Error &&
          (error.message.includes('Unique constraint') ||
           error.message.includes('unique constraint') ||
           error.message.includes('UNIQUE constraint'))) {
        // 跳过重复的标签关联
        skipCount++
      } else {
        // 其他错误记录到结果中
        result.errors.push(
          `创建标签关联失败: ${error instanceof Error ? error.message : '未知错误'}`
        )
        result.statistics.failed++
      }
    }
  }

  if (skipCount > 0) {
    result.warnings.push(`跳过了 ${skipCount} 个重复的标签关联`)
  }
}
```

### 2. 使用示例

#### 数据导入服务中的应用

```typescript
// 去重处理：移除重复的标签关联
const uniqueTagAssociations = this.removeDuplicateTagAssociations(tagAssociations)

try {
  await tx.transactionTag.createMany({
    data: uniqueTagAssociations,
  })
} catch (error) {
  // 如果批量插入失败，尝试逐条插入以处理可能的重复数据
  console.warn('标签关联批量插入失败，尝试逐条插入:', error)
  await this.createTagAssociationsIndividually(tx, uniqueTagAssociations, result)
}
```

## 📈 性能对比

### 场景分析

| 场景       | 第一层去重 | 第二层批量 | 第三层逐条  | 总体性能   |
| ---------- | ---------- | ---------- | ----------- | ---------- |
| 无重复数据 | ✅ 快速    | ✅ 成功    | ❌ 不执行   | **最优**   |
| 少量重复   | ✅ 快速    | ❌ 失败    | ✅ 部分执行 | **良好**   |
| 大量重复   | ✅ 快速    | ❌ 失败    | ✅ 大量执行 | **可接受** |

### 性能优势

1. **最佳情况**：无重复数据时，只执行第一层和第二层，性能最优
2. **一般情况**：少量重复时，大部分数据通过批量插入，少量通过逐条插入
3. **最坏情况**：大量重复时，虽然需要逐条处理，但避免了整个操作失败

## 🔧 其他应用场景

### 1. 定期交易生成

```typescript
// future-data-generation.service.ts 中已经实现了重复检测
const existingTagAssociations = await tx.transactionTag.findMany({
  where: {
    transactionId: { in: createdTransactions.map(t => t.id) },
    tagId: { in: recurring.tagIds },
  },
})

const existingAssociationsSet = new Set(
  existingTagAssociations.map(a => `${a.transactionId}-${a.tagId}`)
)

// 只创建不存在的关联
const newTransactionTags = []
for (const transaction of createdTransactions) {
  for (const tagId of recurring.tagIds) {
    const associationKey = `${transaction.id}-${tagId}`
    if (!existingAssociationsSet.has(associationKey)) {
      newTransactionTags.push({
        transactionId: transaction.id,
        tagId: tagId,
      })
    }
  }
}
```

### 2. 单个交易创建

```typescript
// 使用 Prisma 的嵌套创建，自动处理关联
const transaction = await tx.transaction.create({
  data: {
    // ... 交易数据
    tags: {
      create: tagIds.map((tagId: string) => ({
        tagId,
      })),
    },
  },
})
```

## 💡 最佳实践建议

### 1. 选择合适的策略

- **数据导入**：使用三层防护机制（预处理 + 批量 + 逐条）
- **定期生成**：使用预查询 + 过滤的方式
- **单个操作**：使用 Prisma 嵌套创建

### 2. 性能优化

- 优先使用批量操作
- 预处理时去重，减少数据库压力
- 合理的错误处理和日志记录

### 3. 错误处理

- 区分唯一约束错误和其他错误
- 提供详细的统计信息（成功、跳过、失败）
- 记录警告信息，便于用户了解处理结果

### 4. 监控和日志

```typescript
console.log(`📊 标签关联处理: 成功 ${successCount} 个，跳过重复 ${skipCount} 个`)
result.warnings.push(`跳过了 ${skipCount} 个重复的标签关联`)
```

## 🎯 总结

通过实施三层防护机制，我们成功解决了 Prisma `createMany()` 不支持 `skipDuplicates` 的问题：

1. **提升性能**：大部分情况下使用高效的批量操作
2. **保证可靠性**：重复数据不会导致整个操作失败
3. **提供透明度**：详细的统计和日志信息
4. **灵活适应**：根据不同场景选择最适合的策略

这种方案在保证数据完整性的同时，最大化了批量操作的性能优势。
