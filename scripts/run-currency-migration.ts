/**
 * 运行货币及汇率优化迁移
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function runCurrencyMigration() {
  try {
    console.log('🚀 开始运行货币及汇率优化迁移...\n')

    // 读取迁移文件
    const migrationPath = path.join(
      process.cwd(),
      'prisma/migrations/20250621_currency_optimization_v2/migration.sql'
    )

    if (!fs.existsSync(migrationPath)) {
      console.log('❌ 迁移文件不存在:', migrationPath)
      return
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    console.log('📄 读取迁移文件成功')

    // 分割SQL语句并执行
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📝 找到 ${statements.length} 条SQL语句\n`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`执行第 ${i + 1} 条语句...`)

      try {
        await prisma.$executeRawUnsafe(statement)
        console.log('✅ 执行成功')
      } catch (error) {
        console.log('⚠️  执行失败:', error)
        // 某些语句可能因为字段已存在而失败，这是正常的
      }
    }

    console.log('\n🎉 迁移执行完成！')

    // 验证迁移结果
    console.log('\n🔍 验证迁移结果...')

    // 检查 Currency 表的 decimalPlaces 字段
    try {
      const currencies = await prisma.currency.findMany({
        select: {
          code: true,
          decimalPlaces: true,
        },
        take: 5,
      })

      console.log('✅ Currency.decimalPlaces 字段验证成功')
      console.log('示例数据:', currencies)
    } catch (error) {
      console.log('❌ Currency.decimalPlaces 字段验证失败:', error)
    }

    // 检查 ExchangeRate 表的新字段
    try {
      const exchangeRates = await prisma.exchangeRate.findMany({
        select: {
          id: true,
          type: true,
          sourceRateId: true,
        },
        take: 5,
      })

      console.log('✅ ExchangeRate 新字段验证成功')
      console.log('示例数据:', exchangeRates)
    } catch (error) {
      console.log('❌ ExchangeRate 新字段验证失败:', error)
    }

    console.log('\n✨ 迁移验证完成！')
  } catch (error) {
    console.error('❌ 迁移执行失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行迁移
runCurrencyMigration()
