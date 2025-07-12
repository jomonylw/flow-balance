# Vercel 部署优化指南

## 问题分析

根据 Vercel 部署日志，主要问题包括：

1. **内存配置警告**: `vercel.json` 中的 `memory` 配置在新的 CPU 计费模式下被忽略
2. **数据库连接池问题**: 出现 "too many connections" 错误
3. **事务超时**: Prisma 事务默认超时 5 秒，数据导入操作超时
4. **长时间运行的导入操作**: 可能导致连接泄漏

## 解决方案

### 1. 更新 vercel.json 配置

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 60
    },
    "src/app/**/page.tsx": {
      "maxDuration": 30
    }
  }
}
```

- 移除了 `memory` 配置（在新计费模式下被忽略）
- 增加 API 函数的最大执行时间到 60 秒

### 2. 数据库连接优化

#### 连接池配置优化

- 降低最大连接数从 5 到 3，避免连接池耗尽
- 增加查询超时时间到 60 秒，支持长时间运行的操作
- 减少连接空闲超时时间到 30 秒，更快释放连接

#### PostgreSQL 连接参数优化

```
connection_limit=2
pool_timeout=15
connect_timeout=15
statement_timeout=120000
idle_in_transaction_session_timeout=180000
```

### 3. 专用导入连接管理

创建了 `src/lib/database/import-connection.ts`：

- 为数据导入操作提供专用的数据库连接
- 使用独立的连接配置，避免影响其他操作
- 自动管理连接的创建和清理
- 支持长时间运行的事务（5分钟超时）

### 4. 事务超时优化

- 使用专用的导入事务函数 `executeImportTransaction`
- 事务超时时间增加到 5 分钟
- 最大等待时间设置为 1 分钟

### 5. 错误处理优化

#### 安全的翻译函数

创建了 `getUserTranslatorSafe` 函数：

- 在数据库连接问题时返回默认翻译函数
- 避免在错误处理过程中再次查询数据库
- 减少连接池压力

#### 进度跟踪优化

- 使用 `Promise.resolve()` 替代 `setImmediate`
- 在错误情况下避免重复的数据库查询
- 优化错误处理流程

## 环境变量建议

### 必需的环境变量

```
DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=https://your-domain.vercel.app
```

### 可选的优化环境变量

```
# Prisma 优化
PRISMA_CLIENT_ENGINE_TYPE=binary

# Next.js 优化
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production

# 数据库连接优化（如果使用 PostgreSQL）
DATABASE_CONNECTION_LIMIT=2
DATABASE_POOL_TIMEOUT=15
DATABASE_STATEMENT_TIMEOUT=120000
```

## 部署检查清单

- [ ] 更新 `vercel.json` 配置
- [ ] 确保数据库连接字符串正确
- [ ] 验证环境变量设置
- [ ] 检查数据库连接池限制
- [ ] 测试数据导入功能
- [ ] 监控连接池使用情况

## 监控建议

1. **连接池监控**: 定期检查数据库连接数
2. **函数执行时间**: 监控 API 函数的执行时间
3. **错误率**: 关注数据库连接相关的错误
4. **内存使用**: 虽然不能配置，但要监控内存使用情况

## 已实施的优化

### 1. Vercel 配置优化

- ✅ 移除了被忽略的 `memory` 配置
- ✅ 增加 API 函数最大执行时间到 60 秒
- ✅ 保持页面函数执行时间为 30 秒

### 2. 数据库连接池优化

- ✅ 降低最大连接数从 5 到 3
- ✅ 增加查询超时时间到 60 秒
- ✅ 减少连接空闲超时时间到 30 秒
- ✅ 优化 PostgreSQL 连接参数

### 3. 专用导入连接管理

- ✅ 创建 `import-connection.ts` 专用连接管理器
- ✅ 实现 `executeImportTransaction` 函数
- ✅ 支持 5 分钟的长事务超时
- ✅ 自动连接创建和清理

### 4. 事务超时优化

- ✅ 数据导入使用专用事务函数
- ✅ 事务超时时间增加到 5 分钟
- ✅ 最大等待时间设置为 1 分钟

### 5. 错误处理优化

- ✅ 创建 `getUserTranslatorSafe` 安全翻译函数
- ✅ 在错误情况下避免重复数据库查询
- ✅ 使用 `Promise.resolve()` 替代 `setImmediate`

## 故障排除

### 连接池耗尽

- 检查是否有未正确关闭的连接
- 减少并发请求数量
- 考虑使用连接池代理（如 PgBouncer）

### 事务超时

- 检查导入数据的大小
- 考虑分批处理大量数据
- 优化数据库查询性能

### 函数超时

- 检查函数执行时间
- 考虑异步处理长时间运行的操作
- 使用队列系统处理大型任务

## 性能监控建议

### 关键指标

1. **数据库连接数**: 监控活跃连接数，确保不超过限制
2. **API 响应时间**: 特别关注数据导入相关的 API
3. **错误率**: 监控 P2037 (连接池) 和事务超时错误
4. **内存使用**: 虽然不能配置，但要监控使用情况

### 告警设置

- 连接数超过 80% 时告警
- API 响应时间超过 30 秒时告警
- 错误率超过 5% 时告警
