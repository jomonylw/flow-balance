#!/bin/bash

# Flow Balance - Docker Entrypoint Script
# Docker 容器启动脚本

set -e

echo "🚀 Starting Flow Balance..."

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is required"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET environment variable is required"
    exit 1
fi

# 检测数据库类型
if [[ "$DATABASE_URL" == postgresql://* ]] || [[ "$DATABASE_URL" == postgres://* ]]; then
    echo "📊 Detected PostgreSQL database"
    DB_TYPE="postgresql"
elif [[ "$DATABASE_URL" == file:* ]]; then
    echo "📊 Detected SQLite database"
    DB_TYPE="sqlite"
    
    # 创建 SQLite 数据库目录
    DB_PATH=$(echo "$DATABASE_URL" | sed 's/file://')
    DB_DIR=$(dirname "$DB_PATH")
    mkdir -p "$DB_DIR"
    echo "📁 Created database directory: $DB_DIR"
else
    echo "❌ Unsupported database URL format: $DATABASE_URL"
    exit 1
fi

# 等待数据库连接（仅 PostgreSQL）
if [ "$DB_TYPE" = "postgresql" ]; then
    echo "⏳ Waiting for database connection..."
    
    # 从 DATABASE_URL 提取连接信息
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
        echo "⚠️  Could not extract database host/port, skipping connection check"
    else
        echo "🔍 Checking connection to $DB_HOST:$DB_PORT"
        
        # 等待数据库可用
        timeout=30
        while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
            timeout=$((timeout - 1))
            if [ $timeout -le 0 ]; then
                echo "❌ Database connection timeout"
                exit 1
            fi
            echo "⏳ Waiting for database... ($timeout seconds remaining)"
            sleep 1
        done
        
        echo "✅ Database connection established"
    fi
fi

# 运行数据库迁移
echo "🔄 Running database migrations..."
if ! pnpm db:deploy; then
    echo "❌ Database migration failed"
    exit 1
fi
echo "✅ Database migrations completed"

# 生成 Prisma 客户端（运行时生成确保与环境匹配）
echo "🔄 Generating Prisma client..."
if command -v prisma >/dev/null 2>&1; then
    prisma generate
else
    pnpm db:generate
fi
echo "✅ Prisma client generated"

# 初始化应用（包括 JWT 密钥生成）
echo "🔑 Initializing application..."
if node -e "
const path = require('path');
const fs = require('fs');

// 确保数据目录存在
const dataDir = '/app/data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory:', dataDir);
}

// 初始化 JWT 密钥
const crypto = require('crypto');
const jwtSecretFile = path.join(dataDir, '.jwt-secret');

if (!fs.existsSync(jwtSecretFile)) {
    const jwtSecret = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(jwtSecretFile, jwtSecret, { mode: 0o600 });
    console.log('✅ Generated new JWT secret');
} else {
    console.log('✅ JWT secret already exists');
}
"; then
    echo "✅ Application initialized successfully"
else
    echo "⚠️  Application initialization failed, but continuing..."
fi

# 检查并导入种子数据（仅在数据库为空时）
echo "🔍 Checking if seed data is needed..."
if node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.currency.count().then(count => {
    if (count === 0) {
        console.log('SEED_NEEDED');
        process.exit(0);
    } else {
        console.log('SEED_EXISTS');
        process.exit(1);
    }
}).catch(() => {
    console.log('SEED_NEEDED');
    process.exit(0);
}).finally(() => {
    prisma.\$disconnect();
});
"; then
    echo "🌱 Database is empty, importing seed data..."
    if pnpm db:seed; then
        echo "✅ Seed data imported successfully"
    else
        echo "⚠️  Seed data import failed, but continuing..."
    fi
else
    echo "✅ Seed data already exists, skipping import"
fi

# 检查数据库连接
echo "🔍 Testing database connection..."
if ! node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`.then(() => {
    console.log('✅ Database connection test passed');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Database connection test failed:', error.message);
    process.exit(1);
}).finally(() => {
    prisma.\$disconnect();
});
"; then
    echo "❌ Database connection test failed"
    exit 1
fi

# 设置文件权限（SQLite）
if [ "$DB_TYPE" = "sqlite" ]; then
    DB_PATH=$(echo "$DATABASE_URL" | sed 's/file://')
    if [ -f "$DB_PATH" ]; then
        chmod 644 "$DB_PATH"
        echo "📝 Set database file permissions"
    fi
fi

# 显示启动信息
echo ""
echo "🎉 Flow Balance is ready!"
echo "📊 Database: $DB_TYPE"
echo "🌐 Port: ${PORT:-3000}"
echo "🔧 Environment: ${NODE_ENV:-development}"
echo "📅 Build Date: ${NEXT_PUBLIC_BUILD_DATE:-unknown}"
echo "🏷️  Version: ${NEXT_PUBLIC_APP_VERSION:-unknown}"
echo ""

# 启动应用
echo "🚀 Starting application..."
exec "$@"
