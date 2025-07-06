# Flow Balance 部署指南

## 🚀 快速部署（Docker）

Flow Balance 支持一键 Docker 部署，**无需复杂配置**。

### 🔑 自动化特性

- **JWT 密钥自动生成**：无需手动配置，首次启动时自动生成安全密钥
- **种子数据自动导入**：自动导入 34 种国际货币基础数据
- **智能初始化**：只在数据库为空时执行初始化，不影响现有数据

### 系统要求

- **Docker**: 20.10+
- **Docker Compose**: 1.29+
- **磁盘空间**: 至少 1GB 可用空间

### SQLite 部署（单机推荐）

```bash
# 克隆项目
git clone https://github.com/jomonylw/flow-balance.git
cd flow-balance

# 一键启动
docker-compose -f docker-compose.sqlite.yml up -d

# 访问应用
open http://localhost:3000
```

### PostgreSQL 部署（生产环境推荐）

```bash
# 启动应用（包含 PostgreSQL 数据库）
docker-compose -f docker-compose.postgresql.yml up -d
```

## 🔒 安全配置

### JWT 密钥管理

- **自动生成**：首次启动时自动生成 64 字节随机密钥
- **持久化存储**：保存在 `/app/data/.jwt-secret` 文件中
- **容器重启保持**：确保会话不会因重启而中断
- **无需用户配置**：完全自动化，提升用户体验

### 自定义 JWT 密钥（可选）

如果需要使用自定义密钥：

```yaml
environment:
  - JWT_SECRET=your-custom-secret-minimum-32-characters
```

## 🚨 故障排除

### 会话过期问题

**症状**：登录后立即提示"会话已过期"

**解决方案**：
1. 检查数据目录挂载：`ls -la ./data`
2. 重启容器重新生成密钥：`docker-compose restart`
3. 查看容器日志：`docker logs flow-balance-app`

## 开发环境设置

### 1. 克隆项目

```bash
git clone <repository-url>
cd persional-balance-sheet
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 环境变量配置

复制环境变量示例文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置必要的环境变量：

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. 数据库设置

```bash
# 生成 Prisma 客户端
pnpm db:generate

# 运行数据库迁移
pnpm db:migrate

# 填充种子数据
pnpm db:seed
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 生产环境部署

### 1. 数据库配置

#### PostgreSQL 设置

1. 创建 PostgreSQL 数据库
2. 获取数据库连接字符串
3. 更新环境变量

#### 使用 PostgreSQL schema

```bash
# 复制生产环境 schema
cp prisma/schema.production.prisma prisma/schema.prisma

# 或者直接修改 prisma/schema.prisma 中的 provider
# datasource db {
#   provider = "postgresql"
#   url      = env("DATABASE_URL")
# }
```

### 2. 环境变量配置

生产环境 `.env` 示例：

```env
NODE_ENV="production"
DATABASE_URL="postgresql://username:password@your-db-host:5432/flowbalance?schema=public"
JWT_SECRET="your-production-jwt-secret-very-long-and-secure"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### 3. 数据库迁移

```bash
# 生成 Prisma 客户端
npx prisma generate

# 部署数据库迁移
npx prisma migrate deploy

# 可选：填充基础数据（币种等）
npx prisma db seed
```

### 4. 构建应用

```bash
pnpm build
```

### 5. 启动生产服务器

```bash
pnpm start
```

## 部署平台指南

### Vercel 部署

1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量：
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL`
3. 部署设置：
   - Build Command: `pnpm build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

### Railway 部署

1. 连接 GitHub 仓库到 Railway
2. 添加 PostgreSQL 服务
3. 配置环境变量
4. 部署会自动触发

### Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install

COPY . .

RUN npx prisma generate
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

构建和运行：

```bash
docker build -t flow-balance .
docker run -p 3000:3000 --env-file .env flow-balance
```

## 数据库管理

### 查看数据库

```bash
npx prisma studio
```

### 重置数据库（开发环境）

```bash
pnpm db:reset
```

### 备份数据库

```bash
# PostgreSQL
pg_dump $DATABASE_URL > backup.sql

# SQLite
cp prisma/dev.db backup.db
```

## 安全注意事项

1. **JWT Secret**: 使用强随机字符串，至少32字符
2. **数据库密码**: 使用强密码
3. **HTTPS**: 生产环境必须使用HTTPS
4. **环境变量**: 不要将敏感信息提交到版本控制
5. **CORS**: 配置适当的CORS策略

## 监控和日志

### 错误监控

推荐集成：

- Sentry (错误追踪)
- LogRocket (用户会话录制)

### 性能监控

- Vercel Analytics
- Google Analytics
- New Relic

## 维护

### 定期任务

1. 数据库备份
2. 日志清理
3. 安全更新
4. 性能监控

### 更新部署

```bash
git pull origin main
pnpm install
npx prisma migrate deploy
pnpm build
pnpm start
```

## 故障排除

### 常见问题

1. **数据库连接失败**

   - 检查 DATABASE_URL 格式
   - 确认数据库服务运行
   - 检查网络连接

2. **Prisma 错误**

   - 运行 `npx prisma generate`
   - 检查 schema.prisma 语法
   - 确认迁移状态

3. **JWT 错误**

   - 检查 JWT_SECRET 配置
   - 确认令牌格式正确

4. **构建失败**
   - 检查 TypeScript 错误
   - 确认所有依赖已安装
   - 检查环境变量

### 日志查看

```bash
# 查看应用日志
pm2 logs

# 查看数据库日志
tail -f /var/log/postgresql/postgresql.log
```

## 支持

如有问题，请查看：

1. 项目 README.md
2. GitHub Issues
3. Prisma 文档
4. Next.js 文档
