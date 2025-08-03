#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * Flow Balance - Database Switch Script
 * 数据库切换脚本，支持 SQLite 和 PostgreSQL
 * 通过复制预定义的 schema 文件来更新主 schema.prisma 文件
 */

const fs = require('fs')
const path = require('path')

const PRISMA_DIR = path.join(__dirname, '..', 'prisma')
const DEST_SCHEMA_PATH = path.join(PRISMA_DIR, 'schema.prisma')

function showUsage() {
  console.log(`
Flow Balance - Database Schema Switch Script

Usage:
  node scripts/switch-database.js <database-type>

Database Types:
  sqlite      - Switch to SQLite by copying schema.sqlite.prisma
  postgresql  - Switch to PostgreSQL by copying schema.postgresql.prisma
  postgres    - Alias for postgresql

Examples:
  node scripts/switch-database.js sqlite
  node scripts/switch-database.js postgresql

This script overwrites 'prisma/schema.prisma' with the content of the selected database-specific schema file.
`)
}

function switchDatabaseSchema(dbType) {
  console.log(`🔄 Switching database schema to "${dbType}"...`)

  const sourceFileName = `schema.${dbType}.prisma`
  const sourceSchemaPath = path.join(PRISMA_DIR, sourceFileName)

  if (!fs.existsSync(sourceSchemaPath)) {
    console.error(`❌ Source schema file not found at: ${sourceSchemaPath}`)
    process.exit(1)
  }

  try {
    const schemaContent = fs.readFileSync(sourceSchemaPath, 'utf8')
    fs.writeFileSync(DEST_SCHEMA_PATH, schemaContent)

    console.log(`✅ Successfully switched to "${dbType}" schema.`)
    console.log(`   - Source: ${sourceFileName}`)
    console.log('   - Destination: schema.prisma')
    console.log('🔧 Next steps:')
    console.log('   - Update your DATABASE_URL in the .env file if necessary.')
    console.log('   - Run \`pnpm db:generate\` to update Prisma Client.')
    console.log('   - Run \`pnpm db:migrate\` if you have schema changes.')
  } catch (error) {
    console.error('❌ An error occurred during the switch:', error)
    process.exit(1)
  }
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
      switchDatabaseSchema('sqlite')
      break

    case 'postgresql':
    case 'postgres':
      // Use 'postgresql' as the canonical name for the file
      switchDatabaseSchema('postgresql')
      break

    default:
      console.error(`❌ Unknown database type: ${dbType}`)
      showUsage()
      process.exit(1)
  }
}

// Check if the script is being run directly
if (require.main === module) {
  main()
}
