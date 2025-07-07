# 🐳 Flow Balance - 简化 Docker 使用指南

## 🎯 设计理念

Flow Balance 的 Docker 镜像设计为"开箱即用"，用户无需复杂的配置即可快速启动和使用。

### ✨ 核心特性

- **零配置启动**：无需手动设置环境变量
- **智能检测**：自动检测访问地址和端口
- **安全默认值**：自动生成安全的认证密钥
- **持久化数据**：数据自动保存到 Docker 卷
- **健康检查**：内置应用健康监控

## 🚀 快速开始

### 方法一：使用预构建镜像（推荐）

```bash
# 1. 拉取镜像
docker pull jomonylw/flow-balance:latest

# 2. 一键启动
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -v flow-balance-data:/app/data \
  --restart unless-stopped \
  jomonylw/flow-balance:latest

# 3. 访问应用
open http://localhost:3000
```

### 方法二：使用简化脚本

```bash
# 1. 克隆项目（如果需要脚本）
git clone https://github.com/jomonylw/flow-balance.git
cd flow-balance

# 2. 运行简化脚本
./scripts/docker-run-simple.sh

# 或使用 Make 命令
make docker-run
```

### 方法三：从源码构建

```bash
# 1. 克隆项目
git clone https://github.com/jomonylw/flow-balance.git
cd flow-balance

# 2. 构建镜像（支持动态数据库检测）
./scripts/docker-build.sh

# 或使用传统方式构建
docker build -t flow-balance:latest .

# 3. 启动容器（SQLite）
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -v flow-balance-data:/app/data \
  -e DATABASE_URL="file:/app/data/flow-balance.db" \
  --restart unless-stopped \
  flow-balance:latest

# 或启动容器（PostgreSQL）
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  --restart unless-stopped \
  flow-balance:latest
```

## 🎯 动态数据库检测

Flow Balance 支持在**运行时**自动检测数据库类型，无需在构建时指定：

### 支持的数据库格式

| 数据库类型     | DATABASE_URL 格式                     | 自动行为                     |
| -------------- | ------------------------------------- | ---------------------------- |
| **SQLite**     | `file:/app/data/flow-balance.db`      | 自动切换到 SQLite schema     |
| **PostgreSQL** | `postgresql://user:pass@host:5432/db` | 自动切换到 PostgreSQL schema |
| **PostgreSQL** | `postgres://user:pass@host:5432/db`   | 自动切换到 PostgreSQL schema |

### 动态切换示例

```bash
# 同一个镜像，不同的数据库配置

# 使用 SQLite
docker run -d -p 3000:3000 \
  -e DATABASE_URL="file:/app/data/flow-balance.db" \
  -v flow-balance-data:/app/data \
  flow-balance:latest

# 使用 PostgreSQL
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@postgres:5432/flowbalance" \
  flow-balance:latest
```

## 🔧 智能配置说明

### 自动配置的内容

1. **认证密钥**：

   - `JWT_SECRET`：自动生成 64 字节随机密钥
   - `NEXTAUTH_SECRET`：自动生成 32 字节 Base64 密钥
   - 密钥持久化存储，重启容器不会丢失

2. **访问地址**：

   - 自动检测容器的访问地址
   - 支持代理和负载均衡器的 Header 检测
   - 默认绑定到 `0.0.0.0:3000`

3. **数据库**：
   - 🎯 **动态检测**：根据 `DATABASE_URL` 自动选择数据库类型
   - `file:/path/to/db.sqlite` → 自动使用 SQLite
   - `postgresql://...` → 自动使用 PostgreSQL
   - 自动创建数据库和表结构
   - 自动导入基础种子数据（货币信息等）

### 环境变量覆盖

如果需要自定义配置，可以通过环境变量覆盖：

```bash
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -e NEXT_PUBLIC_APP_URL="https://your-domain.com" \
  -v flow-balance-data:/app/data \
  flow-balance:latest
```

## 📊 容器管理

### 常用命令

```bash
# 查看容器状态
docker ps -f name=flow-balance

# 查看应用日志
docker logs -f flow-balance

# 重启容器
docker restart flow-balance

# 停止容器
docker stop flow-balance

# 删除容器（保留数据）
docker rm flow-balance

# 删除容器和数据
docker rm -f flow-balance
docker volume rm flow-balance-data
```

### 健康检查

```bash
# 检查应用健康状态
docker exec flow-balance curl -f http://localhost:3000/api/health

# 查看健康检查日志
docker inspect flow-balance | grep -A 10 "Health"
```

## 🔒 安全考虑

### 生产环境建议

1. **使用 HTTPS**：

```bash
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e NEXTAUTH_URL="https://your-domain.com" \
  -e NEXT_PUBLIC_APP_URL="https://your-domain.com" \
  flow-balance:latest
```

2. **使用外部数据库**：

```bash
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  flow-balance:latest
```

3. **限制容器权限**：

```bash
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  --user 1001:1001 \
  --read-only \
  --tmpfs /tmp \
  -v flow-balance-data:/app/data \
  flow-balance:latest
```

## 🐛 故障排查

### 常见问题

1. **端口被占用**：

```bash
# 查看端口占用
netstat -tuln | grep 3000

# 使用其他端口
docker run -p 3001:3000 ...
```

2. **容器启动失败**：

```bash
# 查看详细日志
docker logs flow-balance

# 检查镜像
docker images | grep flow-balance
```

3. **数据丢失**：

```bash
# 检查数据卷
docker volume ls | grep flow-balance

# 备份数据
docker run --rm -v flow-balance-data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .
```

## 📈 性能优化

### 资源限制

```bash
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  --memory=512m \
  --cpus=1.0 \
  -v flow-balance-data:/app/data \
  flow-balance:latest
```

### 使用 Docker Compose

```yaml
version: '3.8'
services:
  flow-balance:
    image: jomonylw/flow-balance:latest
    ports:
      - '3000:3000'
    volumes:
      - flow-balance-data:/app/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

volumes:
  flow-balance-data:
```

## 🎉 总结

通过智能配置和自动化脚本，Flow Balance 实现了真正的"开箱即用"体验：

- ✅ 无需手动配置环境变量
- ✅ 自动生成安全密钥
- ✅ 智能检测访问地址
- ✅ 一键启动和管理
- ✅ 数据持久化保护

用户只需要一条 `docker run` 命令就能启动完整的财务管理系统！
