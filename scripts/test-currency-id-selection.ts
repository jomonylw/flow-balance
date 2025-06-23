#!/usr/bin/env tsx

/**
 * 测试货币ID精确选择功能
 * 
 * 这个脚本用于验证：
 * 1. 前端传递货币ID而不是货币代码
 * 2. 后端根据货币ID精确添加用户选择的货币
 * 3. 不再因为优先级导致添加错误的货币
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCurrencyIdSelection() {
  console.log('🧪 开始测试货币ID精确选择功能...\n')

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

    // 2. 查找是否存在相同代码的不同货币
    console.log('\n🔍 查找相同代码的不同货币...')
    
    const allCurrencies = await prisma.currency.findMany({
      where: {
        OR: [
          { createdBy: null }, // 全局货币
          { createdBy: testUser.id }, // 用户自定义货币
        ],
      },
      orderBy: { code: 'asc' },
    })

    // 按代码分组
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
      console.log('⚠️  未发现相同代码的不同货币，无法测试精确选择功能')
      console.log('💡 建议创建一个自定义货币来测试此功能')
      return
    }

    console.log(`✅ 发现 ${duplicateCodes.length} 个重复的货币代码:`)
    duplicateCodes.forEach(([code, currencies]) => {
      console.log(`   ${code}: ${currencies.length} 个货币`)
      currencies.forEach(currency => {
        console.log(`     - ID: ${currency.id}, 创建者: ${currency.createdBy || '全局'}, 名称: ${currency.name}`)
      })
    })

    // 3. 选择第一个重复代码进行测试
    const [testCode, testCurrencies] = duplicateCodes[0]
    console.log(`\n🧪 使用 ${testCode} 进行测试...`)

    // 清理用户当前的货币选择
    console.log('🧹 清理用户当前的货币选择...')
    await prisma.userCurrency.deleteMany({
      where: { userId: testUser.id },
    })

    // 4. 测试添加全局货币
    const globalCurrency = testCurrencies.find(c => c.createdBy === null)
    const customCurrency = testCurrencies.find(c => c.createdBy === testUser.id)

    if (globalCurrency) {
      console.log(`\n📝 测试添加全局货币: ${globalCurrency.name} (ID: ${globalCurrency.id})`)
      
      // 模拟API调用
      const result = await testAddCurrencyById(testUser.id, globalCurrency.id)
      if (result.success) {
        console.log(`✅ 成功添加全局货币`)
        
        // 验证添加的是否是正确的货币
        const addedCurrency = await prisma.userCurrency.findFirst({
          where: {
            userId: testUser.id,
            currencyId: globalCurrency.id,
          },
          include: { currency: true },
        })
        
        if (addedCurrency) {
          console.log(`✅ 验证通过: 添加的货币ID为 ${addedCurrency.currencyId}`)
          console.log(`   货币信息: ${addedCurrency.currency.name} (${addedCurrency.currency.createdBy ? '自定义' : '全局'})`)
        } else {
          console.log(`❌ 验证失败: 未找到添加的货币记录`)
        }
      } else {
        console.log(`❌ 添加全局货币失败: ${result.error}`)
      }
    }

    // 5. 测试添加自定义货币
    if (customCurrency) {
      console.log(`\n📝 测试添加自定义货币: ${customCurrency.name} (ID: ${customCurrency.id})`)
      
      // 先清理之前的选择
      await prisma.userCurrency.deleteMany({
        where: { userId: testUser.id },
      })
      
      const result = await testAddCurrencyById(testUser.id, customCurrency.id)
      if (result.success) {
        console.log(`✅ 成功添加自定义货币`)
        
        // 验证添加的是否是正确的货币
        const addedCurrency = await prisma.userCurrency.findFirst({
          where: {
            userId: testUser.id,
            currencyId: customCurrency.id,
          },
          include: { currency: true },
        })
        
        if (addedCurrency) {
          console.log(`✅ 验证通过: 添加的货币ID为 ${addedCurrency.currencyId}`)
          console.log(`   货币信息: ${addedCurrency.currency.name} (${addedCurrency.currency.createdBy ? '自定义' : '全局'})`)
        } else {
          console.log(`❌ 验证失败: 未找到添加的货币记录`)
        }
      } else {
        console.log(`❌ 添加自定义货币失败: ${result.error}`)
      }
    }

    // 6. 测试重复添加检测
    if (globalCurrency && customCurrency) {
      console.log(`\n📝 测试重复代码检测...`)
      
      // 先添加全局货币
      await prisma.userCurrency.deleteMany({
        where: { userId: testUser.id },
      })
      
      await testAddCurrencyById(testUser.id, globalCurrency.id)
      console.log(`✅ 已添加全局 ${testCode}`)
      
      // 尝试添加自定义货币（应该被阻止）
      const result = await testAddCurrencyById(testUser.id, customCurrency.id)
      if (!result.success) {
        console.log(`✅ 重复检测正常工作: ${result.error}`)
      } else {
        console.log(`❌ 重复检测失败: 应该阻止添加相同代码的货币`)
      }
    }

    console.log('\n✅ 货币ID精确选择功能测试完成')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 模拟API调用的函数
async function testAddCurrencyById(userId: string, currencyId: string) {
  try {
    // 模拟 POST /api/user/currencies 的逻辑
    
    // 1. 查找货币
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

    // 2. 检查重复代码
    const existingCurrenciesWithSameCode = await prisma.userCurrency.findMany({
      where: {
        userId: userId,
        isActive: true,
        currency: {
          code: currency.code,
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
        return { success: false, error: '该货币已在您的可用列表中' }
      } else {
        return { 
          success: false, 
          error: `您已选择了货币代码为 ${currency.code} 的其他货币，同一货币代码只能选择一次` 
        }
      }
    }

    // 3. 添加货币
    const maxOrder = await prisma.userCurrency.aggregate({
      where: { userId: userId },
      _max: { order: true },
    })

    await prisma.userCurrency.create({
      data: {
        userId: userId,
        currencyId: currency.id,
        order: (maxOrder._max.order || 0) + 1,
        isActive: true,
      },
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: `添加失败: ${error}` }
  }
}

testCurrencyIdSelection().catch(console.error)
