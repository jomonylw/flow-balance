#!/usr/bin/env node

/**
 * Flow Balance - Data Backup Script
 * 数据备份脚本，支持 SQLite 和 PostgreSQL
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 获取当前时间戳
function getTimestamp() {
  const now = new Date()
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

// 检查文件是否存在
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath)
  } catch (error) {
    return false
  }
}

// 创建备份目录
function ensureBackupDir() {
  const backupDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
    console.log(`📁 创建备份目录: ${backupDir}`)
  }
  return backupDir
}

// 备份 SQLite 数据库
function backupSQLite() {
  console.log('🗄️  开始备份 SQLite 数据库...')

  const dbPaths = ['data/production.db', 'prisma/dev.db', 'dev.db']

  let dbPath = null
  for (const path of dbPaths) {
    if (fileExists(path)) {
      dbPath = path
      break
    }
  }

  if (!dbPath) {
    console.log('⚠️  未找到 SQLite 数据库文件')
    return false
  }

  const backupDir = ensureBackupDir()
  const timestamp = getTimestamp()
  const backupPath = path.join(backupDir, `sqlite-backup-${timestamp}.db`)

  try {
    fs.copyFileSync(dbPath, backupPath)
    console.log(`✅ SQLite 备份完成: ${backupPath}`)

    // 压缩备份文件
    try {
      execSync(`gzip "${backupPath}"`)
      console.log(`🗜️  备份文件已压缩: ${backupPath}.gz`)
    } catch (error) {
      console.log('ℹ️  压缩失败，保留原始备份文件')
    }

    return true
  } catch (error) {
    console.error(`❌ SQLite 备份失败: ${error.message}`)
    return false
  }
}

// 备份 PostgreSQL 数据库
function backupPostgreSQL() {
  console.log('🗄️  开始备份 PostgreSQL 数据库...')

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || !databaseUrl.includes('postgresql://')) {
    console.log('⚠️  未找到 PostgreSQL 连接字符串')
    return false
  }

  const backupDir = ensureBackupDir()
  const timestamp = getTimestamp()
  const backupPath = path.join(backupDir, `postgresql-backup-${timestamp}.sql`)

  try {
    // 使用 pg_dump 备份数据库
    const command = `pg_dump "${databaseUrl}" > "${backupPath}"`
    execSync(command, { stdio: 'inherit' })

    console.log(`✅ PostgreSQL 备份完成: ${backupPath}`)

    // 压缩备份文件
    try {
      execSync(`gzip "${backupPath}"`)
      console.log(`🗜️  备份文件已压缩: ${backupPath}.gz`)
    } catch (error) {
      console.log('ℹ️  压缩失败，保留原始备份文件')
    }

    return true
  } catch (error) {
    console.error(`❌ PostgreSQL 备份失败: ${error.message}`)
    console.log('💡 请确保已安装 pg_dump 工具')
    return false
  }
}

// 清理旧备份文件
function cleanupOldBackups() {
  console.log('🧹 清理旧备份文件...')

  const backupDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(backupDir)) {
    return
  }

  try {
    const files = fs.readdirSync(backupDir)
    const now = Date.now()
    const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 天

    let deletedCount = 0

    files.forEach(file => {
      const filePath = path.join(backupDir, file)
      const stats = fs.statSync(filePath)

      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath)
        deletedCount++
        console.log(`🗑️  删除旧备份: ${file}`)
      }
    })

    if (deletedCount === 0) {
      console.log('ℹ️  没有需要清理的旧备份文件')
    } else {
      console.log(`✅ 清理完成，删除了 ${deletedCount} 个旧备份文件`)
    }
  } catch (error) {
    console.error(`❌ 清理失败: ${error.message}`)
  }
}

// 显示备份信息
function showBackupInfo() {
  const backupDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(backupDir)) {
    console.log('📋 暂无备份文件')
    return
  }

  try {
    const files = fs.readdirSync(backupDir)
    if (files.length === 0) {
      console.log('📋 暂无备份文件')
      return
    }

    console.log('📋 备份文件列表:')
    files.forEach(file => {
      const filePath = path.join(backupDir, file)
      const stats = fs.statSync(filePath)
      const size = (stats.size / 1024 / 1024).toFixed(2)
      const date = stats.mtime.toLocaleString()
      console.log(`  ${file} (${size} MB, ${date})`)
    })
  } catch (error) {
    console.error(`❌ 获取备份信息失败: ${error.message}`)
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  console.log('💾 Flow Balance 数据备份工具')
  console.log('================================')

  switch (command) {
    case 'sqlite':
      backupSQLite()
      break

    case 'postgresql':
    case 'postgres':
      backupPostgreSQL()
      break

    case 'auto':
      // 自动检测数据库类型
      const databaseUrl = process.env.DATABASE_URL
      if (databaseUrl && databaseUrl.includes('postgresql://')) {
        backupPostgreSQL()
      } else {
        backupSQLite()
      }
      break

    case 'cleanup':
      cleanupOldBackups()
      break

    case 'list':
      showBackupInfo()
      break

    case 'help':
    case '--help':
    case '-h':
      console.log(`
使用方法:
  node scripts/backup-data.js <command>

命令:
  auto        自动检测数据库类型并备份
  sqlite      备份 SQLite 数据库
  postgresql  备份 PostgreSQL 数据库
  cleanup     清理 30 天前的旧备份
  list        显示备份文件列表
  help        显示帮助信息

示例:
  node scripts/backup-data.js auto
  node scripts/backup-data.js sqlite
  node scripts/backup-data.js cleanup
`)
      break

    default:
      console.log('🚀 自动备份模式')
      const success = main.auto
        ? main.auto()
        : (() => {
            const databaseUrl = process.env.DATABASE_URL
            if (databaseUrl && databaseUrl.includes('postgresql://')) {
              return backupPostgreSQL()
            } else {
              return backupSQLite()
            }
          })()

      if (success) {
        cleanupOldBackups()
      }
      break
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

module.exports = {
  backupSQLite,
  backupPostgreSQL,
  cleanupOldBackups,
  showBackupInfo,
}
