import { PrismaClient, TransactionType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始填充种子数据...')

  // 1. 创建币种数据
  console.log('📦 创建币种数据...')
  const currencies = await Promise.all([
    prisma.currency.upsert({
      where: { code: 'USD' },
      update: {},
      create: {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$'
      }
    }),
    prisma.currency.upsert({
      where: { code: 'EUR' },
      update: {},
      create: {
        code: 'EUR',
        name: 'Euro',
        symbol: '€'
      }
    }),
    prisma.currency.upsert({
      where: { code: 'CNY' },
      update: {},
      create: {
        code: 'CNY',
        name: 'Chinese Yuan',
        symbol: '¥'
      }
    }),
    prisma.currency.upsert({
      where: { code: 'JPY' },
      update: {},
      create: {
        code: 'JPY',
        name: 'Japanese Yen',
        symbol: '¥'
      }
    })
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
          baseCurrencyCode: 'USD',
          dateFormat: 'YYYY-MM-DD'
        }
      }
    }
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      settings: {
        create: {
          baseCurrencyCode: 'CNY',
          dateFormat: 'YYYY-MM-DD'
        }
      }
    }
  })

  // 3. 为用户1创建分类结构
  console.log('📁 创建分类结构...')
  
  // 顶级分类
  const assetsCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '资产',
      order: 1
    }
  })

  const liabilitiesCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '负债',
      order: 2
    }
  })

  const incomeCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '收入',
      order: 3
    }
  })

  const expenseCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '支出',
      order: 4
    }
  })

  // 资产子分类
  const cashCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '现金',
      parentId: assetsCategory.id,
      order: 1
    }
  })

  const bankCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '银行账户',
      parentId: assetsCategory.id,
      order: 2
    }
  })

  const investmentCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '投资',
      parentId: assetsCategory.id,
      order: 3
    }
  })

  // 支出子分类
  const foodCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '餐饮',
      parentId: expenseCategory.id,
      order: 1
    }
  })

  const transportCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '交通',
      parentId: expenseCategory.id,
      order: 2
    }
  })

  const shoppingCategory = await prisma.category.create({
    data: {
      userId: user1.id,
      name: '购物',
      parentId: expenseCategory.id,
      order: 3
    }
  })

  // 4. 创建账户
  console.log('🏦 创建账户...')
  
  const checkingAccount = await prisma.account.create({
    data: {
      userId: user1.id,
      categoryId: bankCategory.id,
      name: '招商银行储蓄卡',
      description: '日常消费账户'
    }
  })

  const savingsAccount = await prisma.account.create({
    data: {
      userId: user1.id,
      categoryId: bankCategory.id,
      name: '建设银行定期存款',
      description: '定期存款账户'
    }
  })

  const cashAccount = await prisma.account.create({
    data: {
      userId: user1.id,
      categoryId: cashCategory.id,
      name: '现金钱包',
      description: '随身现金'
    }
  })

  const investmentAccount = await prisma.account.create({
    data: {
      userId: user1.id,
      categoryId: investmentCategory.id,
      name: '股票投资账户',
      description: '股票投资'
    }
  })

  // 5. 创建标签
  console.log('🏷️ 创建标签...')
  
  const workTag = await prisma.tag.create({
    data: {
      userId: user1.id,
      name: '工作',
      color: '#3B82F6'
    }
  })

  const personalTag = await prisma.tag.create({
    data: {
      userId: user1.id,
      name: '个人',
      color: '#10B981'
    }
  })

  const urgentTag = await prisma.tag.create({
    data: {
      userId: user1.id,
      name: '紧急',
      color: '#EF4444'
    }
  })

  // 6. 创建交易记录
  console.log('💰 创建交易记录...')
  
  const salaryTransaction = await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: checkingAccount.id,
      categoryId: incomeCategory.id,
      currencyCode: 'USD',
      type: TransactionType.INCOME,
      amount: 5000,
      description: '月薪',
      date: new Date('2024-01-01'),
      tags: {
        create: [
          { tagId: workTag.id }
        ]
      }
    }
  })

  await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: checkingAccount.id,
      categoryId: foodCategory.id,
      currencyCode: 'USD',
      type: TransactionType.EXPENSE,
      amount: 25.50,
      description: '午餐',
      date: new Date('2024-01-02'),
      tags: {
        create: [
          { tagId: personalTag.id }
        ]
      }
    }
  })

  await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: checkingAccount.id,
      categoryId: transportCategory.id,
      currencyCode: 'USD',
      type: TransactionType.EXPENSE,
      amount: 15.00,
      description: '地铁卡充值',
      date: new Date('2024-01-03'),
      tags: {
        create: [
          { tagId: personalTag.id }
        ]
      }
    }
  })

  await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: savingsAccount.id,
      categoryId: incomeCategory.id,
      currencyCode: 'USD',
      type: TransactionType.INCOME,
      amount: 1000,
      description: '定期存款转入',
      date: new Date('2024-01-05')
    }
  })

  await prisma.transaction.create({
    data: {
      userId: user1.id,
      accountId: checkingAccount.id,
      categoryId: shoppingCategory.id,
      currencyCode: 'USD',
      type: TransactionType.EXPENSE,
      amount: 89.99,
      description: '购买书籍',
      date: new Date('2024-01-07'),
      tags: {
        create: [
          { tagId: personalTag.id }
        ]
      }
    }
  })

  console.log('✅ 种子数据填充完成!')
  console.log(`👤 创建了 2 个用户`)
  console.log(`💱 创建了 ${currencies.length} 种币种`)
  console.log(`📁 创建了分类结构`)
  console.log(`🏦 创建了 4 个账户`)
  console.log(`🏷️ 创建了 3 个标签`)
  console.log(`💰 创建了 5 条交易记录`)
}

main()
  .catch((e) => {
    console.error('❌ 种子数据填充失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
