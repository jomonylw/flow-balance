#!/bin/bash

# Flow Balance - Docker Compose Build Script
# 为 docker-compose 设置构建参数

set -e

# 生成构建信息
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "🐳 Flow Balance Docker Compose Build"
echo "===================================="
echo "📅 Build Date: $BUILD_DATE"
echo "🔗 Git Commit: $GIT_COMMIT"
echo ""

# 导出环境变量供 docker-compose 使用
export BUILD_DATE="$BUILD_DATE"
export GIT_COMMIT="$GIT_COMMIT"

# 显示使用说明
show_usage() {
    cat << EOF
Usage:
    $0 [COMPOSE_FILE] [COMMAND]

Arguments:
    COMPOSE_FILE    Docker compose file (default: docker-compose.yml)
    COMMAND         Docker compose command (default: up --build -d)

Examples:
    # Build with default compose file
    $0

    # Build with optimized compose file
    $0 docker-compose.optimized.yml

    # Build and run in foreground
    $0 docker-compose.yml "up --build"

    # Just build without running
    $0 docker-compose.yml "build"

Environment Variables Set:
    BUILD_DATE=$BUILD_DATE
    GIT_COMMIT=$GIT_COMMIT

EOF
}

# 解析参数
COMPOSE_FILE="${1:-docker-compose.yml}"
COMMAND="${2:-up --build -d}"

# 检查参数
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

# 检查 compose 文件是否存在
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Docker compose file not found: $COMPOSE_FILE"
    exit 1
fi

# 检查 docker-compose 是否可用
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo "❌ Neither docker-compose nor docker compose is available"
    exit 1
fi

# 选择 docker-compose 命令
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

echo "🔨 Building with $DOCKER_COMPOSE..."
echo "📁 Compose file: $COMPOSE_FILE"
echo "⚡ Command: $COMMAND"
echo ""

# 执行 docker-compose 命令
if $DOCKER_COMPOSE -f "$COMPOSE_FILE" $COMMAND; then
    echo ""
    echo "✅ Docker compose operation completed successfully!"
    echo ""
    echo "🚀 Quick commands:"
    echo "   # View logs"
    echo "   $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f"
    echo ""
    echo "   # Stop services"
    echo "   $DOCKER_COMPOSE -f $COMPOSE_FILE down"
    echo ""
    echo "   # Restart services"
    echo "   $DOCKER_COMPOSE -f $COMPOSE_FILE restart"
else
    echo ""
    echo "❌ Docker compose operation failed!"
    exit 1
fi
