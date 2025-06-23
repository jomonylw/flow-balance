/**
 * @deprecated 此文件已被弃用，请使用 @/types/core 中的统一类型定义
 * 为了向后兼容，重新导出核心类型
 */

import type {
  Category as CoreCategory,
  Currency as CoreCurrency,
  Tag as CoreTag,
  Account as CoreAccount,
  Transaction as CoreTransaction,
  TransactionFormData as CoreTransactionFormData,
  User as CoreUser,
  TrendDataPoint as CoreTrendDataPoint,
  TransactionTagInfo,
} from '@/types/core'
import { AccountType } from '@/types/core/constants'

// 为了完全兼容，创建适配器类型
export interface LegacyCategory
  extends Omit<
    CoreCategory,
    'transactions' | 'parent' | 'children' | 'accounts'
  > {
  transactions?: LegacyTransaction[]
  parent?: LegacyCategory | null
  children?: LegacyCategory[]
  accounts?: LegacyAccount[]
}
export interface LegacyCurrency extends CoreCurrency {
  isActive: boolean // 添加 isActive 字段以保持向后兼容
}
export type LegacyTag = CoreTag
export type LegacyTransactionTag = TransactionTagInfo

export interface LegacyAccount
  extends Omit<
    CoreAccount,
    'category' | 'currency' | 'currencyCode' | 'transactions'
  > {
  category: {
    id: string
    name: string
    type?: AccountType
  }
  transactions?: LegacyTransaction[]
  currencyCode: string // 改为必需字段
  currency?: LegacyCurrency
}

export interface LegacyTransaction
  extends Omit<
    CoreTransaction,
    'date' | 'tags' | 'account' | 'createdAt' | 'updatedAt'
  > {
  date: string
  createdAt: string
  updatedAt: string
  tags: { tag: LegacyTransactionTag }[]
  account?: LegacyAccount
}

export interface LegacyTransactionFormData
  extends Omit<CoreTransactionFormData, 'type'> {
  type: 'INCOME' | 'EXPENSE'
}

export type LegacyUser = CoreUser
export type LegacyTrendDataPoint = CoreTrendDataPoint

// 重新导出为原名称以保持向后兼容
/** 分类类型 - 重新导出核心类型 */
export type { Category } from '@/types/core'
/** 货币类型 - 重新导出核心类型 */
export type { Currency } from '@/types/core'
/** 标签类型 - 重新导出核心类型 */
export type { Tag } from '@/types/core'
/** 交易标签类型 - 重新导出核心类型 */
export type { TransactionTag } from '@/types/core'
/** 账户类型 - 重新导出核心类型 */
export type { Account } from '@/types/core'
/** 交易类型 - 重新导出核心类型 */
export type { Transaction } from '@/types/core'
/** 交易表单数据类型 - 重新导出核心类型 */
export type { TransactionFormData } from '@/types/core'
/** 用户类型 - 重新导出核心类型 */
export type { User } from '@/types/core'
/** 趋势数据点类型 - 重新导出核心类型 */
export type { TrendDataPoint } from '@/types/core'
/** 时间范围类型 - 重新导出核心类型 */
export type { TimeRange } from '@/types/core'
