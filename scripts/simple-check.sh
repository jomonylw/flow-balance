#!/bin/bash

# Flow Balance - Simple Deployment Check
# 简化版部署检查脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE} Flow Balance 部署检查${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 检查计数
CHECKS_PASSED=0
CHECKS_FAILED=0

print_check() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((CHECKS_PASSED++))
}

print_fail() {
    echo -e "${RED}[✗]${NC} $1"
    ((CHECKS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo "🔧 检查必需工具..."

# 检查 Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_check "Node.js $NODE_VERSION"
else
    print_fail "Node.js 未安装"
fi

# 检查 pnpm
if command -v pnpm >/dev/null 2>&1; then
    PNPM_VERSION=$(pnpm --version)
    print_check "pnpm $PNPM_VERSION"
else
    print_fail "pnpm 未安装"
fi

# 检查 Docker
if command -v docker >/dev/null 2>&1; then
    print_check "Docker 已安装"
else
    print_warning "Docker 未安装（可选）"
fi

echo ""
echo "📁 检查项目文件..."

# 检查关键文件
files=("package.json" "next.config.js" "prisma/schema.prisma" "Dockerfile")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        print_check "$file 存在"
    else
        print_fail "$file 缺失"
    fi
done

echo ""
echo "🔧 检查环境配置..."

# 检查 .env 文件
if [ -f ".env" ]; then
    print_check ".env 文件存在"
    
    # 检查关键环境变量
    if grep -q "DATABASE_URL" .env; then
        print_check "DATABASE_URL 已配置"
    else
        print_fail "DATABASE_URL 缺失"
    fi

    if grep -q "JWT_SECRET" .env; then
        print_check "JWT_SECRET 已配置"
    else
        print_check "JWT_SECRET 未配置，将自动生成"
    fi
else
    print_warning ".env 文件不存在，将使用默认配置"
fi

echo ""
echo "📦 检查依赖..."

if [ -d "node_modules" ]; then
    print_check "依赖已安装"
else
    print_warning "依赖未安装，请运行 pnpm install"
fi

echo ""
echo "📊 检查总结"
echo "================================"
echo -e "✅ 通过: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "❌ 失败: ${RED}$CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 项目可以部署！${NC}"
    echo ""
    echo "🚀 推荐的部署命令："
    echo "  ./scripts/quick-start.sh    # 交互式快速部署"
    echo "  make docker-prod           # Docker 生产环境"
    echo "  make deploy:vercel         # Vercel 部署"
else
    echo -e "${RED}❌ 发现问题，请修复后再部署${NC}"
    exit 1
fi
