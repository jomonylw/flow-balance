/**
 * Zod 验证 Schema 定义
 * 提供运行时类型验证和数据校验
 */

import { z } from 'zod'
import { ConstantsManager } from '@/lib/utils/constants-manager'
import { SortOrder } from '@/types/core/constants'
// 核心类型从 @/types/core 导入，在此文件中不直接使用但保持导入以供其他文件引用
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { UserSettings, Currency, Tag } from '@/types/core'

// ============================================================================
// 基础验证 Schema
// ============================================================================

// CUID 验证函数 - 用于验证 Prisma 生成的 CUID 格式 ID
const cuidSchema = () =>
  z
    .string()
    .min(1)
    .regex(/^c[a-z0-9]{24}$/, 'Invalid CUID format')

/** 用户设置验证 Schema */
export const UserSettingsSchema = z.object({
  baseCurrencyCode: z.string().min(3).max(3).optional(),
  language: z.enum(ConstantsManager.getZodLanguageEnum()).optional(),
  theme: z.enum(ConstantsManager.getZodThemeEnum()).optional(),
})

/** 货币验证 Schema */
export const CurrencySchema = z.object({
  code: z.string().min(3).max(3),
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(10),
  isActive: z.boolean().default(true),
})

/** 标签验证 Schema */
export const TagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
})

// ============================================================================
// 分类和账户验证 Schema
// ============================================================================

/** 分类创建验证 Schema */
export const CategoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ConstantsManager.getZodAccountTypeEnum()).optional(),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  description: z.string().max(500).optional(),
  parentId: z.string().min(1).nullable().optional(),
  order: z.number().int().min(0).optional(),
})

/** 分类更新验证 Schema */
export const CategoryUpdateSchema = CategoryCreateSchema.partial()

/** 账户创建验证 Schema */
export const AccountCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  currencyCode: z.string().min(3).max(3),
  categoryId: cuidSchema(),
})

/** 账户更新验证 Schema */
export const AccountUpdateSchema = AccountCreateSchema.partial()

// ============================================================================
// 交易验证 Schema
// ============================================================================

/** 交易创建验证 Schema */
export const TransactionCreateSchema = z.object({
  accountId: cuidSchema(),
  currencyCode: z.string().min(3).max(3),
  type: z.enum(ConstantsManager.getZodTransactionTypeEnum()),
  amount: z.number().positive(),
  description: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
  date: z.string().datetime().or(z.date()),
  tagIds: z.array(cuidSchema()).optional(),
})

/** 交易更新验证 Schema */
export const TransactionUpdateSchema = TransactionCreateSchema.partial()

/** 交易查询参数验证 Schema */
export const TransactionQuerySchema = z.object({
  accountId: cuidSchema().optional(),
  categoryId: cuidSchema().optional(),
  type: z.enum(ConstantsManager.getZodTransactionTypeEnum()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  tagIds: z.array(cuidSchema()).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z
    .enum(ConstantsManager.getZodSortOrderEnum())
    .default(SortOrder.DESC),
})

// ============================================================================
// 汇率验证 Schema
// ============================================================================

/** 汇率创建验证 Schema */
export const ExchangeRateCreateSchema = z.object({
  fromCurrency: z.string().min(3).max(3),
  toCurrency: z.string().min(3).max(3),
  rate: z.number().positive(),
  date: z.string().datetime().or(z.date()),
})

/** 汇率更新验证 Schema */
export const ExchangeRateUpdateSchema = ExchangeRateCreateSchema.partial()

// ============================================================================
// API 请求验证 Schema
// ============================================================================

/** 分页参数验证 Schema */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().optional(),
})

/** 排序参数验证 Schema */
export const SortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z
    .enum(ConstantsManager.getZodSortOrderEnum())
    .default(SortOrder.DESC),
})

/** 筛选参数验证 Schema */
export const FilterSchema = z.object({
  search: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

/** 完整查询参数验证 Schema */
export const QueryParamsSchema =
  PaginationSchema.merge(SortSchema).merge(FilterSchema)

// ============================================================================
// 表单验证 Schema
// ============================================================================

/** 登录表单验证 Schema */
export const LoginFormSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
})

/** 注册表单验证 Schema */
export const RegisterFormSchema = z
  .object({
    email: z.string().email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码至少需要6个字符'),
    confirmPassword: z.string().min(6, '确认密码至少需要6个字符'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  })

/** 密码重置表单验证 Schema */
export const ResetPasswordFormSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
})

/** 新密码设置表单验证 Schema */
export const NewPasswordFormSchema = z
  .object({
    password: z.string().min(6, '密码至少需要6个字符'),
    confirmPassword: z.string().min(6, '确认密码至少需要6个字符'),
    token: z.string().min(1, '重置令牌不能为空'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  })

// ============================================================================
// 数据导入/导出验证 Schema
// ============================================================================

/** CSV 导入验证 Schema */
export const CSVImportSchema = z.object({
  file: typeof File !== 'undefined' ? z.instanceof(File) : z.any(),
  mapping: z.record(z.string()),
  options: z
    .object({
      skipFirstRow: z.boolean().default(true),
      dateFormat: z.string().default('YYYY-MM-DD'),
      encoding: z.string().default('utf-8'),
    })
    .optional(),
})

/** 数据导出选项验证 Schema */
export const ExportOptionsSchema = z.object({
  format: z.enum(ConstantsManager.getZodExportFormatEnum()),
  dateRange: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
  includeCategories: z.array(cuidSchema()).optional(),
  includeAccounts: z.array(cuidSchema()).optional(),
})

// ============================================================================
// 工具函数
// ============================================================================

/** 验证数据并返回结果 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        err => `${err.path.join('.')}: ${err.message}`
      )
      return { success: false, errors }
    }
    return { success: false, errors: ['验证失败'] }
  }
}

/** 安全解析数据（不抛出异常） */
export function safeParseData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  return schema.safeParse(data)
}

/** 创建 API 验证中间件 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    const result = validateData(schema, data)
    if (!result.success) {
      throw new Error(`验证失败: ${result.errors.join(', ')}`)
    }
    return result.data
  }
}

// ============================================================================
// 类型导出
// ============================================================================

// 从 Schema 推断类型
// UserSettings, Currency, Tag 类型已从 @/types/core 导入
export type CategoryCreate = z.infer<typeof CategoryCreateSchema>
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>
export type AccountCreate = z.infer<typeof AccountCreateSchema>
export type AccountUpdate = z.infer<typeof AccountUpdateSchema>
export type TransactionCreate = z.infer<typeof TransactionCreateSchema>
export type TransactionUpdate = z.infer<typeof TransactionUpdateSchema>
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>
export type ExchangeRateCreate = z.infer<typeof ExchangeRateCreateSchema>
export type ExchangeRateUpdate = z.infer<typeof ExchangeRateUpdateSchema>
export type LoginForm = z.infer<typeof LoginFormSchema>
export type RegisterForm = z.infer<typeof RegisterFormSchema>
export type ResetPasswordForm = z.infer<typeof ResetPasswordFormSchema>
export type NewPasswordForm = z.infer<typeof NewPasswordFormSchema>
export type CSVImport = z.infer<typeof CSVImportSchema>
export type ExportOptions = z.infer<typeof ExportOptionsSchema>
