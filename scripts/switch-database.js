#!/usr/bin/env node

/**
 * Flow Balance - Database Switch Script
 * 数据库切换脚本，支持 SQLite 和 PostgreSQL
 * 仅更新 schema.prisma 文件中的 provider
 */

const fs = require('fs')
const path = require('path')

const SCHEMA_PATH = path.join(__dirname, '..', 'prisma', 'schema.prisma')

function showUsage() {
  console.log(`
Flow Balance - Database Provider Switch Script

Usage:
  node scripts/switch-database.js <database-type>

Database Types:
  sqlite      - Switch provider to "sqlite"
  postgresql  - Switch provider to "postgresql"
  postgres    - Alias for postgresql

Examples:
  node scripts/switch-database.js sqlite
  node scripts/switch-database.js postgresql

This script only modifies the 'provider' in the datasource block of your schema.prisma.
`)
}

function switchProvider(provider) {
  console.log(`🔄 Switching provider to "${provider}"...`)

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`❌ Schema file not found at: ${SCHEMA_PATH}`)
    process.exit(1)
  }

  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8')

  // 使用正则表达式替换 provider 的值
  const updatedSchemaContent = schemaContent.replace(
    /(datasource db {\s*provider\s*=\s*")[^"]*(")/,
    `$1${provider}$2`
  )

  if (schemaContent === updatedSchemaContent) {
    console.warn(
      `🟡 Provider is already set to "${provider}". No changes made.`
    )
    return
  }

  fs.writeFileSync(SCHEMA_PATH, updatedSchemaContent)

  console.log(
    `✅ Successfully switched provider to "${provider}" in ${SCHEMA_PATH}`
  )
  console.log('🔧 Next steps:')
  console.log('   - Update your DATABASE_URL in the .env file accordingly.')
  console.log('   - Run `pnpm db:generate` to update Prisma Client.')
  console.log('   - Run `pnpm db:migrate` if you have schema changes.')
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
      switchProvider('sqlite')
      break

    case 'postgresql':
    case 'postgres':
      switchProvider('postgresql')
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
  switchProvider,
}
