#!/bin/bash

# Flow Balance - Vercel Build Script
# 处理数据库schema切换、种子数据导入和应用构建

set -e

echo "🚀 Starting Vercel build process..."

# 1. 检测数据库类型并切换schema
if [[ "$DATABASE_URL" == postgresql://* ]] || [[ "$DATABASE_URL" == postgres://* ]]; then
    echo "📊 Detected PostgreSQL database"

    # 切换到PostgreSQL schema
    if [ -f "prisma/schema.postgresql.prisma" ]; then
        echo "🔄 Switching to PostgreSQL schema..."
        cp prisma/schema.postgresql.prisma prisma/schema.prisma
        echo "✅ PostgreSQL schema activated"

        # 尝试创建数据库表结构
        echo "🔄 Creating database schema..."
        if npx prisma db push --accept-data-loss; then
            echo "✅ Database schema created successfully"
        else
            echo "⚠️ Database push failed, trying alternative method..."
            # 如果 db push 失败，尝试使用 migrate deploy
            if npx prisma migrate deploy; then
                echo "✅ Database migration completed"
            else
                echo "⚠️ Migration failed, assuming schema exists"
            fi
        fi
    else
        echo "❌ PostgreSQL schema file not found"
        exit 1
    fi
else
    echo "📊 Using default SQLite schema"
fi

# 2. 生成Prisma客户端
echo "⚙️ Generating Prisma client..."
pnpm db:generate
echo "✅ Prisma client generated"

# 3. 检查并导入种子数据
echo "🔍 Checking seed data..."

# 等待数据库连接稳定
sleep 2

SEED_CHECK_OUTPUT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSeedData() {
    try {
        const count = await prisma.currency.count();
        console.log(\`Found \${count} currencies in database\`);

        if (count === 0) {
            console.log('SEED_NEEDED');
        } else {
            console.log('SEED_EXISTS');
        }
    } catch (error) {
        console.log('Database check failed, assuming seed needed:', error.message);
        console.log('SEED_NEEDED');
    } finally {
        await prisma.\$disconnect();
    }
}

checkSeedData();
" 2>/dev/null)

echo "$SEED_CHECK_OUTPUT"

if echo "$SEED_CHECK_OUTPUT" | grep -q "SEED_NEEDED"; then
    echo "🌱 Database is empty or check failed, importing seed data..."
    if pnpm db:seed; then
        echo "✅ Seed data imported successfully"

        # 验证种子数据导入
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

        echo "📊 Imported $CURRENCY_COUNT currencies"
    else
        echo "⚠️ Seed data import failed, but continuing..."
    fi
else
    echo "✅ Seed data already exists, skipping import"
fi

# 4. 构建应用
echo "🏗️ Building application..."
pnpm build
echo "✅ Build completed successfully"

echo "🎉 Vercel build process completed!"
