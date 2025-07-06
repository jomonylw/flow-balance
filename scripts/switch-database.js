#!/usr/bin/env node

/**
 * Flow Balance - Database Switch Script
 * 数据库切换脚本，支持 SQLite 和 PostgreSQL
 */

const fs = require('fs')
const path = require('path')

const SCHEMA_DIR = path.join(__dirname, '..', 'prisma')
const SQLITE_SCHEMA = path.join(SCHEMA_DIR, 'schema.prisma')
const POSTGRESQL_SCHEMA = path.join(SCHEMA_DIR, 'schema.postgresql.prisma')

function showUsage() {
  console.log(`
Flow Balance - Database Switch Script

Usage:
  node scripts/switch-database.js <database-type>

Database Types:
  sqlite      - Switch to SQLite (development)
  postgresql  - Switch to PostgreSQL (production)
  postgres    - Alias for postgresql

Examples:
  node scripts/switch-database.js sqlite
  node scripts/switch-database.js postgresql

Environment Variables:
  DATABASE_URL - Will be updated based on database type
`)
}

function switchToSQLite() {
  console.log('🔄 Switching to SQLite database...')
  
  // 备份当前 schema
  if (fs.existsSync(SQLITE_SCHEMA)) {
    const backupPath = `${SQLITE_SCHEMA}.backup.${Date.now()}`
    fs.copyFileSync(SQLITE_SCHEMA, backupPath)
    console.log(`📦 Current schema backed up to: ${backupPath}`)
  }
  
  // 读取当前 schema 并修改 provider
  let schemaContent = fs.readFileSync(SQLITE_SCHEMA, 'utf8')
  
  // 替换 datasource 配置
  schemaContent = schemaContent.replace(
    /datasource db \{[\s\S]*?\}/,
    `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`
  )
  
  // 写入修改后的 schema
  fs.writeFileSync(SQLITE_SCHEMA, schemaContent)
  
  console.log('✅ Successfully switched to SQLite')
  console.log('📝 Please update your .env file:')
  console.log('   DATABASE_URL="file:./prisma/dev.db"')
  console.log('')
  console.log('🔧 Next steps:')
  console.log('   pnpm db:generate')
  console.log('   pnpm db:migrate')
}

function switchToPostgreSQL() {
  console.log('🔄 Switching to PostgreSQL database...')
  
  // 检查是否存在 PostgreSQL schema 文件
  if (!fs.existsSync(POSTGRESQL_SCHEMA)) {
    console.error('❌ PostgreSQL schema file not found!')
    console.error(`   Expected: ${POSTGRESQL_SCHEMA}`)
    process.exit(1)
  }
  
  // 备份当前 schema
  if (fs.existsSync(SQLITE_SCHEMA)) {
    const backupPath = `${SQLITE_SCHEMA}.backup.${Date.now()}`
    fs.copyFileSync(SQLITE_SCHEMA, backupPath)
    console.log(`📦 Current schema backed up to: ${backupPath}`)
  }
  
  // 复制 PostgreSQL schema
  fs.copyFileSync(POSTGRESQL_SCHEMA, SQLITE_SCHEMA)
  
  console.log('✅ Successfully switched to PostgreSQL')
  console.log('📝 Please update your .env file:')
  console.log('   DATABASE_URL="postgresql://username:password@localhost:5432/flowbalance?schema=public"')
  console.log('')
  console.log('🔧 Next steps:')
  console.log('   pnpm db:generate')
  console.log('   pnpm db:migrate')
}

function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    showUsage()
    process.exit(1)
  }
  
  const dbType = args[0].toLowerCase()
  
  switch (dbType) {
    case 'sqlite':
      switchToSQLite()
      break
      
    case 'postgresql':
    case 'postgres':
      switchToPostgreSQL()
      break
      
    default:
      console.error(`❌ Unknown database type: ${dbType}`)
      showUsage()
      process.exit(1)
  }
}

// 检查是否直接运行此脚本
if (require.main === module) {
  main()
}

module.exports = {
  switchToSQLite,
  switchToPostgreSQL
}
