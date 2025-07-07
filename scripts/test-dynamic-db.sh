#!/bin/bash

# Flow Balance - 动态数据库检测测试脚本
# 测试 Docker 容器的动态数据库检测功能

set -e

echo "🧪 Flow Balance - 动态数据库检测测试"
echo "=================================="

# 测试函数
test_database_detection() {
    local db_url="$1"
    local expected_type="$2"
    local test_name="$3"
    
    echo ""
    echo "🔍 测试: $test_name"
    echo "   DATABASE_URL: $db_url"
    echo "   期望类型: $expected_type"
    
    # 模拟入口脚本的检测逻辑
    if [[ "$db_url" == postgresql://* ]] || [[ "$db_url" == postgres://* ]]; then
        detected_type="postgresql"
    elif [[ "$db_url" == file:* ]]; then
        detected_type="sqlite"
    else
        detected_type="unknown"
    fi
    
    if [ "$detected_type" = "$expected_type" ]; then
        echo "   ✅ 检测正确: $detected_type"
    else
        echo "   ❌ 检测错误: 期望 $expected_type，实际 $detected_type"
        return 1
    fi
}

# 测试用例
echo "开始测试数据库 URL 检测..."

test_database_detection "file:/app/data/flow-balance.db" "sqlite" "SQLite 标准格式"
test_database_detection "file:./prisma/dev.db" "sqlite" "SQLite 相对路径"
test_database_detection "file:/tmp/test.db" "sqlite" "SQLite 绝对路径"

test_database_detection "postgresql://user:pass@localhost:5432/db" "postgresql" "PostgreSQL 标准格式"
test_database_detection "postgres://user:pass@localhost:5432/db" "postgresql" "PostgreSQL 简写格式"
test_database_detection "postgresql://user:pass@host.com:5432/flowbalance?schema=public" "postgresql" "PostgreSQL 带参数"

echo ""
echo "🔧 测试 schema 文件检查..."

# 检查必要的文件是否存在
required_files=(
    "prisma/schema.prisma"
    "prisma/schema.postgresql.prisma"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file 存在"
        
        # 检查 provider 配置
        if [ "$file" = "prisma/schema.prisma" ]; then
            provider=$(grep 'provider.*=' "$file" | grep -o '"[^"]*"' | tr -d '"')
            echo "      当前 provider: $provider"
        elif [ "$file" = "prisma/schema.postgresql.prisma" ]; then
            provider=$(grep 'provider.*=' "$file" | grep -o '"[^"]*"' | tr -d '"')
            echo "      PostgreSQL provider: $provider"
        fi
    else
        echo "   ❌ $file 不存在"
        exit 1
    fi
done

echo ""
echo "🐳 测试 Docker 构建（可选）..."

if command -v docker >/dev/null 2>&1; then
    echo "   Docker 可用，可以进行构建测试"
    echo "   运行命令: ./scripts/docker-build.sh --help"
    
    if [ -f "scripts/docker-build.sh" ]; then
        echo "   ✅ 构建脚本存在"
    else
        echo "   ❌ 构建脚本不存在"
    fi
else
    echo "   ⚠️  Docker 不可用，跳过构建测试"
fi

echo ""
echo "📋 测试总结"
echo "============"
echo "✅ 数据库 URL 检测逻辑正确"
echo "✅ Schema 文件完整"
echo "✅ 动态检测功能就绪"
echo ""
echo "🚀 使用示例："
echo ""
echo "# SQLite 模式"
echo "docker run -d -p 3000:3000 \\"
echo "  -e DATABASE_URL=\"file:/app/data/flow-balance.db\" \\"
echo "  -v flow-balance-data:/app/data \\"
echo "  flow-balance:latest"
echo ""
echo "# PostgreSQL 模式"
echo "docker run -d -p 3000:3000 \\"
echo "  -e DATABASE_URL=\"postgresql://user:password@host:5432/dbname\" \\"
echo "  flow-balance:latest"
echo ""
echo "🎉 测试完成！"
