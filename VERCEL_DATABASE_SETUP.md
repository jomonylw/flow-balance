# Vercel 数据库连接配置指南

## 🚨 解决 "Too Many Connections" 错误

如果您在 Vercel 部署时遇到 `FATAL: too many connections for role "prisma_migration"`
错误，请按照以下步骤配置：

## 📋 必需的环境变量配置

在 Vercel 项目设置中，确保设置以下环境变量：

### 1. 数据库连接 URL

```bash
DATABASE_URL=postgresql://username:password@hostname:port/database?pgbouncer=true&connection_limit=1&pool_timeout=20&connect_timeout=15&statement_timeout=60000
```

**关键参数说明：**

- `pgbouncer=true` - 启用 PgBouncer 连接池 (必须)
- `connection_limit=1` - 每个 serverless 函数最多 1 个连接 (必须)
- `pool_timeout=20` - 连接池超时 20 秒
- `connect_timeout=15` - 连接超时 15 秒
- `statement_timeout=60000` - 语句超时 60 秒

### 2. Prisma 优化配置

```bash
PRISMA_CLIENT_ENGINE_TYPE=binary
PRISMA_GENERATE_SKIP_AUTOINSTALL=true
```

### 3. Next.js 优化配置

```bash
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## 🔧 数据库提供商特定配置

### Supabase

```bash
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
```

### Neon

```bash
DATABASE_URL=postgresql://[user]:[password]@[neon-hostname]/[dbname]?pgbouncer=true&connection_limit=1
```

### PlanetScale

```bash
DATABASE_URL=mysql://[username]:[password]@[host]/[database]?sslaccept=strict&connection_limit=1
```

### Railway

```bash
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/railway?pgbouncer=true&connection_limit=1
```

## ⚡ Vercel 函数配置优化

我们已经在 `vercel.json` 中配置了以下优化：

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

## 🔍 故障排除

### 1. 检查连接池设置

确保您的数据库提供商支持连接池，并且已正确配置。

### 2. 验证环境变量

在 Vercel 部署日志中检查环境变量是否正确设置：

```bash
echo $DATABASE_URL
```

### 3. 监控连接数

使用数据库提供商的监控工具检查活跃连接数。

### 4. 测试健康检查

部署后访问 `/api/health/database` 端点检查数据库连接状态。

## 📚 相关文档

- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Connection Pooling Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)

## ✅ 验证清单

- [ ] DATABASE_URL 包含 `pgbouncer=true` 参数
- [ ] DATABASE_URL 包含 `connection_limit=1` 参数
- [ ] 所有必需的环境变量已在 Vercel 中设置
- [ ] 数据库提供商支持连接池
- [ ] 部署后 `/api/health/database` 返回正常状态
- [ ] 应用功能正常，无连接错误
