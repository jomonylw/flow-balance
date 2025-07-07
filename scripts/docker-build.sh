#!/bin/bash

# Flow Balance - Docker Build Script
# 支持多数据库类型的 Docker 镜像构建脚本

set -e

# 默认配置
DEFAULT_IMAGE_NAME="flow-balance"
DEFAULT_TAG="latest"

# 显示使用说明
show_usage() {
    cat << EOF
Flow Balance - Docker Build Script

Usage:
    $0 [OPTIONS]

Options:
    -i, --image NAME        Docker image name (default: flow-balance)
    -t, --tag TAG          Docker image tag (default: latest)
    -h, --help             Show this help message

Examples:
    # Build with default settings
    $0

    # Build with custom image name and tag
    $0 --image myapp/flow-balance --tag v1.0.0

Note:
    The built image supports both SQLite and PostgreSQL databases.
    Database type is automatically detected at runtime based on DATABASE_URL:
    - file:/path/to/db.sqlite  -> SQLite
    - postgresql://...         -> PostgreSQL

Environment Variables:
    DOCKER_BUILDKIT=1      Enable Docker BuildKit (recommended)

EOF
}

# 解析命令行参数
IMAGE_NAME="$DEFAULT_IMAGE_NAME"
TAG="$DEFAULT_TAG"

while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--image)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# 构建信息
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "🐳 Flow Balance Docker Build"
echo "================================"
echo "🏷️  Image Name:   $FULL_IMAGE_NAME"
echo "📅 Build Date:   $BUILD_DATE"
echo "🔗 Git Commit:   $GIT_COMMIT"
echo "📊 Database:     Dynamic (SQLite/PostgreSQL)"
echo ""

# 检查必要文件
echo "🔍 Checking required files..."
required_files=(
    "Dockerfile"
    "package.json"
    "prisma/schema.prisma"
    "prisma/schema.postgresql.prisma"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Required file not found: $file"
        exit 1
    fi
done

echo "✅ All required files found"

# 启用 BuildKit（如果可用）
export DOCKER_BUILDKIT=1

# 构建 Docker 镜像
echo ""
echo "🔨 Building Docker image..."
echo "   Command: docker build -t $FULL_IMAGE_NAME ."

if docker build \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg GIT_COMMIT="$GIT_COMMIT" \
    --tag "$FULL_IMAGE_NAME" \
    .; then

    echo ""
    echo "✅ Docker image built successfully!"
    echo ""
    echo "📋 Image Information:"
    echo "   Name: $FULL_IMAGE_NAME"
    echo "   Database: Dynamic (SQLite/PostgreSQL)"
    echo "   Size: $(docker images --format "table {{.Size}}" "$FULL_IMAGE_NAME" | tail -n 1)"
    echo ""
    echo "🚀 Quick Start Commands:"
    echo ""
    echo "   # Run with SQLite (default)"
    echo "   docker run -d -p 3000:3000 \\"
    echo "     -v flow-balance-data:/app/data \\"
    echo "     -e DATABASE_URL=\"file:/app/data/flow-balance.db\" \\"
    echo "     $FULL_IMAGE_NAME"
    echo ""
    echo "   # Run with PostgreSQL"
    echo "   docker run -d -p 3000:3000 \\"
    echo "     -e DATABASE_URL=\"postgresql://user:password@host:5432/dbname\" \\"
    echo "     $FULL_IMAGE_NAME"
    echo ""
    echo "   # Run with docker-compose (recommended)"
    echo "   docker-compose up -d"
    echo ""
    echo "📖 For more deployment options, see:"
    echo "   - DOCKER_SIMPLE_USAGE.md"
    echo "   - README.md"

else
    echo ""
    echo "❌ Docker build failed!"
    exit 1
fi
