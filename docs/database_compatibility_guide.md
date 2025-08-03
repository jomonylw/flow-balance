# Postgre & SQLite 数据库兼容性改造要点指南

## 1. 概述

本项目为实现对 PostgreSQL 和 SQLite 的双重支持，在数据查询层（`src/lib/database/queries/`）进行了一系列关键的适配改造。通过在运行时检测数据库类型并执行相应的原生 SQL 查询，项目成功解决了两种数据库在 SQL 方言、函数支持、数据类型处理及标识符引用等方面的差异。

本文档旨在总结这些核心改造点，为后续的开发和维护提供清晰的指引。

---

## 2. 核心兼容性策略

### 2.1. 运行时数据库检测

所有需要兼容处理的查询都包裹在一个条件块中，通过 `isPostgreSQL()`
辅助函数在运行时判断当前数据库类型，然后执行对应的 SQL 语句。

```typescript
import { isPostgreSQL } from './system.queries'

if (isPostgreSQL()) {
  // PostgreSQL-specific native SQL query
} else {
  // SQLite-specific native SQL query
}
```

### 2.2. SQL 标识符引用 (Identifier Quoting)

为确保跨数据库的正确性，原生查询中的表名和列名引用方式有所不同。

- **PostgreSQL**: 采用双引号 (`"`) 包裹所有标识符，如 `t."accountId"`,
  `"transactions"`。这是因为 PostgreSQL 对未引用的标识符会统一转为小写，使用引号可以保留原始的大小写，是更安全的做法。
- **SQLite**: 直接使用标识符，无需引号，如 `t.accountId`, `transactions`。

---

## 3. 关键技术点详解

### 3.1. 日期与时间处理

日期和时间函数是两种数据库差异最大的地方。

- **月份生成与格式化**:

  - **PostgreSQL**: 使用 `to_char(date, 'YYYY-MM')`, `date_trunc('month', ...)` 和
    `interval '1 month'`。
  - **SQLite**: 使用 `strftime('%Y-%m', ...)` 和 `date(..., '+1 month')`。

- **日期数据类型与时间戳 (关键修正)**:
  - **问题**: Prisma 的 `DateTime`
    类型在 SQLite 中默认存储为文本，但在不同驱动和版本下行为可能不一致，直接比较容易出错。
  - **解决方案**: 在 SQLite 中，所有 `DateTime` 字段都以 **Unix 时间戳 (毫秒)** 的形式存储（`BigInt`
    类型）。
  - **适配**:
    - 在 SQLite 查询中，使用 `t.date/1000, 'unixepoch'` 的模式将毫秒时间戳转换为秒，供 `strftime`
      等函数使用。
    - 在向查询传递日期参数时，应用层会调用 `.getTime()` 将 `Date`
      对象转换为毫秒时间戳，确保 WHERE 条件中的比较是纯数字比较。

### 3.2. 高级 SQL 功能模拟 (`DISTINCT ON`)

`net-worth` 接口需要获取每个账户在每个月末的最后一条余额记录。

- **PostgreSQL**: 直接使用其独有的 `DISTINCT ON (partition_column)` 语法，简洁高效。
- **SQLite**: 通过标准的 **窗口函数 `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)`**
  来模拟。通过为数据分区、排序、编号，然后筛选出 `rn = 1` 的记录，实现了与 `DISTINCT ON`
  完全相同的逻辑。这是跨数据库兼容的推荐方案。

**示例 (`getNetWorthHistory` in `account.queries.ts`):**

```sql
-- SQLite version
SELECT ...
FROM (
  SELECT
    ...,
    ROW_NUMBER() OVER(PARTITION BY ame.account_id, ame.currency_id, ame.month ORDER BY t.date DESC) as rn
  FROM ...
)
WHERE rn = 1
```

### 3.3. 数据类型安全转换 (Prisma & BigInt)

- **问题**: 原生 SQL 查询返回的聚合结果（如 `SUM`）在 SQLite 中可能是一个 `Decimal`
  类型。当 Prisma 尝试将这个值反序列化时，会试图将其转换为 `BigInt`，如果转换失败则可能导致
  `RangeError`。

- **解决方案**:
  1.  在 SQLite 的原生查询中，使用 `CAST(value AS TEXT)` 将最终的计算结果显式转换为字符串。
  2.  在应用层，Prisma 会自动将这个文本格式的数字正确地解析为 JavaScript 的 `number`
      类型，从而绕过了 `BigInt` 的转换问题。如果需要手动处理，可以提供一个通用的
      `convertToNumber(value: any)` 辅助函数。

**示例 (`getMonthlyStockSummary` in `report.queries.ts`):**

```sql
-- SQLite query
SELECT CAST(COALESCE((SELECT amount ...), 0) AS TEXT) as balance_amount ...

// Application layer
// Prisma handles the conversion automatically when fetching the data.
const monthlyBalanceData = await getMonthlyStockSummary(...)
// row.balanceAmount is now a number
```

### 3.4. 应用层数据处理逻辑

在处理从数据库获取的数据时，必须警惕由迭代顺序不一致引起的问题，尤其是在进行批量操作（如货币转换）时。

- **问题**: 在 `stock-category-service.ts` 中，批量货币转换的计算结果不正确。
- **原因**: 构建转换请求数组的循环 (`for...of Object.values(data)`) 和应用转换结果的循环 (`for...of months`) 迭代顺序不一致，导致请求和结果通过数组索引匹配时发生错位。`Object.values`
  的顺序依赖于对象键的插入顺序（即数据库返回顺序），而月份数组是按时间排序的。
- **解决方案**: 确保构建请求和应用结果时，使用完全相同的、确定性的迭代顺序。

**示例 (`getStockCategorySummary` in `stock-category-service.ts`):**

```typescript
// Bad: Iteration orders may not match
const requests = []
for (const monthData of Object.values(accountDataByMonth)) {
  /* ... */
}
const results = await convert(requests)
let index = 0
for (const month of allMonths) {
  // ... apply results[index++]
}

// Good: Iteration orders are guaranteed to match
const requests = []
for (const month of allMonths) {
  // <-- Use the same iterator
  const monthData = accountDataByMonth[month] || {}
  for (const accountData of Object.values(monthData)) {
    // ... push to requests
  }
}
const results = await convert(requests)
let index = 0
for (const month of allMonths) {
  // <-- Use the same iterator
  // ... apply results[index++]
}
```

---

## 4. 总结

通过上述策略，项目成功地在不引入额外 ORM 复杂性的前提下，实现了对两种主流数据库的高效和稳定支持。未来的数据库相关开发应遵循本文档总结的模式，同时注意应用层的数据处理逻辑，以确保代码的兼容性、正确性和可维护性。
