#!/usr/bin/env tsx

/**
 * 测试货币API的重复验证功能
 * 
 * 这个脚本模拟API调用来测试货币代码重复验证
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 模拟API验证逻辑
async function validateCurrencyCodesForUser(userId: string, currencyCodes: string[]) {
  console.log(`\n🧪 测试用户 ${userId} 的货币代码验证...`)
  console.log(`   输入代码: ${currencyCodes.join(', ')}`)

  // 1. 检查重复项
  const uniqueCodes = new Set(currencyCodes)
  if (uniqueCodes.size !== currencyCodes.length) {
    const duplicates = currencyCodes.filter((code, index) => 
      currencyCodes.indexOf(code) !== index
    )
    console.log(`   ❌ 货币代码列表中存在重复项: ${[...new Set(duplicates)].join(', ')}`)
    return false
  }

  // 2. 验证货币代码是否有效
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

  // 3. 检查是否会导致同一货币代码有多个选择
  const selectedCurrencies: any[] = []
  const codeToSelectedCurrency = new Map<string, any>()

  for (const code of currencyCodes) {
    const candidateCurrencies = validCurrencies.filter(c => c.code === code)
    // 按优先级排序：用户自定义货币优先
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
}

// 模拟单个货币添加验证
async function validateSingleCurrencyAdd(userId: string, currencyCode: string) {
  console.log(`\n🧪 测试添加单个货币 ${currencyCode}...`)

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
    console.log(`   ❌ 无效的货币代码: ${currencyCode}`)
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
      console.log(`   ❌ 该货币已在可用列表中`)
      return false
    } else {
      console.log(`   ❌ 已选择了货币代码为 ${currencyCode} 的其他货币`)
      return false
    }
  }

  console.log(`   ✅ 可以添加货币: ${currency.code} - ID: ${currency.id}`)
  return true
}

async function main() {
  console.log('🧪 开始测试货币API验证功能...\n')

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

    // 测试场景1: 正常的货币代码列表
    await validateCurrencyCodesForUser(testUser.id, ['USD', 'EUR', 'GBP'])

    // 测试场景2: 包含重复代码的列表
    await validateCurrencyCodesForUser(testUser.id, ['USD', 'EUR', 'USD'])

    // 测试场景3: 包含无效代码的列表
    await validateCurrencyCodesForUser(testUser.id, ['USD', 'INVALID', 'EUR'])

    // 测试场景4: 包含重复货币代码的列表（如果存在CNY的两个版本）
    const cnyVersions = await prisma.currency.findMany({
      where: { code: 'CNY' },
    })

    if (cnyVersions.length > 1) {
      console.log(`\n🔍 发现 ${cnyVersions.length} 个CNY版本，测试重复代码处理...`)
      await validateCurrencyCodesForUser(testUser.id, ['USD', 'CNY', 'EUR'])
    }

    // 测试场景5: 单个货币添加
    await validateSingleCurrencyAdd(testUser.id, 'GBP')
    
    // 测试场景6: 添加已存在代码的货币
    if (cnyVersions.length > 1) {
      await validateSingleCurrencyAdd(testUser.id, 'CNY')
    }

    console.log('\n✅ 货币API验证测试完成')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
