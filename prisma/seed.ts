import { PrismaClient, TransactionType, AccountType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始填充种子数据...')

  // 1. 创建币种数据
  console.log('📦 创建币种数据...')

  // 定义完整的货币数据
  const currencyData = [
    { code: 'AUD', name: 'Australian Dollar', symbol: '$', decimalPlaces: 2 },
    { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimalPlaces: 2 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$', decimalPlaces: 2 },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr.', decimalPlaces: 2 },
    { code: 'CNY', name: 'Chinese Renminbi Yuan', symbol: '¥', decimalPlaces: 2 },
    { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimalPlaces: 2 },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr.', decimalPlaces: 2 },
    { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2 },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimalPlaces: 2 },
    { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimalPlaces: 2 },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimalPlaces: 0 },
    { code: 'ILS', name: 'Israeli New Sheqel', symbol: '₪', decimalPlaces: 2 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2 },
    { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', decimalPlaces: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0 },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimalPlaces: 0 },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimalPlaces: 2 },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimalPlaces: 2 },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimalPlaces: 2 },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimalPlaces: 2 },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimalPlaces: 2 },
    { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', decimalPlaces: 2 },
    { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimalPlaces: 2 },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimalPlaces: 2 },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimalPlaces: 2 },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2 },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', decimalPlaces: 2 },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimalPlaces: 2 },
    { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', decimalPlaces: 2 },
    { code: 'USD', name: 'United States Dollar', symbol: '$', decimalPlaces: 2 },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', decimalPlaces: 0 },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalPlaces: 2 },
  ]

  // 批量创建或更新货币数据
  for (const currency of currencyData) {
    // 先查找是否存在
    const existingCurrency = await prisma.currency.findFirst({
      where: {
        code: currency.code,
        createdBy: null,
      },
    })

    if (existingCurrency) {
      // 更新现有货币
      await prisma.currency.update({
        where: { id: existingCurrency.id },
        data: {
          name: currency.name,
          symbol: currency.symbol,
          decimalPlaces: currency.decimalPlaces,
        },
      })
    } else {
      // 创建新货币
      await prisma.currency.create({
        data: {
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          decimalPlaces: currency.decimalPlaces,
          createdBy: null,
        },
      })
    }
  }

  console.log(`✅ 已创建/更新 ${currencyData.length} 种货币`)

  // 获取创建的货币
  const currencies = await Promise.all([
    prisma.currency.findFirst({ where: { code: 'USD', createdBy: null } }),
    prisma.currency.findFirst({ where: { code: 'EUR', createdBy: null } }),
    prisma.currency.findFirst({ where: { code: 'CNY', createdBy: null } }),
    prisma.currency.findFirst({ where: { code: 'JPY', createdBy: null } }),
  ])

  // 2. 创建测试用户
  console.log('👤 创建测试用户...')
  const hashedPassword = await bcrypt.hash('password123', 10)

  const user1 = await prisma.user.upsert({
    where: { email: 'demo@flowbalance.com' },
    update: {},
    create: {
      email: 'demo@flowbalance.com',
      password: hashedPassword,
      settings: {
        create: {
          baseCurrencyId: currencies[0]?.id, // USD
          dateFormat: 'YYYY-MM-DD',
        },
      },
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      settings: {
        create: {
          baseCurrencyId: currencies[2]?.id, // CNY
          dateFormat: 'YYYY-MM-DD',
        },
      },
    },
  })

  // 为用户1添加可用货币
  console.log('💰 创建用户货币设置...')
  await prisma.userCurrency.createMany({
    data: [
      {
        userId: user1.id,
        currencyId: currencies[0]!.id,
        order: 0,
        isActive: true,
      }, // USD
      {
        userId: user1.id,
        currencyId: currencies[1]!.id,
        order: 1,
        isActive: true,
      }, // EUR
      {
        userId: user1.id,
        currencyId: currencies[2]!.id,
        order: 2,
        isActive: true,
      }, // CNY
      {
        userId: user1.id,
        currencyId: currencies[3]!.id,
        order: 3,
        isActive: true,
      }, // JPY
    ],
  })

  // 为用户2添加可用货币
  await prisma.userCurrency.createMany({
    data: [
      {
        userId: user2.id,
        currencyId: currencies[2]!.id,
        order: 0,
        isActive: true,
      }, // CNY
      {
        userId: user2.id,
        currencyId: currencies[0]!.id,
        order: 1,
        isActive: true,
      }, // USD
      {
        userId: user2.id,
        currencyId: currencies[1]!.id,
        order: 2,
        isActive: true,
      }, // EUR
    ],
  })

  // 3. 为用户1创建分类结构
  console.log('📁 创建分类结构...')

  // 顶级分类
  const assetsCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '资产',
      type: AccountType.ASSET,
      order: 1,
    },
  })

  const liabilitiesCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '负债',
      type: AccountType.LIABILITY,
      order: 2,
    },
  })

  const incomeCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '收入',
      type: AccountType.INCOME,
      order: 3,
    },
  })

  const expenseCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '支出',
      type: AccountType.EXPENSE,
      order: 4,
    },
  })

  // 资产子分类
  const cashCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '现金',
      type: AccountType.ASSET,
      parentId: assetsCategory.id,
      order: 1,
    },
  })

  const bankCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '银行账户',
      type: AccountType.ASSET,
      parentId: assetsCategory.id,
      order: 2,
    },
  })

  const investmentCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '投资',
      type: AccountType.ASSET,
      parentId: assetsCategory.id,
      order: 3,
    },
  })

  // 支出子分类
  const foodCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '餐饮',
      type: AccountType.EXPENSE,
      parentId: expenseCategory.id,
      order: 1,
    },
  })

  const transportCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '交通',
      type: AccountType.EXPENSE,
      parentId: expenseCategory.id,
      order: 2,
    },
  })

  const shoppingCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '购物',
      type: AccountType.EXPENSE,
      parentId: expenseCategory.id,
      order: 3,
    },
  })

  // 4. 创建账户
  console.log('🏦 创建账户...')

  const _checkingAccount = await prisma.account.upsert({
    where: {
      userId_name: {
        userId: user1.id,
        name: '招商银行储蓄卡',
      },
    },
    update: {},
    create: {
      userId: user1.id,
      categoryId: bankCategory.id,
      currencyId: currencies[0]!.id, // USD
      name: '招商银行储蓄卡',
      description: '日常消费账户',
    },
  })

  const savingsAccount = await prisma.account.upsert({
    where: {
      userId_name: {
        userId: user1.id,
        name: '建设银行定期存款',
      },
    },
    update: {},
    create: {
      userId: user1.id,
      categoryId: bankCategory.id,
      currencyId: currencies[0]!.id, // USD
      name: '建设银行定期存款',
      description: '定期存款账户',
    },
  })

  const _cashAccount = await prisma.account.upsert({
    where: {
      userId_name: {
        userId: user1.id,
        name: '现金钱包',
      },
    },
    update: {},
    create: {
      userId: user1.id,
      categoryId: cashCategory.id,
      currencyId: currencies[0]!.id, // USD
      name: '现金钱包',
      description: '随身现金',
    },
  })

  const investmentAccount = await prisma.account.upsert({
    where: {
      userId_name: {
        userId: user1.id,
        name: '股票投资账户',
      },
    },
    update: {},
    create: {
      userId: user1.id,
      categoryId: investmentCategory.id,
      currencyId: currencies[0]!.id, // USD
      name: '股票投资账户',
      description: '股票投资',
    },
  })

  // 创建流量类账户（收入/支出账户）
  const salaryAccount = await prisma.account.upsert({
    where: {
      userId_name: {
        userId: user1.id,
        name: '工资收入',
      },
    },
    update: {},
    create: {
      userId: user1.id,
      categoryId: incomeCategory.id,
      currencyId: currencies[0]!.id, // USD
      name: '工资收入',
      description: '主要工资收入来源',
    },
  })

  const foodExpenseAccount = await prisma.account.upsert({
    where: {
      userId_name: {
        userId: user1.id,
        name: '餐饮支出',
      },
    },
    update: {},
    create: {
      userId: user1.id,
      categoryId: foodCategory.id,
      currencyId: currencies[0]!.id, // USD
      name: '餐饮支出',
      description: '日常餐饮消费',
    },
  })

  const transportExpenseAccount = await prisma.account.upsert({
    where: {
      userId_name: {
        userId: user1.id,
        name: '交通支出',
      },
    },
    update: {},
    create: {
      userId: user1.id,
      categoryId: transportCategory.id,
      currencyId: currencies[0]!.id, // USD
      name: '交通支出',
      description: '交通出行费用',
    },
  })

  const shoppingExpenseAccount = await prisma.account.upsert({
    where: {
      userId_name: {
        userId: user1.id,
        name: '购物支出',
      },
    },
    update: {},
    create: {
      userId: user1.id,
      categoryId: shoppingCategory.id,
      currencyId: currencies[0]!.id, // USD
      name: '购物支出',
      description: '日常购物消费',
    },
  })

  // 创建负债账户
  const _creditCardAccount = await prisma.account.upsert({
    where: {
      userId_name: {
        userId: user1.id,
        name: '信用卡负债',
      },
    },
    update: {},
    create: {
      userId: user1.id,
      categoryId: liabilitiesCategory.id,
      currencyId: currencies[0]!.id, // USD
      name: '信用卡负债',
      description: '信用卡欠款',
    },
  })

  const _mortgageAccount = await prisma.account.upsert({
    where: {
      userId_name: {
        userId: user1.id,
        name: '房贷',
      },
    },
    update: {},
    create: {
      userId: user1.id,
      categoryId: liabilitiesCategory.id,
      currencyId: currencies[0]!.id, // USD
      name: '房贷',
      description: '住房贷款',
    },
  })

  // 5. 创建标签
  console.log('🏷️ 创建标签...')

  const workTag = await prisma.tag.create({
    data: {
      userId: user1.id,
      name: '工作',
      color: '#3B82F6',
    },
  })

  const personalTag = await prisma.tag.create({
    data: {
      userId: user1.id,
      name: '个人',
      color: '#10B981',
    },
  })

  const _urgentTag = await prisma.tag.create({
    data: {
      userId: user1.id,
      name: '紧急',
      color: '#EF4444',
    },
  })

  // 6. 创建交易记录
  console.log('💰 创建交易记录...')

  const _salaryTransaction = await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: salaryAccount.id,
      categoryId: incomeCategory.id,
      currencyId: currencies[0]!.id, // USD
      type: TransactionType.INCOME,
      amount: 5000,
      description: '月薪',
      date: new Date('2024-01-01'),
      tags: {
        create: [{ tagId: workTag.id }],
      },
    },
  })

  await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: foodExpenseAccount.id,
      categoryId: foodCategory.id,
      currencyId: currencies[0]!.id, // USD
      type: TransactionType.EXPENSE,
      amount: 25.5,
      description: '午餐',
      date: new Date('2024-01-02'),
      tags: {
        create: [{ tagId: personalTag.id }],
      },
    },
  })

  await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: transportExpenseAccount.id,
      categoryId: transportCategory.id,
      currencyId: currencies[0]!.id, // USD
      type: TransactionType.EXPENSE,
      amount: 15.0,
      description: '地铁卡充值',
      date: new Date('2024-01-03'),
      tags: {
        create: [{ tagId: personalTag.id }],
      },
    },
  })

  await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: savingsAccount.id,
      categoryId: incomeCategory.id,
      currencyId: currencies[0]!.id, // USD
      type: TransactionType.INCOME,
      amount: 1000,
      description: '定期存款转入',
      date: new Date('2024-01-05'),
    },
  })

  await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: shoppingExpenseAccount.id,
      categoryId: shoppingCategory.id,
      currencyId: currencies[0]!.id, // USD
      type: TransactionType.EXPENSE,
      amount: 89.99,
      description: '购买书籍',
      date: new Date('2024-01-07'),
      tags: {
        create: [{ tagId: personalTag.id }],
      },
    },
  })

  // 添加一些多货币交易记录
  await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: salaryAccount.id,
      categoryId: incomeCategory.id,
      currencyId: currencies[1]!.id, // EUR
      type: TransactionType.INCOME,
      amount: 500,
      description: '欧洲项目收入',
      date: new Date('2024-01-10'),
    },
  })

  await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: foodExpenseAccount.id,
      categoryId: foodCategory.id,
      currencyId: currencies[2]!.id, // CNY
      type: TransactionType.EXPENSE,
      amount: 150,
      description: '中餐厅用餐',
      date: new Date('2024-01-12'),
    },
  })

  await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: investmentAccount.id,
      categoryId: incomeCategory.id,
      currencyId: currencies[3]!.id, // JPY
      type: TransactionType.INCOME,
      amount: 50000,
      description: '日本股票收益',
      date: new Date('2024-01-15'),
    },
  })

  // 7. 创建示例汇率数据
  console.log('💱 创建汇率数据...')

  const exchangeRates = await Promise.all([
    prisma.exchangeRate.create({
      data: {
        userId: user1.id,
        fromCurrencyId: currencies[1]!.id, // EUR
        toCurrencyId: currencies[0]!.id, // USD
        rate: 1.08,
        effectiveDate: new Date('2024-01-01'),
        notes: '欧元兑美元汇率',
      },
    }),
    prisma.exchangeRate.create({
      data: {
        userId: user1.id,
        fromCurrencyId: currencies[2]!.id, // CNY
        toCurrencyId: currencies[0]!.id, // USD
        rate: 0.14,
        effectiveDate: new Date('2024-01-01'),
        notes: '人民币兑美元汇率',
      },
    }),
    prisma.exchangeRate.create({
      data: {
        userId: user1.id,
        fromCurrencyId: currencies[3]!.id, // JPY
        toCurrencyId: currencies[0]!.id, // USD
        rate: 0.0067,
        effectiveDate: new Date('2024-01-01'),
        notes: '日元兑美元汇率',
      },
    }),
  ])

  console.log('✅ 种子数据填充完成!')
  console.log('👤 创建了 2 个用户')
  console.log(`💱 创建了 34 种全局货币（包含完整的货币符号和小数位配置）`)
  console.log('💰 为用户设置了可用货币')
  console.log('📁 创建了分类结构')
  console.log('🏦 创建了 10 个账户（4个资产类 + 2个负债类 + 4个流量类）')
  console.log('🏷️ 创建了 3 个标签')
  console.log('💰 创建了 8 条交易记录（包含多货币）')
  console.log(`💱 创建了 ${exchangeRates.length} 个汇率记录`)
  console.log('🔄 多货币交易：USD, EUR, CNY, JPY')
  console.log('📊 汇率设置：EUR→USD, CNY→USD, JPY→USD')
  console.log('📊 流量类账户：工资收入、餐饮支出、交通支出、购物支出')
  console.log('💰 货币精度：JPY/KRW/IDR/VND 使用 0 位小数，其他货币使用 2 位小数')
}

main()
  .catch(e => {
    console.error('❌ 种子数据填充失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
