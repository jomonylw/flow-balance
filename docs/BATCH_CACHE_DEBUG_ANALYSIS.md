# 批量缓存调试分析

## 🚨 问题现象

修改为批量缓存策略后，缓存命中率直接降到 0%：

```
getCachedUserActiveCurrency: 0.0% (0/138)
getCachedUserExchangeRate: 0.0% (0/100)
```

## 🔍 可能的原因分析

### 1. **监控逻辑问题（最可能）**

#### 原始监控逻辑

```typescript
// 基于总执行时间判断缓存命中
if (executionTime < 5) {
  cacheLogger.logCacheHit(...)
} else {
  cacheLogger.logCacheMiss(...)
}
```

#### 批量缓存的执行流程

```typescript
const _getCachedUserActiveCurrency = async (userId, currencyCode) => {
  // 1. 调用批量缓存函数（可能命中或未命中）
  const currencyMap = await _getCachedUserAllActiveCurrencies(userId)

  // 2. 从 Map 中查找（总是很快，< 1ms）
  return currencyMap.get(currencyCode) || null
}
```

#### 问题分析

- **第一次调用**: `_getCachedUserAllActiveCurrencies` 缓存未命中 → 数据库查询 → 总时间 > 5ms
- **后续调用**: `_getCachedUserAllActiveCurrencies` 缓存命中 → 但仍需要 Map 查找 → 总时间可能 > 5ms

### 2. **缓存架构问题**

#### 当前架构

```typescript
// 包装器函数（被监控）
getCachedUserActiveCurrency(userId, currencyCode)
  ↓
// 内部函数（不是 nextCache）
_getCachedUserActiveCurrency(userId, currencyCode)
  ↓
// 真正的缓存函数
_getCachedUserAllActiveCurrencies(userId) // nextCache
```

#### 问题

- 监控的是包装器函数，但真正的缓存在更深层
- 包装器函数总是执行，包括 Map 查找时间
- 缓存命中检测基于错误的时间测量

### 3. **缓存键问题**

#### 理论上的问题

- 批量缓存函数的缓存键是 `['get-user-all-active-currencies']`
- 但监控显示的是 `get-user-active-currency-${userId}-${currencyCode}`
- 可能存在缓存键不匹配的问题

## ✅ 修复方案

### 1. **改进监控逻辑**

我已经实施了新的监控策略：

```typescript
const _getCachedUserActiveCurrency = async (userId, currencyCode) => {
  const startTime = performance.now()
  const currencyMap = await _getCachedUserAllActiveCurrencies(userId)
  const mapLookupTime = performance.now()
  const result = currencyMap.get(currencyCode) || null
  const endTime = performance.now()

  return {
    result,
    cacheTime: mapLookupTime - startTime,  // 批量缓存的时间
    totalTime: endTime - startTime         // 总时间
  }
}

// 包装器中基于 cacheTime 判断
if (cacheTime < 5) {
  cacheLogger.logCacheHit(...)  // 批量缓存命中
} else {
  cacheLogger.logCacheMiss(...) // 批量缓存未命中
}
```

### 2. **调试日志增强**

添加了详细的调试日志：

```typescript
if (process.env.NODE_ENV === 'development') {
  console.warn(
    `🔍 [BATCH CACHE] getCachedUserActiveCurrency: total=${totalTime.toFixed(2)}ms, cache=${cacheTime.toFixed(2)}ms, lookup=${lookupTime.toFixed(2)}ms`
  )
}
```

## 🧪 验证方法

### 1. **运行调试脚本**

```bash
node scripts/debug-batch-cache.js
```

**功能**:

- 重置缓存统计
- 执行单次和多次 API 调用
- 分析缓存命中情况
- 诊断批量缓存是否正常工作

### 2. **观察服务器日志**

查找以下日志：

```bash
🔍 [CACHE CALL] getCachedUserActiveCurrency: userId=xxx, currencyCode=xxx
🔍 [BATCH CACHE] getCachedUserActiveCurrency: total=XXms, cache=XXms, lookup=XXms
🎯 [CACHE HIT] getCachedUserActiveCurrency
❌ [CACHE MISS] getCachedUserActiveCurrency
```

### 3. **分析缓存时间**

**预期结果**:

- **第一次调用**: `cache=20-50ms` (数据库查询) → CACHE MISS
- **后续调用**: `cache=1-3ms` (缓存命中) → CACHE HIT

## 🎯 诊断指南

### 1. **如果仍然 0% 命中率**

可能的原因：

1. **阈值问题**: 缓存时间仍然 > 5ms
2. **架构问题**: 批量缓存函数本身有问题
3. **监控 bug**: 新的监控逻辑有错误

**解决方案**:

- 调整阈值到 10ms 或 15ms
- 检查批量缓存函数是否正确工作
- 验证监控逻辑的正确性

### 2. **如果部分命中**

可能的原因：

1. **预热不完整**: 某些数据没有被预热
2. **缓存失效**: 某些操作导致缓存失效
3. **参数变化**: 不同的参数组合

**解决方案**:

- 改进预热策略
- 检查缓存失效逻辑
- 分析参数模式

### 3. **如果高命中率**

说明批量缓存策略成功！

**后续优化**:

- 调整 TTL 设置
- 优化预热策略
- 监控生产环境性能

## 🔧 备选方案

### 如果批量缓存策略仍有问题

#### 方案1: 回退到原始策略 + 更长 TTL

```typescript
const _getCachedUserActiveCurrency = nextCache(
  async (userId: string, currencyCode: string) => {
    // 原始查询逻辑
  },
  ['get-user-active-currency'],
  { revalidate: 3600 } // 1小时 TTL
)
```

#### 方案2: 混合策略

```typescript
// 批量预热 + 单个缓存
await _getCachedUserAllActiveCurrencies(userId) // 预热
const result = await _getCachedUserActiveCurrency(userId, currencyCode) // 单个缓存
```

#### 方案3: 应用级缓存

```typescript
// 使用内存缓存 + Next.js 缓存
const memoryCache = new Map()
const getCachedUserActiveCurrency = async (userId, currencyCode) => {
  const key = `${userId}-${currencyCode}`
  if (memoryCache.has(key)) {
    return memoryCache.get(key)
  }

  const result = await dbQuery(...)
  memoryCache.set(key, result)
  return result
}
```

## 📊 预期结果

### 成功指标

- `getCachedUserActiveCurrency`: 0% → **80%+**
- `getCachedUserExchangeRate`: 0% → **80%+**
- 服务器日志显示正确的缓存命中/未命中

### 失败指标

- 命中率仍然是 0%
- 服务器日志显示异常
- API 响应时间没有改善

## ✅ 下一步行动

1. **立即运行调试脚本**:

   ```bash
   node scripts/debug-batch-cache.js
   ```

2. **观察服务器控制台日志**，查找：

   - `[BATCH CACHE]` 日志
   - `[CACHE CALL]` 日志
   - 缓存命中/未命中日志

3. **根据结果调整**:

   - 如果缓存时间 > 5ms，调整阈值
   - 如果批量缓存有问题，检查实现
   - 如果监控有 bug，修复逻辑

4. **验证最终效果**:
   ```bash
   curl http://localhost:3000/api/dev/cache-stats
   ```

**目标**: 确定批量缓存策略是真的有问题，还是只是监控统计的问题。
