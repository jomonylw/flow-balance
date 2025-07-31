#!/usr/bin/env node

/**
 * 测试数据库初始化脚本
 * 为测试环境创建数据库表结构
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// 设置测试环境变量
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'file:./test.db'

console.log('🔧 设置测试数据库...')

try {
  // 删除现有的测试数据库文件
  const testDbPath = path.join(process.cwd(), 'test.db')
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
    console.log('✅ 删除现有测试数据库')
  }

  // 生成 Prisma 客户端
  console.log('📦 生成 Prisma 客户端...')
  execSync('pnpm prisma generate --schema=prisma/schema.sqlite.prisma', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  })

  // 推送数据库架构（不使用迁移文件）
  console.log('🗄️ 创建数据库表结构...')
  execSync(
    'pnpm prisma db push --force-reset --schema=prisma/schema.sqlite.prisma',
    {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    }
  )

  console.log('✅ 测试数据库设置完成！')
  console.log(`📍 数据库位置: ${testDbPath}`)
} catch (error) {
  console.error('❌ 测试数据库设置失败:', error.message)
  process.exit(1)
}
