#!/usr/bin/env node

/**
 * 最终验证脚本
 * 验证恢复到真实数据库查询后的最终效果
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
 * 重置缓存统计
 */
async function resetCacheStats() {
  const response = await makeRequest('/api/dev/cache-stats', {
    method: 'DELETE',
  })
  return response.ok
}

/**
 * 最终验证测试
 */
async function finalVerification() {
  console.log('🏁 批量缓存优化最终验证')
  console.log(`📍 测试目标: ${BASE_URL}`)
  console.log('🎯 目标: 验证真实数据库查询版本的最终效果\n')

  try {
    // 1. 重置缓存统计
    console.log('🔄 重置缓存统计...')
    await resetCacheStats()

    // 2. 执行综合测试
    console.log('\n📊 执行综合缓存测试...')
    const testAPIs = [
      '/api/user/currencies',
      '/api/user/settings',
      '/api/tags',
      '/api/tree-structure',
    ]

    const callResults = []

    // 每个API调用3次
    for (const api of testAPIs) {
      for (let i = 1; i <= 3; i++) {
        const startTime = Date.now()
        const response = await makeRequest(api)
        const endTime = Date.now()
        const duration = endTime - startTime

        callResults.push({
          api,
          call: i,
          success: response.ok,
          duration,
        })

        if (response.ok) {
          console.log(`   ${api} 第${i}次: ✅ ${duration}ms`)
        } else {
          console.log(`   ${api} 第${i}次: ❌ ${response.status}`)
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // 3. 获取最终统计
    console.log('\n📊 最终优化效果统计:')
    const stats = await getCacheStats()

    if (stats) {
      console.log(`   🌍 整体命中率: ${stats.global.hitRate}`)
      console.log(`   📈 总调用次数: ${stats.global.total}`)
      console.log(`   🎯 缓存命中: ${stats.global.hits}`)
      console.log(`   ❌ 缓存未命中: ${stats.global.misses}`)

      // 重点关注的优化函数
      const targetFunctions = [
        '_getCachedUserAllActiveCurrencies',
        'getCachedUserActiveCurrency',
        'getCachedUserExchangeRate',
        'getCachedMultipleCurrencyConversions',
      ]

      console.log('\n🎯 重点优化函数最终效果:')

      let excellentCount = 0
      let goodCount = 0
      let poorCount = 0

      targetFunctions.forEach(functionName => {
        const func = stats.functions[functionName]
        if (func) {
          const hitRate = parseFloat(func.hitRate)
          let status = '❌'
          let level = 'poor'

          if (hitRate >= 90) {
            status = '🏆'
            level = 'excellent'
            excellentCount++
          } else if (hitRate >= 80) {
            status = '🎉'
            level = 'excellent'
            excellentCount++
          } else if (hitRate >= 60) {
            status = '📈'
            level = 'good'
            goodCount++
          } else {
            poorCount++
          }

          console.log(`\n   ${status} ${functionName}:`)
          console.log(`     命中率: ${func.hitRate}`)
          console.log(`     调用次数: ${func.total}`)
          console.log(`     命中次数: ${func.hits}`)
          console.log(`     未命中次数: ${func.misses}`)

          if (level === 'excellent') {
            console.log(`     ✅ 优化成功！达到优秀水平`)
          } else if (level === 'good') {
            console.log(`     📈 优化有效，达到良好水平`)
          } else {
            console.log(`     🔧 仍需进一步优化`)
          }
        } else {
          console.log(`\n   ❓ ${functionName}: 未被调用`)
          poorCount++
        }
      })

      // 4. 性能分析
      console.log('\n⚡ 性能分析:')
      const averageDuration =
        callResults.reduce((sum, r) => sum + r.duration, 0) / callResults.length
      const fastCalls = callResults.filter(r => r.duration < 20).length
      const mediumCalls = callResults.filter(
        r => r.duration >= 20 && r.duration < 50
      ).length
      const slowCalls = callResults.filter(r => r.duration >= 50).length

      console.log(`   平均响应时间: ${averageDuration.toFixed(1)}ms`)
      console.log(`   响应时间分布:`)
      console.log(
        `     ⚡ 超快 (<20ms): ${fastCalls}/${callResults.length} (${((fastCalls / callResults.length) * 100).toFixed(1)}%)`
      )
      console.log(
        `     🟡 中等 (20-50ms): ${mediumCalls}/${callResults.length} (${((mediumCalls / callResults.length) * 100).toFixed(1)}%)`
      )
      console.log(
        `     🐌 较慢 (>50ms): ${slowCalls}/${callResults.length} (${((slowCalls / callResults.length) * 100).toFixed(1)}%)`
      )

      // 5. 最终评估
      console.log('\n🏆 批量缓存优化最终评估:')

      console.log(`\n   📊 优化函数分布:`)
      console.log(
        `     🏆 优秀级别 (≥80%): ${excellentCount}/${targetFunctions.length}`
      )
      console.log(
        `     📈 良好级别 (60-80%): ${goodCount}/${targetFunctions.length}`
      )
      console.log(
        `     🔧 需优化 (<60%): ${poorCount}/${targetFunctions.length}`
      )

      const overallHitRate = parseFloat(stats.global.hitRate)

      if (excellentCount >= 3 && overallHitRate >= 90) {
        console.log('\n🎉🎉🎉 批量缓存优化完全成功！🎉🎉🎉')
        console.log('✅ 所有关键函数都达到优秀水平')
        console.log('✅ 整体系统性能达到优秀水平')
        console.log('✅ 响应速度显著提升')
        console.log('🏆 优化任务圆满完成！')
      } else if (excellentCount >= 2 && overallHitRate >= 80) {
        console.log('\n🎉 批量缓存优化基本成功！')
        console.log('✅ 大部分关键函数达到优秀水平')
        console.log('✅ 整体系统性能显著提升')
        console.log('📈 优化效果显著')
      } else if (excellentCount >= 1 || goodCount >= 2) {
        console.log('\n📈 批量缓存优化有明显效果')
        console.log('✅ 部分函数达到优秀水平')
        console.log('📊 整体性能有改善')
        console.log('🔧 可继续微调优化')
      } else {
        console.log('\n🔧 批量缓存优化需要进一步调整')
        console.log('📊 有一定效果但未达到预期')
        console.log('🔍 需要深入分析和优化')
      }

      // 6. 优化成果总结
      console.log('\n📈 优化成果总结:')
      console.log(`   🎯 整体命中率: ${stats.global.hitRate}`)
      console.log(`   ⚡ 平均响应时间: ${averageDuration.toFixed(1)}ms`)
      console.log(
        `   🚀 超快响应比例: ${((fastCalls / callResults.length) * 100).toFixed(1)}%`
      )

      if (averageDuration < 30 && fastCalls / callResults.length > 0.7) {
        console.log('   🏆 性能优化目标达成！')
      } else if (averageDuration < 50) {
        console.log('   📈 性能有显著改善')
      } else {
        console.log('   🔧 性能仍需优化')
      }
    }

    // 7. 下一步建议
    console.log('\n💡 下一步建议:')

    if (stats) {
      const overallHitRate = parseFloat(stats.global.hitRate)

      if (overallHitRate >= 90) {
        console.log('🎉 优化任务基本完成！')
        console.log('1. 部署到生产环境')
        console.log('2. 监控生产环境性能')
        console.log('3. 根据实际使用情况微调TTL')
        console.log('4. 考虑扩展优化到其他缓存函数')
        console.log('5. 建立长期性能监控体系')
      } else if (overallHitRate >= 80) {
        console.log('📈 继续优化:')
        console.log('1. 微调剩余函数的缓存策略')
        console.log('2. 优化缓存预热机制')
        console.log('3. 调整TTL设置')
        console.log('4. 监控缓存失效模式')
      } else {
        console.log('🔧 深入优化:')
        console.log('1. 分析低命中率函数的具体问题')
        console.log('2. 检查缓存失效逻辑')
        console.log('3. 优化数据查询和处理')
        console.log('4. 考虑调整缓存架构')
      }
    }

    console.log('\n🎉 批量缓存优化最终验证完成！')
    console.log('💡 感谢您的耐心，优化过程圆满结束！')
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error)
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
🏁 批量缓存优化最终验证脚本

用法:
  node scripts/final-verification.js

功能:
  • 验证真实数据库查询版本的最终效果
  • 综合评估批量缓存优化成果
  • 提供最终的性能分析和建议

环境变量:
  TEST_BASE_URL - 测试的基础 URL (默认: http://localhost:3000)

注意:
  1. 确保应用在开发环境下运行
  2. 确保已恢复到真实数据库查询版本
  3. 这是优化过程的最终验证步骤
`)
    return
  }

  await finalVerification()
}

// 运行主函数
if (require.main === module) {
  main()
}

module.exports = {
  finalVerification,
}
