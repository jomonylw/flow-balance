#!/bin/bash

# Flow Balance - Docker 镜像大小对比脚本
# 对比原版和优化版镜像的大小差异

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Flow Balance Docker Image Size Comparison${NC}"
echo ""

# 构建原版镜像
echo -e "${YELLOW}🔨 Building original image...${NC}"
docker build -f Dockerfile -t flow-balance:original . > /dev/null 2>&1

# 构建优化版镜像
echo -e "${YELLOW}🔨 Building optimized image...${NC}"
docker build -f Dockerfile.optimized -t flow-balance:optimized . > /dev/null 2>&1

# 获取镜像大小
echo -e "${BLUE}📊 Image Size Comparison:${NC}"
echo ""

# 原版镜像信息
ORIGINAL_SIZE=$(docker images flow-balance:original --format "{{.Size}}")
ORIGINAL_SIZE_BYTES=$(docker inspect flow-balance:original --format='{{.Size}}')

# 优化版镜像信息
OPTIMIZED_SIZE=$(docker images flow-balance:optimized --format "{{.Size}}")
OPTIMIZED_SIZE_BYTES=$(docker inspect flow-balance:optimized --format='{{.Size}}')

# 计算节省的空间
SAVED_BYTES=$((ORIGINAL_SIZE_BYTES - OPTIMIZED_SIZE_BYTES))
SAVED_PERCENTAGE=$(echo "scale=1; ($SAVED_BYTES * 100) / $ORIGINAL_SIZE_BYTES" | bc -l)

# 显示对比结果
printf "%-20s %-15s %-15s\n" "Version" "Size" "Layers"
printf "%-20s %-15s %-15s\n" "--------" "----" "------"

ORIGINAL_LAYERS=$(docker history flow-balance:original --quiet | wc -l)
OPTIMIZED_LAYERS=$(docker history flow-balance:optimized --quiet | wc -l)

printf "%-20s %-15s %-15s\n" "Original" "$ORIGINAL_SIZE" "$ORIGINAL_LAYERS"
printf "%-20s %-15s %-15s\n" "Optimized" "$OPTIMIZED_SIZE" "$OPTIMIZED_LAYERS"

echo ""
echo -e "${GREEN}💾 Space Saved: $(numfmt --to=iec $SAVED_BYTES) (${SAVED_PERCENTAGE}%)${NC}"

# 显示详细的层分析
echo ""
echo -e "${BLUE}📋 Layer Analysis:${NC}"
echo ""
echo -e "${YELLOW}Original Image Layers:${NC}"
docker history flow-balance:original --format "table {{.CreatedBy}}\t{{.Size}}" | head -8

echo ""
echo -e "${YELLOW}Optimized Image Layers:${NC}"
docker history flow-balance:optimized --format "table {{.CreatedBy}}\t{{.Size}}" | head -8

# 性能建议
echo ""
echo -e "${BLUE}🚀 Optimization Summary:${NC}"
echo -e "  • Reduced image size by ${SAVED_PERCENTAGE}%"
echo -e "  • Fewer layers for faster pulls"
echo -e "  • Minimal runtime dependencies"
echo -e "  • Better security with non-root user"
echo ""

# 清理测试镜像（可选）
read -p "🗑️  Remove test images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker rmi flow-balance:original flow-balance:optimized > /dev/null 2>&1
    echo -e "${GREEN}✅ Test images removed${NC}"
fi
