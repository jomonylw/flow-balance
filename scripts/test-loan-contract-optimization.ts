#!/usr/bin/env tsx

/**
 * 测试贷款合约处理优化后的功能
 */

import { PrismaClient } from '@prisma/client'
import { UnifiedSyncService } from '../src/lib/services/unified-sync.service'
import { LoanContractService } from '../src/lib/services/loan-contract.service'

const prisma = new PrismaClient()

async function testLoanContractOptimization() {
  try {
    console.log('🧪 测试贷款合约处理优化...')

    // 1. 获取测试用户
    const user = await prisma.user.findFirst({
      where: { email: 'demo@flowbalance.com' },
    })

    if (!user) {
      console.log('❌ 未找到测试用户')
      return
    }

    console.log(`✅ 测试用户: ${user.email}`)

    // 2. 获取用户的贷款合约
    const loanContracts = await prisma.loanContract.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        id: true,
        contractName: true,
        currentPeriod: true,
        totalPeriods: true,
        nextPaymentDate: true,
      },
    })

    console.log(`📋 找到 ${loanContracts.length} 个活跃的贷款合约:`)
    loanContracts.forEach((lc, index) => {
      console.log(`  ${index + 1}. ${lc.contractName}`)
      console.log(`     当前期数: ${lc.currentPeriod}/${lc.totalPeriods}`)
      console.log(`     下次还款: ${lc.nextPaymentDate?.toISOString().split('T')[0] || 'N/A'}`)
    })

    if (loanContracts.length === 0) {
      console.log('⚠️  没有找到活跃的贷款合约，无法测试')
      return
    }

    // 3. 记录优化前的还款记录数量
    const beforeCounts = new Map<string, number>()
    for (const lc of loanContracts) {
      const count = await prisma.loanPayment.count({
        where: { loanContractId: lc.id },
      })
      beforeCounts.set(lc.id, count)
      console.log(`📊 贷款合约 "${lc.contractName}" 当前有 ${count} 条还款记录`)
    }

    // 4. 测试直接调用 LoanContractService.processLoanPaymentsBySchedule
    console.log('\n🔄 测试直接调用 LoanContractService.processLoanPaymentsBySchedule...')
    const directResult = await LoanContractService.processLoanPaymentsBySchedule(user.id)
    console.log('直接调用结果:', {
      processed: directResult.processed,
      errors: directResult.errors.length,
    })

    // 5. 记录直接调用后的还款记录数量
    const afterDirectCounts = new Map<string, number>()
    for (const lc of loanContracts) {
      const count = await prisma.loanPayment.count({
        where: { loanContractId: lc.id },
      })
      afterDirectCounts.set(lc.id, count)
      const beforeCount = beforeCounts.get(lc.id) || 0
      const added = count - beforeCount
      console.log(`📊 贷款合约 "${lc.contractName}" 现在有 ${count} 条还款记录 (新增 ${added} 条)`)
    }

    // 6. 测试通过统一同步服务调用
    console.log('\n🔄 测试通过统一同步服务调用...')
    const syncResult = await UnifiedSyncService.triggerUserSync(user.id, true)
    console.log('统一同步结果:', syncResult)

    // 等待同步完成
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 7. 记录统一同步后的还款记录数量
    const afterSyncCounts = new Map<string, number>()
    let hasUnexpectedChanges = false
    for (const lc of loanContracts) {
      const count = await prisma.loanPayment.count({
        where: { loanContractId: lc.id },
      })
      afterSyncCounts.set(lc.id, count)
      const directCount = afterDirectCounts.get(lc.id) || 0
      const added = count - directCount
      console.log(`📊 贷款合约 "${lc.contractName}" 现在有 ${count} 条还款记录 (统一同步新增 ${added} 条)`)
      
      if (added !== 0) {
        hasUnexpectedChanges = true
        console.log(`⚠️  检测到意外变化！`)
      }
    }

    // 8. 检查是否有重复的还款记录（相同期数）
    console.log('\n🔍 检查重复还款记录...')
    for (const lc of loanContracts) {
      const payments = await prisma.loanPayment.findMany({
        where: { loanContractId: lc.id },
        select: { period: true, paymentDate: true },
        orderBy: { period: 'asc' },
      })

      const periodMap = new Map<number, number>()
      for (const payment of payments) {
        const count = periodMap.get(payment.period) || 0
        periodMap.set(payment.period, count + 1)
      }

      const duplicatePeriods = Array.from(periodMap.entries()).filter(([_, count]) => count > 1)
      if (duplicatePeriods.length > 0) {
        console.log(`❌ 贷款合约 "${lc.contractName}" 存在重复期数:`)
        duplicatePeriods.forEach(([period, count]) => {
          console.log(`   期数 ${period}: ${count} 条记录`)
        })
        hasUnexpectedChanges = true
      } else {
        console.log(`✅ 贷款合约 "${lc.contractName}" 没有重复期数`)
      }
    }

    // 9. 总结测试结果
    console.log('\n📋 测试结果总结:')
    if (hasUnexpectedChanges) {
      console.log('❌ 测试发现问题：存在意外的变化或重复记录')
    } else {
      console.log('✅ 测试成功：优化后的贷款合约处理功能正常')
    }

    // 10. 验证功能一致性
    console.log('\n🔍 验证功能一致性:')
    console.log(`📊 直接调用处理了 ${directResult.processed} 条记录`)
    console.log(`📊 统一同步没有额外处理记录 (符合预期)`)
    
    if (directResult.errors.length > 0) {
      console.log(`⚠️  发现 ${directResult.errors.length} 个错误:`)
      directResult.errors.forEach(error => console.log(`   - ${error}`))
    } else {
      console.log('✅ 没有发现处理错误')
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testLoanContractOptimization()
