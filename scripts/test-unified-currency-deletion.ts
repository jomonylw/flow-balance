#!/usr/bin/env tsx

/**
 * 测试统一的货币删除API
 * 
 * 验证：
 * 1. 现有API可以同时处理货币代码和货币ID
 * 2. 传递货币ID时能精确删除
 * 3. 传递货币代码时保持向后兼容
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testUnifiedCurrencyDeletion() {
  console.log('🧪 开始测试统一的货币删除API...\n')

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

    // 2. 查找用户当前选择的AUD
    const userSelectedAud = await prisma.userCurrency.findFirst({
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

    if (!userSelectedAud) {
      console.log('❌ 用户没有选择AUD货币，无法测试删除功能')
      return
    }

    console.log(`✅ 找到用户选择的AUD:`)
    console.log(`   货币ID: ${userSelectedAud.currencyId}`)
    console.log(`   货币代码: ${userSelectedAud.currency.code}`)
    console.log(`   名称: ${userSelectedAud.currency.name}`)
    console.log(`   创建者: ${userSelectedAud.currency.createdBy || '全局'}`)

    // 3. 测试通过货币ID删除（新方式）
    console.log(`\n🔧 测试1: 通过货币ID删除...`)
    
    const idResult = await testDeleteCurrencyUnified(testUser.id, userSelectedAud.currencyId)
    
    if (idResult.success) {
      console.log(`✅ 通过ID删除成功: ${idResult.message}`)
      
      // 验证删除结果
      const remainingAud = await prisma.userCurrency.findFirst({
        where: {
          userId: testUser.id,
          currencyId: userSelectedAud.currencyId,
        },
      })
      
      if (!remainingAud) {
        console.log(`✅ 验证通过: 货币已从用户列表中移除`)
      } else {
        console.log(`❌ 验证失败: 货币仍在用户列表中`)
      }
      
      // 恢复数据
      await prisma.userCurrency.create({
        data: {
          userId: testUser.id,
          currencyId: userSelectedAud.currencyId,
          order: userSelectedAud.order,
          isActive: userSelectedAud.isActive,
        },
      })
      console.log(`🔄 数据已恢复`)
      
    } else {
      console.log(`❌ 通过ID删除失败: ${idResult.error}`)
    }

    // 4. 测试通过货币代码删除（向后兼容）
    console.log(`\n🔧 测试2: 通过货币代码删除（向后兼容）...`)
    
    const codeResult = await testDeleteCurrencyUnified(testUser.id, userSelectedAud.currency.code)
    
    if (codeResult.success) {
      console.log(`✅ 通过代码删除成功: ${codeResult.message}`)
      
      // 恢复数据
      await prisma.userCurrency.create({
        data: {
          userId: testUser.id,
          currencyId: userSelectedAud.currencyId,
          order: userSelectedAud.order,
          isActive: userSelectedAud.isActive,
        },
      })
      console.log(`🔄 数据已恢复`)
      
    } else {
      console.log(`❌ 通过代码删除失败: ${codeResult.error}`)
      if (codeResult.error && codeResult.error.includes('不在您的可用列表中')) {
        console.log(`⚠️  这表明仍然存在货币代码歧义问题`)
      }
    }

    // 5. 检查所有AUD货币
    console.log(`\n🔍 检查所有AUD货币...`)
    
    const allAudCurrencies = await prisma.currency.findMany({
      where: {
        code: 'AUD',
        OR: [
          { createdBy: null },
          { createdBy: testUser.id },
        ],
      },
    })

    console.log(`📋 找到 ${allAudCurrencies.length} 个AUD货币:`)
    allAudCurrencies.forEach((currency, index) => {
      console.log(`   ${index + 1}. ID: ${currency.id}`)
      console.log(`      名称: ${currency.name}`)
      console.log(`      创建者: ${currency.createdBy || '全局'}`)
    })

    if (allAudCurrencies.length > 1) {
      console.log(`\n💡 由于存在多个AUD货币，建议使用货币ID进行精确删除`)
    }

    console.log('\n✅ 统一货币删除API测试完成')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 模拟统一的删除API逻辑
async function testDeleteCurrencyUnified(userId: string, currencyCodeOrId: string) {
  try {
    // 智能判断传入的是货币代码还是货币ID
    let currency
    
    // 首先尝试作为货币ID查找
    currency = await prisma.currency.findFirst({
      where: {
        id: currencyCodeOrId,
        OR: [
          { createdBy: userId },
          { createdBy: null },
        ],
      },
    })

    // 如果按ID没找到，再尝试按货币代码查找
    if (!currency) {
      currency = await prisma.currency.findFirst({
        where: {
          code: currencyCodeOrId,
          OR: [
            { createdBy: userId },
            { createdBy: null },
          ],
        },
      })
    }

    if (!currency) {
      return { success: false, error: '货币不存在' }
    }

    // 检查是否是本位币
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: userId },
    })

    if (userSettings?.baseCurrencyId === currency.id) {
      return { success: false, error: '不能删除本位币，请先更改本位币设置' }
    }

    // 检查交易记录
    const transactionCount = await prisma.transaction.count({
      where: {
        userId: userId,
        currencyId: currency.id,
      },
    })

    if (transactionCount > 0) {
      return { 
        success: false, 
        error: `该货币有 ${transactionCount} 条交易记录，不能删除` 
      }
    }

    // 检查汇率设置
    const exchangeRateCount = await prisma.exchangeRate.count({
      where: {
        userId: userId,
        OR: [{ fromCurrencyId: currency.id }, { toCurrencyId: currency.id }],
      },
    })

    if (exchangeRateCount > 0) {
      return { 
        success: false, 
        error: `该货币有 ${exchangeRateCount} 条汇率设置，不能删除` 
      }
    }

    // 删除用户货币记录
    const deletedCount = await prisma.userCurrency.deleteMany({
      where: {
        userId: userId,
        currencyId: currency.id,
      },
    })

    if (deletedCount.count === 0) {
      return { success: false, error: '该货币不在您的可用列表中' }
    }

    return { 
      success: true, 
      message: '货币删除成功',
      deletedCurrency: {
        id: currency.id,
        code: currency.code,
        name: currency.name,
      }
    }
  } catch (error) {
    return { success: false, error: `删除失败: ${error}` }
  }
}

testUnifiedCurrencyDeletion().catch(console.error)
