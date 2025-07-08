#!/bin/bash

# Flow Balance - 优化镜像构建脚本
# 用于构建最小化的 Docker 镜像

set -e

echo "🚀 Building optimized Flow Balance Docker image..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
IMAGE_NAME="flow-balance"
TAG="${1:-latest}"
DOCKERFILE="${2:-Dockerfile.optimized}"

echo -e "${BLUE}📋 Build Configuration:${NC}"
echo -e "  Image: ${IMAGE_NAME}:${TAG}"
echo -e "  Dockerfile: ${DOCKERFILE}"
echo ""

# 检查 Docker 是否可用
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
    exit 1
fi

# 检查 Dockerfile 是否存在
if [ ! -f "$DOCKERFILE" ]; then
    echo -e "${RED}❌ Dockerfile not found: $DOCKERFILE${NC}"
    exit 1
fi

# 构建信息
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# 构建镜像
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
echo -e "${BLUE}📅 Build Date: $BUILD_DATE${NC}"
echo -e "${BLUE}🔗 Git Commit: $GIT_COMMIT${NC}"
docker build \
    --file "$DOCKERFILE" \
    --tag "$IMAGE_NAME:$TAG" \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg GIT_COMMIT="$GIT_COMMIT" \
    --progress=plain \
    .

# 检查构建结果
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    
    # 显示镜像信息
    echo -e "${BLUE}📊 Image Information:${NC}"
    docker images "$IMAGE_NAME:$TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    
    # 显示镜像层信息
    echo -e "${BLUE}📋 Image Layers:${NC}"
    docker history "$IMAGE_NAME:$TAG" --format "table {{.CreatedBy}}\t{{.Size}}" | head -10
    
    echo ""
    echo -e "${GREEN}🎉 Optimized image built successfully!${NC}"
    echo -e "${YELLOW}💡 To run the container:${NC}"
    echo -e "  docker run -d -p 3000:3000 -v \$(pwd)/data:/app/data $IMAGE_NAME:$TAG"
    
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
