#!/usr/bin/env tsx

/**
 * 测试重复货币代码的显示逻辑
 * 
 * 验证：
 * 1. 当两个相同代码的货币都未选择时，待选区域应该显示两个
 * 2. 当其中一个被选择后，待选区域只显示未选择的那个
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testDuplicateCurrencyDisplay() {
  console.log('🧪 开始测试重复货币代码的显示逻辑...\n')

  try {
    // 1. 查找测试用户
    const testUser = await prisma.user.findFirst({
      where: {
        email: {
          contains: '@',
        },
      },
    })

    if (!testUser) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 使用测试用户: ${testUser.email}`)

    // 2. 查找AUD货币（我们知道有两个）
    const audCurrencies = await prisma.currency.findMany({
      where: {
        code: 'AUD',
        OR: [
          { createdBy: null },
          { createdBy: testUser.id },
        ],
      },
    })

    if (audCurrencies.length < 2) {
      console.log('❌ 未找到足够的AUD货币进行测试')
      return
    }

    const globalAUD = audCurrencies.find(c => c.createdBy === null)
    const customAUD = audCurrencies.find(c => c.createdBy === testUser.id)

    console.log(`✅ 找到两个AUD货币:`)
    console.log(`   全局AUD: ${globalAUD?.name} (ID: ${globalAUD?.id})`)
    console.log(`   自定义AUD: ${customAUD?.name} (ID: ${customAUD?.id})`)

    // 3. 清理用户当前的AUD选择
    console.log('\n🧹 清理用户当前的AUD选择...')
    await prisma.userCurrency.deleteMany({
      where: {
        userId: testUser.id,
        currencyId: { in: audCurrencies.map(c => c.id) },
      },
    })

    // 4. 测试场景1：两个AUD都未选择
    console.log('\n📝 场景1：两个AUD都未选择')
    const scenario1 = await getAvailableCurrencies(testUser.id)
    const audInScenario1 = scenario1.filter(c => c.code === 'AUD')
    
    console.log(`✅ 待选区域显示 ${audInScenario1.length} 个AUD货币:`)
    audInScenario1.forEach(currency => {
      console.log(`   - ${currency.name} (${currency.createdBy ? '自定义' : '全局'})`)
    })

    if (audInScenario1.length === 2) {
      console.log('✅ 正确：两个AUD都在待选区域显示')
    } else {
      console.log('❌ 错误：应该显示两个AUD')
    }

    // 5. 测试场景2：选择全局AUD
    console.log('\n📝 场景2：选择全局AUD')
    if (globalAUD) {
      await prisma.userCurrency.create({
        data: {
          userId: testUser.id,
          currencyId: globalAUD.id,
          order: 1,
          isActive: true,
        },
      })

      const scenario2 = await getAvailableCurrencies(testUser.id)
      const audInScenario2 = scenario2.filter(c => c.code === 'AUD')
      
      console.log(`✅ 待选区域显示 ${audInScenario2.length} 个AUD货币:`)
      audInScenario2.forEach(currency => {
        console.log(`   - ${currency.name} (${currency.createdBy ? '自定义' : '全局'})`)
      })

      if (audInScenario2.length === 1 && audInScenario2[0].createdBy === testUser.id) {
        console.log('✅ 正确：只显示未选择的自定义AUD')
      } else {
        console.log('❌ 错误：应该只显示未选择的自定义AUD')
      }
    }

    // 6. 测试场景3：切换到选择自定义AUD
    console.log('\n📝 场景3：切换到选择自定义AUD')
    
    // 清理全局AUD选择
    await prisma.userCurrency.deleteMany({
      where: {
        userId: testUser.id,
        currencyId: globalAUD?.id,
      },
    })

    // 选择自定义AUD
    if (customAUD) {
      await prisma.userCurrency.create({
        data: {
          userId: testUser.id,
          currencyId: customAUD.id,
          order: 1,
          isActive: true,
        },
      })

      const scenario3 = await getAvailableCurrencies(testUser.id)
      const audInScenario3 = scenario3.filter(c => c.code === 'AUD')
      
      console.log(`✅ 待选区域显示 ${audInScenario3.length} 个AUD货币:`)
      audInScenario3.forEach(currency => {
        console.log(`   - ${currency.name} (${currency.createdBy ? '自定义' : '全局'})`)
      })

      if (audInScenario3.length === 1 && audInScenario3[0].createdBy === null) {
        console.log('✅ 正确：只显示未选择的全局AUD')
      } else {
        console.log('❌ 错误：应该只显示未选择的全局AUD')
      }
    }

    // 7. 测试场景4：尝试添加第二个AUD（应该被阻止）
    console.log('\n📝 场景4：尝试添加第二个AUD（应该被阻止）')
    
    if (globalAUD && customAUD) {
      // 当前已选择自定义AUD，尝试添加全局AUD
      const result = await testAddCurrency(testUser.id, globalAUD.id)
      
      if (!result.success) {
        console.log(`✅ 正确阻止重复添加: ${result.error}`)
      } else {
        console.log('❌ 错误：应该阻止添加相同代码的货币')
      }
    }

    console.log('\n✅ 重复货币代码显示逻辑测试完成')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 获取可用货币列表（模拟前端逻辑）
async function getAvailableCurrencies(userId: string) {
  const allCurrencies = await prisma.currency.findMany({
    where: {
      OR: [
        { createdBy: null },
        { createdBy: userId },
      ],
    },
  })

  const userCurrencies = await prisma.userCurrency.findMany({
    where: {
      userId: userId,
      isActive: true,
    },
    select: { currencyId: true },
  })

  const userCurrencyIds = new Set(userCurrencies.map(uc => uc.currencyId))

  return allCurrencies
    .map(currency => ({
      ...currency,
      isSelected: userCurrencyIds.has(currency.id),
    }))
    .filter(currency => !currency.isSelected)
}

// 测试添加货币（模拟API逻辑）
async function testAddCurrency(userId: string, currencyId: string) {
  try {
    const currency = await prisma.currency.findFirst({
      where: {
        id: currencyId,
        OR: [
          { createdBy: userId },
          { createdBy: null },
        ],
      },
    })

    if (!currency) {
      return { success: false, error: '无效的货币ID' }
    }

    // 检查重复代码
    const existingCurrenciesWithSameCode = await prisma.userCurrency.findMany({
      where: {
        userId: userId,
        isActive: true,
        currency: {
          code: currency.code,
        },
      },
    })

    if (existingCurrenciesWithSameCode.length > 0) {
      return { 
        success: false, 
        error: `您已选择了货币代码为 ${currency.code} 的其他货币，同一货币代码只能选择一次` 
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: `添加失败: ${error}` }
  }
}

testDuplicateCurrencyDisplay().catch(console.error)
