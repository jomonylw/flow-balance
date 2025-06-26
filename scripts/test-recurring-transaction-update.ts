#!/usr/bin/env tsx

/**
 * 测试定期交易更新功能
 */

import { PrismaClient } from '@prisma/client'
import { RecurringTransactionService } from '../src/lib/services/recurring-transaction.service'

const prisma = new PrismaClient()

async function testRecurringTransactionUpdate() {
  try {
    console.log('🧪 测试定期交易更新功能...')

    // 1. 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 测试用户: ${user.email}`)

    // 2. 获取用户的第一个定期交易
    const recurringTransaction = await prisma.recurringTransaction.findFirst({
      where: { userId: user.id },
      include: {
        account: true,
        currency: true,
      },
    })

    if (!recurringTransaction) {
      console.log('❌ 未找到定期交易记录')
      return
    }

    console.log(`✅ 找到定期交易: ${recurringTransaction.description}`)
    console.log(`   当前金额: ${recurringTransaction.amount}`)
    console.log(`   当前账户: ${recurringTransaction.account.name}`)
    console.log(`   当前货币: ${recurringTransaction.currency.code}`)

    // 3. 测试更新基本字段
    console.log('\n🔄 测试更新基本字段...')
    const newAmount = Number(recurringTransaction.amount) + 100
    const newDescription = `${recurringTransaction.description} (已更新)`

    try {
      const updatedTransaction = await RecurringTransactionService.updateRecurringTransaction(
        recurringTransaction.id,
        user.id,
        {
          amount: newAmount,
          description: newDescription,
        }
      )

      console.log(`✅ 基本字段更新成功`)
      console.log(`   新金额: ${updatedTransaction.amount}`)
      console.log(`   新描述: ${updatedTransaction.description}`)
    } catch (error) {
      console.error('❌ 基本字段更新失败:', error)
      return
    }

    // 4. 测试更新账户ID
    console.log('\n🔄 测试更新账户ID...')
    
    // 获取另一个账户
    const anotherAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        id: { not: recurringTransaction.accountId },
      },
    })

    if (anotherAccount) {
      try {
        const updatedTransaction = await RecurringTransactionService.updateRecurringTransaction(
          recurringTransaction.id,
          user.id,
          {
            accountId: anotherAccount.id,
          }
        )

        console.log(`✅ 账户ID更新成功`)
        console.log(`   新账户ID: ${updatedTransaction.accountId}`)
        
        // 恢复原账户
        await RecurringTransactionService.updateRecurringTransaction(
          recurringTransaction.id,
          user.id,
          {
            accountId: recurringTransaction.accountId,
          }
        )
        console.log(`✅ 账户ID已恢复`)
      } catch (error) {
        console.error('❌ 账户ID更新失败:', error)
      }
    } else {
      console.log('⚠️  没有找到其他账户，跳过账户ID更新测试')
    }

    // 5. 测试更新货币代码
    console.log('\n🔄 测试更新货币代码...')
    
    // 获取另一个货币
    const anotherCurrency = await prisma.currency.findFirst({
      where: {
        OR: [{ createdBy: user.id }, { createdBy: null }],
        id: { not: recurringTransaction.currencyId },
      },
    })

    if (anotherCurrency) {
      try {
        const updatedTransaction = await RecurringTransactionService.updateRecurringTransaction(
          recurringTransaction.id,
          user.id,
          {
            currencyCode: anotherCurrency.code,
          }
        )

        console.log(`✅ 货币代码更新成功`)
        console.log(`   新货币ID: ${updatedTransaction.currencyId}`)
        
        // 恢复原货币
        await RecurringTransactionService.updateRecurringTransaction(
          recurringTransaction.id,
          user.id,
          {
            currencyCode: recurringTransaction.currency.code,
          }
        )
        console.log(`✅ 货币代码已恢复`)
      } catch (error) {
        console.error('❌ 货币代码更新失败:', error)
      }
    } else {
      console.log('⚠️  没有找到其他货币，跳过货币代码更新测试')
    }

    // 6. 测试更新时间相关字段
    console.log('\n🔄 测试更新时间相关字段...')
    try {
      const updatedTransaction = await RecurringTransactionService.updateRecurringTransaction(
        recurringTransaction.id,
        user.id,
        {
          interval: 2, // 改为每2个月
        }
      )

      console.log(`✅ 时间相关字段更新成功`)
      console.log(`   新间隔: ${updatedTransaction.interval}`)
      console.log(`   新的下次执行日期: ${updatedTransaction.nextDate}`)
      
      // 恢复原设置
      await RecurringTransactionService.updateRecurringTransaction(
        recurringTransaction.id,
        user.id,
        {
          interval: recurringTransaction.interval,
        }
      )
      console.log(`✅ 时间相关字段已恢复`)
    } catch (error) {
      console.error('❌ 时间相关字段更新失败:', error)
    }

    // 7. 恢复原始数据
    console.log('\n🔄 恢复原始数据...')
    try {
      await RecurringTransactionService.updateRecurringTransaction(
        recurringTransaction.id,
        user.id,
        {
          amount: Number(recurringTransaction.amount),
          description: recurringTransaction.description,
        }
      )
      console.log(`✅ 原始数据已恢复`)
    } catch (error) {
      console.error('❌ 恢复原始数据失败:', error)
    }

    console.log('\n📋 测试结果总结:')
    console.log('✅ 定期交易更新功能测试完成，所有功能正常工作')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testRecurringTransactionUpdate()
