#!/bin/bash

# Flow Balance - Fix Docker Unknown Platform Issue
# 修复 Docker 镜像中的 unknown/unknown 平台问题

set -e

echo "🔧 Flow Balance - Docker Platform Fix Script"
echo "============================================="

# 检查是否安装了必要的工具
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# 设置变量
REGISTRY="ghcr.io"
IMAGE_NAME="jomonylw/flow-balance"
FULL_IMAGE="$REGISTRY/$IMAGE_NAME"

echo "📋 Current image manifests:"
echo "----------------------------"

# 检查当前镜像的平台信息
if docker manifest inspect "$FULL_IMAGE:latest" &> /dev/null; then
    echo "🔍 Inspecting current latest tag manifests..."
    docker manifest inspect "$FULL_IMAGE:latest" | jq -r '.manifests[] | "\(.platform.architecture // "unknown")/\(.platform.os // "unknown") - \(.digest)"'
else
    echo "⚠️  Cannot inspect manifests (may require authentication)"
fi

echo ""
echo "🧹 Cleanup Strategy:"
echo "--------------------"
echo "1. The unknown/unknown platform issue is typically caused by:"
echo "   - Incomplete multi-platform builds"
echo "   - Docker Buildx configuration issues"
echo "   - Base image platform compatibility problems"
echo ""
echo "2. Solutions implemented:"
echo "   ✅ Added explicit platform arguments to Dockerfile"
echo "   ✅ Updated GitHub Actions with proper Buildx configuration"
echo "   ✅ Disabled provenance and SBOM to avoid metadata issues"
echo "   ✅ Specified explicit platform support in workflow"
echo ""
echo "3. Next steps:"
echo "   - Push the updated configuration to trigger a new build"
echo "   - The new build should only create linux/amd64 and linux/arm64 images"
echo "   - The unknown/unknown image will be replaced automatically"

echo ""
echo "🚀 Recommended Actions:"
echo "----------------------"
echo "1. Commit and push the updated .github/workflows/docker-build.yml and Dockerfile"
echo "2. Create a new tag or push to main branch to trigger the workflow"
echo "3. Monitor the GitHub Actions build process"
echo "4. Verify the new images only contain expected platforms:"
echo "   docker manifest inspect $FULL_IMAGE:latest"

echo ""
echo "💡 If you want to manually clean up the registry (requires admin access):"
echo "   - Go to GitHub Packages: https://github.com/jomonylw/flow-balance/pkgs/container/flow-balance"
echo "   - Delete the problematic image versions"
echo "   - Re-run the GitHub Actions workflow"

echo ""
echo "✅ Configuration fixes have been applied!"
echo "   The next build should resolve the unknown/unknown platform issue."
