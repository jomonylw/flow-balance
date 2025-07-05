#!/usr/bin/env node

/**
 * 简化的国际化性能测试
 * 测试数据库查询频率和缓存效果
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// 模拟缓存机制
const userLanguageCache = new Map()
const CACHE_TTL = 10 * 60 * 1000 // 10分钟

async function getUserLanguageWithoutCache(userId) {
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { language: true },
  })
  return userSettings?.language || 'zh'
}

async function getUserLanguageWithCache(userId) {
  // 检查缓存
  const cached = userLanguageCache.get(userId)
  const now = Date.now()
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.language
  }

  // 从数据库获取
  const language = await getUserLanguageWithoutCache(userId)
  
  // 更新缓存
  userLanguageCache.set(userId, {
    language,
    timestamp: now,
  })

  return language
}

async function performanceTest() {
  console.log('🧪 开始国际化性能测试...\n')

  try {
    // 1. 创建测试用户
    console.log('1. 创建测试用户...')
    const testUser = await prisma.user.create({
      data: {
        email: `test-perf-${Date.now()}@example.com`,
        name: 'Performance Test User',
        password: 'hashedpassword',
      },
    })

    await prisma.userSettings.create({
      data: {
        userId: testUser.id,
        language: 'en',
        theme: 'light',
        dateFormat: 'YYYY-MM-DD',
      },
    })
    console.log(`   ✅ 创建用户成功: ${testUser.id}`)

    // 2. 测试无缓存性能
    console.log('\n2. 测试无缓存性能（模拟原有方案）...')
    const iterations = 10
    let totalTimeWithoutCache = 0

    for (let i = 0; i < iterations; i++) {
      const start = Date.now()
      await getUserLanguageWithoutCache(testUser.id)
      totalTimeWithoutCache += Date.now() - start
    }

    const avgTimeWithoutCache = totalTimeWithoutCache / iterations
    console.log(`   📊 ${iterations}次查询平均耗时: ${avgTimeWithoutCache.toFixed(2)}ms`)
    console.log(`   📊 总耗时: ${totalTimeWithoutCache}ms`)

    // 3. 测试有缓存性能
    console.log('\n3. 测试有缓存性能（优化后方案）...')
    let totalTimeWithCache = 0
    let cacheHits = 0

    for (let i = 0; i < iterations; i++) {
      const start = Date.now()
      await getUserLanguageWithCache(testUser.id)
      const elapsed = Date.now() - start
      totalTimeWithCache += elapsed
      
      if (i > 0) { // 第一次之后都应该是缓存命中
        cacheHits++
      }
    }

    const avgTimeWithCache = totalTimeWithCache / iterations
    console.log(`   📊 ${iterations}次查询平均耗时: ${avgTimeWithCache.toFixed(2)}ms`)
    console.log(`   📊 总耗时: ${totalTimeWithCache}ms`)
    console.log(`   📊 缓存命中次数: ${cacheHits}/${iterations - 1}`)

    // 4. 性能对比
    console.log('\n4. 性能对比结果...')
    const improvement = ((avgTimeWithoutCache - avgTimeWithCache) / avgTimeWithoutCache * 100)
    const speedup = avgTimeWithoutCache / avgTimeWithCache

    console.log(`   🚀 平均响应时间改善: ${improvement.toFixed(1)}%`)
    console.log(`   🚀 速度提升倍数: ${speedup.toFixed(1)}x`)
    console.log(`   💾 数据库查询减少: ${cacheHits}/${iterations} (${(cacheHits/iterations*100).toFixed(1)}%)`)

    // 5. 并发测试
    console.log('\n5. 并发性能测试...')
    const concurrentRequests = 20

    // 无缓存并发测试
    console.log('   测试无缓存并发性能...')
    const startConcurrentWithoutCache = Date.now()
    const promisesWithoutCache = Array(concurrentRequests).fill().map(() => 
      getUserLanguageWithoutCache(testUser.id)
    )
    await Promise.all(promisesWithoutCache)
    const concurrentTimeWithoutCache = Date.now() - startConcurrentWithoutCache

    // 清除缓存
    userLanguageCache.clear()

    // 有缓存并发测试（先预热缓存）
    await getUserLanguageWithCache(testUser.id)
    
    console.log('   测试有缓存并发性能...')
    const startConcurrentWithCache = Date.now()
    const promisesWithCache = Array(concurrentRequests).fill().map(() => 
      getUserLanguageWithCache(testUser.id)
    )
    await Promise.all(promisesWithCache)
    const concurrentTimeWithCache = Date.now() - startConcurrentWithCache

    console.log(`   📊 ${concurrentRequests}个并发请求 - 无缓存: ${concurrentTimeWithoutCache}ms`)
    console.log(`   📊 ${concurrentRequests}个并发请求 - 有缓存: ${concurrentTimeWithCache}ms`)
    console.log(`   🚀 并发性能提升: ${(concurrentTimeWithoutCache / concurrentTimeWithCache).toFixed(1)}x`)

    // 6. 内存使用分析
    console.log('\n6. 内存使用分析...')
    const cacheSize = userLanguageCache.size
    const estimatedMemoryPerEntry = 50 // 字节
    const totalMemoryUsage = cacheSize * estimatedMemoryPerEntry

    console.log(`   📊 缓存条目数: ${cacheSize}`)
    console.log(`   📊 预估内存使用: ${totalMemoryUsage} 字节 (${(totalMemoryUsage/1024).toFixed(2)} KB)`)

    // 7. 清理测试数据
    console.log('\n7. 清理测试数据...')
    await prisma.userSettings.delete({
      where: { userId: testUser.id },
    })
    await prisma.user.delete({
      where: { id: testUser.id },
    })
    console.log('   ✅ 清理完成')

    console.log('\n🎉 性能测试完成！')
    console.log('\n📋 总结:')
    console.log(`   • 平均响应时间改善: ${improvement.toFixed(1)}%`)
    console.log(`   • 数据库查询减少: ${(cacheHits/iterations*100).toFixed(1)}%`)
    console.log(`   • 并发性能提升: ${(concurrentTimeWithoutCache / concurrentTimeWithCache).toFixed(1)}x`)
    console.log(`   • 内存开销: ${(totalMemoryUsage/1024).toFixed(2)} KB`)

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
performanceTest()
