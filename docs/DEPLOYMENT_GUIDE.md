# Flow Balance 完整部署指南

## 📋 目录

1. [快速开始](#快速开始)
2. [Docker 部署](#docker-部署)
3. [Vercel 部署](#vercel-部署)
4. [传统服务器部署](#传统服务器部署)
5. [数据库配置](#数据库配置)
6. [环境变量配置](#环境变量配置)
7. [CI/CD 配置](#cicd-配置)
8. [监控和维护](#监控和维护)
9. [故障排除](#故障排除)

## 🚀 快速开始

### 最简单的部署方式

```bash
# 1. 使用 Docker（推荐）
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e JWT_SECRET="your-secure-jwt-secret-minimum-32-characters" \
  -v flow-balance-data:/app/data \
  ghcr.io/jomonylw/flow-balance:latest

# 2. 访问应用
open http://localhost:3000
```

### 一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jomonylw/flow-balance)

## 🐳 Docker 部署

### 方式一：使用预构建镜像

#### SQLite 版本（适合个人使用）

```bash
# 创建数据卷
docker volume create flow-balance-data

# 运行容器
docker run -d \
  --name flow-balance \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="file:./data/production.db" \
  -e JWT_SECRET="your-secure-jwt-secret-minimum-32-characters" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  -v flow-balance-data:/app/data \
  ghcr.io/jomonylw/flow-balance:latest

# 查看日志
docker logs -f flow-balance

# 健康检查
curl http://localhost:3000/api/health
```

#### PostgreSQL 版本（适合生产环境）

```bash
# 1. 创建网络
docker network create flow-balance-network

# 2. 启动 PostgreSQL
docker run -d \
  --name flow-balance-postgres \
  --network flow-balance-network \
  --restart unless-stopped \
  -e POSTGRES_DB=flowbalance \
  -e POSTGRES_USER=flowbalance \
  -e POSTGRES_PASSWORD=your_secure_password \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:15-alpine

# 3. 启动应用
docker run -d \
  --name flow-balance \
  --network flow-balance-network \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://flowbalance:your_secure_password@flow-balance-postgres:5432/flowbalance?schema=public" \
  -e JWT_SECRET="your-secure-jwt-secret-minimum-32-characters" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  ghcr.io/jomonylw/flow-balance:latest
```

### 方式二：使用 Docker Compose

#### 下载配置文件

```bash
# 创建项目目录
mkdir flow-balance && cd flow-balance

# 下载 Docker Compose 配置
curl -O https://raw.githubusercontent.com/jomonylw/flow-balance/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/jomonylw/flow-balance/main/.env.docker

# 复制环境变量文件
cp .env.docker .env
```

#### 配置环境变量

编辑 `.env` 文件：

```bash
# 基础配置
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 安全配置（必须修改）
JWT_SECRET=your-production-jwt-secret-very-long-and-secure-minimum-32-characters
NEXTAUTH_SECRET=your-nextauth-secret-change-this-in-production

# 数据库配置（选择一种）
# 选项 1: SQLite（简单部署）
DATABASE_URL=file:./data/production.db

# 选项 2: PostgreSQL（生产环境推荐）
# DATABASE_URL=postgresql://flowbalance:your_secure_password@postgres:5432/flowbalance?schema=public
# POSTGRES_DB=flowbalance
# POSTGRES_USER=flowbalance
# POSTGRES_PASSWORD=your_very_secure_password_change_this

# 可选配置
# REDIS_PASSWORD=your_redis_secure_password
```

#### 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down

# 停止并删除数据
docker-compose down -v
```

### 方式三：自定义构建

```bash
# 1. 克隆项目
git clone https://github.com/jomonylw/flow-balance.git
cd flow-balance

# 2. 构建镜像
docker build -t flow-balance:custom .

# 3. 运行容器
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="file:./data/production.db" \
  -e JWT_SECRET="your-secure-jwt-secret" \
  -v $(pwd)/data:/app/data \
  flow-balance:custom
```

## ☁️ Vercel 部署

### 方式一：一键部署

1. 点击部署按钮：[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jomonylw/flow-balance)
2. 连接 GitHub 账户
3. 配置环境变量
4. 点击部署

### 方式二：CLI 部署

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 克隆项目
git clone https://github.com/jomonylw/flow-balance.git
cd flow-balance

# 4. 部署项目
vercel

# 5. 配置环境变量
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add NEXTAUTH_SECRET

# 6. 生产部署
vercel --prod
```

### Vercel 环境变量配置

在 Vercel 控制台的 Settings > Environment Variables 中添加：

```bash
# 必需变量
DATABASE_URL=postgresql://username:password@your-postgres-url/flowbalance?sslmode=require
JWT_SECRET=your-production-jwt-secret-very-long-and-secure-minimum-32-characters
NEXTAUTH_SECRET=your-nextauth-secret-change-this-in-production

# 可选变量
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

### 数据库推荐

Vercel 部署推荐使用以下数据库服务：

- **Vercel Postgres**：官方 PostgreSQL 服务
- **PlanetScale**：无服务器 MySQL
- **Supabase**：开源 PostgreSQL
- **Railway**：简单的 PostgreSQL 托管

## 🖥️ 传统服务器部署

### 系统要求

- **操作系统**：Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js**：18.0+
- **内存**：最少 1GB，推荐 2GB+
- **存储**：最少 5GB，推荐 20GB+
- **数据库**：PostgreSQL 13+ 或 SQLite 3

### 部署步骤

#### 1. 环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 PostgreSQL（可选）
sudo apt install postgresql postgresql-contrib

# 安装 PM2（进程管理器）
npm install -g pm2
```

#### 2. 应用部署

```bash
# 1. 克隆代码
git clone https://github.com/jomonylw/flow-balance.git
cd flow-balance

# 2. 安装依赖
pnpm install --production

# 3. 配置环境变量
cp .env.example .env
nano .env

# 4. 数据库设置
pnpm db:generate
pnpm db:deploy

# 5. 构建应用
pnpm build

# 6. 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 3. Nginx 反向代理

```bash
# 安装 Nginx
sudo apt install nginx

# 配置 Nginx
sudo nano /etc/nginx/sites-available/flow-balance
```

Nginx 配置内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/flow-balance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

## 🗄️ 数据库配置

### SQLite 配置

适合个人使用和小型部署：

```bash
# 环境变量
DATABASE_URL="file:./data/production.db"

# 优点
- 零配置
- 文件存储
- 轻量级
- 适合单用户

# 缺点
- 不支持并发写入
- 不适合多用户
- 备份需要文件复制
```

### PostgreSQL 配置

推荐生产环境使用：

```bash
# 1. 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib

# 2. 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE flowbalance;
CREATE USER flowbalance WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE flowbalance TO flowbalance;
\q

# 3. 配置环境变量
DATABASE_URL="postgresql://flowbalance:your_secure_password@localhost:5432/flowbalance?schema=public"

# 4. 运行迁移
pnpm db:deploy
```

### 云数据库服务

#### Vercel Postgres

```bash
# 1. 在 Vercel 控制台创建 Postgres 数据库
# 2. 获取连接字符串
DATABASE_URL="postgres://username:password@ep-xxx.us-east-1.postgres.vercel-storage.com/verceldb?sslmode=require"
```

#### Supabase

```bash
# 1. 在 Supabase 创建项目
# 2. 获取连接字符串
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?schema=public"
```

#### PlanetScale

```bash
# 1. 创建 PlanetScale 数据库
# 2. 获取连接字符串
DATABASE_URL="mysql://username:password@aws.connect.psdb.cloud/database-name?sslaccept=strict"
```

## 🔧 环境变量配置

### 必需变量

```bash
# 数据库连接
DATABASE_URL="your-database-connection-string"

# JWT 密钥（至少 32 字符）
JWT_SECRET="your-super-secure-jwt-secret-minimum-32-characters-long"

# 应用 URL
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### 可选变量

```bash
# 认证配置
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://your-domain.com"

# 邮件配置
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="noreply@your-domain.com"

# Redis 缓存
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD="your-redis-password"

# 监控配置
LOG_LEVEL="info"
ENABLE_METRICS="true"
```

### 安全最佳实践

```bash
# 1. 使用强密码
JWT_SECRET=$(openssl rand -base64 32)

# 2. 限制数据库访问
# 只允许应用服务器 IP 访问数据库

# 3. 使用环境变量
# 不要在代码中硬编码敏感信息

# 4. 定期轮换密钥
# 建议每 90 天更换一次 JWT_SECRET
```

## 🔄 CI/CD 配置

### GitHub Actions

项目已包含完整的 CI/CD 配置：

```yaml
# .github/workflows/docker-build.yml
- 代码质量检查
- 自动化测试
- Docker 镜像构建
- 安全扫描
- 自动发布
```

### 自动部署流程

```bash
# 1. 推送代码到 main 分支
git push origin main

# 2. 创建版本标签
git tag v1.0.0
git push origin v1.0.0

# 3. 自动触发：
# - 构建 Docker 镜像
# - 推送到 GitHub Container Registry
# - 创建 GitHub Release
# - 发送通知
```

### 使用发布的镜像

```bash
# 查看可用版本
https://github.com/jomonylw/flow-balance/pkgs/container/flow-balance

# 拉取最新版本
docker pull ghcr.io/jomonylw/flow-balance:latest

# 拉取特定版本
docker pull ghcr.io/jomonylw/flow-balance:v1.0.0
```

## 📊 监控和维护

### 健康检查

```bash
# 应用健康检查
curl http://localhost:3000/api/health

# Docker 容器健康检查
docker ps --filter "name=flow-balance"

# 查看应用日志
docker logs -f flow-balance
```

### 备份策略

#### SQLite 备份

```bash
# 创建备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /app/data/production.db /backups/flowbalance_$DATE.db
find /backups -name "flowbalance_*.db" -mtime +7 -delete

# 设置定时任务
crontab -e
# 添加：0 2 * * * /path/to/backup-script.sh
```

#### PostgreSQL 备份

```bash
# 创建备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U flowbalance flowbalance > /backups/flowbalance_$DATE.sql
find /backups -name "flowbalance_*.sql" -mtime +7 -delete

# 设置定时任务
crontab -e
# 添加：0 2 * * * /path/to/backup-script.sh
```

### 性能监控

```bash
# 查看资源使用
docker stats flow-balance

# 查看数据库连接
# PostgreSQL
SELECT count(*) FROM pg_stat_activity WHERE datname = 'flowbalance';

# 查看应用指标
curl http://localhost:3000/api/metrics
```

### 日志管理

```bash
# 配置日志轮转
sudo nano /etc/logrotate.d/flow-balance

# 内容：
/var/log/flow-balance/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

## 🔧 故障排除

### 常见问题

#### 1. 数据库连接失败

```bash
# 检查数据库状态
docker ps | grep postgres

# 检查连接字符串
echo $DATABASE_URL

# 测试连接
psql $DATABASE_URL -c "SELECT 1;"
```

#### 2. 应用启动失败

```bash
# 查看详细日志
docker logs flow-balance

# 检查环境变量
docker exec flow-balance env | grep -E "(DATABASE_URL|JWT_SECRET)"

# 检查文件权限
docker exec flow-balance ls -la /app/data
```

#### 3. 内存不足

```bash
# 查看内存使用
docker stats --no-stream

# 增加 swap 空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 4. 磁盘空间不足

```bash
# 清理 Docker 镜像
docker system prune -a

# 清理日志文件
sudo journalctl --vacuum-time=7d

# 清理应用日志
docker exec flow-balance find /app -name "*.log" -mtime +7 -delete
```

### 获取帮助

- **GitHub Issues**: https://github.com/jomonylw/flow-balance/issues
- **文档**: https://github.com/jomonylw/flow-balance/docs
- **社区**: https://github.com/jomonylw/flow-balance/discussions

### 版本升级

```bash
# 1. 备份数据
./backup-script.sh

# 2. 拉取新版本
docker pull ghcr.io/jomonylw/flow-balance:latest

# 3. 停止旧容器
docker stop flow-balance

# 4. 启动新容器
docker run -d \
  --name flow-balance-new \
  -p 3000:3000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e JWT_SECRET="$JWT_SECRET" \
  -v flow-balance-data:/app/data \
  ghcr.io/jomonylw/flow-balance:latest

# 5. 验证新版本
curl http://localhost:3000/api/health

# 6. 删除旧容器
docker rm flow-balance
docker rename flow-balance-new flow-balance
```
