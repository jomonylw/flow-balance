/**
 * 数据库模型类型定义
 * 基于 Prisma Schema 生成的类型定义和扩展
 */

import type { Prisma } from '@prisma/client'
import { AccountType } from '@/types/core/constants'

// ============================================================================
// 基础 Prisma 类型重导出
// ============================================================================

// 重新导出 Prisma 生成的基础类型
export type {
  User,
  UserSettings,
  Currency,
  Category,
  Account,
  Transaction,
  Tag,
  TransactionTag,
  ExchangeRate,
  TransactionType,
  AccountType,
} from '@prisma/client'

// ============================================================================
// 扩展的数据库查询类型
// ============================================================================

/** 用户查询包含设置 */
export type UserWithSettings = Prisma.UserGetPayload<{
  include: {
    settings: {
      include: {
        baseCurrency: true
      }
    }
  }
}>

/** 分类查询包含父级和子级 */
export type CategoryWithRelations = Prisma.CategoryGetPayload<{
  include: {
    parent: true
    children: true
    accounts: true
    transactions: true
  }
}>

/** 分类查询仅包含基础关系 */
export type CategoryWithBasic = Prisma.CategoryGetPayload<{
  include: {
    parent: true
    children: {
      select: {
        id: true
        name: true
        type: true
      }
    }
    _count: {
      select: {
        accounts: true
        transactions: true
        children: true
      }
    }
  }
}>

/** 账户查询包含完整关系 */
export type AccountWithRelations = Prisma.AccountGetPayload<{
  include: {
    category: {
      include: {
        parent: true
      }
    }
    currency: true
    transactions: {
      include: {
        currency: true
        tags: {
          include: {
            tag: true
          }
        }
      }
    }
  }
}>

/** 账户查询包含基础信息 */
export type AccountWithBasic = Prisma.AccountGetPayload<{
  include: {
    category: {
      select: {
        id: true
        name: true
        type: true
      }
    }
    currency: true
    _count: {
      select: {
        transactions: true
      }
    }
  }
}>

/** 交易查询包含完整关系 */
export type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    account: {
      include: {
        category: true
      }
    }
    category: true
    currency: true
    tags: {
      include: {
        tag: true
      }
    }
  }
}>

/** 交易查询包含基础关系 */
export type TransactionWithBasic = Prisma.TransactionGetPayload<{
  include: {
    account: {
      select: {
        id: true
        name: true
        category: {
          select: {
            id: true
            name: true
            type: true
          }
        }
      }
    }
    currency: true
    tags: {
      include: {
        tag: {
          select: {
            id: true
            name: true
          }
        }
      }
    }
  }
}>

/** 序列化后的交易数据（用于客户端传递） */
export type SerializedTransactionWithBasic = Omit<
  TransactionWithBasic,
  'amount' | 'date' | 'createdAt' | 'updatedAt' | 'notes'
> & {
  amount: number
  date: string
  createdAt: string
  updatedAt: string
  notes?: string
}

/** 标签查询包含交易计数 */
export type TagWithCount = Prisma.TagGetPayload<{
  include: {
    _count: {
      select: {
        transactions: true
      }
    }
  }
}>

// ============================================================================
// 数据库查询选项类型
// ============================================================================

/** 分页查询选项 */
export interface DatabasePaginationOptions {
  skip?: number
  take?: number
}

/** 排序查询选项 */
export interface DatabaseSortOptions {
  orderBy?: Prisma.Enumerable<
    | Prisma.TransactionOrderByWithRelationInput
    | Prisma.AccountOrderByWithRelationInput
    | Prisma.CategoryOrderByWithRelationInput
  >
}

/** 筛选查询选项 */
export interface DatabaseFilterOptions {
  where?:
    | Prisma.TransactionWhereInput
    | Prisma.AccountWhereInput
    | Prisma.CategoryWhereInput
    | Prisma.TagWhereInput
}

/** 完整查询选项 */
export interface DatabaseQueryOptions
  extends DatabasePaginationOptions,
    DatabaseSortOptions,
    DatabaseFilterOptions {}

// ============================================================================
// 数据库操作结果类型
// ============================================================================

/** 创建操作结果 */
export interface CreateResult<T> {
  success: boolean
  data?: T
  error?: string
}

/** 更新操作结果 */
export interface UpdateResult<T> {
  success: boolean
  data?: T
  error?: string
  affected: number
}

/** 删除操作结果 */
export interface DeleteResult {
  success: boolean
  error?: string
  affected: number
}

/** 批量操作结果 */
export interface BatchResult<T> {
  success: boolean
  data?: T[]
  error?: string
  total: number
  affected: number
  failed: number
}

// ============================================================================
// 数据库事务类型
// ============================================================================

/** 事务上下文类型 */
export type TransactionContext = Prisma.TransactionClient

/** 事务操作函数类型 */
export type TransactionOperation<T> = (tx: TransactionContext) => Promise<T>

// ============================================================================
// 数据库连接和配置类型
// ============================================================================

/** 数据库连接状态 */
export type DatabaseConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error'

/** 数据库配置 */
export interface DatabaseConfig {
  url: string
  maxConnections?: number
  connectionTimeout?: number
  queryTimeout?: number
  logLevel?: 'info' | 'query' | 'warn' | 'error'
}

// ============================================================================
// 聚合查询类型
// ============================================================================

/** 账户余额聚合结果 */
export interface AccountBalanceAggregate {
  accountId: string
  currencyCode: string
  totalIncome: number
  totalExpense: number
  totalBalance: number
  transactionCount: number
  lastTransactionDate?: Date
}

/** 分类汇总聚合结果 */
export interface CategorySummaryAggregate {
  categoryId: string
  categoryName: string
  categoryType: AccountType
  accountCount: number
  transactionCount: number
  totalAmount: number
  currencyBreakdown: Array<{
    currencyCode: string
    amount: number
    transactionCount: number
  }>
}

/** 月度统计聚合结果 */
export interface MonthlyStatsAggregate {
  year: number
  month: number
  totalIncome: number
  totalExpense: number
  netAmount: number
  transactionCount: number
  currencyCode: string
}

// ============================================================================
// 数据验证类型
// ============================================================================

/** 数据验证规则 */
export interface DatabaseValidationRule {
  field: string
  type: 'required' | 'unique' | 'format' | 'range' | 'custom'
  message: string
  validator?: (value: unknown) => boolean
}

/** 数据验证结果 */
export interface DatabaseValidationResult {
  isValid: boolean
  errors: Array<{
    field: string
    message: string
  }>
}

// ============================================================================
// 数据库迁移类型
// ============================================================================

/** 迁移状态 */
export type MigrationStatus = 'pending' | 'applied' | 'failed' | 'rolled_back'

/** 迁移信息 */
export interface MigrationInfo {
  id: string
  name: string
  status: MigrationStatus
  appliedAt?: Date
  rolledBackAt?: Date
  checksum: string
}

// ============================================================================
// 数据库性能监控类型
// ============================================================================

/** 查询性能指标 */
export interface QueryPerformanceMetrics {
  query: string
  duration: number
  timestamp: Date
  rowsAffected?: number
  error?: string
}

/** 连接池指标 */
export interface ConnectionPoolMetrics {
  activeConnections: number
  idleConnections: number
  totalConnections: number
  maxConnections: number
  waitingRequests: number
}

// ============================================================================
// 工具类型
// ============================================================================

/** 从 Prisma 模型中提取字段类型 */
export type ExtractField<T, K extends keyof T> = T[K]

/** 创建部分更新类型 */
export type PartialUpdate<T> = Partial<
  Omit<T, 'id' | 'createdAt' | 'updatedAt'>
>

/** 创建必需字段类型 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
