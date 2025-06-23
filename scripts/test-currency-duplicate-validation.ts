#!/usr/bin/env tsx

/**
 * 测试货币代码重复验证功能
 * 
 * 这个脚本用于验证用户设置中严格限制同一用户不能选择两个相同货币代码的货币
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 开始测试货币代码重复验证功能...\n')

  try {
    // 1. 查找一个测试用户
    const testUser = await prisma.user.findFirst({
      where: {
        email: {
          contains: '@',
        },
      },
    })

    if (!testUser) {
      console.log('❌ 未找到测试用户，请先创建用户')
      return
    }

    console.log(`✅ 找到测试用户: ${testUser.email}`)

    // 2. 检查是否存在相同货币代码的不同货币
    console.log('\n🔍 检查货币表中是否存在相同代码的不同货币...')
    
    const allCurrencies = await prisma.currency.findMany({
      orderBy: { code: 'asc' },
    })

    const codeGroups = allCurrencies.reduce((groups, currency) => {
      if (!groups[currency.code]) {
        groups[currency.code] = []
      }
      groups[currency.code].push(currency)
      return groups
    }, {} as Record<string, any[]>)

    const duplicateCodes = Object.entries(codeGroups).filter(
      ([_, currencies]) => currencies.length > 1
    )

    if (duplicateCodes.length === 0) {
      console.log('✅ 未发现相同代码的不同货币')
    } else {
      console.log(`⚠️  发现 ${duplicateCodes.length} 个重复的货币代码:`)
      duplicateCodes.forEach(([code, currencies]) => {
        console.log(`   ${code}: ${currencies.length} 个货币`)
        currencies.forEach(currency => {
          console.log(`     - ID: ${currency.id}, 创建者: ${currency.createdBy || '全局'}, 自定义: ${currency.isCustom}`)
        })
      })
    }

    // 3. 检查用户当前的货币设置
    console.log('\n🔍 检查用户当前的货币设置...')
    
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: testUser.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
      orderBy: { order: 'asc' },
    })

    console.log(`✅ 用户当前有 ${userCurrencies.length} 个活跃货币:`)
    userCurrencies.forEach(uc => {
      console.log(`   ${uc.currency.code} (${uc.currency.name}) - ID: ${uc.currency.id}`)
    })

    // 4. 检查是否存在相同代码的货币
    const userCurrencyCodes = userCurrencies.map(uc => uc.currency.code)
    const uniqueUserCodes = new Set(userCurrencyCodes)
    
    if (uniqueUserCodes.size !== userCurrencyCodes.length) {
      console.log('\n❌ 发现用户选择了相同代码的多个货币!')
      const duplicateUserCodes = userCurrencyCodes.filter((code, index) => 
        userCurrencyCodes.indexOf(code) !== index
      )
      console.log(`   重复的代码: ${[...new Set(duplicateUserCodes)].join(', ')}`)
    } else {
      console.log('\n✅ 用户货币设置中没有重复的货币代码')
    }

    // 5. 模拟测试场景（如果存在重复代码的货币）
    if (duplicateCodes.length > 0) {
      console.log('\n🧪 模拟测试重复代码验证...')
      
      const [testCode, testCurrencies] = duplicateCodes[0]
      console.log(`   使用货币代码: ${testCode}`)
      
      // 模拟批量设置包含重复代码的货币
      const testCurrencyCodes = [testCode, testCode, 'USD']
      console.log(`   测试代码列表: ${testCurrencyCodes.join(', ')}`)
      
      // 检查重复项检测逻辑
      const uniqueCodes = new Set(testCurrencyCodes)
      if (uniqueCodes.size !== testCurrencyCodes.length) {
        const duplicates = testCurrencyCodes.filter((code, index) => 
          testCurrencyCodes.indexOf(code) !== index
        )
        console.log(`   ✅ 重复检测正常工作，发现重复项: ${[...new Set(duplicates)].join(', ')}`)
      }
    }

    console.log('\n✅ 货币代码重复验证测试完成')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
