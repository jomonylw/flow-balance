#!/usr/bin/env tsx

/**
 * 测试货币删除修复
 * 
 * 验证：
 * 1. 通过货币ID精确删除用户选择的货币
 * 2. 不再出现"该货币不在您的可用列表中"错误
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCurrencyDeletionFix() {
  console.log('🧪 开始测试货币删除修复...\n')

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
    console.log(`   名称: ${userSelectedAud.currency.name}`)
    console.log(`   创建者: ${userSelectedAud.currency.createdBy || '全局'}`)

    // 3. 模拟新的删除API逻辑（通过货币ID）
    console.log(`\n🔧 测试通过货币ID删除...`)
    
    const result = await testDeleteCurrencyById(testUser.id, userSelectedAud.currencyId)
    
    if (result.success) {
      console.log(`✅ 删除成功: ${result.message}`)
      console.log(`   删除的货币: ${result.deletedCurrency?.name} (${result.deletedCurrency?.code})`)
      
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
      console.log(`\n🔄 恢复测试数据...`)
      await prisma.userCurrency.create({
        data: {
          userId: testUser.id,
          currencyId: userSelectedAud.currencyId,
          order: userSelectedAud.order,
          isActive: userSelectedAud.isActive,
        },
      })
      console.log(`✅ 数据已恢复`)
      
    } else {
      console.log(`❌ 删除失败: ${result.error}`)
    }

    // 4. 对比旧的删除逻辑（通过货币代码）
    console.log(`\n🔍 对比旧的删除逻辑（通过货币代码）...`)
    
    const oldResult = await testDeleteCurrencyByCode(testUser.id, 'AUD')
    
    if (oldResult.success) {
      console.log(`⚠️  旧逻辑意外成功: ${oldResult.message}`)
    } else {
      console.log(`❌ 旧逻辑失败（预期）: ${oldResult.error}`)
      if (oldResult.error && oldResult.error.includes('不在您的可用列表中')) {
        console.log(`✅ 确认了旧逻辑的问题：找到了错误的货币`)
      }
    }

    console.log('\n✅ 货币删除修复测试完成')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 模拟新的删除API逻辑（通过货币ID）
async function testDeleteCurrencyById(userId: string, currencyId: string) {
  try {
    // 验证货币ID是否有效
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

// 模拟旧的删除API逻辑（通过货币代码）
async function testDeleteCurrencyByCode(userId: string, currencyCode: string) {
  try {
    // 这是旧API使用的查找逻辑
    const currency = await prisma.currency.findFirst({
      where: {
        code: currencyCode,
        OR: [
          { createdBy: userId },
          { createdBy: null },
        ],
      },
    })

    if (!currency) {
      return { success: false, error: '货币不存在' }
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

    return { success: true, message: '货币删除成功' }
  } catch (error) {
    return { success: false, error: `删除失败: ${error}` }
  }
}

testCurrencyDeletionFix().catch(console.error)
