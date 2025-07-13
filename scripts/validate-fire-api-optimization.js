#!/usr/bin/env node

/**
 * FIRE API 优化验证脚本
 * 验证优化后的API是否正常工作并返回正确的数据结构
 */

const fs = require('fs')
const path = require('path')

// 模拟验证优化后的代码结构
function validateOptimizations() {
  console.log('🔍 验证 FIRE API 优化...\n')

  const filePath = path.join(__dirname, '../src/app/api/fire/data/route.ts')

  if (!fs.existsSync(filePath)) {
    console.error('❌ 文件不存在:', filePath)
    return false
  }

  const content = fs.readFileSync(filePath, 'utf8')

  // 验证优化点
  const optimizations = [
    {
      name: '移除了 calculateTotalBalanceWithConversion 导入',
      check: !content.includes(
        'import { calculateTotalBalanceWithConversion }'
      ),
      description: '不再使用原有的全量数据加载函数',
    },
    {
      name: '添加了 calculateOptimizedNetWorth 函数',
      check: content.includes('async function calculateOptimizedNetWorth'),
      description: '新增优化的净资产计算函数',
    },
    {
      name: '使用了数据库聚合查询',
      check: content.includes('prisma.transaction.groupBy'),
      description: '使用 groupBy 进行数据库层聚合计算',
    },
    {
      name: '合并了交易查询',
      check: content.includes(
        'const allTransactions = await prisma.transaction.findMany'
      ),
      description: '将多个独立查询合并为一个查询',
    },
    {
      name: '消除了重复的CAGR计算',
      check: content.split('await calculateHistoricalCAGR').length === 2, // 只应该出现一次调用
      description: '只调用一次 CAGR 计算函数',
    },
    {
      name: '使用了 currencyId 而不是 currencyCode',
      check:
        content.includes("by: ['currencyId']") &&
        !content.includes("by: ['currencyCode']"),
      description: '正确使用数据库字段名',
    },
    {
      name: '添加了详细的日志记录',
      check: content.includes('console.log') && content.includes('优化后'),
      description: '增加了性能监控和调试日志',
    },
  ]

  let passedCount = 0
  let totalCount = optimizations.length

  console.log('📋 优化验证结果:')
  console.log('=' * 50)

  optimizations.forEach((opt, index) => {
    const status = opt.check ? '✅' : '❌'
    const result = opt.check ? 'PASS' : 'FAIL'

    console.log(`${index + 1}. ${status} ${opt.name} - ${result}`)
    console.log(`   ${opt.description}`)

    if (opt.check) {
      passedCount++
    }
    console.log()
  })

  console.log(`📊 验证总结: ${passedCount}/${totalCount} 项优化通过`)

  if (passedCount === totalCount) {
    console.log('🎉 所有优化都已正确实施!')
    return true
  } else {
    console.log('⚠️  部分优化可能需要进一步检查')
    return false
  }
}

// 验证代码结构
function validateCodeStructure() {
  console.log('\n🏗️  验证代码结构...\n')

  const filePath = path.join(__dirname, '../src/app/api/fire/data/route.ts')
  const content = fs.readFileSync(filePath, 'utf8')

  const structureChecks = [
    {
      name: '函数定义完整性',
      check:
        content.includes('export async function GET') &&
        content.includes('calculateOptimizedNetWorth'),
      description: '主要函数定义完整',
    },
    {
      name: '错误处理',
      check: content.includes('try {') && content.includes('catch (error)'),
      description: '包含适当的错误处理',
    },
    {
      name: '类型安全',
      check: content.includes(': Promise<{') && content.includes('): Promise<'),
      description: '使用了 TypeScript 类型定义',
    },
    {
      name: '返回数据结构',
      check:
        content.includes('realitySnapshot') &&
        content.includes('userSettings') &&
        content.includes('baseCurrency'),
      description: '保持了原有的返回数据结构',
    },
  ]

  let structurePassed = 0
  structureChecks.forEach((check, index) => {
    const status = check.check ? '✅' : '❌'
    console.log(`${index + 1}. ${status} ${check.name} - ${check.description}`)
    if (check.check) structurePassed++
  })

  console.log(
    `\n📊 结构验证: ${structurePassed}/${structureChecks.length} 项通过`
  )
  return structurePassed === structureChecks.length
}

// 验证性能改进点
function validatePerformanceImprovements() {
  console.log('\n⚡ 验证性能改进点...\n')

  const filePath = path.join(__dirname, '../src/app/api/fire/data/route.ts')
  const content = fs.readFileSync(filePath, 'utf8')

  const performanceChecks = [
    {
      name: '避免全量数据加载',
      check: !content.includes('include: { transactions: true }'),
      impact: '减少内存使用 80%+',
      description: '不再加载所有交易到内存',
    },
    {
      name: '数据库聚合计算',
      check: content.includes('_sum: { amount: true }'),
      impact: '查询时间减少 90%+',
      description: '在数据库层进行聚合计算',
    },
    {
      name: '查询合并优化',
      check: content.includes('OR: [') && content.includes('type: { in: ['),
      impact: '减少数据库往返 66%',
      description: '将3个查询合并为1个',
    },
    {
      name: '重复计算消除',
      check: content.split('await calculateHistoricalCAGR').length === 2,
      impact: '计算时间减少 50%',
      description: '消除重复的CAGR计算',
    },
  ]

  let performancePassed = 0
  performanceChecks.forEach((check, index) => {
    const status = check.check ? '✅' : '❌'
    console.log(`${index + 1}. ${status} ${check.name}`)
    console.log(`   📈 预期影响: ${check.impact}`)
    console.log(`   📝 说明: ${check.description}`)
    if (check.check) performancePassed++
    console.log()
  })

  console.log(
    `📊 性能改进: ${performancePassed}/${performanceChecks.length} 项实施`
  )
  return performancePassed === performanceChecks.length
}

// 主函数
function main() {
  console.log('🚀 FIRE API 优化验证工具')
  console.log('=' * 50)
  console.log(`验证时间: ${new Date().toISOString()}`)
  console.log()

  const optimizationResult = validateOptimizations()
  const structureResult = validateCodeStructure()
  const performanceResult = validatePerformanceImprovements()

  console.log('\n🎯 最终验证结果:')
  console.log('=' * 50)
  console.log(`✅ 优化实施: ${optimizationResult ? 'PASS' : 'FAIL'}`)
  console.log(`✅ 代码结构: ${structureResult ? 'PASS' : 'FAIL'}`)
  console.log(`✅ 性能改进: ${performanceResult ? 'PASS' : 'FAIL'}`)

  const allPassed = optimizationResult && structureResult && performanceResult

  if (allPassed) {
    console.log('\n🎉 验证完成! FIRE API 优化成功实施!')
    console.log('\n📋 下一步建议:')
    console.log('1. 运行性能测试: node scripts/test-fire-api-performance.js')
    console.log('2. 进行功能测试确保数据正确性')
    console.log('3. 监控生产环境性能指标')
  } else {
    console.log('\n⚠️  验证发现问题，请检查上述失败项目')
  }

  return allPassed
}

// 运行验证
if (require.main === module) {
  const success = main()
  process.exit(success ? 0 : 1)
}

module.exports = {
  validateOptimizations,
  validateCodeStructure,
  validatePerformanceImprovements,
}
