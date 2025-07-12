# Vercel 数据库连接优化指南

## 🚨 问题描述

在 Vercel 等 serverless 环境中部署时，可能会遇到以下数据库连接问题：

```
Error [PrismaClientInitializationError]: Too many database connections opened:
FATAL: too many connections for role "prisma_migration"
```

这是因为：

1. **Serverless 特性**：每个函数调用可能创建新的数据库连接
2. **连接池限制**：免费版数据库通常有连接数限制（如 10 个连接）
3. **并发请求**：多个并发请求会快速耗尽连接池

## 🔧 解决方案

### 1. 数据库连接优化

项目已实现以下优化措施：

#### 连接管理器 (`src/lib/database/connection-manager.ts`)

- **单例模式**：确保全局只有一个连接管理器实例
- **连接池限制**：最大连接数设置为 5（适合免费版数据库）
- **自动清理**：空闲连接自动断开（60秒超时）
- **连接复用**：在同一个 serverless 实例中复用连接

#### Prisma 客户端优化 (`src/lib/database/prisma.ts`)

- **全局实例**：在非生产环境中复用全局实例
- **连接参数**：针对 PostgreSQL 添加连接池参数
- **优雅关闭**：进程退出时正确断开连接

### 2. Vercel 配置优化

#### `vercel.json` 配置

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024,
      "regions": ["iad1"]
    },
    "src/app/**/page.tsx": {
      "maxDuration": 30,
      "memory": 1024,
      "regions": ["iad1"]
    }
  },
  "env": {
    "PRISMA_CLIENT_ENGINE_TYPE": "binary"
  }
}
```

### 3. 数据库连接字符串优化

#### PostgreSQL 连接参数

```bash
# 基础连接字符串
DATABASE_URL="postgresql://user:password@host:port/database"

# 优化后的连接字符串（自动添加）
DATABASE_URL="postgresql://user:password@host:port/database?connection_limit=3&pool_timeout=10&connect_timeout=10&statement_timeout=30000&idle_in_transaction_session_timeout=60000"
```

参数说明：

- `connection_limit=3`：每个实例最多 3 个连接
- `pool_timeout=10`：连接池超时 10 秒
- `connect_timeout=10`：连接超时 10 秒
- `statement_timeout=30000`：语句超时 30 秒
- `idle_in_transaction_session_timeout=60000`：空闲事务超时 60 秒

## 📊 监控和调试

### 1. 健康检查 API

访问以下端点监控数据库连接状态：

```bash
# 基础健康检查
curl https://your-app.vercel.app/api/health

# 详细数据库状态
curl https://your-app.vercel.app/api/health/database
```

### 2. 连接状态监控

健康检查 API 返回的连接信息：

```json
{
  "database": {
    "connectionManager": {
      "connected": true,
      "connectionCount": 2,
      "maxConnections": 5,
      "idleTime": "15s",
      "lastUsed": "2024-07-12T10:30:00.000Z"
    }
  }
}
```

### 3. 日志监控

在 Vercel 控制台查看函数日志：

```
✅ Database connection established (2/5)
🧹 Cleaned up idle database connection (1/5)
```

## 🚀 部署建议

### 1. 数据库提供商选择

**推荐的免费数据库服务**：

- **Supabase**：免费版提供 500MB 存储，100 个并发连接
- **PlanetScale**：免费版提供 5GB 存储，1000 个连接
- **Neon**：免费版提供 512MB 存储，100 个连接

### 2. 环境变量配置

在 Vercel 项目设置中配置：

```bash
DATABASE_URL="your-optimized-connection-string"
JWT_SECRET="your-secure-jwt-secret"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

### 3. 部署检查清单

- [ ] 数据库连接字符串已优化
- [ ] Vercel 函数配置已更新
- [ ] 健康检查 API 正常响应
- [ ] 连接数监控正常
- [ ] 无连接泄漏错误

## 🔍 故障排除

### 常见问题

1. **连接数仍然超限**

   - 检查是否有其他应用连接同一数据库
   - 降低 `connection_limit` 参数
   - 考虑升级数据库计划

2. **连接超时**

   - 增加 `connect_timeout` 和 `pool_timeout`
   - 检查数据库服务器状态
   - 确认网络连接稳定

3. **性能问题**
   - 监控查询执行时间
   - 优化数据库索引
   - 考虑添加缓存层

### 调试命令

```bash
# 本地测试连接
pnpm db:test

# 检查 Prisma 客户端
pnpm db:generate

# 查看连接状态
curl -I https://your-app.vercel.app/api/health
```

## 📈 性能优化建议

1. **连接池调优**：根据实际使用情况调整连接数限制
2. **查询优化**：使用索引和优化查询语句
3. **缓存策略**：对频繁查询的数据添加缓存
4. **监控告警**：设置连接数和响应时间告警
5. **定期维护**：定期清理无用连接和优化数据库

通过以上优化措施，可以有效解决 Vercel 部署中的数据库连接问题，确保应用稳定运行。
