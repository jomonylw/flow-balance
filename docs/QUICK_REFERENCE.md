# Flow Balance 快速参考指南

## 🚀 一键命令

```bash
# 🎯 最快开始方式
git clone https://github.com/jomonylw/flow-balance.git
cd flow-balance
./scripts/quick-start.sh

# 🐳 Docker 快速运行
docker run -p 3000:3000 ghcr.io/jomonylw/flow-balance:latest
```

## 📋 常用命令速查

### 开发环境

```bash
# 本地开发
make dev                    # 启动开发服务器
make install               # 安装依赖
make db-migrate            # 数据库迁移
make db-studio             # 打开数据库管理界面

# Docker 开发
make docker-dev            # 启动 Docker 开发环境
make docker-down-dev       # 停止开发环境
```

### 生产部署

```bash
# Docker 部署
make docker-prod           # 启动生产环境
make docker-down           # 停止服务
make docker-logs-compose   # 查看日志

# 传统部署
make build                 # 构建应用
make start                 # 启动生产服务器
```

### 监控和维护

```bash
# 健康检查
make health                # 检查应用状态
make monitor               # 启动监控
make monitor-check         # 完整系统检查

# 数据管理
make backup                # 备份数据
make db-reset              # 重置数据库
```

### 版本发布

```bash
# 自动发布
make release-patch         # 发布补丁版本 (1.0.0 -> 1.0.1)
make release-minor         # 发布次版本 (1.0.0 -> 1.1.0)
make release-major         # 发布主版本 (1.0.0 -> 2.0.0)

# 部署检查
make deploy-check          # 部署前检查
make prod-ready            # 生产环境准备
```

## 🐳 Docker 命令速查

### 基础操作

```bash
# 构建镜像
docker build -t flow-balance .

# 运行容器 (SQLite)
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e JWT_SECRET="your-secret" \
  -v flow-balance-data:/app/data \
  ghcr.io/jomonylw/flow-balance:latest

# 运行容器 (PostgreSQL)
docker run -d \
  --name flow-balance \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret" \
  ghcr.io/jomonylw/flow-balance:latest
```

### Docker Compose

```bash
# 启动服务
docker-compose up -d                    # 后台启动
docker-compose -f docker-compose.dev.yml up  # 开发环境

# 管理服务
docker-compose ps                       # 查看状态
docker-compose logs -f app             # 查看日志
docker-compose restart app             # 重启应用
docker-compose down                     # 停止服务
```

### 镜像管理

```bash
# 拉取镜像
docker pull ghcr.io/jomonylw/flow-balance:latest
docker pull ghcr.io/jomonylw/flow-balance:v1.0.0

# 查看镜像
docker images | grep flow-balance

# 清理镜像
docker image prune -f
```

## 🔧 环境变量速查

### 必需变量

```bash
DATABASE_URL="file:./data/production.db"                    # SQLite
DATABASE_URL="postgresql://user:pass@host:5432/db"          # PostgreSQL
JWT_SECRET="your-secure-jwt-secret-minimum-32-characters"   # JWT 密钥
```

### 可选变量

```bash
NODE_ENV="production"                                        # 环境
NEXT_PUBLIC_APP_URL="https://your-domain.com"              # 应用 URL
NEXTAUTH_SECRET="your-nextauth-secret"                      # NextAuth 密钥
REDIS_URL="redis://localhost:6379"                         # Redis 缓存
```

### Docker 专用

```bash
POSTGRES_DB="flowbalance"                                   # 数据库名
POSTGRES_USER="flowbalance"                                 # 数据库用户
POSTGRES_PASSWORD="your-secure-password"                    # 数据库密码
```

## 📊 监控命令速查

### 健康检查

```bash
# API 健康检查
curl http://localhost:3000/api/health

# 使用监控脚本
./scripts/monitor.sh health             # 仅健康检查
./scripts/monitor.sh check              # 完整检查
./scripts/monitor.sh monitor            # 持续监控
```

### 日志查看

```bash
# Docker 容器日志
docker logs -f flow-balance

# Docker Compose 日志
docker-compose logs -f app
docker-compose logs --tail=100 app

# 系统日志
journalctl -u flow-balance -f
```

### 性能监控

```bash
# 容器资源使用
docker stats flow-balance

# 系统资源
htop
free -h
df -h
```

## 🗄️ 数据库命令速查

### Prisma 操作

```bash
# 生成客户端
pnpm db:generate

# 数据库迁移
pnpm db:migrate                         # 开发环境迁移
pnpm db:deploy                          # 生产环境迁移

# 数据库管理
pnpm db:studio                          # 打开管理界面
pnpm db:seed                            # 填充种子数据
pnpm db:reset                           # 重置数据库
```

### 数据库切换

```bash
# 切换数据库类型
node scripts/switch-database.js sqlite      # 切换到 SQLite
node scripts/switch-database.js postgresql  # 切换到 PostgreSQL
```

### 备份恢复

```bash
# 自动备份
node scripts/backup-data.js auto           # 自动检测类型
node scripts/backup-data.js sqlite         # SQLite 备份
node scripts/backup-data.js postgresql     # PostgreSQL 备份

# 备份管理
node scripts/backup-data.js list           # 列出备份
node scripts/backup-data.js cleanup        # 清理旧备份
```

## 🔄 Git 和 CI/CD 速查

### Git 操作

```bash
# 基础操作
git add .
git commit -m "feat: add new feature"
git push origin main

# 分支操作
git checkout -b feature/new-feature
git merge main
git push origin feature/new-feature
```

### 版本发布

```bash
# 使用发布脚本
./scripts/release.sh patch             # 补丁版本
./scripts/release.sh minor             # 次版本
./scripts/release.sh major             # 主版本

# 手动发布
npm version patch
git push origin --tags
```

### CI/CD 监控

```bash
# GitHub Actions 状态
# 访问: https://github.com/jomonylw/flow-balance/actions

# 查看构建日志
# 点击具体的工作流查看详细日志

# 重新运行失败的工作流
# 在 Actions 页面点击 "Re-run jobs"
```

## 🚨 故障排除速查

### 常见问题

```bash
# 容器启动失败
docker logs flow-balance                # 查看错误日志
docker exec -it flow-balance sh        # 进入容器调试

# 数据库连接失败
echo $DATABASE_URL                     # 检查连接字符串
psql $DATABASE_URL -c "SELECT 1;"      # 测试连接

# 端口冲突
lsof -i :3000                          # 查看端口占用
kill -9 $(lsof -t -i:3000)            # 杀死占用进程
```

### 重置和清理

```bash
# 重置 Docker 环境
docker-compose down -v                 # 停止并删除卷
docker system prune -a                 # 清理所有资源

# 重置项目
make clean                             # 清理构建文件
rm -rf node_modules                    # 删除依赖
pnpm install                           # 重新安装
```

## 📚 文档链接速查

| 文档        | 用途               | 链接                                                     |
| ----------- | ------------------ | -------------------------------------------------------- |
| 快速开始    | 项目介绍和基础使用 | [README.md](../README.md)                                |
| GitHub 设置 | 仓库创建和配置     | [GITHUB_SETUP_GUIDE.md](GITHUB_SETUP_GUIDE.md)           |
| 分步部署    | 详细操作指南       | [STEP_BY_STEP_DEPLOYMENT.md](STEP_BY_STEP_DEPLOYMENT.md) |
| CI/CD 配置  | 流水线详细说明     | [CICD_CONFIGURATION.md](CICD_CONFIGURATION.md)           |
| 部署指南    | 完整部署文档       | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)               |
| 项目状态    | 功能完成情况       | [PROJECT_STATUS.md](../PROJECT_STATUS.md)                |

## 🆘 获取帮助

```bash
# 查看帮助
make help                              # Makefile 命令帮助
./scripts/quick-start.sh --help        # 快速启动帮助
./scripts/monitor.sh help              # 监控脚本帮助

# 在线资源
# GitHub Issues: https://github.com/jomonylw/flow-balance/issues
# GitHub Discussions: https://github.com/jomonylw/flow-balance/discussions
```

---

💡 **提示**: 将 `jomonylw` 替换为您的实际 GitHub 用户名
