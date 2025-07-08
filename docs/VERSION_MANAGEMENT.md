# Flow Balance - 版本管理和 Docker 镜像构建

## 📋 概述

Flow Balance 使用语义化版本控制 (Semantic Versioning) 和自动化 Docker 镜像构建流程。

## 🏷️ 版本号管理

### 版本号格式

采用 `MAJOR.MINOR.PATCH` 格式：

- **MAJOR**: 不兼容的 API 修改
- **MINOR**: 向下兼容的功能性新增
- **PATCH**: 向下兼容的问题修正

### 当前版本

```bash
# 查看当前版本信息
pnpm version:show
```

### 版本升级

```bash
# 升级补丁版本 (1.0.0 -> 1.0.1)
pnpm version:bump:patch

# 升级次版本 (1.0.0 -> 1.1.0)
pnpm version:bump:minor

# 升级主版本 (1.0.0 -> 2.0.0)
pnpm version:bump:major
```

## 🐳 Docker 镜像标签策略

### 自动生成的标签

#### 1. main 分支推送

当推送到 `main` 分支时，自动生成：

- `ghcr.io/jomonylw/flow-balance:latest`
- `ghcr.io/jomonylw/flow-balance:1.0.0` (package.json 版本)
- `ghcr.io/jomonylw/flow-balance:v1.0.0` (带 v 前缀)

#### 2. Git 标签推送

当推送 `v1.2.3` 格式的标签时，自动生成：

- `ghcr.io/jomonylw/flow-balance:1.2.3`
- `ghcr.io/jomonylw/flow-balance:1.2`
- `ghcr.io/jomonylw/flow-balance:1`
- `ghcr.io/jomonylw/flow-balance:latest`

#### 3. 分支推送

其他分支推送时生成：

- `ghcr.io/jomonylw/flow-balance:develop`
- `ghcr.io/jomonylw/flow-balance:feature-xxx`

### 支持的平台

- `linux/amd64`
- `linux/arm64`

## 🚀 发布流程

### 快速发布

```bash
# 完整发布流程 (版本升级 + 标签创建 + 推送)
pnpm release:patch   # 补丁版本发布
pnpm release:minor   # 次版本发布
pnpm release:major   # 主版本发布
```

### 手动发布步骤

1. **升级版本号**

   ```bash
   pnpm version:bump:patch
   ```

2. **创建 Git 标签**

   ```bash
   pnpm version:tag
   ```

3. **推送到远程仓库**

   ```bash
   git push origin main
   git push origin v1.0.1
   ```

4. **监控构建状态** 访问 [GitHub Actions](https://github.com/jomonylw/flow-balance/actions)
   查看构建进度

## 🔧 Docker 镜像使用

### 拉取镜像

```bash
# 拉取最新版本
docker pull ghcr.io/jomonylw/flow-balance:latest

# 拉取指定版本
docker pull ghcr.io/jomonylw/flow-balance:1.0.0

# 拉取指定平台
docker pull --platform linux/amd64 ghcr.io/jomonylw/flow-balance:latest
docker pull --platform linux/arm64 ghcr.io/jomonylw/flow-balance:latest
```

### 运行容器

```bash
# 基本运行
docker run -p 3000:3000 ghcr.io/jomonylw/flow-balance:latest

# 使用环境变量
docker run -p 3000:3000 \
  -e DATABASE_URL="file:/app/data/flow-balance.db" \
  -v $(pwd)/data:/app/data \
  ghcr.io/jomonylw/flow-balance:latest

# 使用 Docker Compose
docker-compose up -d
```

## 📦 版本信息嵌入

### 构建时信息

Docker 镜像构建时会嵌入以下信息：

- `NEXT_PUBLIC_APP_VERSION`: package.json 中的版本号
- `NEXT_PUBLIC_BUILD_DATE`: 构建日期
- `NEXT_PUBLIC_GIT_COMMIT`: Git 提交哈希

### 运行时访问

```javascript
// 在应用中访问版本信息
const version = process.env.NEXT_PUBLIC_APP_VERSION
const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE
const gitCommit = process.env.NEXT_PUBLIC_GIT_COMMIT
```

## 🛠️ 开发工具

### 版本管理脚本

```bash
# 显示帮助信息
./scripts/version-manager.sh help

# 显示当前版本
./scripts/version-manager.sh current

# 显示 Docker 标签策略
./scripts/version-manager.sh docker-tags
```

### 构建脚本

```bash
# 本地 Docker 构建
./scripts/docker-build.sh

# 构建并运行
./scripts/docker-run-simple.sh
```

## 🔍 故障排除

### 常见问题

1. **版本号不匹配**

   - 确保 package.json 中的版本号是最新的
   - 检查 Git 标签是否正确创建

2. **Docker 镜像构建失败**

   - 检查 GitHub Actions 日志
   - 验证 Dockerfile 语法
   - 确认所有必需文件存在

3. **平台支持问题**
   - 确保基础镜像支持目标平台
   - 检查 Docker Buildx 配置

### 调试命令

```bash
# 检查 Docker 镜像信息
docker manifest inspect ghcr.io/jomonylw/flow-balance:latest

# 查看镜像标签
docker images ghcr.io/jomonylw/flow-balance

# 检查容器版本信息
docker run --rm ghcr.io/jomonylw/flow-balance:latest node -e "
  console.log('Version:', process.env.NEXT_PUBLIC_APP_VERSION);
  console.log('Build Date:', process.env.NEXT_PUBLIC_BUILD_DATE);
  console.log('Git Commit:', process.env.NEXT_PUBLIC_GIT_COMMIT);
"
```

## 📚 相关文档

- [Docker 部署指南](./DOCKER_DEPLOYMENT.md)
- [GitHub Actions 配置](./.github/workflows/docker-build.yml)
- [语义化版本控制](https://semver.org/lang/zh-CN/)
- [Docker 多平台构建](https://docs.docker.com/build/building/multi-platform/)
