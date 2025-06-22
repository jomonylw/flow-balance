import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanDuplicateCurrencies() {
  try {
    console.log('🧹 清理重复货币记录...')

    // 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 用户: ${user.email}`)

    // 删除重复的 CNY 用户货币记录（保留原始的，删除自定义的）
    console.log('\n🗑️  删除重复的 CNY 用户货币记录...')
    
    const deletedUserCurrency = await prisma.userCurrency.deleteMany({
      where: {
        id: { in: ["cmc7v4cnb00039rzslerrnycy"] }
      }
    })
    
    console.log(`✅ 删除了 ${deletedUserCurrency.count} 条重复的用户货币记录`)

    // 删除重复的 CNY 货币记录（删除自定义的）
    console.log('\n🗑️  删除重复的 CNY 货币记录...')
    
    const deletedCurrency = await prisma.currency.deleteMany({
      where: {
        id: { in: ["cmc7v4cna00019rzs2bv3x4qz"] }
      }
    })
    
    console.log(`✅ 删除了 ${deletedCurrency.count} 条重复的货币记录`)

    // 验证清理结果
    console.log('\n🔍 验证清理结果...')
    
    const remainingUserCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: user.id,
      },
      include: {
        currency: true,
      },
      orderBy: [
        { currency: { code: 'asc' } },
      ],
    })

    console.log(`💰 剩余用户货币记录 (${remainingUserCurrencies.length} 条):`)
    remainingUserCurrencies.forEach((uc, index) => {
      console.log(`${index + 1}. ${uc.currency.code} - ${uc.currency.name} (${uc.isActive ? '活跃' : '非活跃'})`)
    })

    // 检查是否还有重复
    const currencyCodeCounts = remainingUserCurrencies.reduce((counts, uc) => {
      const code = uc.currency.code
      counts[code] = (counts[code] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    const duplicates = Object.entries(currencyCodeCounts)
      .filter(([_, count]) => count > 1)
      .map(([code, _]) => code)

    if (duplicates.length > 0) {
      console.log(`⚠️  仍有重复货币: ${duplicates.join(', ')}`)
    } else {
      console.log(`✅ 已无重复货币记录`)
    }

    console.log('\n🎉 清理完成!')

  } catch (error) {
    console.error('❌ 清理失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行清理
cleanDuplicateCurrencies()
