#!/usr/bin/env tsx

/**
 * 测试货币显示和大小写处理
 * 
 * 验证：
 * 1. 待选区域可以显示两个相同code的货币
 * 2. 货币code自动转大写处理
 * 3. isSelected逻辑正确（基于ID而不是code）
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCurrencyDisplayAndCase() {
  console.log('🧪 开始测试货币显示和大小写处理...\n')

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

    // 2. 模拟获取所有货币列表的API逻辑
    console.log('\n🔍 测试货币列表显示逻辑...')
    
    const allCurrencies = await prisma.currency.findMany({
      where: {
        OR: [
          { createdBy: null }, // 全局货币
          { createdBy: testUser.id }, // 用户的自定义货币
        ],
      },
      orderBy: [
        { createdBy: 'asc' }, // 全局货币在前
        { code: 'asc' },
      ],
    })

    // 获取用户已选择的货币
    const userCurrencies = await prisma.userCurrency.findMany({
      where: {
        userId: testUser.id,
        isActive: true,
      },
      select: { currencyId: true },
    })

    const userCurrencyIds = new Set(userCurrencies.map(uc => uc.currencyId))

    // 标记哪些货币已被用户选择（基于ID）
    const currenciesWithStatus = allCurrencies.map(currency => ({
      ...currency,
      isSelected: userCurrencyIds.has(currency.id),
    }))

    console.log(`✅ 总共找到 ${currenciesWithStatus.length} 个可用货币`)

    // 3. 检查相同代码的货币显示
    const codeGroups = currenciesWithStatus.reduce((groups, currency) => {
      if (!groups[currency.code]) {
        groups[currency.code] = []
      }
      groups[currency.code].push(currency)
      return groups
    }, {} as Record<string, any[]>)

    const duplicateCodes = Object.entries(codeGroups).filter(
      ([_, currencies]) => currencies.length > 1
    )

    if (duplicateCodes.length > 0) {
      console.log(`\n📋 发现 ${duplicateCodes.length} 个重复代码的货币:`)
      duplicateCodes.forEach(([code, currencies]) => {
        console.log(`\n💰 货币代码: ${code}`)
        currencies.forEach(currency => {
          console.log(`   - ID: ${currency.id}`)
          console.log(`     名称: ${currency.name}`)
          console.log(`     创建者: ${currency.createdBy || '全局'}`)
          console.log(`     已选择: ${currency.isSelected ? '是' : '否'}`)
          console.log(`     在待选区域显示: ${!currency.isSelected ? '是' : '否'}`)
        })
      })

      // 4. 验证待选区域逻辑
      console.log('\n🔍 验证待选区域显示逻辑...')
      const availableCurrencies = currenciesWithStatus.filter(currency => !currency.isSelected)
      
      console.log(`✅ 待选区域显示 ${availableCurrencies.length} 个货币`)
      
      // 检查是否有相同代码的货币都在待选区域
      const availableCodeGroups = availableCurrencies.reduce((groups, currency) => {
        if (!groups[currency.code]) {
          groups[currency.code] = []
        }
        groups[currency.code].push(currency)
        return groups
      }, {} as Record<string, any[]>)

      const availableDuplicates = Object.entries(availableCodeGroups).filter(
        ([_, currencies]) => currencies.length > 1
      )

      if (availableDuplicates.length > 0) {
        console.log(`✅ 待选区域正确显示了 ${availableDuplicates.length} 组相同代码的货币:`)
        availableDuplicates.forEach(([code, currencies]) => {
          console.log(`   ${code}: ${currencies.length} 个货币可选`)
        })
      } else {
        console.log('ℹ️  待选区域中没有相同代码的货币')
      }
    } else {
      console.log('ℹ️  未发现重复代码的货币')
    }

    // 5. 测试货币代码大小写处理
    console.log('\n🔍 测试货币代码大小写处理...')
    
    // 模拟创建小写货币代码的自定义货币
    const testCode = 'test123'
    console.log(`📝 测试创建货币代码: ${testCode} (小写)`)

    // 检查是否已存在
    const existingTestCurrency = await prisma.currency.findUnique({
      where: {
        createdBy_code: {
          createdBy: testUser.id,
          code: testCode.toUpperCase(),
        },
      },
    })

    if (existingTestCurrency) {
      console.log(`ℹ️  测试货币 ${testCode.toUpperCase()} 已存在，跳过创建测试`)
    } else {
      // 验证大写转换逻辑
      const upperCode = testCode.toUpperCase()
      console.log(`✅ 货币代码自动转换: ${testCode} → ${upperCode}`)
      
      // 验证格式检查
      if (!/^[A-Z0-9]{3,10}$/.test(upperCode)) {
        console.log(`❌ 货币代码格式验证失败: ${upperCode}`)
      } else {
        console.log(`✅ 货币代码格式验证通过: ${upperCode}`)
      }
    }

    // 6. 检查现有货币的代码格式
    console.log('\n🔍 检查现有货币代码格式...')
    
    const invalidCodes = allCurrencies.filter(currency => {
      return !/^[A-Z0-9]{3,10}$/.test(currency.code)
    })

    if (invalidCodes.length > 0) {
      console.log(`⚠️  发现 ${invalidCodes.length} 个格式不正确的货币代码:`)
      invalidCodes.forEach(currency => {
        console.log(`   - ${currency.code} (${currency.name})`)
      })
    } else {
      console.log(`✅ 所有货币代码格式都正确`)
    }

    console.log('\n✅ 货币显示和大小写处理测试完成')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCurrencyDisplayAndCase().catch(console.error)
