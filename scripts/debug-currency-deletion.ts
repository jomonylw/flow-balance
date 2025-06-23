#!/usr/bin/env tsx

/**
 * 调试货币删除问题
 * 
 * 检查用户选择了哪个AUD，以及删除API的查找逻辑
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugCurrencyDeletion() {
  console.log('🔍 开始调试货币删除问题...\n')

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

    // 2. 查找所有AUD货币
    const allAudCurrencies = await prisma.currency.findMany({
      where: {
        code: 'AUD',
        OR: [
          { createdBy: null },
          { createdBy: testUser.id },
        ],
      },
      orderBy: [
        { createdBy: 'asc' }, // null 在前（全局货币）
        { code: 'asc' },
      ],
    })

    console.log(`\n📋 找到 ${allAudCurrencies.length} 个AUD货币:`)
    allAudCurrencies.forEach((currency, index) => {
      console.log(`   ${index + 1}. ID: ${currency.id}`)
      console.log(`      名称: ${currency.name}`)
      console.log(`      创建者: ${currency.createdBy || '全局'}`)
    })

    // 3. 查找用户选择的AUD
    const userSelectedAud = await prisma.userCurrency.findMany({
      where: {
        userId: testUser.id,
        isActive: true,
        currency: {
          code: 'AUD',
        },
      },
      include: {
        currency: true,
      },
    })

    console.log(`\n👤 用户选择的AUD (${userSelectedAud.length} 个):`)
    userSelectedAud.forEach(uc => {
      console.log(`   - 货币ID: ${uc.currencyId}`)
      console.log(`     名称: ${uc.currency.name}`)
      console.log(`     创建者: ${uc.currency.createdBy || '全局'}`)
    })

    // 4. 模拟删除API的查找逻辑
    console.log(`\n🔍 模拟删除API的查找逻辑...`)
    
    // 这是当前API使用的查找逻辑
    const foundCurrency = await prisma.currency.findFirst({
      where: {
        code: 'AUD',
        OR: [
          { createdBy: testUser.id },
          { createdBy: null },
        ],
      },
    })

    if (foundCurrency) {
      console.log(`✅ API找到的货币:`)
      console.log(`   ID: ${foundCurrency.id}`)
      console.log(`   名称: ${foundCurrency.name}`)
      console.log(`   创建者: ${foundCurrency.createdBy || '全局'}`)

      // 检查这个货币是否在用户的选择列表中
      const isInUserList = userSelectedAud.some(uc => uc.currencyId === foundCurrency.id)
      console.log(`   在用户列表中: ${isInUserList ? '是' : '否'}`)

      if (!isInUserList) {
        console.log(`❌ 问题发现：API找到的货币不在用户选择列表中！`)
        console.log(`   这就是为什么删除失败的原因`)
      }
    }

    // 5. 测试正确的删除逻辑
    console.log(`\n🔧 测试正确的删除逻辑...`)
    
    if (userSelectedAud.length > 0) {
      const selectedCurrency = userSelectedAud[0]
      console.log(`📝 尝试删除用户实际选择的AUD: ${selectedCurrency.currency.name}`)
      
      // 模拟删除操作
      const deleteResult = await prisma.userCurrency.deleteMany({
        where: {
          userId: testUser.id,
          currencyId: selectedCurrency.currencyId,
        },
      })

      console.log(`✅ 删除结果: ${deleteResult.count} 条记录被删除`)
      
      // 恢复数据（重新添加）
      await prisma.userCurrency.create({
        data: {
          userId: testUser.id,
          currencyId: selectedCurrency.currencyId,
          order: selectedCurrency.order,
          isActive: selectedCurrency.isActive,
        },
      })
      console.log(`🔄 已恢复数据`)
    }

    // 6. 建议的修复方案
    console.log(`\n💡 建议的修复方案:`)
    console.log(`1. 修改删除API，先查找用户实际选择的货币`)
    console.log(`2. 或者修改前端，传递货币ID而不是货币代码`)
    console.log(`3. 确保删除的是用户实际选择的那个货币`)

  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugCurrencyDeletion().catch(console.error)
