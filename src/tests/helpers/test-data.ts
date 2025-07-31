/**
 * 测试数据辅助函数
 * 用于创建和清理测试数据
 */

import { prisma } from '@/lib/database/connection-manager'
import { subDays, subMonths } from 'date-fns'

/**
 * 创建测试用户
 */
export async function createTestUser() {
  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      password: 'hashedpassword123',
    },
  })

  // 创建用户设置
  const currency = await prisma.currency.findFirst({
    where: { code: 'CNY' },
  })

  if (currency) {
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        baseCurrencyId: currency.id,
        language: 'zh',
      },
    })
  }

  return user
}

/**
 * 创建测试账户
 */
export async function createTestAccount(
  userId: string,
  categoryType: string,
  currencyCode: string
) {
  // 获取或创建分类
  let category = await prisma.category.findFirst({
    where: {
      userId,
      type: categoryType as any,
    },
  })

  if (!category) {
    category = await prisma.category.create({
      data: {
        userId,
        name: `Test ${categoryType} Category`,
        type: categoryType as any,
      },
    })
  }

  // 获取货币
  const currency = await prisma.currency.findFirst({
    where: { code: currencyCode },
  })

  if (!currency) {
    throw new Error(`Currency ${currencyCode} not found`)
  }

  // 创建账户
  const account = await prisma.account.create({
    data: {
      userId,
      name: `Test ${categoryType} Account`,
      categoryId: category.id,
      currencyId: currency.id,
      description: 'Test account for optimization testing',
    },
  })

  return account
}

/**
 * 创建测试交易数据
 */
export async function createTestTransactions(
  userId: string,
  assetAccountId: string,
  incomeAccountId: string
) {
  const currency = await prisma.currency.findFirst({
    where: { code: 'CNY' },
  })

  if (!currency) {
    throw new Error('CNY currency not found')
  }

  const transactions = []

  // 创建资产账户的余额记录（过去6个月）
  for (let i = 6; i >= 1; i--) {
    const date = subMonths(new Date(), i)
    const balance = 10000 + i * 1000 // 递增余额

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        accountId: assetAccountId,
        currencyId: currency.id,
        type: 'BALANCE',
        amount: balance,
        date,
        description: `Balance record for month ${i}`,
        notes: `变化金额：+${i * 1000}`,
      },
    })
    transactions.push(transaction)
  }

  // 创建收入账户的交易记录（过去30天）
  for (let i = 30; i >= 1; i--) {
    const date = subDays(new Date(), i)
    const amount = Math.floor(Math.random() * 1000) + 100 // 100-1100的随机金额

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        accountId: incomeAccountId,
        currencyId: currency.id,
        type: 'INCOME',
        amount,
        date,
        description: `Income transaction day ${i}`,
      },
    })
    transactions.push(transaction)
  }

  return transactions
}

/**
 * 清理测试数据
 */
export async function cleanupTestData(userId: string) {
  // 删除交易记录
  await prisma.transaction.deleteMany({
    where: { userId },
  })

  // 删除账户
  await prisma.account.deleteMany({
    where: { userId },
  })

  // 删除分类
  await prisma.category.deleteMany({
    where: { userId },
  })

  // 删除用户设置
  await prisma.userSettings.deleteMany({
    where: { userId },
  })

  // 删除用户
  await prisma.user.delete({
    where: { id: userId },
  })
}

/**
 * 创建性能测试数据
 */
export async function createPerformanceTestData(
  userId: string,
  accountId: string,
  transactionCount: number = 10000
) {
  const currency = await prisma.currency.findFirst({
    where: { code: 'CNY' },
  })

  if (!currency) {
    throw new Error('CNY currency not found')
  }

  const transactions = []
  const batchSize = 1000

  // 分批创建大量交易数据
  for (
    let batch = 0;
    batch < Math.ceil(transactionCount / batchSize);
    batch++
  ) {
    const batchTransactions = []
    const startIndex = batch * batchSize
    const endIndex = Math.min(startIndex + batchSize, transactionCount)

    for (let i = startIndex; i < endIndex; i++) {
      const date = subDays(new Date(), Math.floor(Math.random() * 365)) // 过去一年内的随机日期
      const amount = Math.floor(Math.random() * 10000) + 100
      const type = Math.random() > 0.5 ? 'INCOME' : 'EXPENSE'

      batchTransactions.push({
        userId,
        accountId,
        currencyId: currency.id,
        type: type as any,
        amount,
        date,
        description: `Performance test transaction ${i}`,
      })
    }

    // 批量插入
    await prisma.transaction.createMany({
      data: batchTransactions,
    })

    transactions.push(...batchTransactions)
  }

  return transactions
}

/**
 * 测量函数执行时间
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now()
  const result = await fn()
  const endTime = Date.now()
  const duration = endTime - startTime

  return { result, duration }
}

/**
 * 比较两个数组的数据一致性
 */
export function compareDataConsistency(
  data1: any[],
  data2: any[],
  keyField: string = 'date'
) {
  if (data1.length !== data2.length) {
    return false
  }

  const map1 = new Map(data1.map(item => [item[keyField], item]))
  const map2 = new Map(data2.map(item => [item[keyField], item]))

  for (const [key, value1] of map1) {
    const value2 = map2.get(key)
    if (!value2) {
      return false
    }

    // 比较关键字段
    if (Math.abs(value1.convertedAmount - value2.convertedAmount) > 0.01) {
      return false
    }
  }

  return true
}
