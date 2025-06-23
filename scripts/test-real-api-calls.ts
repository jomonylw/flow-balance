#!/usr/bin/env tsx

/**
 * 测试实际的API调用来验证货币代码重复验证
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testBatchCurrencyUpdate(userId: string, currencyCodes: string[]) {
  console.log(`\n🧪 测试批量更新货币设置...`)
  console.log(`   输入代码: ${currencyCodes.join(', ')}`)

  try {
    // 模拟 PUT /api/user/currencies 的逻辑
    
    // 1. 检查重复项
    const uniqueCodes = new Set(currencyCodes)
    if (uniqueCodes.size !== currencyCodes.length) {
      const duplicates = currencyCodes.filter((code, index) => 
        currencyCodes.indexOf(code) !== index
      )
      console.log(`   ❌ 货币代码列表中存在重复项: ${[...new Set(duplicates)].join(', ')}`)
      return false
    }

    // 2. 验证货币代码有效性
    const validCurrencies = await prisma.currency.findMany({
      where: {
        code: { in: currencyCodes },
        OR: [
          { createdBy: userId },
          { createdBy: null },
        ],
      },
    })

    if (validCurrencies.length !== currencyCodes.length) {
      const invalidCodes = currencyCodes.filter(
        code => !validCurrencies.some(c => c.code === code)
      )
      console.log(`   ❌ 无效的货币代码: ${invalidCodes.join(', ')}`)
      return false
    }

    // 3. 选择优先级最高的货币并检查重复
    const selectedCurrencies: any[] = []
    const codeToSelectedCurrency = new Map<string, any>()

    for (const code of currencyCodes) {
      const candidateCurrencies = validCurrencies.filter(c => c.code === code)
      candidateCurrencies.sort((a, b) => {
        if (a.createdBy === userId && b.createdBy !== userId) return -1
        if (a.createdBy !== userId && b.createdBy === userId) return 1
        return 0
      })
      
      const selectedCurrency = candidateCurrencies[0]
      if (codeToSelectedCurrency.has(code)) {
        console.log(`   ❌ 货币代码 ${code} 存在多个可选项`)
        return false
      }
      
      codeToSelectedCurrency.set(code, selectedCurrency)
      selectedCurrencies.push(selectedCurrency)
    }

    console.log(`   ✅ 验证通过，将选择 ${selectedCurrencies.length} 个货币:`)
    selectedCurrencies.forEach(currency => {
      console.log(`      ${currency.code} - ID: ${currency.id} (${currency.createdBy ? '自定义' : '全局'})`)
    })

    return true
  } catch (error) {
    console.log(`   ❌ 验证失败: ${error}`)
    return false
  }
}

async function testSingleCurrencyAdd(userId: string, currencyCode: string) {
  console.log(`\n🧪 测试添加单个货币 ${currencyCode}...`)

  try {
    // 模拟 POST /api/user/currencies 的逻辑
    
    // 1. 查找货币
    const currency = await prisma.currency.findFirst({
      where: {
        code: currencyCode,
        OR: [
          { createdBy: userId },
          { createdBy: null },
        ],
      },
      orderBy: { createdBy: 'desc' },
    })

    if (!currency) {
      console.log(`   ❌ 无效的货币代码`)
      return false
    }

    // 2. 检查是否已经选择了相同代码的其他货币
    const existingCurrenciesWithSameCode = await prisma.userCurrency.findMany({
      where: {
        userId: userId,
        isActive: true,
        currency: {
          code: currencyCode,
        },
      },
      include: {
        currency: true,
      },
    })

    if (existingCurrenciesWithSameCode.length > 0) {
      const existingCurrency = existingCurrenciesWithSameCode.find(
        uc => uc.currencyId === currency.id
      )
      
      if (existingCurrency) {
        console.log(`   ❌ 该货币已在您的可用列表中`)
        return false
      } else {
        console.log(`   ❌ 您已选择了货币代码为 ${currencyCode} 的其他货币，同一货币代码只能选择一次`)
        return false
      }
    }

    console.log(`   ✅ 可以添加货币: ${currency.code} - ID: ${currency.id} (${currency.createdBy ? '自定义' : '全局'})`)
    return true
  } catch (error) {
    console.log(`   ❌ 验证失败: ${error}`)
    return false
  }
}

async function main() {
  console.log('🧪 开始测试实际API调用验证...\n')

  try {
    // 查找测试用户
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

    // 显示当前用户的货币设置
    const currentCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: testUser.id,
        isActive: true,
      },
      include: {
        currency: true,
      },
      orderBy: { order: 'asc' },
    })

    console.log(`\n📋 当前用户货币设置 (${currentCurrencies.length} 个):`)
    currentCurrencies.forEach(uc => {
      console.log(`   ${uc.currency.code} - ${uc.currency.name} (ID: ${uc.currency.id})`)
    })

    // 检查是否存在CNY的多个版本
    const cnyVersions = await prisma.currency.findMany({
      where: { code: 'CNY' },
    })

    console.log(`\n🔍 CNY货币版本 (${cnyVersions.length} 个):`)
    cnyVersions.forEach(currency => {
      console.log(`   ID: ${currency.id}, 创建者: ${currency.createdBy || '全局'}, 自定义: ${currency.isCustom}`)
    })

    // 测试场景
    console.log('\n🧪 开始测试各种场景...')

    // 场景1: 正常的货币列表
    await testBatchCurrencyUpdate(testUser.id, ['USD', 'EUR', 'GBP'])

    // 场景2: 包含重复代码
    await testBatchCurrencyUpdate(testUser.id, ['USD', 'EUR', 'USD'])

    // 场景3: 包含无效代码
    await testBatchCurrencyUpdate(testUser.id, ['USD', 'INVALID', 'EUR'])

    // 场景4: 尝试添加已存在的货币
    if (currentCurrencies.length > 0) {
      const existingCode = currentCurrencies[0].currency.code
      await testSingleCurrencyAdd(testUser.id, existingCode)
    }

    // 场景5: 尝试添加新的货币
    await testSingleCurrencyAdd(testUser.id, 'CAD')

    // 场景6: 如果存在CNY的多个版本，测试冲突
    if (cnyVersions.length > 1) {
      const userHasCNY = currentCurrencies.some(uc => uc.currency.code === 'CNY')
      if (userHasCNY) {
        console.log('\n🔍 用户已有CNY，测试添加另一个CNY版本...')
        await testSingleCurrencyAdd(testUser.id, 'CNY')
      } else {
        console.log('\n🔍 用户没有CNY，测试添加CNY...')
        await testSingleCurrencyAdd(testUser.id, 'CNY')
      }
    }

    console.log('\n✅ 实际API调用测试完成')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
