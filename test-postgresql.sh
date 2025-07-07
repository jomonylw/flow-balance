#!/bin/bash

# Test PostgreSQL setup for Flow Balance
# 测试 PostgreSQL 设置

set -e

echo "🧪 Testing PostgreSQL setup for Flow Balance..."

# 设置测试环境变量
export DATABASE_URL="postgresql://postgres:postgres@192.168.2.65:5432/flowbalance"
export NODE_ENV="production"
export DOCKER_CONTAINER="true"

echo "📊 Database URL: $DATABASE_URL"

# 1. 检测数据库类型
if [[ "$DATABASE_URL" == postgresql://* ]] || [[ "$DATABASE_URL" == postgres://* ]]; then
    echo "✅ Detected PostgreSQL database"
    DB_TYPE="postgresql"
else
    echo "❌ Expected PostgreSQL database URL"
    exit 1
fi

# 2. 切换到 PostgreSQL schema
echo "🔄 Switching to PostgreSQL schema..."
if [ -f "prisma/schema.postgresql.prisma" ]; then
    cp prisma/schema.postgresql.prisma prisma/schema.prisma
    echo "✅ PostgreSQL schema activated"
else
    echo "❌ PostgreSQL schema file not found"
    exit 1
fi

# 3. 重新生成 Prisma 客户端
echo "🔄 Regenerating Prisma client for PostgreSQL..."
if ! npx prisma generate; then
    echo "❌ Prisma client generation failed"
    exit 1
fi
echo "✅ Prisma client regenerated"

# 4. 推送数据库 schema
echo "🔄 Pushing database schema..."
if ! npx prisma db push; then
    echo "❌ Database push failed"
    exit 1
fi
echo "✅ Database schema pushed"

# 5. 检查种子数据
echo "🔍 Checking seed data..."
CURRENCY_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.currency.count().then(count => {
    console.log(count);
    process.exit(0);
}).catch(() => {
    console.log(0);
    process.exit(0);
}).finally(() => {
    prisma.\$disconnect();
});
" 2>/dev/null || echo "0")

if [ "$CURRENCY_COUNT" -eq 0 ]; then
    echo "🌱 Database is empty, importing seed data..."
    if ! npm run db:seed; then
        echo "⚠️  Seed data import failed, but continuing..."
    else
        echo "✅ Seed data imported successfully"
    fi
else
    echo "✅ Seed data already exists ($CURRENCY_COUNT currencies)"
fi

# 6. 测试数据库连接
echo "🔍 Testing database connection..."
if node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1 as test\`.then(() => {
    console.log('✅ Database connection test passed');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Database connection test failed:', error.message);
    process.exit(1);
}).finally(() => {
    prisma.\$disconnect();
});
"; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

# 7. 恢复原始 schema
echo "🔄 Restoring original SQLite schema..."
git checkout HEAD -- prisma/schema.prisma 2>/dev/null || echo "⚠️  Could not restore original schema"

echo ""
echo "🎉 PostgreSQL setup test completed successfully!"
echo "📊 Database: PostgreSQL"
echo "🔗 Connection: $DATABASE_URL"
echo "📦 Currencies: $CURRENCY_COUNT"
echo ""
echo "✅ Ready for Docker deployment with PostgreSQL!"
