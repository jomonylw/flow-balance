#!/usr/bin/env node

/**
 * 最终缓存性能测试脚本
 * 验证所有优化措施的综合效果
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

/**
 * 发送 HTTP 请求
 */
async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    return {
      status: response.status,
      ok: response.ok,
      data: response.ok ? await response.json() : null,
    }
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    }
  }
}

/**
 * 获取缓存统计
 */
async function getCacheStats() {
  const response = await makeRequest('/api/dev/cache-stats')
  return response.ok ? response.data.data : null
}

/**
 * 获取缓存性能分析
 */
async function getCacheAnalysis() {
  const response = await makeRequest('/api/dev/cache-analysis')
  return response.ok ? response.data.data.analysis : null
}

/**
 * 重置缓存统计
 */
async function resetCacheStats() {
  const response = await makeRequest('/api/dev/cache-stats', {
    method: 'DELETE',
  })
  return response.ok
}

/**
 * 执行综合性能测试
 */
async function runComprehensiveTest() {
  console.log('\n🧪 执行综合性能测试...')

  const testResults = []
  const apis = [
    '/api/user/currencies',
    '/api/user/settings',
    '/api/tags',
    '/api/tree-structure',
  ]

  // 执行50次随机API调用
  for (let i = 1; i <= 50; i++) {
    const randomApi = apis[Math.floor(Math.random() * apis.length)]
    const startTime = Date.now()

    const response = await makeRequest(randomApi)
    const endTime = Date.now()
    const duration = endTime - startTime

    testResults.push({
      call: i,
      api: randomApi,
      success: response.ok,
      duration,
      timestamp: new Date().toLocaleTimeString(),
    })

    if (i % 10 === 0) {
      console.log(`   完成 ${i}/50 次调用...`)
    }

    // 短暂等待
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  return testResults
}

/**
 * 显示性能分析报告
 */
function displayPerformanceReport(analysis, testResults) {
  console.log('\n📊 最终缓存性能报告')
  console.log('=' * 60)

  // 整体性能
  console.log(`🌍 整体性能:`)
  console.log(`   命中率: ${analysis.overall.hitRate.toFixed(1)}%`)
  console.log(
    `   性能等级: ${getPerformanceIcon(analysis.overall.performance)} ${analysis.overall.performance.toUpperCase()}`
  )
  console.log(`   建议: ${analysis.overall.recommendation}`)

  // 函数级性能
  console.log(`\n🔧 函数级性能:`)
  console.log(`   🟢 优秀函数: ${analysis.summary.excellent}`)
  console.log(`   🟡 良好函数: ${analysis.summary.good}`)
  console.log(`   🔴 需优化函数: ${analysis.summary.poor}`)
  console.log(`   📊 总函数数: ${analysis.summary.totalFunctions}`)

  // 详细函数分析
  console.log(`\n📋 详细函数分析:`)
  analysis.functions
    .sort((a, b) => b.calls - a.calls) // 按调用次数排序
    .forEach(func => {
      const icon = getPerformanceIcon(func.performance)
      console.log(`\n   ${icon} ${func.name}:`)
      console.log(`      命中率: ${func.hitRate.toFixed(1)}%`)
      console.log(`      调用次数: ${func.calls}`)
      console.log(`      性能等级: ${func.performance.toUpperCase()}`)
      console.log(`      建议: ${func.recommendation}`)
    })

  // 测试结果分析
  console.log(`\n🧪 测试执行分析:`)
  const totalCalls = testResults.length
  const successfulCalls = testResults.filter(r => r.success).length
  const averageDuration =
    testResults.reduce((sum, r) => sum + r.duration, 0) / totalCalls
  const fastCalls = testResults.filter(r => r.duration < 30).length
  const mediumCalls = testResults.filter(
    r => r.duration >= 30 && r.duration < 100
  ).length
  const slowCalls = testResults.filter(r => r.duration >= 100).length

  console.log(`   总调用次数: ${totalCalls}`)
  console.log(
    `   成功率: ${((successfulCalls / totalCalls) * 100).toFixed(1)}%`
  )
  console.log(`   平均响应时间: ${averageDuration.toFixed(1)}ms`)
  console.log(`   响应时间分布:`)
  console.log(
    `     ⚡ 快速 (<30ms): ${fastCalls} (${((fastCalls / totalCalls) * 100).toFixed(1)}%)`
  )
  console.log(
    `     🟡 中等 (30-100ms): ${mediumCalls} (${((mediumCalls / totalCalls) * 100).toFixed(1)}%)`
  )
  console.log(
    `     🐌 较慢 (>100ms): ${slowCalls} (${((slowCalls / totalCalls) * 100).toFixed(1)}%)`
  )
}

/**
 * 获取性能图标
 */
function getPerformanceIcon(performance) {
  switch (performance) {
    case 'excellent':
      return '🟢'
    case 'good':
      return '🟡'
    case 'poor':
      return '🔴'
    default:
      return '❓'
  }
}

/**
 * 生成优化建议
 */
function generateOptimizationSuggestions(analysis) {
  console.log('\n💡 优化建议:')

  const poorFunctions = analysis.functions.filter(
    f => f.performance === 'poor' && f.calls > 5
  )
  const goodFunctions = analysis.functions.filter(f => f.performance === 'good')

  if (poorFunctions.length === 0) {
    console.log('   🎉 所有高频函数性能都达到了良好水平！')
  } else {
    console.log('   🔧 需要重点优化的函数:')
    poorFunctions.forEach(func => {
      console.log(
        `   • ${func.name}: ${func.hitRate.toFixed(1)}% (${func.calls} 次调用)`
      )
      console.log(`     建议: ${func.recommendation}`)
    })
  }

  if (goodFunctions.length > 0) {
    console.log('\n   📈 可进一步提升的函数:')
    goodFunctions.forEach(func => {
      console.log(`   • ${func.name}: ${func.hitRate.toFixed(1)}% → 目标 80%+`)
    })
  }

  // 整体建议
  console.log('\n   🎯 整体优化方向:')
  if (analysis.overall.hitRate >= 85) {
    console.log('   • 缓存性能已达到优秀水平，重点关注用户体验优化')
    console.log('   • 可以考虑实施更高级的缓存策略，如预测性缓存')
  } else if (analysis.overall.hitRate >= 70) {
    console.log('   • 继续优化低性能函数，争取整体命中率达到85%+')
    console.log('   • 考虑扩展缓存预热策略')
  } else {
    console.log('   • 需要系统性检查缓存策略和TTL设置')
    console.log('   • 建议增加缓存预热和智能失效机制')
  }
}

/**
 * 主测试函数
 */
async function runFinalCacheTest() {
  console.log('🚀 最终缓存性能测试')
  console.log(`📍 测试目标: ${BASE_URL}`)
  console.log(`🎯 目标: 验证所有优化措施的综合效果\n`)

  try {
    // 1. 重置统计以获得干净的测试环境
    console.log('🔄 重置缓存统计...')
    await resetCacheStats()

    // 2. 执行综合性能测试
    const testResults = await runComprehensiveTest()

    // 3. 获取性能分析
    console.log('\n📊 获取缓存性能分析...')
    const analysis = await getCacheAnalysis()

    if (!analysis) {
      console.log('❌ 无法获取缓存性能分析')
      return
    }

    // 4. 显示性能报告
    displayPerformanceReport(analysis, testResults)

    // 5. 生成优化建议
    generateOptimizationSuggestions(analysis)

    // 6. 总结
    console.log('\n🎉 最终缓存性能测试完成！')
    console.log('\n📈 优化成果总结:')
    console.log(`   • 整体命中率: ${analysis.overall.hitRate.toFixed(1)}%`)
    console.log(`   • 优秀函数数量: ${analysis.summary.excellent}`)
    console.log(`   • 需优化函数数量: ${analysis.summary.poor}`)

    if (analysis.overall.hitRate >= 85) {
      console.log('   🏆 缓存性能已达到优秀水平！')
    } else if (analysis.overall.hitRate >= 70) {
      console.log('   📈 缓存性能良好，继续优化可达到优秀水平')
    } else {
      console.log('   🔧 缓存性能仍有较大优化空间')
    }
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
    process.exit(1)
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 最终缓存性能测试脚本

用法:
  node scripts/final-cache-performance-test.js

功能:
  • 执行综合性能测试
  • 获取详细的性能分析报告
  • 提供具体的优化建议
  • 评估整体优化效果

环境变量:
  TEST_BASE_URL - 测试的基础 URL (默认: http://localhost:3000)

注意:
  1. 确保应用在开发环境下运行
  2. 确保已实施所有缓存优化措施
  3. 测试将执行50次API调用以获得准确的性能数据
`)
    return
  }

  await runFinalCacheTest()
}

// 运行主函数
if (require.main === module) {
  main()
}

module.exports = {
  runFinalCacheTest,
  displayPerformanceReport,
  generateOptimizationSuggestions,
}
