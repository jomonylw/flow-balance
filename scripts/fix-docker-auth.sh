#!/bin/bash

# Flow Balance Docker 认证配置修复脚本
# 用于修复 Docker 环境中的"会话已过期"问题

set -e

echo "🔧 Flow Balance Docker 认证配置修复工具"
echo "========================================="
echo ""

# 检查是否存在 .env.docker 文件
if [ ! -f ".env.docker" ]; then
    echo "❌ 错误：找不到 .env.docker 文件"
    echo "请确保您在项目根目录下运行此脚本"
    exit 1
fi

echo "📋 当前配置检查..."
echo ""

# 显示当前的关键配置
echo "当前 NEXTAUTH_URL: $(grep '^NEXTAUTH_URL=' .env.docker | cut -d'=' -f2)"
echo "当前 NEXT_PUBLIC_APP_URL: $(grep '^NEXT_PUBLIC_APP_URL=' .env.docker | cut -d'=' -f2)"
echo "当前 NEXTAUTH_SECRET: $(grep '^NEXTAUTH_SECRET=' .env.docker | cut -d'=' -f2)"
echo ""

# 生成新的安全密钥
echo "🔐 生成新的安全密钥..."
NEW_SECRET=$(openssl rand -base64 32)
echo "新生成的 NEXTAUTH_SECRET: $NEW_SECRET"
echo ""

# 获取用户输入的访问地址
echo "🌐 请输入您访问应用的完整地址："
echo "例如："
echo "  - http://192.168.1.100:3000 (局域网IP)"
echo "  - http://your-domain.com:3000 (域名)"
echo "  - https://your-domain.com (HTTPS域名)"
echo ""
read -p "请输入访问地址: " APP_URL

# 验证输入的URL格式
if [[ ! $APP_URL =~ ^https?:// ]]; then
    echo "❌ 错误：URL 必须以 http:// 或 https:// 开头"
    exit 1
fi

echo ""
echo "🔄 更新配置文件..."

# 备份原文件
cp .env.docker .env.docker.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 已备份原配置文件"

# 更新配置
sed -i.tmp "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=$APP_URL|" .env.docker
sed -i.tmp "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$APP_URL|" .env.docker
sed -i.tmp "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEW_SECRET|" .env.docker

# 清理临时文件
rm -f .env.docker.tmp

echo "✅ 配置文件已更新"
echo ""

echo "📋 新的配置："
echo "NEXTAUTH_URL: $APP_URL"
echo "NEXT_PUBLIC_APP_URL: $APP_URL"
echo "NEXTAUTH_SECRET: $NEW_SECRET"
echo ""

echo "🚀 下一步操作："
echo "1. 重启 Docker 容器以应用新配置："
echo "   docker-compose -f docker-compose.optimized.yml down"
echo "   docker-compose -f docker-compose.optimized.yml up -d --build"
echo ""
echo "2. 使用新的访问地址打开应用："
echo "   $APP_URL"
echo ""
echo "✅ 配置修复完成！"
