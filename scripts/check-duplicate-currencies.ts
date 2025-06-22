import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDuplicateCurrencies() {
  try {
    console.log('🔍 检查重复货币记录...')

    // 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 用户: ${user.email}`)

    // 检查用户货币记录
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
      },
      include: {
        currency: true,
      },
      orderBy: [
        { currency: { code: 'asc' } },
        { createdAt: 'asc' },
      ],
    })

    console.log(`\n💰 用户货币记录 (${userCurrencies.length} 条):`)
    userCurrencies.forEach((uc, index) => {
      console.log(`${index + 1}. ID: ${uc.id}`)
      console.log(`   货币: ${uc.currency.code} - ${uc.currency.name}`)
      console.log(`   状态: ${uc.isActive ? '✅ 活跃' : '❌ 非活跃'}`)
      console.log(`   创建时间: ${uc.createdAt.toISOString()}`)
      console.log(`   货币ID: ${uc.currencyId}`)
      console.log('')
    })

    // 检查重复的货币代码
    const currencyCodeCounts = userCurrencies.reduce((counts, uc) => {
      const code = uc.currency.code
      counts[code] = (counts[code] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    console.log(`📊 货币代码统计:`)
    Object.entries(currencyCodeCounts).forEach(([code, count]) => {
      if (count > 1) {
        console.log(`  ❌ ${code}: ${count} 条记录 (重复!)`)
      } else {
        console.log(`  ✅ ${code}: ${count} 条记录`)
      }
    })

    // 找出重复的记录
    const duplicates = Object.entries(currencyCodeCounts)
      .filter(([_, count]) => count > 1)
      .map(([code, _]) => code)

    if (duplicates.length > 0) {
      console.log(`\n⚠️  发现重复货币: ${duplicates.join(', ')}`)
      
      for (const code of duplicates) {
        const duplicateRecords = userCurrencies.filter(uc => uc.currency.code === code)
        console.log(`\n🔍 ${code} 的重复记录:`)
        duplicateRecords.forEach((uc, index) => {
          console.log(`  ${index + 1}. UserCurrency ID: ${uc.id}`)
          console.log(`     Currency ID: ${uc.currencyId}`)
          console.log(`     状态: ${uc.isActive ? '活跃' : '非活跃'}`)
          console.log(`     创建时间: ${uc.createdAt.toISOString()}`)
        })

        // 建议清理方案
        const activeRecords = duplicateRecords.filter(uc => uc.isActive)
        const inactiveRecords = duplicateRecords.filter(uc => !uc.isActive)
        
        console.log(`\n💡 ${code} 清理建议:`)
        if (activeRecords.length > 1) {
          console.log(`  - 有 ${activeRecords.length} 个活跃记录，建议保留最早的一个`)
          const keepRecord = activeRecords[0]
          const removeRecords = activeRecords.slice(1)
          console.log(`  - 保留: UserCurrency ID ${keepRecord.id}`)
          console.log(`  - 删除: UserCurrency IDs ${removeRecords.map(r => r.id).join(', ')}`)
        }
        if (inactiveRecords.length > 0) {
          console.log(`  - 有 ${inactiveRecords.length} 个非活跃记录，建议全部删除`)
          console.log(`  - 删除: UserCurrency IDs ${inactiveRecords.map(r => r.id).join(', ')}`)
        }
      }

      // 提供清理脚本
      console.log(`\n🛠️  清理脚本建议:`)
      for (const code of duplicates) {
        const duplicateRecords = userCurrencies.filter(uc => uc.currency.code === code)
        const activeRecords = duplicateRecords.filter(uc => uc.isActive)
        const inactiveRecords = duplicateRecords.filter(uc => !uc.isActive)
        
        // 删除非活跃记录
        if (inactiveRecords.length > 0) {
          console.log(`// 删除 ${code} 的非活跃记录`)
          console.log(`await prisma.userCurrency.deleteMany({`)
          console.log(`  where: {`)
          console.log(`    id: { in: [${inactiveRecords.map(r => `"${r.id}"`).join(', ')}] }`)
          console.log(`  }`)
          console.log(`})`)
          console.log('')
        }

        // 删除多余的活跃记录
        if (activeRecords.length > 1) {
          const removeRecords = activeRecords.slice(1)
          console.log(`// 删除 ${code} 的多余活跃记录`)
          console.log(`await prisma.userCurrency.deleteMany({`)
          console.log(`  where: {`)
          console.log(`    id: { in: [${removeRecords.map(r => `"${r.id}"`).join(', ')}] }`)
          console.log(`  }`)
          console.log(`})`)
          console.log('')
        }
      }
    } else {
      console.log(`\n✅ 未发现重复的货币记录`)
    }

    // 检查货币表本身是否有重复
    console.log(`\n🔍 检查货币表中的重复记录...`)
    const allCurrencies = await prisma.currency.findMany({
      orderBy: { code: 'asc' },
    })

    const currencyCodeCountsInTable = allCurrencies.reduce((counts, currency) => {
      counts[currency.code] = (counts[currency.code] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    const duplicatesInTable = Object.entries(currencyCodeCountsInTable)
      .filter(([_, count]) => count > 1)
      .map(([code, _]) => code)

    if (duplicatesInTable.length > 0) {
      console.log(`⚠️  货币表中发现重复代码: ${duplicatesInTable.join(', ')}`)
      
      for (const code of duplicatesInTable) {
        const duplicateRecords = allCurrencies.filter(c => c.code === code)
        console.log(`\n${code} 的重复记录:`)
        duplicateRecords.forEach((c, index) => {
          console.log(`  ${index + 1}. ID: ${c.id}, 名称: ${c.name}, 自定义: ${c.isCustom}`)
        })
      }
    } else {
      console.log(`✅ 货币表中未发现重复代码`)
    }

  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行检查
checkDuplicateCurrencies()
