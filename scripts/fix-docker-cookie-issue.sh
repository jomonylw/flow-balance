#!/bin/bash

# Flow Balance Docker Cookie 问题修复脚本
# 修复 Docker 环境中的 Cookie 安全设置问题

set -e

echo "🔧 Flow Balance Docker Cookie 问题修复"
echo "======================================"
echo ""

CONTAINER_NAME="flow-balance"
IMAGE_NAME="flow-balance:latest"

# 检查是否有运行中的容器
if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    echo "📋 发现运行中的容器: $CONTAINER_NAME"
    
    # 显示当前容器信息
    echo "当前容器状态:"
    docker ps -f name="$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    echo "🔍 问题诊断:"
    echo "Docker 环境中的 Cookie 安全设置可能导致会话问题"
    echo "修复方案: 重新构建镜像并重启容器"
    echo ""
    
    read -p "是否继续修复？(y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 取消修复"
        exit 0
    fi
    
    echo "🛑 停止现有容器..."
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
    docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
    echo "✅ 容器已停止并删除"
else
    echo "ℹ️  未发现运行中的容器"
fi

# 检查镜像是否存在
if docker images -q "$IMAGE_NAME" | grep -q .; then
    echo "🔄 重新构建镜像以应用修复..."
    docker build -t "$IMAGE_NAME" . --no-cache
    echo "✅ 镜像重新构建完成"
else
    echo "❌ 错误：找不到镜像 '$IMAGE_NAME'"
    echo "请先构建镜像："
    echo "  docker build -t $IMAGE_NAME ."
    exit 1
fi

# 获取端口配置
PORT="3000"
if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
    echo "⚠️  端口 $PORT 已被占用"
    read -p "请输入其他端口号 (默认: 3001): " NEW_PORT
    PORT=${NEW_PORT:-3001}
fi

echo ""
echo "🚀 启动修复后的容器..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:3000" \
    -v flow-balance-data:/app/data \
    --restart unless-stopped \
    "$IMAGE_NAME"

# 等待容器启动
echo "⏳ 等待应用启动..."
sleep 8

# 检查容器状态
if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    echo "✅ 修复完成！容器已成功启动"
    echo ""
    echo "🌐 访问地址："
    echo "   http://localhost:$PORT"
    echo ""
    echo "🔧 修复内容："
    echo "   ✅ 修复了 Docker 环境中的 Cookie 安全设置"
    echo "   ✅ 优化了 JWT 认证配置"
    echo "   ✅ 移除了不必要的 NextAuth 配置"
    echo ""
    echo "📋 验证步骤："
    echo "   1. 打开浏览器访问上述地址"
    echo "   2. 尝试注册新用户或登录"
    echo "   3. 确认不再出现'会话已过期'错误"
    echo ""
    echo "📊 容器状态："
    docker ps -f name="$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "📋 查看日志："
    echo "   docker logs -f $CONTAINER_NAME"
else
    echo "❌ 容器启动失败"
    echo ""
    echo "📋 故障排查："
    echo "   查看日志: docker logs $CONTAINER_NAME"
    echo "   检查镜像: docker images | grep flow-balance"
    echo "   检查端口: netstat -tuln | grep $PORT"
    exit 1
fi
