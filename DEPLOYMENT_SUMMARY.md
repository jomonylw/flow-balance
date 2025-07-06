# Flow Balance 部署总结

## 🎯 完成的功能

### ✅ Docker 支持
- **多阶段构建 Dockerfile**：优化镜像大小和安全性
- **Docker Compose 配置**：支持开发和生产环境
- **多数据库支持**：SQLite 和 PostgreSQL
- **健康检查**：自动监控应用状态
- **自动化脚本**：智能启动和数据库迁移

### ✅ Vercel 部署
- **一键部署**：通过 Deploy 按钮快速部署
- **vercel.json 配置**：优化的构建和运行时配置
- **环境变量管理**：安全的配置管理
- **自动 HTTPS**：免费 SSL 证书

### ✅ CI/CD 自动化
- **GitHub Actions**：完整的 CI/CD 流水线
- **自动测试**：代码质量检查和单元测试
- **Docker 镜像发布**：自动构建和推送到 GitHub Container Registry
- **版本管理**：基于 Git 标签的自动发布

### ✅ 数据库灵活性
- **SQLite**：适合个人使用和小型部署
- **PostgreSQL**：适合生产环境和多用户场景
- **一键切换**：通过脚本快速切换数据库类型
- **自动迁移**：容器启动时自动运行数据库迁移

### ✅ 开发体验
- **快速启动脚本**：交互式部署向导
- **Makefile**：简化常用操作
- **热重载**：开发环境支持代码热重载
- **开发工具**：集成 Prisma Studio 等工具

## 🚀 快速开始

### 方式一：Docker 一键部署（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd persional-balance-sheet

# 2. 运行快速启动脚本
./scripts/quick-start.sh

# 3. 按提示选择部署方式
# - SQLite（个人使用）
# - PostgreSQL（生产环境）
```

### 方式二：使用 Makefile

```bash
# 查看所有可用命令
make help

# 快速启动
make quick-start

# 开发环境
make docker-dev

# 生产环境
make docker-prod
```

### 方式三：Vercel 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jomonylw/flow-balance)

## 📋 部署选项对比

| 部署方式 | 适用场景 | 优点 | 缺点 | 成本 |
|---------|---------|------|------|------|
| **Docker + SQLite** | 个人使用、小团队 | 简单、快速、零配置 | 不支持高并发 | 免费 |
| **Docker + PostgreSQL** | 生产环境、多用户 | 高性能、支持并发 | 配置稍复杂 | 低成本 |
| **Vercel** | 快速原型、个人项目 | 零运维、自动扩展 | 数据库需额外配置 | 免费额度 |
| **传统服务器** | 企业部署、自定义需求 | 完全控制、高性能 | 需要运维知识 | 中等成本 |

## 🔧 配置文件说明

### Docker 相关文件
```
Dockerfile                 # 生产环境镜像构建
Dockerfile.dev            # 开发环境镜像构建
docker-compose.yml        # 生产环境编排
docker-compose.dev.yml    # 开发环境编排
docker-compose.override.yml # 本地开发覆盖配置
.dockerignore             # Docker 构建忽略文件
```

### 环境配置文件
```
.env.example              # 环境变量模板
.env.docker               # Docker 专用环境变量
vercel.json               # Vercel 部署配置
ecosystem.config.js       # PM2 进程管理配置
```

### 自动化脚本
```
scripts/quick-start.sh         # 快速启动向导
scripts/docker-entrypoint.sh  # Docker 容器启动脚本
scripts/switch-database.js    # 数据库切换脚本
scripts/backup-data.js        # 数据备份脚本
scripts/init-db.sql          # PostgreSQL 初始化脚本
```

### CI/CD 配置
```
.github/workflows/docker-build.yml  # Docker 构建和发布
.github/workflows/ci.yml           # 持续集成
```

## 🛠️ 常用命令

### 开发环境
```bash
# 本地开发
pnpm dev

# Docker 开发环境
make docker-dev
# 或
docker-compose -f docker-compose.dev.yml up

# 数据库管理
make db-studio
pnpm db:migrate
```

### 生产部署
```bash
# Docker 生产环境
make docker-prod
# 或
docker-compose up -d

# 传统部署
pnpm build
pnpm start

# Vercel 部署
pnpm deploy:vercel
```

### 数据库操作
```bash
# 切换到 PostgreSQL
make db-postgresql

# 切换到 SQLite
make db-sqlite

# 备份数据
make backup
# 或
node scripts/backup-data.js auto
```

### 监控和维护
```bash
# 健康检查
make health
curl http://localhost:3000/api/health

# 查看日志
docker-compose logs -f app

# 查看服务状态
docker-compose ps
```

## 🔒 安全配置

### 必需的环境变量
```bash
# 强制要求的安全配置
JWT_SECRET="至少32字符的随机字符串"
NEXTAUTH_SECRET="NextAuth专用密钥"
DATABASE_URL="数据库连接字符串"
```

### 生产环境建议
```bash
# 1. 使用强密码
JWT_SECRET=$(openssl rand -base64 32)

# 2. 启用 HTTPS
# 使用 Nginx + Let's Encrypt 或云服务商的 SSL

# 3. 限制数据库访问
# 只允许应用服务器 IP 访问数据库

# 4. 定期备份
# 设置自动备份任务

# 5. 监控日志
# 配置日志收集和告警
```

## 📊 性能优化

### Docker 优化
- 多阶段构建减少镜像大小
- 健康检查确保服务可用性
- 资源限制防止内存泄漏
- 日志轮转避免磁盘满载

### 数据库优化
- PostgreSQL 连接池配置
- 索引优化查询性能
- 定期备份和清理
- 监控连接数和查询性能

### 应用优化
- Next.js 静态生成
- 图片优化和懒加载
- API 响应缓存
- 代码分割和压缩

## 🆘 故障排除

### 常见问题
1. **容器启动失败**：检查环境变量和数据库连接
2. **数据库连接错误**：验证 DATABASE_URL 格式
3. **内存不足**：增加服务器内存或优化配置
4. **磁盘空间不足**：清理日志和旧镜像

### 获取帮助
- 查看日志：`docker-compose logs -f`
- 健康检查：`curl http://localhost:3000/api/health`
- 社区支持：GitHub Issues 和 Discussions

## 🎉 总结

Flow Balance 现在支持：

✅ **多种部署方式**：Docker、Vercel、传统服务器  
✅ **多数据库支持**：SQLite、PostgreSQL  
✅ **自动化 CI/CD**：GitHub Actions 完整流水线  
✅ **开发友好**：热重载、快速启动、丰富工具  
✅ **生产就绪**：健康检查、监控、备份、安全配置  
✅ **文档完善**：详细的部署指南和故障排除  

无论是个人使用还是企业部署，都能找到合适的解决方案！
