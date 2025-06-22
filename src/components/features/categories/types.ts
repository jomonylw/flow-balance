import type {
  User as CoreUser,
  Category as CoreCategory,
  Currency as CoreCurrency,
  Tag as CoreTag,
  Account as CoreAccount,
  CategoryType,
} from '@/types/core'
import type {
  TransactionWithBasic,
  SerializedTransactionWithBasic,
} from '@/types/database'
import type {
  LegacyCategory,
  LegacyCurrency,
} from '@/types/business/transaction'

// 重新导出核心类型
/** 用户类型 - 重新导出核心类型 */
export type { User } from '@/types/core'
/** 货币类型 - 重新导出核心类型 */
export type { Currency } from '@/types/core'
/** 标签类型 - 重新导出核心类型 */
export type { Tag } from '@/types/core'

// 扩展类型以包含交易数据
export interface CategoryWithTransactions
  extends Omit<CoreCategory, 'transactions'> {
  transactions: TransactionWithBasic[]
}

export interface AccountWithTransactions
  extends Omit<CoreAccount, 'transactions'> {
  transactions: TransactionWithBasic[]
}

// 序列化版本的类型（用于客户端传递）
export interface SerializedCategoryWithTransactions {
  id: string
  name: string
  type: CategoryType
  icon?: string | null
  color?: string | null
  description?: string | null
  order: number
  parentId?: string | null
  userId: string
  createdAt: string
  updatedAt: string
  parent?: SerializedCategoryWithTransactions | null
  children?: SerializedCategoryWithTransactions[]
  transactions: SerializedTransactionWithBasic[]
  accounts?: SerializedAccountWithTransactions[]
}

export interface SerializedAccountWithTransactions
  extends Omit<
    CoreAccount,
    'transactions' | 'createdAt' | 'updatedAt' | 'category'
  > {
  createdAt: string
  updatedAt: string
  category: SerializedCategoryWithTransactions
  transactions: SerializedTransactionWithBasic[]
}

// 存量类账户（资产/负债）
export type StockAccount = AccountWithTransactions

// 重新导出统一类型定义，避免重复
export type { StockCategory, FlowCategory, FlowAccount } from '@/types/core'

export interface CategoryDetailViewProps {
  category: CategoryWithTransactions
  accounts: AccountWithTransactions[]
  categories: CoreCategory[]
  currencies: CoreCurrency[]
  tags: CoreTag[]
  user: CoreUser
}

export interface SerializedCategoryDetailViewProps {
  category: SerializedCategoryWithTransactions
  accounts: SerializedAccountWithTransactions[]
  categories: SerializedCategoryWithTransactions[]
  currencies: CoreCurrency[]
  tags: CoreTag[]
  user: CoreUser
}

export interface StockCategoryDetailViewProps {
  category: LegacyCategory
  currencies: LegacyCurrency[]
  user: CoreUser
}

export interface FlowCategoryDetailViewProps {
  category: LegacyCategory
  user: CoreUser
}

// 重新导出一些类型以保持兼容性
export type { CategoryWithTransactions as Category }
export type { TransactionWithBasic as Transaction }
