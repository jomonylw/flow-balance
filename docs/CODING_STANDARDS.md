# 📋 Flow Balance 代码规范

## 🎯 总体原则

### 核心理念

1. **可读性优先** - 代码应该像文档一样易读
2. **一致性** - 整个项目保持统一的代码风格
3. **简洁性** - 避免过度复杂的抽象和设计
4. **类型安全** - 充分利用 TypeScript 的类型系统
5. **性能意识** - 编写高效的代码，避免不必要的重渲染

## 📁 文件和目录命名

### 文件命名规范

```bash
# 组件文件 - PascalCase
UserProfile.tsx
AccountSummaryCard.tsx

# 工具函数文件 - kebab-case
format-currency.ts
validate-email.ts

# 常量文件 - kebab-case
api-endpoints.ts
ui-constants.ts

# 类型定义文件 - kebab-case
user-types.ts
api-types.ts

# Hook 文件 - camelCase (以 use 开头)
useAccountData.ts
useResponsive.ts
```

### 目录命名规范

```bash
# 功能模块目录 - kebab-case
user-management/
account-settings/
transaction-history/

# 组件分类目录 - kebab-case
data-display/
form-controls/
navigation/
```

## 🏗️ 组件设计规范

### 组件文件结构

```typescript
// 1. 导入部分 - 按顺序分组
import React from 'react'
import { useState, useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import { useAccountData } from '@/hooks/api/useAccountData'
import { formatCurrency } from '@/lib/utils/format'

import type { Account } from '@/types/database/account'

// 2. 类型定义
interface AccountCardProps {
  account: Account
  onEdit?: (account: Account) => void
  className?: string
}

// 3. 组件实现
export default function AccountCard({
  account,
  onEdit,
  className = ''
}: AccountCardProps) {
  // 组件逻辑
  return (
    // JSX
  )
}

// 4. 默认导出（如果需要）
export { AccountCard }
```

### 组件命名规范

```typescript
// ✅ 好的组件命名
function UserProfileCard() {}
function TransactionListItem() {}
function CurrencySelector() {}

// ❌ 避免的命名
function Card() {} // 太通用
function Component() {} // 无意义
function Thing() {} // 不明确
```

### Props 接口设计

```typescript
// ✅ 好的 Props 设计
interface UserCardProps {
  user: User
  showAvatar?: boolean
  onEdit?: (user: User) => void
  className?: string
  'data-testid'?: string
}

// ❌ 避免的 Props 设计
interface UserCardProps {
  data: any // 使用 any 类型
  config: object // 过于通用
  options: {} // 空对象类型
}
```

## 🔧 TypeScript 使用规范

### 类型定义

```typescript
// ✅ 明确的类型定义
interface User {
  id: string
  name: string
  email: string
  createdAt: Date
  settings?: UserSettings
}

type UserRole = 'admin' | 'user' | 'guest'

// ✅ 泛型使用
interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

// ❌ 避免使用 any
interface BadUser {
  id: any
  data: any
}
```

### 函数类型注解

```typescript
// ✅ 明确的函数类型
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
  }).format(amount)
}

// ✅ 异步函数
async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const response = await api.get(`/users/${userId}`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return null
  }
}
```

## 🎨 React 最佳实践

### Hooks 使用规范

```typescript
// ✅ 自定义 Hook 命名和结构
function useAccountData(accountId: string) {
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 数据获取逻辑
  }, [accountId])

  return { account, loading, error, refetch }
}

// ✅ Hook 依赖数组
useEffect(() => {
  fetchData()
}, [accountId, currency]) // 明确列出所有依赖

// ❌ 避免空依赖数组（除非确实只需要运行一次）
useEffect(() => {
  fetchData() // 如果 fetchData 依赖外部变量，这可能导致问题
}, [])
```

### 状态管理

```typescript
// ✅ 使用 reducer 管理复杂状态
interface TransactionState {
  transactions: Transaction[]
  loading: boolean
  error: string | null
  filters: TransactionFilters
}

function transactionReducer(state: TransactionState, action: TransactionAction): TransactionState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null }
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        transactions: action.payload,
      }
    default:
      return state
  }
}
```

### 组件优化

```typescript
// ✅ 使用 memo 优化组件
const TransactionItem = React.memo(function TransactionItem({
  transaction
}: TransactionItemProps) {
  return (
    <div>{transaction.description}</div>
  )
})

// ✅ 使用 useMemo 优化计算
function AccountSummary({ transactions }: AccountSummaryProps) {
  const totalAmount = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.amount, 0)
  }, [transactions])

  return <div>Total: {totalAmount}</div>
}

// ✅ 使用 useCallback 优化函数
function TransactionList({ onTransactionSelect }: TransactionListProps) {
  const handleSelect = useCallback((transaction: Transaction) => {
    onTransactionSelect?.(transaction)
  }, [onTransactionSelect])

  return (
    // 渲染逻辑
  )
}
```

## 🔄 API 和数据处理

### API 调用规范

```typescript
// ✅ 统一的 API 客户端
class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      throw new ApiError('Failed to fetch data', error)
    }
  }
}

// ✅ 错误处理
class ApiError extends Error {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
```

### 数据验证

```typescript
// ✅ 使用 Zod 进行运行时验证
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150),
})

type User = z.infer<typeof UserSchema>

function validateUser(data: unknown): User {
  return UserSchema.parse(data)
}
```

## 🎨 样式和UI规范

### CSS 类命名

```css
/* ✅ BEM 命名规范 */
.account-card {}
.account-card__header {}
.account-card__title {}
.account-card__amount {}
.account-card--highlighted {}

/* ✅ Tailwind 类使用 */
<div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
```

### 响应式设计

```typescript
// ✅ 使用自定义 Hook 处理响应式
function useResponsive() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)

    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return { isMobile }
}
```

## 🧪 测试规范

### 测试文件命名

```bash
# 组件测试
UserProfile.test.tsx
AccountCard.spec.tsx

# 工具函数测试
format-currency.test.ts
validate-email.test.ts

# Hook 测试
useAccountData.test.ts
```

### 测试结构

```typescript
// ✅ 测试组织结构
describe('UserProfile', () => {
  describe('rendering', () => {
    it('should display user name', () => {
      // 测试逻辑
    })

    it('should show avatar when provided', () => {
      // 测试逻辑
    })
  })

  describe('interactions', () => {
    it('should call onEdit when edit button is clicked', () => {
      // 测试逻辑
    })
  })

  describe('edge cases', () => {
    it('should handle missing user data gracefully', () => {
      // 测试逻辑
    })
  })
})
```

## 📝 注释和文档

### 代码注释

```typescript
/**
 * 格式化货币金额显示
 * @param amount - 金额数值
 * @param currency - 货币代码 (如 'CNY', 'USD')
 * @param locale - 本地化设置，默认为 'zh-CN'
 * @returns 格式化后的货币字符串
 *
 * @example
 * formatCurrency(1234.56, 'CNY') // '¥1,234.56'
 * formatCurrency(1234.56, 'USD', 'en-US') // '$1,234.56'
 */
function formatCurrency(amount: number, currency: string, locale: string = 'zh-CN'): string {
  // 实现逻辑
}

// ✅ 复杂逻辑注释
function calculateCompoundInterest(principal: number, rate: number, time: number) {
  // 使用复利公式: A = P(1 + r)^t
  // 其中 A = 最终金额, P = 本金, r = 利率, t = 时间
  return principal * Math.pow(1 + rate, time)
}
```

### JSDoc 注释

````typescript
/**
 * 账户卡片组件
 *
 * 用于显示账户基本信息，包括账户名称、余额和货币类型
 * 支持编辑和删除操作
 *
 * @component
 * @example
 * ```tsx
 * <AccountCard
 *   account={account}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
interface AccountCardProps {
  /** 账户数据 */
  account: Account
  /** 编辑回调函数 */
  onEdit?: (account: Account) => void
  /** 删除回调函数 */
  onDelete?: (accountId: string) => void
  /** 自定义样式类名 */
  className?: string
}
````

## 🚀 性能优化指南

### 避免不必要的重渲染

```typescript
// ✅ 使用 React.memo
const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }) {
  return <div>{/* 复杂的渲染逻辑 */}</div>
})

// ✅ 优化 Context 使用
const UserContext = createContext<UserContextValue | null>(null)

function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // 使用 useMemo 避免每次渲染都创建新对象
  const value = useMemo(() => ({
    user,
    setUser
  }), [user])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}
```

### 代码分割

```typescript
// ✅ 动态导入
const LazyReportPage = lazy(() => import('@/components/reports/ReportPage'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyReportPage />
    </Suspense>
  )
}
```

## 🔒 安全最佳实践

### 输入验证

```typescript
// ✅ 服务端验证
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // 验证输入数据
    const validatedData = TransactionSchema.parse(body)

    // 处理业务逻辑
    const result = await createTransaction(validatedData)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid input data' }, { status: 400 })
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
```

### 敏感数据处理

```typescript
// ✅ 避免在客户端暴露敏感信息
interface PublicUser {
  id: string
  name: string
  email: string
  // 不包含密码、令牌等敏感信息
}

function sanitizeUser(user: User): PublicUser {
  const { password, refreshToken, ...publicUser } = user
  return publicUser
}
```

## 📋 代码审查清单

### 提交前检查

- [ ] 代码通过 ESLint 检查
- [ ] 代码通过 TypeScript 类型检查
- [ ] 所有测试通过
- [ ] 代码格式化正确
- [ ] 没有 console.log 或调试代码
- [ ] 添加了必要的注释和文档
- [ ] 性能影响已评估
- [ ] 安全性已考虑

### 代码审查要点

- [ ] 代码逻辑正确
- [ ] 错误处理完善
- [ ] 边界情况已考虑
- [ ] 代码可读性良好
- [ ] 遵循项目规范
- [ ] 没有重复代码
- [ ] 组件职责单一
- [ ] API 设计合理
