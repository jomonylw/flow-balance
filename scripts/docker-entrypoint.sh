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

# JWT_SECRET 不再是必需的，会自动生成
if [ -n "$JWT_SECRET" ]; then
    echo "🔑 Using provided JWT_SECRET from environment"
else
    echo "🔑 JWT_SECRET will be auto-generated during initialization"
fi

# 检测数据库类型并动态切换 schema
if [[ "$DATABASE_URL" == postgresql://* ]] || [[ "$DATABASE_URL" == postgres://* ]]; then
    echo "📊 Detected PostgreSQL database"
    DB_TYPE="postgresql"

    # 动态切换到 PostgreSQL schema
    if [ -f "prisma/schema.postgresql.prisma" ]; then
        echo "🔄 Switching to PostgreSQL schema..."
        cp prisma/schema.postgresql.prisma prisma/schema.prisma
        echo "✅ PostgreSQL schema activated"
    else
        echo "❌ PostgreSQL schema file not found: prisma/schema.postgresql.prisma"
        exit 1
    fi

elif [[ "$DATABASE_URL" == file:* ]]; then
    echo "📊 Detected SQLite database"
    DB_TYPE="sqlite"

    # 检查当前 schema 是否为 SQLite
    current_provider=$(grep 'provider.*=' prisma/schema.prisma | grep -o '"[^"]*"' | tr -d '"')
    if [ "$current_provider" != "sqlite" ]; then
        echo "🔄 Current schema provider is '$current_provider', switching to SQLite..."
        # 重新生成 SQLite schema（从 PostgreSQL schema 转换）
        if [ -f "prisma/schema.postgresql.prisma" ]; then
            # 复制 PostgreSQL schema 并修改 provider
            sed 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.postgresql.prisma > prisma/schema.prisma
            echo "✅ SQLite schema activated"
        else
            echo "⚠️  PostgreSQL schema not found, keeping current schema"
        fi
    else
        echo "✅ SQLite schema already active"
    fi

    # 创建 SQLite 数据库目录
    DB_PATH=$(echo "$DATABASE_URL" | sed 's/file://')
    DB_DIR=$(dirname "$DB_PATH")
    mkdir -p "$DB_DIR"
    echo "📁 Created database directory: $DB_DIR"
else
    echo "❌ Unsupported database URL format: $DATABASE_URL"
    echo "   Supported formats:"
    echo "   - SQLite: file:/path/to/database.db"
    echo "   - PostgreSQL: postgresql://user:password@host:port/database"
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

# 重新生成 Prisma 客户端（确保与当前 schema 匹配）
echo "🔄 Regenerating Prisma client for $DB_TYPE..."
if command -v prisma >/dev/null 2>&1; then
    prisma generate
else
    pnpm db:generate
fi
echo "✅ Prisma client regenerated for $DB_TYPE"

# 运行数据库迁移
echo "🔄 Running database migrations..."
if ! pnpm db:deploy; then
    echo "❌ Database migration failed"
    exit 1
fi
echo "✅ Database migrations completed"

# 智能配置和初始化应用
echo "🔑 Initializing application with smart configuration..."
if node -e "
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 确保数据目录存在
const dataDir = '/app/data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory:', dataDir);
}

// 1. 自动生成 JWT 密钥（应用使用自定义 JWT 认证）
const jwtSecretFile = path.join(dataDir, '.jwt-secret');
let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    if (!fs.existsSync(jwtSecretFile)) {
        jwtSecret = crypto.randomBytes(64).toString('hex');
        fs.writeFileSync(jwtSecretFile, jwtSecret, { mode: 0o600 });
        console.log('✅ Generated new JWT secret');
    } else {
        jwtSecret = fs.readFileSync(jwtSecretFile, 'utf8').trim();
        console.log('✅ Using existing JWT secret');
    }
    // 设置环境变量供应用使用
    process.env.JWT_SECRET = jwtSecret;
}

// 2. 设置应用访问 URL（用于 Cookie 安全设置）
let appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!appUrl || appUrl === 'http://localhost:3000') {
    const port = process.env.PORT || '3000';
    // 在 Docker 环境中，使用 0.0.0.0 确保外部可访问
    const defaultUrl = \`http://0.0.0.0:\${port}\`;
    process.env.NEXT_PUBLIC_APP_URL = defaultUrl;
    console.log(\`✅ Set NEXT_PUBLIC_APP_URL to: \${defaultUrl}\`);
}

// 3. 标记 Docker 环境，用于 Cookie 安全设置
process.env.DOCKER_CONTAINER = 'true';

console.log('🎯 Final configuration:');
console.log(\`   NEXT_PUBLIC_APP_URL: \${process.env.NEXT_PUBLIC_APP_URL}\`);
console.log(\`   JWT_SECRET: [HIDDEN]\`);
console.log(\`   DOCKER_CONTAINER: \${process.env.DOCKER_CONTAINER}\`);
"; then
    echo "✅ Application initialized successfully with smart configuration"
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
