/**
 * 类型转换工具
 * 处理 Prisma 生成的类型与我们的常量枚举类型之间的转换
 */

import { ConstantsManager } from './constants-manager'
import type { AccountType, TransactionType, Language, Theme } from '@/types/core/constants'

/**
 * 转换 Prisma 对象中的枚举字段
 */
export class TypeConverters {
  /**
   * 转换账户对象，将 Prisma 枚举转换为我们的枚举
   */
  static convertAccount<T extends { category: { type: string } }>(account: T): T & {
    category: T['category'] & { type: AccountType }
  } {
    return {
      ...account,
      category: {
        ...account.category,
        type: ConstantsManager.convertPrismaAccountType(account.category.type),
      },
    }
  }

  /**
   * 转换分类对象，将 Prisma 枚举转换为我们的枚举
   */
  static convertCategory<T extends { type: string }>(category: T): T & { type: AccountType } {
    return {
      ...category,
      type: ConstantsManager.convertPrismaAccountType(category.type),
    }
  }

  /**
   * 转换交易对象，将 Prisma 枚举转换为我们的枚举
   */
  static convertTransaction<T extends { type: string }>(transaction: T): T & { type: TransactionType } {
    return {
      ...transaction,
      type: ConstantsManager.convertPrismaTransactionType(transaction.type),
    }
  }

  /**
   * 转换用户设置对象，将 Prisma 枚举转换为我们的枚举
   */
  static convertUserSettings<T extends { language: string; theme: string }>(
    settings: T
  ): T & { language: Language; theme: Theme } {
    return {
      ...settings,
      language: ConstantsManager.convertPrismaLanguage(settings.language),
      theme: ConstantsManager.convertPrismaTheme(settings.theme),
    }
  }

  /**
   * 批量转换账户数组
   */
  static convertAccounts<T extends { category: { type: string } }>(
    accounts: T[]
  ): Array<T & { category: T['category'] & { type: AccountType } }> {
    return accounts.map(account => this.convertAccount(account))
  }

  /**
   * 批量转换分类数组
   */
  static convertCategories<T extends { type: string }>(
    categories: T[]
  ): Array<T & { type: AccountType }> {
    return categories.map(category => this.convertCategory(category))
  }

  /**
   * 批量转换交易数组
   */
  static convertTransactions<T extends { type: string }>(
    transactions: T[]
  ): Array<T & { type: TransactionType }> {
    return transactions.map(transaction => this.convertTransaction(transaction))
  }

  /**
   * 转换带有交易的账户对象
   */
  static convertAccountWithTransactions<
    T extends {
      category: { type: string }
      transactions: Array<{ type: string }>
    }
  >(account: T): T & {
    category: T['category'] & { type: AccountType }
    transactions: Array<T['transactions'][0] & { type: TransactionType }>
  } {
    return {
      ...account,
      category: {
        ...account.category,
        type: ConstantsManager.convertPrismaAccountType(account.category.type),
      },
      transactions: account.transactions.map(transaction => ({
        ...transaction,
        type: ConstantsManager.convertPrismaTransactionType(transaction.type),
      })),
    }
  }

  /**
   * 批量转换带有交易的账户数组
   */
  static convertAccountsWithTransactions<
    T extends {
      category: { type: string }
      transactions: Array<{ type: string }>
    }
  >(accounts: T[]): Array<T & {
    category: T['category'] & { type: AccountType }
    transactions: Array<T['transactions'][0] & { type: TransactionType }>
  }> {
    return accounts.map(account => this.convertAccountWithTransactions(account))
  }

  /**
   * 安全转换 - 如果转换失败返回原值
   */
  static safeConvertAccountType(type: string): AccountType | string {
    try {
      return ConstantsManager.convertPrismaAccountType(type)
    } catch {
      return type
    }
  }

  /**
   * 安全转换 - 如果转换失败返回原值
   */
  static safeConvertTransactionType(type: string): TransactionType | string {
    try {
      return ConstantsManager.convertPrismaTransactionType(type)
    } catch {
      return type
    }
  }

  /**
   * 安全转换 - 如果转换失败返回原值
   */
  static safeConvertLanguage(language: string): Language | string {
    try {
      return ConstantsManager.convertPrismaLanguage(language)
    } catch {
      return language
    }
  }

  /**
   * 安全转换 - 如果转换失败返回原值
   */
  static safeConvertTheme(theme: string): Theme | string {
    try {
      return ConstantsManager.convertPrismaTheme(theme)
    } catch {
      return theme
    }
  }
}

/**
 * 便捷的转换函数
 */
export const convertPrismaAccount = TypeConverters.convertAccount
export const convertPrismaCategory = TypeConverters.convertCategory
export const convertPrismaTransaction = TypeConverters.convertTransaction
export const convertPrismaUserSettings = TypeConverters.convertUserSettings
export const convertPrismaAccounts = TypeConverters.convertAccounts
export const convertPrismaCategories = TypeConverters.convertCategories
export const convertPrismaTransactions = TypeConverters.convertTransactions
export const convertPrismaAccountWithTransactions = TypeConverters.convertAccountWithTransactions
export const convertPrismaAccountsWithTransactions = TypeConverters.convertAccountsWithTransactions

/**
 * 类型守卫函数 - 检查是否为我们的枚举类型
 */
export function isOurAccountType(type: any): type is AccountType {
  return Object.values(ConstantsManager.getAllAccountTypes()).includes(type)
}

export function isOurTransactionType(type: any): type is TransactionType {
  return Object.values(ConstantsManager.getAllTransactionTypes()).includes(type)
}

export function isOurLanguage(language: any): language is Language {
  return Object.values(ConstantsManager.getAllLanguages()).includes(language)
}

export function isOurTheme(theme: any): theme is Theme {
  return Object.values(ConstantsManager.getAllThemes()).includes(theme)
}
