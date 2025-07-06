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

// 1. 自动生成 JWT 密钥
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

// 2. 自动生成 NEXTAUTH_SECRET
let nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!nextAuthSecret || nextAuthSecret === 'your-nextauth-secret-change-this-in-production') {
    const nextAuthSecretFile = path.join(dataDir, '.nextauth-secret');
    if (!fs.existsSync(nextAuthSecretFile)) {
        nextAuthSecret = crypto.randomBytes(32).toString('base64');
        fs.writeFileSync(nextAuthSecretFile, nextAuthSecret, { mode: 0o600 });
        console.log('✅ Generated new NextAuth secret');
    } else {
        nextAuthSecret = fs.readFileSync(nextAuthSecretFile, 'utf8').trim();
        console.log('✅ Using existing NextAuth secret');
    }
    process.env.NEXTAUTH_SECRET = nextAuthSecret;
}

// 3. 智能检测和设置访问 URL
let nextAuthUrl = process.env.NEXTAUTH_URL;
let appUrl = process.env.NEXT_PUBLIC_APP_URL;

// 如果没有设置或者是默认的 localhost，则使用智能默认值
if (!nextAuthUrl || nextAuthUrl === 'http://localhost:3000') {
    const port = process.env.PORT || '3000';
    // 在 Docker 环境中，使用 0.0.0.0 确保外部可访问
    // NextAuth 会在运行时根据实际请求动态处理 URL
    const defaultUrl = \`http://0.0.0.0:\${port}\`;
    process.env.NEXTAUTH_URL = defaultUrl;
    console.log(\`✅ Set NEXTAUTH_URL to: \${defaultUrl}\`);
}

if (!appUrl || appUrl === 'http://localhost:3000') {
    const port = process.env.PORT || '3000';
    const defaultUrl = \`http://0.0.0.0:\${port}\`;
    process.env.NEXT_PUBLIC_APP_URL = defaultUrl;
    console.log(\`✅ Set NEXT_PUBLIC_APP_URL to: \${defaultUrl}\`);
}

// 设置 NextAuth 的信任主机配置，允许动态主机
process.env.NEXTAUTH_URL_INTERNAL = process.env.NEXTAUTH_URL;
process.env.AUTH_TRUST_HOST = 'true';

console.log('🎯 Final configuration:');
console.log(\`   NEXTAUTH_URL: \${process.env.NEXTAUTH_URL}\`);
console.log(\`   NEXT_PUBLIC_APP_URL: \${process.env.NEXT_PUBLIC_APP_URL}\`);
console.log(\`   NEXTAUTH_SECRET: [HIDDEN]\`);
console.log(\`   JWT_SECRET: [HIDDEN]\`);
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
