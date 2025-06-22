/**
 * 创建可用的演示用户
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 创建全局货币
async function createGlobalCurrencies() {
  const globalCurrencies = [
    { code: 'CNY', name: '人民币', symbol: '¥', decimalPlaces: 2 },
    { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
    { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0 },
    { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2 },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimalPlaces: 2 },
  ]

  const createdCurrencies: Record<string, any> = {}

  for (const curr of globalCurrencies) {
    // 检查是否已存在
    let currency = await prisma.currency.findFirst({
      where: {
        createdBy: null,
        code: curr.code,
      },
    })

    if (!currency) {
      currency = await prisma.currency.create({
        data: {
          createdBy: null,
          code: curr.code,
          name: curr.name,
          symbol: curr.symbol,
          decimalPlaces: curr.decimalPlaces,
          isCustom: false,
        },
      })
      console.log(`✅ 创建全局货币: ${curr.code} - ${curr.name}`)
    } else {
      console.log(`ℹ️  全局货币已存在: ${curr.code} - ${curr.name}`)
    }

    createdCurrencies[curr.code] = currency
  }

  return createdCurrencies
}

// 创建分类结构
async function createCategoryStructure(userId: string) {
  const categories: Record<string, any> = {}

  // 资产类分类
  const assetCategory = await prisma.category.create({
    data: {
      userId,
      name: '资产',
      type: 'ASSET',
      order: 1,
    },
  })
  categories['资产'] = assetCategory

  // 资产子分类
  const assetSubCategories = [
    { name: '现金及现金等价物', order: 1 },
    { name: '银行存款', order: 2 },
    { name: '投资理财', order: 3 },
    { name: '固定资产', order: 4 },
  ]

  for (const sub of assetSubCategories) {
    const subCategory = await prisma.category.create({
      data: {
        userId,
        name: sub.name,
        parentId: assetCategory.id,
        type: 'ASSET',
        order: sub.order,
      },
    })
    categories[sub.name] = subCategory
  }

  // 负债类分类
  const liabilityCategory = await prisma.category.create({
    data: {
      userId,
      name: '负债',
      type: 'LIABILITY',
      order: 2,
    },
  })
  categories['负债'] = liabilityCategory

  // 负债子分类
  const liabilitySubCategories = [
    { name: '信用卡', order: 1 },
    { name: '贷款', order: 2 },
    { name: '应付款项', order: 3 },
  ]

  for (const sub of liabilitySubCategories) {
    const subCategory = await prisma.category.create({
      data: {
        userId,
        name: sub.name,
        parentId: liabilityCategory.id,
        type: 'LIABILITY',
        order: sub.order,
      },
    })
    categories[sub.name] = subCategory
  }

  // 收入类分类
  const incomeCategory = await prisma.category.create({
    data: {
      userId,
      name: '收入',
      type: 'INCOME',
      order: 3,
    },
  })
  categories['收入'] = incomeCategory

  // 收入子分类
  const incomeSubCategories = [
    { name: '工资收入', order: 1 },
    { name: '投资收益', order: 2 },
    { name: '其他收入', order: 3 },
  ]

  for (const sub of incomeSubCategories) {
    const subCategory = await prisma.category.create({
      data: {
        userId,
        name: sub.name,
        parentId: incomeCategory.id,
        type: 'INCOME',
        order: sub.order,
      },
    })
    categories[sub.name] = subCategory
  }

  // 支出类分类
  const expenseCategory = await prisma.category.create({
    data: {
      userId,
      name: '支出',
      type: 'EXPENSE',
      order: 4,
    },
  })
  categories['支出'] = expenseCategory

  // 支出子分类
  const expenseSubCategories = [
    { name: '日常生活', order: 1 },
    { name: '交通出行', order: 2 },
    { name: '餐饮娱乐', order: 3 },
    { name: '医疗健康', order: 4 },
    { name: '教育培训', order: 5 },
    { name: '购物消费', order: 6 },
  ]

  for (const sub of expenseSubCategories) {
    const subCategory = await prisma.category.create({
      data: {
        userId,
        name: sub.name,
        parentId: expenseCategory.id,
        type: 'EXPENSE',
        order: sub.order,
      },
    })
    categories[sub.name] = subCategory
  }

  return categories
}

// 创建账户
async function createAccounts(
  userId: string,
  categories: Record<string, any>,
  currencies: Record<string, any>
) {
  const accounts = []

  // 资产类账户
  const assetAccounts = [
    {
      name: '现金',
      categoryName: '现金及现金等价物',
      currency: 'CNY',
      color: '#10B981',
    },
    {
      name: '招商银行储蓄卡',
      categoryName: '银行存款',
      currency: 'CNY',
      color: '#EF4444',
    },
    {
      name: '工商银行储蓄卡',
      categoryName: '银行存款',
      currency: 'CNY',
      color: '#3B82F6',
    },
    {
      name: '支付宝余额',
      categoryName: '现金及现金等价物',
      currency: 'CNY',
      color: '#06B6D4',
    },
    {
      name: '微信零钱',
      categoryName: '现金及现金等价物',
      currency: 'CNY',
      color: '#22C55E',
    },
    {
      name: '股票投资账户',
      categoryName: '投资理财',
      currency: 'CNY',
      color: '#8B5CF6',
    },
    {
      name: '基金投资账户',
      categoryName: '投资理财',
      currency: 'CNY',
      color: '#F59E0B',
    },
    {
      name: 'USD投资账户',
      categoryName: '投资理财',
      currency: 'USD',
      color: '#EC4899',
    },
  ]

  for (const acc of assetAccounts) {
    const account = await prisma.account.create({
      data: {
        userId,
        name: acc.name,
        categoryId: categories[acc.categoryName].id,
        currencyId: currencies[acc.currency].id,
        color: acc.color,
        description: `演示${acc.name}`,
      },
    })
    accounts.push(account)
  }

  // 负债类账户
  const liabilityAccounts = [
    {
      name: '招商银行信用卡',
      categoryName: '信用卡',
      currency: 'CNY',
      color: '#DC2626',
    },
    {
      name: '建设银行信用卡',
      categoryName: '信用卡',
      currency: 'CNY',
      color: '#1D4ED8',
    },
    { name: '房贷', categoryName: '贷款', currency: 'CNY', color: '#7C2D12' },
    { name: '车贷', categoryName: '贷款', currency: 'CNY', color: '#374151' },
  ]

  for (const acc of liabilityAccounts) {
    const account = await prisma.account.create({
      data: {
        userId,
        name: acc.name,
        categoryId: categories[acc.categoryName].id,
        currencyId: currencies[acc.currency].id,
        color: acc.color,
        description: `演示${acc.name}`,
      },
    })
    accounts.push(account)
  }

  // 收入类账户
  const incomeAccounts = [
    {
      name: '工资',
      categoryName: '工资收入',
      currency: 'CNY',
      color: '#059669',
    },
    {
      name: '奖金',
      categoryName: '工资收入',
      currency: 'CNY',
      color: '#0D9488',
    },
    {
      name: '股票收益',
      categoryName: '投资收益',
      currency: 'CNY',
      color: '#7C3AED',
    },
    {
      name: '基金收益',
      categoryName: '投资收益',
      currency: 'CNY',
      color: '#DB2777',
    },
    {
      name: '兼职收入',
      categoryName: '其他收入',
      currency: 'CNY',
      color: '#EA580C',
    },
  ]

  for (const acc of incomeAccounts) {
    const account = await prisma.account.create({
      data: {
        userId,
        name: acc.name,
        categoryId: categories[acc.categoryName].id,
        currencyId: currencies[acc.currency].id,
        color: acc.color,
        description: `演示${acc.name}`,
      },
    })
    accounts.push(account)
  }

  // 支出类账户
  const expenseAccounts = [
    {
      name: '餐饮',
      categoryName: '餐饮娱乐',
      currency: 'CNY',
      color: '#F97316',
    },
    {
      name: '交通',
      categoryName: '交通出行',
      currency: 'CNY',
      color: '#2563EB',
    },
    {
      name: '购物',
      categoryName: '购物消费',
      currency: 'CNY',
      color: '#DC2626',
    },
    {
      name: '房租',
      categoryName: '日常生活',
      currency: 'CNY',
      color: '#7C2D12',
    },
    {
      name: '水电费',
      categoryName: '日常生活',
      currency: 'CNY',
      color: '#0891B2',
    },
    {
      name: '医疗',
      categoryName: '医疗健康',
      currency: 'CNY',
      color: '#16A34A',
    },
    {
      name: '教育',
      categoryName: '教育培训',
      currency: 'CNY',
      color: '#9333EA',
    },
    {
      name: '娱乐',
      categoryName: '餐饮娱乐',
      currency: 'CNY',
      color: '#E11D48',
    },
  ]

  for (const acc of expenseAccounts) {
    const account = await prisma.account.create({
      data: {
        userId,
        name: acc.name,
        categoryId: categories[acc.categoryName].id,
        currencyId: currencies[acc.currency].id,
        color: acc.color,
        description: `演示${acc.name}`,
      },
    })
    accounts.push(account)
  }

  return accounts
}

// 创建标签
async function createTags(userId: string) {
  const tags = []

  const tagData = [
    { name: '必需', color: '#DC2626' },
    { name: '可选', color: '#F59E0B' },
    { name: '投资', color: '#8B5CF6' },
    { name: '紧急', color: '#EF4444' },
    { name: '计划内', color: '#10B981' },
    { name: '意外支出', color: '#F97316' },
    { name: '定期', color: '#3B82F6' },
    { name: '一次性', color: '#6B7280' },
    { name: '工作相关', color: '#059669' },
    { name: '家庭', color: '#EC4899' },
    { name: '个人', color: '#8B5CF6' },
    { name: '健康', color: '#22C55E' },
    { name: '学习', color: '#7C3AED' },
    { name: '娱乐', color: '#F472B6' },
    { name: '旅行', color: '#06B6D4' },
  ]

  for (const tag of tagData) {
    const createdTag = await prisma.tag.create({
      data: {
        userId,
        name: tag.name,
        color: tag.color,
      },
    })
    tags.push(createdTag)
  }

  return tags
}

// 创建演示交易
async function createDemoTransactions(
  userId: string,
  accounts: any[],
  tags: any[]
) {
  const transactions: any[] = []

  // 获取一些账户
  const cashAccount = accounts.find(acc => acc.name === '现金')
  const salaryAccount = accounts.find(acc => acc.name === '工资')
  const foodAccount = accounts.find(acc => acc.name === '餐饮')
  const transportAccount = accounts.find(acc => acc.name === '交通')
  const bankAccount = accounts.find(acc => acc.name === '招商银行储蓄卡')

  // 获取一些标签
  const necessaryTag = tags.find(tag => tag.name === '必需')
  const regularTag = tags.find(tag => tag.name === '定期')

  if (
    !cashAccount ||
    !salaryAccount ||
    !foodAccount ||
    !transportAccount ||
    !bankAccount
  ) {
    console.log('⚠️  跳过创建演示交易：缺少必要账户')
    return transactions
  }

  // 创建一些演示交易
  const demoTransactions = [
    // 收入交易
    {
      accountId: salaryAccount.id,
      categoryId: salaryAccount.categoryId,
      currencyId: salaryAccount.currencyId,
      type: 'INCOME',
      amount: 15000,
      description: '月工资',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
      tagIds: regularTag ? [regularTag.id] : [],
    },
    {
      accountId: salaryAccount.id,
      categoryId: salaryAccount.categoryId,
      currencyId: salaryAccount.currencyId,
      type: 'INCOME',
      amount: 3000,
      description: '季度奖金',
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15天前
      tagIds: [],
    },
    // 支出交易
    {
      accountId: foodAccount.id,
      categoryId: foodAccount.categoryId,
      currencyId: foodAccount.currencyId,
      type: 'EXPENSE',
      amount: 85,
      description: '午餐',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前
      tagIds: necessaryTag ? [necessaryTag.id] : [],
    },
    {
      accountId: transportAccount.id,
      categoryId: transportAccount.categoryId,
      currencyId: transportAccount.currencyId,
      type: 'EXPENSE',
      amount: 12,
      description: '地铁费',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前
      tagIds: necessaryTag ? [necessaryTag.id] : [],
    },
    {
      accountId: foodAccount.id,
      categoryId: foodAccount.categoryId,
      currencyId: foodAccount.currencyId,
      type: 'EXPENSE',
      amount: 120,
      description: '晚餐聚会',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
      tagIds: [],
    },
    // 余额调整（资产账户）
    {
      accountId: bankAccount.id,
      categoryId: bankAccount.categoryId,
      currencyId: bankAccount.currencyId,
      type: 'BALANCE',
      amount: 50000,
      description: '银行账户余额',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
      tagIds: [],
    },
    {
      accountId: cashAccount.id,
      categoryId: cashAccount.categoryId,
      currencyId: cashAccount.currencyId,
      type: 'BALANCE',
      amount: 500,
      description: '现金余额',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
      tagIds: [],
    },
  ]

  for (const txn of demoTransactions) {
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        accountId: txn.accountId,
        categoryId: txn.categoryId,
        currencyId: txn.currencyId,
        type: txn.type as any,
        amount: txn.amount,
        description: txn.description,
        date: txn.date,
        tags: {
          create: txn.tagIds.map(tagId => ({
            tagId,
          })),
        },
      },
    })
    transactions.push(transaction)
  }

  return transactions
}

async function createDemoUser() {
  try {
    console.log('🔧 创建演示用户...\n')

    // 创建全局货币
    console.log('💱 创建全局货币...')
    const currencies = await createGlobalCurrencies()
    console.log('✅ 全局货币准备完成\n')

    // 删除现有的演示用户（如果存在）
    const existingUser = await prisma.user.findUnique({
      where: { email: 'demo@flowbalance.com' },
    })

    if (existingUser) {
      console.log('🗑️  删除现有演示用户...')
      await prisma.user.delete({
        where: { email: 'demo@flowbalance.com' },
      })
    }

    // 创建密码哈希
    const password = 'demo123'
    const passwordHash = await bcrypt.hash(password, 10)

    // 创建新的演示用户
    const demoUser = await prisma.user.create({
      data: {
        email: 'demo@flowbalance.com',
        password: passwordHash,
      },
    })

    console.log(`✅ 创建用户: ${demoUser.email}`)
    console.log(`🔑 密码: ${password}`)

    // 创建用户设置
    await prisma.userSettings.create({
      data: {
        userId: demoUser.id,
        baseCurrencyId: currencies['CNY'].id,
        language: 'zh',
        theme: 'system',
      },
    })
    console.log('✅ 创建用户设置')

    // 添加用户可用货币
    const userCurrencyList = ['CNY', 'USD', 'EUR', 'JPY']
    for (let i = 0; i < userCurrencyList.length; i++) {
      const currencyCode = userCurrencyList[i]
      await prisma.userCurrency.create({
        data: {
          userId: demoUser.id,
          currencyId: currencies[currencyCode].id,
          isActive: true,
          order: i,
        },
      })
      console.log(`✅ 添加用户货币: ${currencyCode}`)
    }

    // 创建一些基础汇率
    console.log('\n📝 创建基础汇率...')
    const baseRates = [
      { from: 'CNY', to: 'USD', rate: 0.14 },
      { from: 'EUR', to: 'USD', rate: 1.08 },
      { from: 'JPY', to: 'USD', rate: 0.0067 },
    ]

    for (const rate of baseRates) {
      await prisma.exchangeRate.create({
        data: {
          userId: demoUser.id,
          fromCurrencyId: currencies[rate.from].id,
          toCurrencyId: currencies[rate.to].id,
          rate: rate.rate,
          effectiveDate: new Date(),
          type: 'USER',
          notes: '演示数据',
        },
      })
      console.log(`✅ 创建汇率: ${rate.from} → ${rate.to} = ${rate.rate}`)
    }

    // 创建分类结构
    console.log('\n📁 创建分类结构...')
    const categories = await createCategoryStructure(demoUser.id)
    console.log(`✅ 创建了 ${Object.keys(categories).length} 个分类`)

    // 创建账户
    console.log('\n🏦 创建账户...')
    const accounts = await createAccounts(demoUser.id, categories, currencies)
    console.log(`✅ 创建了 ${accounts.length} 个账户`)

    // 创建标签
    console.log('\n🏷️  创建标签...')
    const tags = await createTags(demoUser.id)
    console.log(`✅ 创建了 ${tags.length} 个标签`)

    // 创建演示交易
    console.log('\n💰 创建演示交易...')
    const transactions = await createDemoTransactions(
      demoUser.id,
      accounts,
      tags
    )
    console.log(`✅ 创建了 ${transactions.length} 条演示交易`)

    // 自动生成汇率
    console.log('\n🔄 自动生成汇率...')
    const { generateAutoExchangeRates } = await import(
      '../src/lib/services/exchange-rate-auto-generation.service'
    )
    const result = await generateAutoExchangeRates(demoUser.id)
    console.log(`✨ 自动生成了 ${result.generatedCount} 条汇率`)

    console.log('\n🎉 演示用户创建完成！')
    console.log('\n📊 数据统计:')
    console.log('  👤 用户: 1')
    console.log(`  💱 全局货币: ${Object.keys(currencies).length}`)
    console.log(`  📁 分类: ${Object.keys(categories).length}`)
    console.log(`  🏦 账户: ${accounts.length}`)
    console.log(`  🏷️  标签: ${tags.length}`)
    console.log(`  💰 交易: ${transactions.length}`)
    console.log(
      `  💱 汇率: ${3 + result.generatedCount} (${3}用户 + ${result.generatedCount}自动)`
    )
    console.log('\n📋 登录信息:')
    console.log('📧 邮箱: demo@flowbalance.com')
    console.log('🔑 密码: demo123')
    console.log('🌐 地址: http://localhost:3002')
    console.log('\n🔍 测试功能:')
    console.log('  • 用户级别货币隔离')
    console.log('  • 多货币账户管理')
    console.log('  • 汇率自动生成')
    console.log('  • 交易记录管理')
    console.log('  • 标签分类系统')
  } catch (error) {
    console.error('❌ 创建演示用户失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行创建
createDemoUser()
