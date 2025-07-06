#!/bin/bash

# Flow Balance - 简单 Docker 运行脚本
# 一键启动，无需复杂配置

set -e

echo "🚀 Flow Balance - 简单启动脚本"
echo "================================"
echo ""

# 默认配置
CONTAINER_NAME="flow-balance"
IMAGE_NAME="flow-balance:latest"
PORT="3000"
DATA_VOLUME="flow-balance-data"

# 检查是否已有容器在运行
if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    echo "⚠️  检测到已有容器在运行"
    echo "容器名称: $CONTAINER_NAME"
    echo ""
    read -p "是否停止并重新启动？(y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🛑 停止现有容器..."
        docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
        docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
        echo "✅ 现有容器已停止"
    else
        echo "❌ 取消启动"
        exit 0
    fi
fi

# 检查镜像是否存在
if ! docker images -q "$IMAGE_NAME" | grep -q .; then
    echo "❌ 错误：找不到 Docker 镜像 '$IMAGE_NAME'"
    echo ""
    echo "请先构建镜像："
    echo "  docker build -t $IMAGE_NAME ."
    echo ""
    echo "或者从 Docker Hub 拉取："
    echo "  docker pull jomonylw/flow-balance:latest"
    echo "  docker tag jomonylw/flow-balance:latest $IMAGE_NAME"
    exit 1
fi

# 检查端口是否被占用
if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
    echo "⚠️  端口 $PORT 已被占用"
    echo ""
    read -p "请输入其他端口号 (默认: 3001): " NEW_PORT
    PORT=${NEW_PORT:-3001}
    echo "✅ 将使用端口: $PORT"
fi

echo ""
echo "📋 启动配置："
echo "   容器名称: $CONTAINER_NAME"
echo "   镜像名称: $IMAGE_NAME"
echo "   访问端口: $PORT"
echo "   数据卷: $DATA_VOLUME"
echo ""

# 启动容器
echo "🐳 启动 Flow Balance 容器..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:3000" \
    -v "$DATA_VOLUME:/app/data" \
    --restart unless-stopped \
    "$IMAGE_NAME"

# 等待容器启动
echo "⏳ 等待应用启动..."
sleep 5

# 检查容器状态
if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    echo "✅ Flow Balance 启动成功！"
    echo ""
    echo "🌐 访问地址："
    echo "   http://localhost:$PORT"
    echo ""
    echo "📊 容器状态："
    docker ps -f name="$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "📋 常用命令："
    echo "   查看日志: docker logs -f $CONTAINER_NAME"
    echo "   停止容器: docker stop $CONTAINER_NAME"
    echo "   重启容器: docker restart $CONTAINER_NAME"
    echo "   删除容器: docker rm -f $CONTAINER_NAME"
    echo ""
    echo "🎉 享受使用 Flow Balance！"
else
    echo "❌ 容器启动失败"
    echo ""
    echo "📋 故障排查："
    echo "   查看日志: docker logs $CONTAINER_NAME"
    echo "   检查镜像: docker images | grep flow-balance"
    echo "   检查端口: netstat -tuln | grep $PORT"
    exit 1
fi
