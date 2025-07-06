# Flow Balance 分步部署实操指南

## 🎯 目标

本指南将带您完成从本地项目到 GitHub，再到自动化 CI/CD 和 Docker 镜像发布的完整流程。

## ⏱️ 预计时间

- **总时间**: 30-45 分钟
- **GitHub 设置**: 10 分钟
- **CI/CD 配置**: 15 分钟
- **测试验证**: 10-20 分钟

## 📋 准备清单

在开始之前，确保您有：

- [ ] GitHub 账户
- [ ] Git 已安装并配置
- [ ] 项目代码在本地
- [ ] Docker 已安装（可选，用于本地测试）

## 🚀 第一步：准备项目

### 1.1 检查项目状态

```bash
# 进入项目目录
cd persional-balance-sheet

# 检查 Git 状态
git status

# 如果不是 Git 仓库，初始化
git init
git branch -M main
```

### 1.2 清理和检查文件

```bash
# 清理构建文件
rm -rf .next node_modules/.cache

# 检查 .gitignore 文件
cat .gitignore | grep -E "(\.env|node_modules|\.next)"

# 确保敏感文件不会被提交
ls -la | grep "\.env"
```

### 1.3 验证关键文件存在

```bash
# 检查必需的文件
ls -la .github/workflows/
ls -la Dockerfile docker-compose.yml
ls -la package.json prisma/schema.prisma
```

## 🏗️ 第二步：创建 GitHub 仓库

### 2.1 在 GitHub 网站创建仓库

1. 访问 https://github.com/new
2. 填写信息：

   ```
   Repository name: flow-balance
   Description: Personal Finance Management System - 个人财务管理系统
   Visibility: Public (推荐) 或 Private

   ❌ 不要勾选 "Add a README file"
   ❌ 不要勾选 "Add .gitignore"
   ✅ 可以选择 MIT License
   ```

3. 点击 "Create repository"

### 2.2 记录仓库信息

```bash
# 替换 jomonylw 为您的 GitHub 用户名
GITHUB_USERNAME="jomonylw"
REPO_NAME="flow-balance"
REPO_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"

echo "仓库 URL: $REPO_URL"
```

## 📤 第三步：上传代码到 GitHub

### 3.1 配置 Git（如果还没配置）

```bash
# 设置用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 验证配置
git config --list | grep user
```

### 3.2 添加远程仓库

```bash
# 添加远程仓库（替换 jomonylw）
git remote add origin https://github.com/jomonylw/flow-balance.git

# 验证远程仓库
git remote -v
```

### 3.3 提交并推送代码

```bash
# 添加所有文件
git add .

# 检查要提交的文件
git status

# 提交代码
git commit -m "feat: initial commit - Flow Balance personal finance management system

Features:
- Complete Next.js application with TypeScript
- Docker support with multi-stage builds
- PostgreSQL and SQLite database support
- GitHub Actions CI/CD pipeline
- Comprehensive deployment documentation
- Monitoring and backup scripts
- Automated release workflow"

# 推送到 GitHub
git push -u origin main
```

## ⚙️ 第四步：配置 GitHub Actions

### 4.1 启用 GitHub Actions

1. 在 GitHub 仓库页面，点击 **Actions** 标签
2. 如果看到 "Get started with GitHub Actions"，点击 "I understand my workflows, go ahead and enable
   them"

### 4.2 配置仓库权限

1. 进入 **Settings** > **Actions** > **General**
2. 在 "Workflow permissions" 部分：
   - ✅ 选择 **Read and write permissions**
   - ✅ 勾选 **Allow GitHub Actions to create and approve pull requests**
3. 点击 **Save**

### 4.3 更新工作流文件

编辑 `.github/workflows/docker-build.yml`，确保镜像名称正确：

```bash
# 使用编辑器打开文件
nano .github/workflows/docker-build.yml

# 或者使用 sed 替换（替换 jomonylw）
sed -i 's/jomonylw/jomonylw/g' .github/workflows/docker-build.yml
```

## 🐳 第五步：设置 Docker 镜像发布

### 5.1 验证 GitHub Container Registry 权限

GitHub Actions 会自动使用 `GITHUB_TOKEN` 推送到 GitHub Container Registry，无需额外配置。

### 5.2 更新文档中的镜像引用

```bash
# 更新所有文档中的镜像引用（替换 jomonylw）
find . -name "*.md" -exec sed -i 's/jomonylw/jomonylw/g' {} \;

# 提交更改
git add .
git commit -m "docs: update Docker image references with actual username"
git push origin main
```

## 🧪 第六步：测试 CI/CD 流水线

### 6.1 触发第一次构建

推送代码后，GitHub Actions 会自动触发：

```bash
# 查看构建状态
echo "访问: https://github.com/jomonylw/flow-balance/actions"
```

### 6.2 监控构建过程

1. 在 GitHub 仓库中，点击 **Actions** 标签
2. 应该看到两个工作流正在运行：

   - ✅ **CI** - 代码质量检查和测试
   - ✅ **Docker Build and Release** - Docker 镜像构建

3. 点击工作流查看详细进度：

   ```
   CI 工作流步骤：
   ├── lint-and-test (Node.js 18.x, 20.x)
   ├── build-check
   ├── database-check
   └── security-check

   Docker 工作流步骤：
   ├── quality-check
   ├── docker-build
   ├── security-scan
   └── release (仅标签触发)
   ```

### 6.3 验证构建结果

构建完成后（约 5-10 分钟），检查：

1. **Actions 页面**：所有工作流显示绿色 ✅
2. **Packages 页面**：
   - 在仓库主页右侧点击 **Packages**
   - 应该看到 `flow-balance` 包
   - 标签应该包括 `latest` 和 `main`

## 🏷️ 第七步：创建第一个版本发布

### 7.1 使用自动化脚本发布

```bash
# 发布第一个版本（1.0.0）
./scripts/release.sh major

# 或者使用 Makefile
make release-major
```

### 7.2 手动发布（备选方案）

```bash
# 更新版本号到 1.0.0
npm version 1.0.0 --no-git-tag-version

# 提交版本更新
git add package.json
git commit -m "chore: bump version to 1.0.0"

# 创建标签
git tag -a v1.0.0 -m "Release v1.0.0

🎉 First stable release of Flow Balance!

Features:
- Complete personal finance management system
- Docker containerization support
- Multi-database support (SQLite/PostgreSQL)
- Automated CI/CD pipeline
- Comprehensive documentation

Docker Usage:
docker run -p 3000:3000 ghcr.io/jomonylw/flow-balance:v1.0.0"

# 推送标签
git push origin main
git push origin v1.0.0
```

### 7.3 验证版本发布

1. **GitHub Releases**：访问 `https://github.com/jomonylw/flow-balance/releases`
2. **Docker 镜像**：应该看到新的版本标签
3. **测试拉取镜像**：
   ```bash
   docker pull ghcr.io/jomonylw/flow-balance:v1.0.0
   docker pull ghcr.io/jomonylw/flow-balance:latest
   ```

## ✅ 第八步：验证完整流程

### 8.1 测试 Docker 镜像

```bash
# 拉取并运行镜像
docker run -d \
  --name flow-balance-test \
  -p 3000:3000 \
  -e DATABASE_URL="file:./data/test.db" \
  -e JWT_SECRET="test-jwt-secret-for-demo" \
  ghcr.io/jomonylw/flow-balance:latest

# 等待启动
sleep 10

# 测试健康检查
curl http://localhost:3000/api/health

# 清理测试容器
docker stop flow-balance-test
docker rm flow-balance-test
```

### 8.2 验证文档链接

更新 README.md 中的部署按钮：

```markdown
<!-- 在 README.md 中添加 -->

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jomonylw/flow-balance)

![CI](https://github.com/jomonylw/flow-balance/workflows/CI/badge.svg)
![Docker Build](https://github.com/jomonylw/flow-balance/workflows/Docker%20Build%20and%20Release/badge.svg)
```

### 8.3 测试快速部署

```bash
# 测试快速启动脚本
./scripts/quick-start.sh

# 测试 Makefile 命令
make help
make health
```

## 🎉 完成！

恭喜！您已经成功完成了完整的部署配置。现在您拥有：

### ✅ 已完成的功能

- 🐳 **自动化 Docker 镜像构建和发布**
- 🔄 **完整的 CI/CD 流水线**
- 🏷️ **自动版本管理和发布**
- 📊 **代码质量检查和安全扫描**
- 📚 **完善的文档和使用指南**

### 🚀 可用的部署方式

```bash
# 1. 使用最新镜像
docker run -p 3000:3000 ghcr.io/jomonylw/flow-balance:latest

# 2. 使用 Docker Compose
git clone https://github.com/jomonylw/flow-balance.git
cd flow-balance
./scripts/quick-start.sh

# 3. 部署到 Vercel
# 点击 README 中的 Deploy 按钮
```

### 📈 后续维护

```bash
# 日常开发流程
git add .
git commit -m "feat: add new feature"
git push origin main  # 自动触发 CI/CD

# 发布新版本
./scripts/release.sh patch  # 自动构建和发布
```

## 🆘 如果遇到问题

### 常见问题解决

1. **构建失败**：检查 GitHub Actions 日志
2. **权限问题**：确认 Actions 权限设置
3. **镜像推送失败**：检查仓库可见性设置
4. **测试失败**：本地运行 `npm test` 检查

### 获取帮助

- 查看 [故障排除指南](GITHUB_SETUP_GUIDE.md#故障排除)
- 检查 [CI/CD 配置文档](CICD_CONFIGURATION.md)
- 在 GitHub Issues 中报告问题

您的 Flow Balance 项目现在已经完全现代化，具备了企业级的 CI/CD 流水线！🎊
