# Flow Balance GitHub 设置和 CI/CD 流水线配置指南

## 📋 目录

1. [准备工作](#准备工作)
2. [创建 GitHub 仓库](#创建-github-仓库)
3. [上传项目到 GitHub](#上传项目到-github)
4. [配置 GitHub Actions](#配置-github-actions)
5. [设置 Docker 镜像发布](#设置-docker-镜像发布)
6. [配置环境变量和密钥](#配置环境变量和密钥)
7. [测试 CI/CD 流水线](#测试-cicd-流水线)
8. [版本发布流程](#版本发布流程)
9. [故障排除](#故障排除)

## 🚀 准备工作

### 1. 检查项目状态

在上传到 GitHub 之前，确保项目处于良好状态：

```bash
# 进入项目目录
cd persional-balance-sheet

# 运行部署检查
./scripts/simple-check.sh

# 或者使用 Makefile
make deploy-check
```

### 2. 清理项目文件

```bash
# 清理构建文件和缓存
make clean

# 确保 .gitignore 文件正确配置
cat .gitignore
```

### 3. 检查敏感信息

```bash
# 确保没有敏感信息被提交
grep -r "password\|secret\|key" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md"

# 检查 .env 文件是否在 .gitignore 中
grep "\.env" .gitignore
```

## 📁 创建 GitHub 仓库

### 1. 在 GitHub 网站创建仓库

1. 访问 [GitHub](https://github.com)
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 填写仓库信息：
   - **Repository name**: `flow-balance`
   - **Description**: `Personal Finance Management System - 个人财务管理系统`
   - **Visibility**: 选择 Public 或 Private
   - **不要**勾选 "Add a README file"（我们已经有了）
   - **不要**勾选 "Add .gitignore"（我们已经有了）
   - **License**: 可选择 MIT License

4. 点击 "Create repository"

### 2. 记录仓库信息

创建完成后，记录以下信息：
- **仓库 URL**: `https://github.com/jomonylw/flow-balance`
- **Git URL**: `git@github.com:jomonylw/flow-balance.git`

## 📤 上传项目到 GitHub

### 1. 初始化 Git 仓库（如果还没有）

```bash
# 检查是否已经是 Git 仓库
git status

# 如果不是 Git 仓库，初始化
git init

# 设置默认分支为 main
git branch -M main
```

### 2. 配置 Git 用户信息

```bash
# 设置用户名和邮箱（如果还没设置）
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 或者只为当前项目设置
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 3. 添加远程仓库

```bash
# 添加 GitHub 远程仓库
git remote add origin https://github.com/jomonylw/flow-balance.git

# 或者使用 SSH（推荐，需要先配置 SSH 密钥）
git remote add origin git@github.com:jomonylw/flow-balance.git

# 验证远程仓库
git remote -v
```

### 4. 提交和推送代码

```bash
# 添加所有文件到暂存区
git add .

# 检查要提交的文件
git status

# 提交代码
git commit -m "feat: initial commit - Flow Balance personal finance management system

- Complete Next.js application with TypeScript
- Docker support with multi-stage builds
- PostgreSQL and SQLite database support
- GitHub Actions CI/CD pipeline
- Comprehensive deployment documentation
- Monitoring and backup scripts"

# 推送到 GitHub
git push -u origin main
```

## ⚙️ 配置 GitHub Actions

### 1. 验证 GitHub Actions 文件

确保以下文件存在并正确配置：

```bash
# 检查 CI/CD 配置文件
ls -la .github/workflows/

# 应该看到：
# - ci.yml
# - docker-build.yml
```

### 2. 更新 GitHub Actions 配置

编辑 `.github/workflows/docker-build.yml`，替换占位符：

```yaml
# 找到这一行并替换为您的实际仓库名
IMAGE_NAME: ${{ github.repository }}

# 确保镜像名称正确
images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
```

### 3. 检查工作流权限

在 GitHub 仓库中：
1. 进入 **Settings** > **Actions** > **General**
2. 在 "Workflow permissions" 部分选择：
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**

## 🐳 设置 Docker 镜像发布

### 1. 启用 GitHub Container Registry

1. 进入 GitHub 个人设置：**Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**
2. 点击 "Generate new token (classic)"
3. 设置权限：
   - ✅ `write:packages`
   - ✅ `read:packages`
   - ✅ `delete:packages`
4. 生成并保存 token

### 2. 配置包可见性

1. 在仓库页面，进入 **Settings** > **Actions** > **General**
2. 确保 "Fork pull request workflows from outside collaborators" 设置正确

### 3. 更新镜像引用

在所有文档中，将镜像引用更新为：
```bash
# 替换 jomonylw 为您的 GitHub 用户名
ghcr.io/jomonylw/flow-balance:latest
```

## 🔐 配置环境变量和密钥

### 1. 设置仓库密钥

在 GitHub 仓库中，进入 **Settings** > **Secrets and variables** > **Actions**：

#### Repository secrets（必需）
```bash
# 如果需要自定义 Docker registry（可选）
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password

# 如果需要部署到其他服务（可选）
VERCEL_TOKEN=your-vercel-token
```

#### Repository variables（可选）
```bash
# 应用配置
APP_NAME=flow-balance
DOCKER_IMAGE_NAME=flow-balance
```

### 2. 环境变量配置

对于不同环境，创建相应的环境变量文件：

```bash
# 开发环境 - .env.development
NODE_ENV=development
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=dev-jwt-secret-change-in-production

# 生产环境 - .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-production-jwt-secret-very-long-and-secure
```

## 🧪 测试 CI/CD 流水线

### 1. 触发第一次构建

```bash
# 推送代码触发 CI
git add .
git commit -m "ci: trigger initial GitHub Actions build"
git push origin main
```

### 2. 监控构建过程

1. 在 GitHub 仓库中，点击 **Actions** 标签
2. 查看正在运行的工作流
3. 点击工作流查看详细日志

### 3. 验证构建结果

构建成功后，检查：
- ✅ 所有测试通过
- ✅ Docker 镜像构建成功
- ✅ 镜像推送到 GitHub Container Registry

### 4. 查看发布的镜像

1. 在仓库主页，点击右侧的 **Packages**
2. 应该看到 `flow-balance` 包
3. 点击包名查看不同版本的镜像

## 🏷️ 版本发布流程

### 1. 使用自动化发布脚本

```bash
# 发布补丁版本（1.0.0 -> 1.0.1）
./scripts/release.sh patch

# 发布次版本（1.0.1 -> 1.1.0）
./scripts/release.sh minor

# 发布主版本（1.1.0 -> 2.0.0）
./scripts/release.sh major
```

### 2. 手动发布流程

```bash
# 1. 更新版本号
npm version patch  # 或 minor, major

# 2. 推送代码和标签
git push origin main
git push origin --tags

# 3. 在 GitHub 创建 Release
# 访问: https://github.com/jomonylw/flow-balance/releases/new
```

### 3. 验证发布

发布后检查：
- ✅ GitHub Release 页面有新版本
- ✅ Docker 镜像有新标签
- ✅ 可以拉取新镜像：`docker pull ghcr.io/jomonylw/flow-balance:v1.0.0`

## 📊 监控和维护

### 1. 设置通知

在 GitHub 仓库 **Settings** > **Notifications** 中：
- ✅ 启用 Actions 失败通知
- ✅ 启用安全警报
- ✅ 启用依赖更新通知

### 2. 定期维护

```bash
# 每周检查依赖更新
npm outdated

# 检查安全漏洞
npm audit

# 更新依赖
npm update
```

### 3. 监控镜像大小

```bash
# 检查镜像大小
docker images ghcr.io/jomonylw/flow-balance

# 清理旧镜像
docker image prune -f
```

## 🔧 故障排除

### 1. 常见构建问题

#### 问题：权限被拒绝
```bash
# 解决方案：检查 GitHub token 权限
# 确保在 Settings > Actions > General 中启用了写权限
```

#### 问题：Docker 构建失败
```bash
# 检查 Dockerfile 语法
docker build -t test-build .

# 查看详细错误日志
# 在 GitHub Actions 中点击失败的步骤查看日志
```

#### 问题：测试失败
```bash
# 本地运行测试
npm test

# 检查代码规范
npm run lint

# 类型检查
npm run type-check
```

### 2. 推送问题

#### 问题：推送被拒绝
```bash
# 可能是分支保护规则，检查：
# Settings > Branches > Branch protection rules

# 或者需要先拉取最新代码
git pull origin main --rebase
git push origin main
```

#### 问题：大文件推送失败
```bash
# 检查文件大小
find . -size +100M -not -path "./node_modules/*" -not -path "./.git/*"

# 使用 Git LFS 处理大文件
git lfs track "*.db"
git add .gitattributes
```

### 3. 镜像问题

#### 问题：无法拉取镜像
```bash
# 检查镜像是否存在
docker search ghcr.io/jomonylw/flow-balance

# 登录 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u jomonylw --password-stdin

# 拉取镜像
docker pull ghcr.io/jomonylw/flow-balance:latest
```

## 📚 相关资源

### GitHub 文档
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [创建 Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

### Docker 文档
- [Docker 多阶段构建](https://docs.docker.com/develop/dev-best-practices/dockerfile_best-practices/)
- [Docker Compose 文档](https://docs.docker.com/compose/)

### 项目相关文档
- [部署指南](DEPLOYMENT_GUIDE.md)
- [项目状态](../PROJECT_STATUS.md)
- [部署总结](../DEPLOYMENT_SUMMARY.md)

## ✅ 检查清单

完成以下步骤后，您的项目就完全配置好了：

- [ ] ✅ 创建 GitHub 仓库
- [ ] ✅ 上传代码到 GitHub
- [ ] ✅ 配置 GitHub Actions 权限
- [ ] ✅ 设置必要的密钥和变量
- [ ] ✅ 触发第一次 CI/CD 构建
- [ ] ✅ 验证 Docker 镜像发布成功
- [ ] ✅ 测试镜像拉取和运行
- [ ] ✅ 创建第一个版本发布
- [ ] ✅ 设置通知和监控

完成后，您就拥有了一个完全自动化的现代化项目！🎉
