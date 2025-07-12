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
        
        # 推送数据库结构
        echo "🔄 Pushing database schema..."
        npx prisma db push
        echo "✅ Database schema pushed"
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
