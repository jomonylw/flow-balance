/**
 * 序列化工具函数
 * 用于将Prisma返回的数据转换为可以传递给客户端组件的普通对象
 */

import { Decimal } from '@prisma/client/runtime/library'

/**
 * 递归地将对象中的所有Decimal类型转换为number类型
 * @param obj 要序列化的对象
 * @returns 序列化后的对象
 */
export function serializeDecimal<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (obj instanceof Decimal) {
    return parseFloat(obj.toString()) as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeDecimal(item)) as T
  }

  if (typeof obj === 'object') {
    const serialized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeDecimal(value)
    }
    return serialized
  }

  return obj
}

/**
 * 序列化账户数据，确保所有Decimal字段都转换为number
 */
export function serializeAccount(account: any) {
  return {
    ...account,
    transactions: account.transactions?.map((transaction: any) => ({
      ...transaction,
      amount: parseFloat(transaction.amount.toString())
    })) || []
  }
}

/**
 * 序列化交易数据
 */
export function serializeTransaction(transaction: any) {
  return {
    ...transaction,
    amount: parseFloat(transaction.amount.toString())
  }
}

/**
 * 序列化账户列表
 */
export function serializeAccounts(accounts: any[]) {
  return accounts.map(account => serializeAccount(account))
}
