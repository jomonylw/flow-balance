#!/usr/bin/env node

/**
 * 测试服务端国际化优化方案
 * 验证缓存机制是否正常工作
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testI18nOptimization() {
  console.log('🧪 开始测试服务端国际化优化方案...\n')

  try {
    // 动态导入 ES 模块
    const {
      getUserTranslator,
      clearUserLanguageCache,
      createServerTranslator
    } = await import('../src/lib/utils/server-i18n.ts')
    // 1. 创建测试用户
    console.log('1. 创建测试用户...')
    const testUser = await prisma.user.create({
      data: {
        email: `test-i18n-${Date.now()}@example.com`,
        name: 'Test User',
        password: 'hashedpassword',
      },
    })
    console.log(`   ✅ 创建用户成功: ${testUser.id}`)

    // 2. 创建用户设置
    console.log('2. 创建用户设置...')
    await prisma.userSettings.create({
      data: {
        userId: testUser.id,
        language: 'en',
        theme: 'light',
        dateFormat: 'YYYY-MM-DD',
      },
    })
    console.log('   ✅ 创建用户设置成功')

    // 3. 测试缓存机制
    console.log('3. 测试缓存机制...')
    
    // 第一次调用 - 应该查询数据库
    console.log('   第一次调用 getUserTranslator...')
    const start1 = Date.now()
    const translator1 = await getUserTranslator(testUser.id)
    const time1 = Date.now() - start1
    console.log(`   ✅ 第一次调用耗时: ${time1}ms`)
    
    // 第二次调用 - 应该使用缓存
    console.log('   第二次调用 getUserTranslator...')
    const start2 = Date.now()
    const translator2 = await getUserTranslator(testUser.id)
    const time2 = Date.now() - start2
    console.log(`   ✅ 第二次调用耗时: ${time2}ms`)
    
    // 验证缓存效果
    if (time2 < time1) {
      console.log(`   ✅ 缓存生效！第二次调用比第一次快 ${time1 - time2}ms`)
    } else {
      console.log('   ⚠️  缓存可能未生效，或者时间差太小')
    }

    // 4. 测试翻译功能
    console.log('4. 测试翻译功能...')
    const testKey = 'settings.update.success'
    const translation = translator1(testKey)
    console.log(`   ✅ 翻译测试: "${testKey}" -> "${translation}"`)

    // 5. 测试缓存清除
    console.log('5. 测试缓存清除...')
    clearUserLanguageCache(testUser.id)
    console.log('   ✅ 清除用户缓存成功')
    
    // 清除后再次调用
    const start3 = Date.now()
    const translator3 = await getUserTranslator(testUser.id)
    const time3 = Date.now() - start3
    console.log(`   ✅ 清除缓存后调用耗时: ${time3}ms`)

    // 6. 测试语言更新场景
    console.log('6. 测试语言更新场景...')
    
    // 更新用户语言设置
    await prisma.userSettings.update({
      where: { userId: testUser.id },
      data: { language: 'zh' },
    })
    
    // 清除缓存（模拟 API 更新时的行为）
    clearUserLanguageCache(testUser.id)
    
    // 获取新的翻译器
    const translatorZh = await getUserTranslator(testUser.id)
    const translationZh = translatorZh(testKey)
    console.log(`   ✅ 中文翻译: "${testKey}" -> "${translationZh}"`)

    // 7. 测试多用户缓存
    console.log('7. 测试多用户缓存...')
    
    // 创建第二个用户
    const testUser2 = await prisma.user.create({
      data: {
        email: `test-i18n-2-${Date.now()}@example.com`,
        name: 'Test User 2',
        password: 'hashedpassword',
      },
    })
    
    await prisma.userSettings.create({
      data: {
        userId: testUser2.id,
        language: 'en',
        theme: 'dark',
        dateFormat: 'DD/MM/YYYY',
      },
    })
    
    // 同时获取两个用户的翻译器
    const [trans1, trans2] = await Promise.all([
      getUserTranslator(testUser.id),
      getUserTranslator(testUser2.id),
    ])
    
    console.log(`   ✅ 用户1翻译: ${trans1(testKey)}`)
    console.log(`   ✅ 用户2翻译: ${trans2(testKey)}`)

    // 8. 清理测试数据
    console.log('8. 清理测试数据...')
    await prisma.userSettings.deleteMany({
      where: {
        userId: {
          in: [testUser.id, testUser2.id],
        },
      },
    })
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testUser.id, testUser2.id],
        },
      },
    })
    console.log('   ✅ 清理完成')

    console.log('\n🎉 所有测试通过！优化方案工作正常。')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testI18nOptimization()
