#!/usr/bin/env tsx

/**
 * 修复现有数据中的重复货币代码问题
 * 
 * 这个脚本会：
 * 1. 检查所有用户的货币设置
 * 2. 识别选择了相同代码多个货币的用户
 * 3. 为每个用户保留优先级最高的货币（用户自定义 > 全局）
 * 4. 移除重复的货币选择
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface DuplicateInfo {
  userId: string
  userEmail: string
  code: string
  currencies: Array<{
    id: string
    currencyId: string
    currency: {
      id: string
      code: string
      name: string
      createdBy: string | null
      isCustom: boolean
    }
  }>
}

async function findDuplicateCurrencyCodes(): Promise<DuplicateInfo[]> {
  console.log('🔍 检查用户货币设置中的重复代码...')

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
    },
  })

  const duplicates: DuplicateInfo[] = []

  for (const user of allUsers) {
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
    })

    // 按货币代码分组
    const codeGroups = userCurrencies.reduce((groups, uc) => {
      const code = uc.currency.code
      if (!groups[code]) {
        groups[code] = []
      }
      groups[code].push(uc)
      return groups
    }, {} as Record<string, any[]>)

    // 找出有重复的代码
    for (const [code, currencies] of Object.entries(codeGroups)) {
      if (currencies.length > 1) {
        duplicates.push({
          userId: user.id,
          userEmail: user.email,
          code,
          currencies,
        })
      }
    }
  }

  return duplicates
}

async function fixDuplicateCurrencyCodes(duplicates: DuplicateInfo[], dryRun: boolean = true) {
  console.log(`\n🔧 ${dryRun ? '模拟' : '执行'}修复重复货币代码...`)

  for (const duplicate of duplicates) {
    console.log(`\n👤 用户: ${duplicate.userEmail}`)
    console.log(`💰 重复代码: ${duplicate.code}`)
    console.log(`📊 重复数量: ${duplicate.currencies.length}`)

    // 按优先级排序：用户自定义 > 全局
    const sortedCurrencies = duplicate.currencies.sort((a, b) => {
      if (a.currency.createdBy === duplicate.userId && b.currency.createdBy !== duplicate.userId) return -1
      if (a.currency.createdBy !== duplicate.userId && b.currency.createdBy === duplicate.userId) return 1
      return 0
    })

    const keepCurrency = sortedCurrencies[0]
    const removeCurrencies = sortedCurrencies.slice(1)

    console.log(`✅ 保留: ${keepCurrency.currency.name} (ID: ${keepCurrency.currency.id}, ${keepCurrency.currency.createdBy ? '自定义' : '全局'})`)
    
    for (const removeCurrency of removeCurrencies) {
      console.log(`❌ 移除: ${removeCurrency.currency.name} (ID: ${removeCurrency.currency.id}, ${removeCurrency.currency.createdBy ? '自定义' : '全局'})`)
      
      if (!dryRun) {
        try {
          await prisma.userCurrency.delete({
            where: { id: removeCurrency.id },
          })
          console.log(`   ✅ 已删除用户货币记录: ${removeCurrency.id}`)
        } catch (error) {
          console.log(`   ❌ 删除失败: ${error}`)
        }
      } else {
        console.log(`   🔍 将删除用户货币记录: ${removeCurrency.id}`)
      }
    }
  }
}

async function main() {
  console.log('🚀 开始检查和修复重复货币代码问题...\n')

  try {
    // 1. 查找重复的货币代码
    const duplicates = await findDuplicateCurrencyCodes()

    if (duplicates.length === 0) {
      console.log('✅ 未发现重复的货币代码，数据完整性良好！')
      return
    }

    console.log(`⚠️  发现 ${duplicates.length} 个重复货币代码问题:`)
    duplicates.forEach(duplicate => {
      console.log(`   用户: ${duplicate.userEmail}, 代码: ${duplicate.code}, 重复数: ${duplicate.currencies.length}`)
    })

    // 2. 模拟修复（干运行）
    console.log('\n🧪 首先进行模拟修复...')
    await fixDuplicateCurrencyCodes(duplicates, true)

    // 3. 询问是否执行实际修复
    console.log('\n❓ 是否要执行实际修复？')
    console.log('   注意：这将永久删除重复的货币选择记录')
    console.log('   建议：先备份数据库，然后手动确认修复逻辑正确')
    console.log('\n   要执行实际修复，请修改脚本中的 EXECUTE_FIX 变量为 true')

    const EXECUTE_FIX = false // 安全起见，默认为 false

    if (EXECUTE_FIX) {
      console.log('\n🔧 执行实际修复...')
      await fixDuplicateCurrencyCodes(duplicates, false)
      console.log('\n✅ 修复完成！')
    } else {
      console.log('\n🔍 仅执行了模拟修复，未进行实际更改')
    }

    // 4. 验证修复结果
    if (EXECUTE_FIX) {
      console.log('\n🔍 验证修复结果...')
      const remainingDuplicates = await findDuplicateCurrencyCodes()
      if (remainingDuplicates.length === 0) {
        console.log('✅ 修复成功，不再有重复的货币代码')
      } else {
        console.log(`⚠️  仍有 ${remainingDuplicates.length} 个重复问题需要手动处理`)
      }
    }

  } catch (error) {
    console.error('❌ 处理过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
