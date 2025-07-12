#!/bin/bash

# Docker 构建前检查脚本
# 确保构建环境正确配置

set -e

echo "🔍 Docker 构建环境检查..."

# 1. 检查必要的文件
echo "📁 检查必要文件..."
required_files=(
    "package.json"
    "pnpm-lock.yaml"
    "prisma/schema.prisma"
    "next.config.js"
    "Dockerfile"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ 缺少必要文件: $file"
        exit 1
    else
        echo "✅ $file"
    fi
done

# 2. 检查 Prisma schema
echo "🗄️ 检查 Prisma schema..."
if grep -q "datasource db" prisma/schema.prisma; then
    echo "✅ Prisma schema 格式正确"
else
    echo "❌ Prisma schema 格式错误"
    exit 1
fi

# 3. 检查 package.json 脚本
echo "📦 检查 package.json 脚本..."
required_scripts=("build" "start" "db:generate")
for script in "${required_scripts[@]}"; do
    if jq -e ".scripts.\"$script\"" package.json > /dev/null; then
        echo "✅ 脚本 $script 存在"
    else
        echo "❌ 缺少脚本: $script"
        exit 1
    fi
done

# 4. 检查 Next.js 配置
echo "⚙️ 检查 Next.js 配置..."
if [ -f "next.config.js" ]; then
    if grep -q "output.*standalone" next.config.js; then
        echo "✅ Next.js standalone 配置正确"
    else
        echo "⚠️ 建议启用 standalone 输出模式"
    fi
fi

# 5. 检查 Dockerfile
echo "🐳 检查 Dockerfile..."
if grep -q "DATABASE_URL.*file:/tmp/build.db" Dockerfile; then
    echo "✅ Dockerfile 包含构建时数据库 URL"
else
    echo "⚠️ Dockerfile 可能缺少构建时数据库 URL"
fi

echo "✅ Docker 构建环境检查完成"
echo "🚀 可以开始构建 Docker 镜像"
