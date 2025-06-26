#!/usr/bin/env tsx

/**
 * 测试定期交易重复生成问题的修复
 */

import { PrismaClient } from '@prisma/client'
import { UnifiedSyncService } from '../src/lib/services/unified-sync.service'

const prisma = new PrismaClient()

async function testRecurringDuplicateFix() {
  try {
    console.log('🧪 测试定期交易重复生成问题的修复...')

    // 1. 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 测试用户: ${user.email}`)

    // 2. 获取用户的定期交易
    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        id: true,
        description: true,
        frequency: true,
        interval: true,
        startDate: true,
        nextDate: true,
        currentCount: true,
      },
    })

    console.log(`📋 找到 ${recurringTransactions.length} 个活跃的定期交易:`)
    recurringTransactions.forEach((rt, index) => {
      console.log(`  ${index + 1}. ${rt.description} (${rt.frequency}, 每${rt.interval}次)`)
      console.log(`     开始日期: ${rt.startDate.toISOString().split('T')[0]}`)
      console.log(`     下次执行: ${rt.nextDate.toISOString().split('T')[0]}`)
      console.log(`     已执行次数: ${rt.currentCount}`)
    })

    if (recurringTransactions.length === 0) {
      console.log('⚠️  没有找到活跃的定期交易，无法测试')
      return
    }

    // 3. 记录修复前的交易数量
    const beforeCounts = new Map<string, number>()
    for (const rt of recurringTransactions) {
      const count = await prisma.transaction.count({
        where: { recurringTransactionId: rt.id },
      })
      beforeCounts.set(rt.id, count)
      console.log(`📊 定期交易 "${rt.description}" 当前有 ${count} 条交易记录`)
    }

    // 4. 执行第一次手动同步
    console.log('\n🔄 执行第一次手动同步...')
    const firstSyncResult = await UnifiedSyncService.triggerUserSync(user.id, true)
    console.log('第一次同步结果:', firstSyncResult)

    // 等待同步完成
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 5. 记录第一次同步后的交易数量
    const afterFirstCounts = new Map<string, number>()
    for (const rt of recurringTransactions) {
      const count = await prisma.transaction.count({
        where: { recurringTransactionId: rt.id },
      })
      afterFirstCounts.set(rt.id, count)
      const beforeCount = beforeCounts.get(rt.id) || 0
      const added = count - beforeCount
      console.log(`📊 定期交易 "${rt.description}" 现在有 ${count} 条交易记录 (新增 ${added} 条)`)
    }

    // 6. 执行第二次手动同步
    console.log('\n🔄 执行第二次手动同步...')
    const secondSyncResult = await UnifiedSyncService.triggerUserSync(user.id, true)
    console.log('第二次同步结果:', secondSyncResult)

    // 等待同步完成
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 7. 记录第二次同步后的交易数量
    const afterSecondCounts = new Map<string, number>()
    let hasDuplicates = false
    for (const rt of recurringTransactions) {
      const count = await prisma.transaction.count({
        where: { recurringTransactionId: rt.id },
      })
      afterSecondCounts.set(rt.id, count)
      const firstCount = afterFirstCounts.get(rt.id) || 0
      const added = count - firstCount
      console.log(`📊 定期交易 "${rt.description}" 现在有 ${count} 条交易记录 (第二次同步新增 ${added} 条)`)
      
      if (added > 0) {
        hasDuplicates = true
        console.log(`⚠️  检测到重复生成！`)
      }
    }

    // 8. 检查是否有重复的交易记录（相同日期）
    console.log('\n🔍 检查重复交易记录...')
    for (const rt of recurringTransactions) {
      const transactions = await prisma.transaction.findMany({
        where: { recurringTransactionId: rt.id },
        select: { date: true, amount: true },
        orderBy: { date: 'asc' },
      })

      const dateMap = new Map<string, number>()
      for (const tx of transactions) {
        const dateStr = tx.date.toISOString().split('T')[0]
        const count = dateMap.get(dateStr) || 0
        dateMap.set(dateStr, count + 1)
      }

      const duplicateDates = Array.from(dateMap.entries()).filter(([_, count]) => count > 1)
      if (duplicateDates.length > 0) {
        console.log(`❌ 定期交易 "${rt.description}" 存在重复日期:`)
        duplicateDates.forEach(([date, count]) => {
          console.log(`   ${date}: ${count} 条记录`)
        })
        hasDuplicates = true
      } else {
        console.log(`✅ 定期交易 "${rt.description}" 没有重复日期`)
      }
    }

    // 9. 总结测试结果
    console.log('\n📋 测试结果总结:')
    if (hasDuplicates) {
      console.log('❌ 测试失败：仍然存在重复生成的问题')
    } else {
      console.log('✅ 测试成功：没有检测到重复生成的问题')
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testRecurringDuplicateFix()
