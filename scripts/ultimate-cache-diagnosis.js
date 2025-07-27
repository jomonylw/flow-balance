#!/usr/bin/env node

/**
 * 终极缓存诊断脚本
 * 使用最简化版本来确定问题根源
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
 * 终极缓存诊断
 */
async function ultimateCacheDiagnosis() {
  console.log('🔬 终极缓存诊断')
  console.log(`📍 测试目标: ${BASE_URL}`)
  console.log('🎯 目标: 使用最简化版本确定问题根源\n')

  try {
    // 1. 重置缓存统计
    console.log('🔄 重置缓存统计...')
    await resetCacheStats()

    // 2. 连续调用 5 次
    console.log('\n📊 连续调用 5 次最简化版本...')
    const callResults = []

    for (let i = 1; i <= 5; i++) {
      const startTime = Date.now()
      const response = await makeRequest('/api/user/currencies')
      const endTime = Date.now()
      const duration = endTime - startTime

      callResults.push({
        call: i,
        success: response.ok,
        duration,
      })

      if (response.ok) {
        console.log(`   第 ${i} 次: ✅ 成功 - ${duration}ms`)
      } else {
        console.log(`   第 ${i} 次: ❌ 失败 - ${response.status}`)
      }

      // 短暂等待
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // 3. 获取缓存统计
    console.log('\n📊 终极诊断结果:')
    const stats = await getCacheStats()

    if (stats) {
      console.log(`   整体命中率: ${stats.global.hitRate}`)
      console.log(`   总调用次数: ${stats.global.total}`)
      console.log(`   缓存命中: ${stats.global.hits}`)
      console.log(`   缓存未命中: ${stats.global.misses}`)

      // 检查核心缓存函数
      const coreFunction = stats.functions['_getCachedUserAllActiveCurrencies']
      if (coreFunction) {
        console.log(`\n   🔍 _getCachedUserAllActiveCurrencies:`)
        console.log(`     命中率: ${coreFunction.hitRate}`)
        console.log(`     调用次数: ${coreFunction.total}`)
        console.log(`     命中次数: ${coreFunction.hits}`)
        console.log(`     未命中次数: ${coreFunction.misses}`)

        const hitRate = parseFloat(coreFunction.hitRate)
        if (hitRate >= 60) {
          console.log(`     🎉 最简化版本缓存工作正常！`)
          console.log(`     💡 问题在于数据库查询或数据处理`)
        } else if (hitRate > 0) {
          console.log(`     🟡 最简化版本缓存部分工作`)
          console.log(`     💡 可能是缓存配置问题`)
        } else {
          console.log(`     ❌ 最简化版本缓存也不工作`)
          console.log(`     💡 问题在于 Next.js 缓存机制本身`)
        }
      } else {
        console.log(
          `\n   ❌ _getCachedUserAllActiveCurrencies: 未被调用或未被监控`
        )
      }

      // 检查包装器函数
      const wrapperFunction = stats.functions['getCachedUserActiveCurrency']
      if (wrapperFunction) {
        console.log(`\n   🔍 getCachedUserActiveCurrency:`)
        console.log(`     命中率: ${wrapperFunction.hitRate}`)
        console.log(`     调用次数: ${wrapperFunction.total}`)

        const hitRate = parseFloat(wrapperFunction.hitRate)
        if (hitRate >= 60) {
          console.log(`     🎉 包装器工作正常！`)
        } else if (hitRate > 0) {
          console.log(`     🟡 包装器部分工作，可能需要调整阈值`)
        } else {
          console.log(`     ❌ 包装器不工作`)
        }
      }

      // 对比其他正常工作的缓存
      console.log(`\n   📋 其他缓存函数对比:`)
      const workingFunctions = [
        'getCachedUserSettings',
        'getCachedUserCurrencies',
        'getCachedUserTags',
      ]

      workingFunctions.forEach(functionName => {
        const func = stats.functions[functionName]
        if (func) {
          console.log(`     ${functionName}: ${func.hitRate}`)
        }
      })
    }

    // 4. 根本原因分析
    console.log('\n🎯 根本原因分析:')

    if (stats) {
      const coreHitRate = parseFloat(
        stats.functions['_getCachedUserAllActiveCurrencies']?.hitRate || '0'
      )
      const otherFunctionsWork =
        stats.functions['getCachedUserSettings']?.hitRate === '100.0%'

      if (coreHitRate >= 60) {
        console.log('✅ 最简化版本工作正常')
        console.log('🔧 问题确定在于数据库查询或数据处理逻辑')
        console.log('💡 解决方案:')
        console.log('   1. 逐步添加真实数据库查询')
        console.log('   2. 检查数据序列化过程')
        console.log('   3. 验证数据库连接和查询结果')
      } else if (coreHitRate > 0) {
        console.log('🟡 最简化版本部分工作')
        console.log('🔧 可能的问题:')
        console.log('   1. 缓存键冲突')
        console.log('   2. TTL 设置问题')
        console.log('   3. 缓存标签被频繁失效')
      } else if (otherFunctionsWork) {
        console.log('❌ 最简化版本也不工作，但其他缓存正常')
        console.log('🔧 非常奇怪的问题，可能是:')
        console.log('   1. 特定的缓存键或标签有问题')
        console.log('   2. 函数调用路径有问题')
        console.log('   3. 监控逻辑有 bug')
        console.log('💡 建议: 检查函数调用链和监控逻辑')
      } else {
        console.log('❌ 整个缓存系统有问题')
        console.log('🔧 系统级问题:')
        console.log('   1. Next.js 版本兼容性')
        console.log('   2. 环境配置问题')
        console.log('   3. 缓存存储问题')
      }
    }

    // 5. 下一步行动计划
    console.log('\n📋 下一步行动计划:')

    if (stats) {
      const coreHitRate = parseFloat(
        stats.functions['_getCachedUserAllActiveCurrencies']?.hitRate || '0'
      )

      if (coreHitRate >= 60) {
        console.log('🎉 问题定位成功！')
        console.log('1. 恢复到真实数据库查询版本')
        console.log('2. 逐步添加数据库查询逻辑')
        console.log('3. 检查每一步的缓存效果')
        console.log('4. 优化数据序列化过程')
      } else if (coreHitRate > 0) {
        console.log('🔧 需要调试缓存配置:')
        console.log('1. 尝试不同的缓存键')
        console.log('2. 调整 TTL 设置')
        console.log('3. 简化缓存标签')
        console.log('4. 检查缓存失效逻辑')
      } else {
        console.log('❌ 需要深入调试:')
        console.log('1. 检查函数是否被正确调用')
        console.log('2. 验证监控逻辑')
        console.log('3. 检查 Next.js 缓存配置')
        console.log('4. 考虑使用其他缓存策略')
      }
    }

    // 6. 服务器日志提示
    console.log('\n💡 服务器日志检查:')
    console.log('请观察服务器控制台是否有以下日志:')
    console.log('   🧪 [ULTIMATE TEST] Called for user: xxx')
    console.log('   🧪 [ULTIMATE TEST] Returning: {...}')
    console.log('   🔍 [CORE CACHE] _getCachedUserAllActiveCurrencies: XXms')

    if (
      stats &&
      parseFloat(
        stats.functions['_getCachedUserAllActiveCurrencies']?.hitRate || '0'
      ) === 0
    ) {
      console.log('\n⚠️  如果没有看到 [ULTIMATE TEST] 日志:')
      console.log('   说明函数根本没有被调用，问题在调用链')
      console.log('\n⚠️  如果看到 [ULTIMATE TEST] 日志但缓存不工作:')
      console.log('   说明 Next.js 缓存机制有问题')
    }

    console.log('\n🎉 终极缓存诊断完成！')
  } catch (error) {
    console.error('❌ 诊断过程中发生错误:', error)
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
🔬 终极缓存诊断脚本

用法:
  node scripts/ultimate-cache-diagnosis.js

功能:
  • 使用最简化版本确定问题根源
  • 对比正常工作的缓存函数
  • 提供精确的问题定位和解决方案

环境变量:
  TEST_BASE_URL - 测试的基础 URL (默认: http://localhost:3000)

注意:
  1. 确保应用在开发环境下运行
  2. 观察服务器控制台的 [ULTIMATE TEST] 日志
  3. 这是最后的诊断步骤，将确定问题根源
`)
    return
  }

  await ultimateCacheDiagnosis()
}

// 运行主函数
if (require.main === module) {
  main()
}

module.exports = {
  ultimateCacheDiagnosis,
}
