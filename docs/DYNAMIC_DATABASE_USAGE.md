# 🎯 Flow Balance - 动态数据库支持

## 概述

Flow Balance 现在支持**运行时动态数据库检测**，同一个 Docker 镜像可以根据 `DATABASE_URL`
环境变量自动选择使用 SQLite 或 PostgreSQL 数据库。

## ✨ 核心特性

- 🎯 **智能检测**：根据 `DATABASE_URL` 格式自动选择数据库类型
- 🔄 **动态切换**：运行时自动切换 Prisma schema
- 📦 **单一镜像**：一个镜像支持多种数据库
- 🚀 **零配置**：无需手动指定数据库类型

## 📊 支持的数据库格式

| 数据库类型     | URL 格式                    | 示例                                  |
| -------------- | --------------------------- | ------------------------------------- |
| **SQLite**     | `file:/path/to/database.db` | `file:/app/data/flow-balance.db`      |
| **PostgreSQL** | `postgresql://...`          | `postgresql://user:pass@host:5432/db` |
| **PostgreSQL** | `postgres://...`            | `postgres://user:pass@host:5432/db`   |

## 🚀 使用方法

### 方法一：SQLite（推荐用于个人使用）

```bash
# 使用 SQLite 数据库
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="file:/app/data/flow-balance.db" \
  -v flow-balance-data:/app/data \
  --restart unless-stopped \
  flow-balance:latest
```

**优点：**

- 无需外部数据库服务
- 数据文件直接存储在容器卷中
- 适合个人使用和小型部署

### 方法二：PostgreSQL（推荐用于生产环境）

```bash
# 使用 PostgreSQL 数据库
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://flowbalance:your_password@postgres:5432/flowbalance" \
  --restart unless-stopped \
  flow-balance:latest
```

**优点：**

- 更好的并发性能
- 支持复杂查询
- 适合生产环境和多用户场景

### 方法三：Docker Compose（推荐）

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  # SQLite 版本
  flow-balance-sqlite:
    image: flow-balance:latest
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=file:/app/data/flow-balance.db
    volumes:
      - flow-balance-data:/app/data
    restart: unless-stopped

  # PostgreSQL 版本
  flow-balance-postgres:
    image: flow-balance:latest
    ports:
      - '3001:3000'
    environment:
      - DATABASE_URL=postgresql://flowbalance:secure_password@postgres:5432/flowbalance
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=flowbalance
      - POSTGRES_USER=flowbalance
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  flow-balance-data:
  postgres-data:
```

启动服务：

```bash
# 启动 SQLite 版本
docker-compose up -d flow-balance-sqlite

# 启动 PostgreSQL 版本
docker-compose up -d flow-balance-postgres postgres

# 启动所有服务
docker-compose up -d
```

## 🔧 工作原理

### 启动流程

1. **检测阶段**：容器启动时检查 `DATABASE_URL` 格式
2. **Schema 切换**：根据检测结果自动选择正确的 Prisma schema
3. **客户端生成**：重新生成匹配的 Prisma 客户端
4. **数据库迁移**：运行数据库迁移创建表结构
5. **应用启动**：启动 Flow Balance 应用

### 日志示例

**SQLite 模式：**

```
📊 Detected SQLite database
✅ SQLite schema already active
🔄 Regenerating Prisma client for sqlite...
✅ Prisma client regenerated for sqlite
```

**PostgreSQL 模式：**

```
📊 Detected PostgreSQL database
🔄 Switching to PostgreSQL schema...
✅ PostgreSQL schema activated
🔄 Regenerating Prisma client for postgresql...
✅ Prisma client regenerated for postgresql
```

## 🛠️ 构建镜像

### 使用构建脚本

```bash
# 克隆项目
git clone https://github.com/jomonylw/flow-balance.git
cd flow-balance

# 构建支持动态检测的镜像
./scripts/docker-build.sh

# 或使用自定义名称和标签
./scripts/docker-build.sh --image myapp/flow-balance --tag v1.0.0
```

### 使用 Docker 命令

```bash
# 直接构建
docker build -t flow-balance:latest .
```

## 🔍 故障排查

### 常见问题

1. **数据库连接失败**

   ```bash
   # 检查容器日志
   docker logs flow-balance

   # 验证 DATABASE_URL 格式
   docker exec flow-balance env | grep DATABASE_URL
   ```

2. **Schema 切换失败**

   ```bash
   # 检查 schema 文件
   docker exec flow-balance ls -la prisma/

   # 查看当前 provider
   docker exec flow-balance grep "provider.*=" prisma/schema.prisma
   ```

3. **迁移失败**

   ```bash
   # 手动运行迁移
   docker exec flow-balance pnpm db:deploy

   # 重置数据库（谨慎使用）
   docker exec flow-balance pnpm db:reset
   ```

## 📈 性能对比

| 特性       | SQLite     | PostgreSQL |
| ---------- | ---------- | ---------- |
| 部署复杂度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| 性能       | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| 并发支持   | ⭐⭐       | ⭐⭐⭐⭐⭐ |
| 资源占用   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| 备份恢复   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ |

## 🎉 总结

通过动态数据库检测功能，Flow Balance 实现了：

- ✅ **一镜像多用**：同一个镜像支持不同数据库
- ✅ **智能切换**：根据 URL 自动选择数据库类型
- ✅ **简化部署**：无需构建多个版本的镜像
- ✅ **灵活配置**：运行时决定数据库类型

用户只需要修改 `DATABASE_URL` 环境变量就能在不同数据库之间切换！
