#!/usr/bin/env node

/**
 * 测试货币用户级别隔离功能
 * 验证不同用户可以创建相同代码的货币，且互不可见
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 开始测试货币用户级别隔离功能...\n')

  try {
    // 1. 创建测试用户
    console.log('📝 创建测试用户...')
    
    const user1 = await prisma.user.upsert({
      where: { email: 'test-user-1@example.com' },
      update: {},
      create: {
        email: 'test-user-1@example.com',
        password: 'test-password-1',
      },
    })

    const user2 = await prisma.user.upsert({
      where: { email: 'test-user-2@example.com' },
      update: {},
      create: {
        email: 'test-user-2@example.com',
        password: 'test-password-2',
      },
    })

    console.log(`✅ 用户1: ${user1.email} (${user1.id})`)
    console.log(`✅ 用户2: ${user2.email} (${user2.id})\n`)

    // 2. 创建全局货币
    console.log('📝 创建全局货币...')

    // 先检查是否已存在全局 USD 货币
    let globalCurrency = await prisma.currency.findFirst({
      where: {
        createdBy: null,
        code: 'USD',
      },
    })

    if (!globalCurrency) {
      globalCurrency = await prisma.currency.create({
        data: {
          createdBy: null,
          code: 'USD',
          name: 'US Dollar',
          symbol: '$',
          decimalPlaces: 2,
          isCustom: false,
        },
      })
    }

    console.log(`✅ 全局货币: ${globalCurrency.name} (${globalCurrency.code})\n`)

    // 3. 用户1创建自定义货币
    console.log('📝 用户1创建自定义货币...')
    
    const user1Currency = await prisma.currency.create({
      data: {
        createdBy: user1.id,
        code: 'CNY',
        name: '人民币（用户1版本）',
        symbol: '¥',
        decimalPlaces: 2,
        isCustom: true,
      },
    })

    console.log(`✅ 用户1货币: ${user1Currency.name} (${user1Currency.code})\n`)

    // 4. 用户2创建相同代码的自定义货币
    console.log('📝 用户2创建相同代码的自定义货币...')
    
    const user2Currency = await prisma.currency.create({
      data: {
        createdBy: user2.id,
        code: 'CNY',
        name: '人民币（用户2版本）',
        symbol: '￥',
        decimalPlaces: 3,
        isCustom: true,
      },
    })

    console.log(`✅ 用户2货币: ${user2Currency.name} (${user2Currency.code})\n`)

    // 5. 验证用户1只能看到自己的货币
    console.log('🔍 验证用户1可见的货币...')
    
    const user1Currencies = await prisma.currency.findMany({
      where: {
        OR: [
          { createdBy: null }, // 全局货币
          { createdBy: user1.id }, // 用户1的自定义货币
        ],
      },
      orderBy: [
        { createdBy: 'asc' }, // null 值排在前面
        { code: 'asc' },
      ],
    })

    console.log(`用户1可见货币数量: ${user1Currencies.length}`)
    user1Currencies.forEach(currency => {
      const type = currency.createdBy ? '自定义' : '全局'
      console.log(`  - ${currency.code}: ${currency.name} (${type})`)
    })
    console.log()

    // 6. 验证用户2只能看到自己的货币
    console.log('🔍 验证用户2可见的货币...')
    
    const user2Currencies = await prisma.currency.findMany({
      where: {
        OR: [
          { createdBy: null }, // 全局货币
          { createdBy: user2.id }, // 用户2的自定义货币
        ],
      },
      orderBy: [
        { createdBy: 'asc' }, // null 值排在前面
        { code: 'asc' },
      ],
    })

    console.log(`用户2可见货币数量: ${user2Currencies.length}`)
    user2Currencies.forEach(currency => {
      const type = currency.createdBy ? '自定义' : '全局'
      console.log(`  - ${currency.code}: ${currency.name} (${type})`)
    })
    console.log()

    // 7. 验证查询优先级（用户自定义货币优先）
    console.log('🔍 验证查询优先级...')
    
    const user1CnyQuery = await prisma.currency.findFirst({
      where: {
        code: 'CNY',
        OR: [
          { createdBy: user1.id }, // 用户自定义货币
          { createdBy: null },     // 全局货币
        ],
      },
      orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
    })

    const user2CnyQuery = await prisma.currency.findFirst({
      where: {
        code: 'CNY',
        OR: [
          { createdBy: user2.id }, // 用户自定义货币
          { createdBy: null },     // 全局货币
        ],
      },
      orderBy: { createdBy: 'desc' }, // 用户自定义货币优先
    })

    console.log(`用户1查询CNY结果: ${user1CnyQuery?.name} (小数位: ${user1CnyQuery?.decimalPlaces})`)
    console.log(`用户2查询CNY结果: ${user2CnyQuery?.name} (小数位: ${user2CnyQuery?.decimalPlaces})`)
    console.log()

    // 8. 验证结果
    console.log('📊 测试结果验证...')
    
    const checks = [
      {
        name: '用户1能看到全局货币',
        result: user1Currencies.some(c => c.createdBy === null),
      },
      {
        name: '用户2能看到全局货币',
        result: user2Currencies.some(c => c.createdBy === null),
      },
      {
        name: '用户1只能看到自己的自定义货币',
        result: user1Currencies.filter(c => c.createdBy).every(c => c.createdBy === user1.id),
      },
      {
        name: '用户2只能看到自己的自定义货币',
        result: user2Currencies.filter(c => c.createdBy).every(c => c.createdBy === user2.id),
      },
      {
        name: '用户1查询CNY返回自己的版本',
        result: user1CnyQuery?.createdBy === user1.id && user1CnyQuery?.decimalPlaces === 2,
      },
      {
        name: '用户2查询CNY返回自己的版本',
        result: user2CnyQuery?.createdBy === user2.id && user2CnyQuery?.decimalPlaces === 3,
      },
      {
        name: '两个用户创建了相同代码的货币',
        result: user1Currency.code === user2Currency.code && user1Currency.id !== user2Currency.id,
      },
    ]

    let passedCount = 0
    checks.forEach(check => {
      const status = check.result ? '✅' : '❌'
      console.log(`${status} ${check.name}`)
      if (check.result) passedCount++
    })

    console.log(`\n🎯 测试结果: ${passedCount}/${checks.length} 项通过`)

    if (passedCount === checks.length) {
      console.log('🎉 所有测试通过！货币用户级别隔离功能正常工作。')
    } else {
      console.log('⚠️  部分测试失败，请检查实现。')
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error('❌ 脚本执行失败:', e)
    process.exit(1)
  })
