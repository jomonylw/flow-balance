# 货币服务缓存使用指南

## 🎯 概述

本指南说明如何正确使用优化后的货币服务缓存功能，以及在开发和维护过程中需要注意的事项。

## 📚 核心函数使用

### 1. 基础货币查询

```typescript
import {
  getUserCurrencies,
  getUserCurrencyRecords,
  getUserExchangeRate,
} from '@/lib/services/currency.service'

// 获取用户货币列表（带缓存）
const currencies = await getUserCurrencies(userId)

// 获取用户货币记录（带缓存）
const currencyRecords = await getUserCurrencyRecords(userId)

// 获取汇率（带缓存）
const exchangeRate = await getUserExchangeRate(userId, 'USD', 'EUR')
```

### 2. 批量货币转换（重点优化）

```typescript
import { convertMultipleCurrencies } from '@/lib/services/currency.service'

// 批量转换（已优化，消除N+1查询）
const amounts = [
  { amount: 100, currency: 'USD' },
  { amount: 200, currency: 'EUR' },
  { amount: 300, currency: 'CNY' },
]

const results = await convertMultipleCurrencies(
  userId,
  amounts,
  'USD', // 目标货币
  new Date() // 可选：转换日期
)

// 结果包含所有转换信息
results.forEach(result => {
  if (result.success) {
    console.log(
      `${result.originalAmount} ${result.originalCurrency} = ${result.convertedAmount} ${result.targetCurrency}`
    )
  } else {
    console.error(`转换失败: ${result.error}`)
  }
})
```

## 🔄 缓存失效管理

### 1. 在 API 路由中使用

```typescript
import {
  revalidateUserCurrencyCache,
  revalidateExchangeRateCache,
  revalidateUserSettingsCache,
  revalidateAllCurrencyCache,
} from '@/lib/services/currency.service'

// 用户货币设置更新后
export async function PUT(request: NextRequest) {
  // ... 更新用户货币设置

  // 清除相关缓存
  revalidateUserCurrencyCache(user.id)

  return successResponse(result)
}
```

### 2. 缓存失效时机表

| 操作类型          | 影响的数据     | 推荐的缓存失效函数                                                            |
| ----------------- | -------------- | ----------------------------------------------------------------------------- |
| 添加/删除用户货币 | 用户货币列表   | `revalidateUserCurrencyCache(userId)`                                         |
| 更新/创建汇率     | 汇率数据       | `revalidateExchangeRateCache(userId)`                                         |
| 修改用户设置      | 用户设置       | `revalidateUserSettingsCache(userId)`                                         |
| 批量数据导入      | 所有相关数据   | `revalidateAllCurrencyCache()`                                                |
| 货币转换错误修复  | 汇率和货币数据 | `revalidateExchangeRateCache(userId)` + `revalidateUserCurrencyCache(userId)` |

## ⚡ 性能最佳实践

### 1. 批量操作优化

```typescript
// ✅ 推荐：使用批量转换
const results = await convertMultipleCurrencies(userId, amounts, baseCurrency)

// ❌ 避免：循环调用单个转换
const results = []
for (const amount of amounts) {
  const result = await convertCurrency(userId, amount.amount, amount.currency, baseCurrency)
  results.push(result)
}
```

### 2. 缓存预热策略

```typescript
// 在用户登录后预加载常用数据
async function preloadUserCurrencyData(userId: string) {
  // 预加载用户货币列表
  await getUserCurrencies(userId)

  // 预加载用户货币记录
  await getUserCurrencyRecords(userId)

  // 预加载常用汇率
  const currencies = await getUserCurrencies(userId)
  const baseCurrency = await getUserBaseCurrency(userId)

  for (const currency of currencies) {
    if (currency !== baseCurrency) {
      await getUserExchangeRate(userId, currency, baseCurrency)
    }
  }
}
```

## 🐛 故障排除

### 1. 缓存不生效

**症状**: API 响应时间没有改善 **可能原因**:

- 缓存标签配置错误
- TTL 设置过短
- 频繁的缓存失效

**解决方案**:

```typescript
// 检查缓存配置
console.log('缓存配置:', CACHE)

// 在开发环境查看缓存失效日志
if (process.env.NODE_ENV === 'development') {
  console.warn('缓存已清除:', cacheTag)
}
```

### 2. 数据不一致

**症状**: 显示的数据与数据库不符 **可能原因**:

- 数据更新后未清除缓存
- 缓存失效函数调用错误

**解决方案**:

```typescript
// 数据更新后立即清除相关缓存
await updateUserCurrency(userId, currencyData)
revalidateUserCurrencyCache(userId) // 立即清除

// 或者使用全量清除（安全但性能较低）
revalidateAllCurrencyCache()
```

### 3. 内存使用过高

**症状**: 应用内存使用持续增长 **可能原因**:

- 缓存 TTL 设置过长
- 缓存数据量过大

**解决方案**:

```typescript
// 调整缓存时间
const CACHE = {
  USER_DATA_TTL: 5 * 60 * 1000, // 减少到5分钟
  EXCHANGE_RATE_TTL: 30 * 60 * 1000, // 减少到30分钟
}

// 定期清理缓存（在低峰期）
setInterval(
  () => {
    if (isLowTrafficPeriod()) {
      revalidateAllCurrencyCache()
    }
  },
  60 * 60 * 1000
) // 每小时检查一次
```

## 📊 监控和调试

### 1. 性能监控

```typescript
// 添加性能监控
const startTime = performance.now()
const result = await convertMultipleCurrencies(userId, amounts, baseCurrency)
const endTime = performance.now()

console.log(`批量转换耗时: ${endTime - startTime}ms`)
```

### 2. 缓存命中率监控

```typescript
// 在生产环境添加缓存统计
let cacheHits = 0
let cacheMisses = 0

// 在缓存函数中添加统计
if (cached) {
  cacheHits++
} else {
  cacheMisses++
}

// 定期报告
setInterval(
  () => {
    const hitRate = ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(1)
    console.log(`缓存命中率: ${hitRate}%`)
  },
  5 * 60 * 1000
) // 每5分钟报告一次
```

## 🔮 升级路径

### 1. 当前限制

- 内存缓存，应用重启后清空
- 单实例部署限制
- 适用于中小规模应用

### 2. 未来升级选项

#### 分布式缓存（Redis）

```typescript
// 未来可以迁移到 Redis
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export const getCachedData = async (key: string) => {
  const cached = await redis.get(key)
  return cached ? JSON.parse(cached) : null
}

export const setCachedData = async (key: string, data: any, ttl: number) => {
  await redis.setex(key, ttl, JSON.stringify(data))
}
```

#### 智能缓存策略

```typescript
// 基于使用频率调整 TTL
const getAdaptiveTTL = (accessCount: number) => {
  if (accessCount > 100) return 60 * 60 // 1小时
  if (accessCount > 10) return 30 * 60 // 30分钟
  return 10 * 60 // 10分钟
}
```

## ✅ 检查清单

部署前确认：

- [ ] 所有 API 路由已添加适当的缓存失效调用
- [ ] 缓存时间配置合理
- [ ] 错误处理完整
- [ ] 性能测试通过
- [ ] 向后兼容性确认

运行时监控：

- [ ] API 响应时间改善
- [ ] 数据库查询频率降低
- [ ] 内存使用稳定
- [ ] 缓存命中率 > 80%
- [ ] 数据一致性正常

## 📞 支持

如果遇到问题：

1. 查看开发环境的缓存日志
2. 运行性能测试脚本验证
3. 检查缓存失效调用是否正确
4. 考虑临时使用 `revalidateAllCurrencyCache()` 清除所有缓存

该缓存优化方案为货币服务提供了显著的性能提升，特别是解决了批量转换的 N+1 查询问题，为用户提供更好的体验。
