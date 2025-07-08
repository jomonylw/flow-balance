# Flow Balance - Makefile
# 简化常用开发和部署操作

.PHONY: help install dev build start test lint clean docker-build docker-run docker-compose-build deploy-dev deploy-prod

# 默认目标
.DEFAULT_GOAL := help

# 变量定义
APP_NAME := flow-balance
DOCKER_IMAGE := $(APP_NAME)
DOCKER_TAG := latest
COMPOSE_FILE := docker-compose.yml
COMPOSE_DEV_FILE := docker-compose.dev.yml

# 帮助信息
help: ## 显示帮助信息
	@echo "Flow Balance - 可用命令："
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "快速开始："
	@echo "  make install     # 安装依赖"
	@echo "  make dev         # 启动开发服务器"
	@echo "  make docker-dev  # 使用 Docker 启动开发环境"
	@echo ""

# 开发环境
install: ## 安装项目依赖
	@echo "📦 安装依赖..."
	pnpm install
	@echo "✅ 依赖安装完成"

dev: ## 启动开发服务器
	@echo "🚀 启动开发服务器..."
	pnpm dev

build: ## 构建生产版本
	@echo "🔨 构建生产版本..."
	pnpm build
	@echo "✅ 构建完成"

start: ## 启动生产服务器
	@echo "🚀 启动生产服务器..."
	pnpm start

# 测试和代码质量
test: ## 运行测试
	@echo "🧪 运行测试..."
	pnpm test

test-coverage: ## 运行测试并生成覆盖率报告
	@echo "🧪 运行测试覆盖率..."
	pnpm test:coverage

lint: ## 运行代码检查
	@echo "🔍 运行代码检查..."
	pnpm lint

lint-fix: ## 修复代码格式问题
	@echo "🔧 修复代码格式..."
	pnpm lint:fix

type-check: ## 运行 TypeScript 类型检查
	@echo "📝 运行类型检查..."
	pnpm type-check

# 数据库操作
db-generate: ## 生成 Prisma 客户端
	@echo "🗄️  生成 Prisma 客户端..."
	pnpm db:generate

db-migrate: ## 运行数据库迁移
	@echo "🗄️  运行数据库迁移..."
	pnpm db:migrate

db-seed: ## 填充种子数据
	@echo "🌱 填充种子数据..."
	pnpm db:seed

db-studio: ## 打开 Prisma Studio
	@echo "🎨 打开 Prisma Studio..."
	pnpm db:studio

db-reset: ## 重置数据库
	@echo "🗄️  重置数据库..."
	pnpm db:reset

# 数据库切换
db-sqlite: ## 切换到 SQLite 数据库
	@echo "🔄 切换到 SQLite..."
	node scripts/switch-database.js sqlite

db-postgresql: ## 切换到 PostgreSQL 数据库
	@echo "🔄 切换到 PostgreSQL..."
	node scripts/switch-database.js postgresql

# Docker 操作
docker-build: ## 构建 Docker 镜像
	@echo "🐳 构建 Docker 镜像..."
	./scripts/docker-build.sh
	@echo "✅ Docker 镜像构建完成"

docker-run: ## 运行 Docker 容器（简单模式，自动配置）
	@echo "🐳 运行 Docker 容器（简单模式）..."
	./scripts/docker-run-simple.sh

docker-compose-build: ## 使用 Docker Compose 构建
	@echo "🐳 使用 Docker Compose 构建..."
	./scripts/docker-compose-build.sh

docker-run-manual: ## 运行 Docker 容器（手动配置）
	@echo "🐳 运行 Docker 容器（手动配置）..."
	docker run -d \
		--name $(APP_NAME) \
		-p 3000:3000 \
		-e DATABASE_URL="file:/app/data/production.db" \
		-v $(APP_NAME)-data:/app/data \
		$(DOCKER_IMAGE):$(DOCKER_TAG)
	@echo "✅ Docker 容器启动完成"

docker-stop: ## 停止 Docker 容器
	@echo "🛑 停止 Docker 容器..."
	docker stop $(APP_NAME) || true
	docker rm $(APP_NAME) || true

docker-logs: ## 查看 Docker 容器日志
	@echo "📋 查看容器日志..."
	docker logs -f $(APP_NAME)

# Docker Compose 操作
docker-dev: ## 启动开发环境 (Docker Compose)
	@echo "🐳 启动开发环境..."
	docker-compose -f $(COMPOSE_DEV_FILE) up -d
	@echo "✅ 开发环境启动完成"
	@echo "🌐 访问: http://localhost:3000"

docker-prod: ## 启动生产环境 (Docker Compose)
	@echo "🐳 启动生产环境..."
	docker-compose -f $(COMPOSE_FILE) up -d
	@echo "✅ 生产环境启动完成"

docker-down: ## 停止 Docker Compose 服务
	@echo "🛑 停止服务..."
	docker-compose down

docker-down-dev: ## 停止开发环境服务
	@echo "🛑 停止开发环境..."
	docker-compose -f $(COMPOSE_DEV_FILE) down

docker-ps: ## 查看 Docker Compose 服务状态
	@echo "📊 服务状态..."
	docker-compose ps

docker-logs-compose: ## 查看 Docker Compose 日志
	@echo "📋 查看服务日志..."
	docker-compose logs -f

# 快速部署
quick-start: ## 快速启动 (交互式)
	@echo "🚀 快速启动..."
	./scripts/quick-start.sh

deploy-dev: ## 部署到开发环境
	@echo "🚀 部署到开发环境..."
	@if [ ! -f .env ]; then \
		echo "❌ 未找到 .env 文件，请先配置环境变量"; \
		exit 1; \
	fi
	docker-compose -f $(COMPOSE_DEV_FILE) up -d --build
	@echo "✅ 开发环境部署完成"

deploy-prod: ## 部署到生产环境
	@echo "🚀 部署到生产环境..."
	@if [ ! -f .env ]; then \
		echo "❌ 未找到 .env 文件，请先配置环境变量"; \
		exit 1; \
	fi
	docker-compose -f $(COMPOSE_FILE) up -d --build
	@echo "✅ 生产环境部署完成"

# 清理操作
clean: ## 清理构建文件
	@echo "🧹 清理构建文件..."
	rm -rf .next
	rm -rf out
	rm -rf dist
	rm -rf build
	rm -rf node_modules/.cache
	@echo "✅ 清理完成"

clean-docker: ## 清理 Docker 资源
	@echo "🧹 清理 Docker 资源..."
	docker system prune -f
	docker volume prune -f
	@echo "✅ Docker 清理完成"

clean-all: clean clean-docker ## 清理所有文件和 Docker 资源

# 健康检查和监控
health: ## 检查应用健康状态
	@echo "🏥 检查应用健康状态..."
	@./scripts/monitor.sh health

monitor: ## 启动应用监控
	@echo "📊 启动应用监控..."
	@./scripts/monitor.sh monitor

monitor-check: ## 执行完整监控检查
	@echo "🔍 执行完整监控检查..."
	@./scripts/monitor.sh check

monitor-report: ## 生成监控报告
	@echo "📋 生成监控报告..."
	@./scripts/monitor.sh report

# 备份和恢复
backup: ## 备份数据
	@echo "💾 备份数据..."
	@if [ -f "data/production.db" ]; then \
		cp data/production.db "data/backup-$(shell date +%Y%m%d_%H%M%S).db"; \
		echo "✅ SQLite 数据库备份完成"; \
	else \
		echo "ℹ️  未找到 SQLite 数据库文件"; \
	fi

# 版本管理
version: ## 显示版本信息
	@echo "📋 版本信息:"
	@echo "  Node.js: $(shell node --version)"
	@echo "  pnpm: $(shell pnpm --version)"
	@echo "  Docker: $(shell docker --version | cut -d' ' -f3 | cut -d',' -f1)"
	@echo "  App: $(shell grep '"version"' package.json | cut -d'"' -f4)"

# 更新依赖
update: ## 更新项目依赖
	@echo "📦 更新依赖..."
	pnpm update
	@echo "✅ 依赖更新完成"

# 安全检查
audit: ## 运行安全审计
	@echo "🔒 运行安全审计..."
	pnpm audit

# 性能分析
analyze: ## 分析构建包大小
	@echo "📊 分析构建包..."
	pnpm analyze

# 格式化代码
format: ## 格式化代码
	@echo "💅 格式化代码..."
	pnpm format

format-check: ## 检查代码格式
	@echo "💅 检查代码格式..."
	pnpm format:check

# 完整的 CI 流程
ci: install lint type-check test build ## 运行完整的 CI 流程
	@echo "✅ CI 流程完成"

# 部署检查和发布
deploy-check: ## 运行部署前检查
	@echo "🔍 运行部署前检查..."
	@./scripts/deploy-check.sh

release-patch: ## 发布补丁版本
	@echo "🚀 发布补丁版本..."
	@./scripts/release.sh patch

release-minor: ## 发布次版本
	@echo "🚀 发布次版本..."
	@./scripts/release.sh minor

release-major: ## 发布主版本
	@echo "🚀 发布主版本..."
	@./scripts/release.sh major

# 生产环境准备
prod-ready: ci docker-build deploy-check ## 准备生产环境
	@echo "✅ 生产环境准备完成"
