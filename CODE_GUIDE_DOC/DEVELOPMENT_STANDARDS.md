# 📋 Flow Balance 开发规范与质量保证指南

## 🎯 项目概述

Flow Balance 是一个基于 Next.js + Prisma 的个人财务管理应用，采用 App
Router、服务端组件和客户端组件的现代架构。

### 核心技术栈

- **前端**: Next.js 15.3.3, React 19, TypeScript 5
- **样式**: Tailwind CSS 4
- **数据库**: Prisma + SQLite
- **图表**: ECharts 5.6.0
- **包管理**: pnpm (首选)
- **测试**: Jest + Testing Library
- **代码质量**: ESLint + Prettier + Husky

## 🛠️ 开发环境配置

### 必需工具

```bash
# Node.js 版本要求
node >= 18.0.0

# 包管理器
pnpm >= 8.0.0

# 数据库工具
prisma >= 6.9.0
```

### 环境变量配置

```bash
# 复制环境变量模板
cp .env.example .env.local

# 必需的环境变量
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## 📁 项目结构规范

### 目录命名规范

```
src/
├── app/                    # Next.js App Router 页面
├── components/             # 组件目录
│   ├── ui/                # 基础 UI 组件 (kebab-case)
│   ├── features/          # 功能组件 (kebab-case)
│   └── layout/            # 布局组件
├── lib/                   # 工具库
│   ├── utils/             # 工具函数 (kebab-case)
│   ├── services/          # 业务服务 (kebab-case)
│   ├── api/               # API 客户端
│   └── database/          # 数据库相关
├── types/                 # TypeScript 类型定义
├── hooks/                 # 自定义 Hooks (camelCase)
├── contexts/              # React Context
└── styles/                # 全局样式
```

### 文件命名规范

```bash
# 组件文件 - PascalCase
UserProfile.tsx
AccountSummaryCard.tsx

# 工具函数文件 - kebab-case
format-currency.ts
validate-email.ts

# Hook 文件 - camelCase (以 use 开头)
useAccountData.ts
useResponsive.ts

# 类型定义文件 - kebab-case
user-types.ts
api-types.ts
```

## 🔧 代码质量工具配置

### ESLint 配置

项目使用严格的 ESLint 规则确保代码质量：

```javascript
// eslint.config.mjs - 主要规则
{
  '@typescript-eslint/no-unused-vars': 'error',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-non-null-assertion': 'warn',
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'max-len': ['warn', { code: 100 }],
  'react-hooks/exhaustive-deps': 'warn'
}
```

### Prettier 配置

统一的代码格式化规则：

```javascript
// .prettierrc.js
{
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  printWidth: 80,
  jsxSingleQuote: true,
  arrowParens: 'avoid'
}
```

### TypeScript 配置

严格的类型检查配置：

```json
// tsconfig.json - 关键配置
{
  "strict": true,
  "noImplicitAny": true,
  "noImplicitReturns": true,
  "noImplicitThis": true,
  "noImplicitOverride": true
}
```

## 🚀 开发工作流

### 1. 开发前准备

```bash
# 安装依赖
pnpm install

# 生成 Prisma 客户端
pnpm db:generate

# 运行数据库迁移
pnpm db:migrate

# 启动开发服务器
pnpm dev
```

### 2. 代码检查命令

```bash
# 基础检查
pnpm lint                    # ESLint 检查
pnpm type-check             # TypeScript 类型检查
pnpm format:check           # Prettier 格式检查

# 详细检查
pnpm type-check:detailed    # 详细类型检查报告
pnpm type-check:strict      # 严格模式类型检查

# 自动修复
pnpm lint:fix               # 自动修复 ESLint 错误
pnpm format                 # 自动格式化代码
```

### 3. 测试命令

```bash
# 运行测试
pnpm test                   # 运行所有测试
pnpm test:watch            # 监听模式运行测试
pnpm test:coverage         # 生成覆盖率报告
pnpm test:ci               # CI 环境测试
```

### 4. 数据库操作

```bash
# 数据库管理
pnpm db:studio             # 打开 Prisma Studio
pnpm db:seed               # 运行种子数据
pnpm db:reset              # 重置数据库
```

### 5. 构建和部署

```bash
# 构建项目
pnpm build                 # 生产构建
pnpm analyze               # 构建分析
pnpm start                 # 启动生产服务器

# 清理
pnpm clean                 # 清理构建文件
```

## 🔄 Git 工作流

### Pre-commit 自动化

项目配置了 Husky + lint-staged 自动化检查：

```javascript
// .lintstagedrc.js
{
  '*.{ts,tsx,js,jsx}': ['eslint --fix --max-warnings=1000', 'prettier --write'],
  '*.json': ['prettier --write'],
  '*.{css,scss,sass,less}': ['prettier --write'],
  '*.md': ['prettier --write']
}
```

### 提交前检查清单

- [ ] 代码通过 ESLint 检查 (`pnpm lint`)
- [ ] 代码通过 TypeScript 类型检查 (`pnpm type-check`)
- [ ] 所有测试通过 (`pnpm test`)
- [ ] 代码格式化正确 (`pnpm format:check`)
- [ ] 没有 console.log 或调试代码
- [ ] 添加了必要的注释和文档

## 🧪 测试规范

### 测试文件组织

```bash
# 测试文件命名
UserProfile.test.tsx        # 组件测试
format-currency.test.ts     # 工具函数测试
useAccountData.test.ts      # Hook 测试

# 测试目录结构
__tests__/
├── components/             # 组件测试
├── lib/                   # 工具函数测试
└── api/                   # API 测试
```

### 测试覆盖率要求

```javascript
// jest.config.js - 覆盖率阈值
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

## 📝 代码规范

### 组件设计原则

1. **单一职责**: 每个组件只负责一个功能
2. **Props 类型安全**: 使用 TypeScript 接口定义 Props
3. **性能优化**: 合理使用 React.memo, useMemo, useCallback
4. **错误边界**: 重要组件添加错误处理

### TypeScript 使用规范

```typescript
// ✅ 好的类型定义
interface User {
  id: string
  name: string
  email: string
  createdAt: Date
  settings?: UserSettings
}

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

### 命名规范

```typescript
// 组件命名 - PascalCase
function UserProfileCard() {}

// 函数命名 - camelCase
function formatCurrency() {}

// 常量命名 - UPPER_SNAKE_CASE
const API_ENDPOINTS = {}

// 类型命名 - PascalCase
type UserRole = 'admin' | 'user'
```

## 🎨 UI/UX 规范

### 样式规范

- 使用 Tailwind CSS 进行样式开发
- 响应式设计优先 (移动端 + PC 端)
- 支持深色/浅色主题切换
- 使用语义化的 CSS 类名

### 组件库使用

- 基础 UI 组件统一放在 `src/components/ui/`
- 功能组件放在 `src/components/features/`
- 布局组件放在 `src/components/layout/`

## 🔒 安全最佳实践

### 输入验证

```typescript
// 使用 Zod 进行运行时验证
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
})

type User = z.infer<typeof UserSchema>
```

### API 安全

- 服务端验证所有输入数据
- 使用 TypeScript 确保类型安全
- 避免在客户端暴露敏感信息

## 📊 性能优化

### 代码分割

```typescript
// 动态导入
const LazyComponent = lazy(() => import('@/components/LazyComponent'))

// 使用 Suspense
<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
```

### 组件优化

```typescript
// 使用 React.memo
const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }) {
  return <div>{/* 复杂渲染逻辑 */}</div>
})

// 使用 useMemo 优化计算
const totalAmount = useMemo(() => {
  return transactions.reduce((sum, t) => sum + t.amount, 0)
}, [transactions])
```

## 🐛 调试和故障排除

### 常用调试命令

```bash
# 类型检查问题
pnpm type-check:detailed

# ESLint 问题批量修复
node scripts/smart-lint-fix.js

# 数据库问题调试
pnpm db:studio

# 构建问题分析
pnpm analyze
```

### 常见问题解决

1. **TypeScript 错误**: 检查类型定义和导入路径
2. **ESLint 错误**: 使用自动修复脚本或手动修复
3. **构建失败**: 检查依赖版本和配置文件
4. **测试失败**: 检查模拟数据和测试环境配置

## 📚 文档和注释

### JSDoc 注释规范

```typescript
/**
 * 格式化货币金额显示
 * @param amount - 金额数值
 * @param currency - 货币代码 (如 'CNY', 'USD')
 * @returns 格式化后的货币字符串
 * @example
 * formatCurrency(1234.56, 'CNY') // '¥1,234.56'
 */
function formatCurrency(amount: number, currency: string): string {
  // 实现逻辑
}
```

### README 维护

- 保持 README.md 更新
- 记录重要的配置变更
- 添加新功能的使用说明

## 🚨 错误处理和日志规范

### 错误处理最佳实践

```typescript
// ✅ API 错误处理
async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const response = await api.get(`/users/${userId}`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch user:', error)
    // 不要抛出原始错误，包装后再抛出
    throw new Error('用户数据获取失败')
  }
}

// ✅ 组件错误边界
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
```

### 日志规范

```typescript
// ✅ 允许的日志类型
console.warn('警告信息') // 警告
console.error('错误信息') // 错误

// ❌ 避免在生产代码中使用
console.log('调试信息') // 仅用于开发调试
console.debug('调试信息') // 仅用于开发调试
```

## 📦 依赖管理规范

### 包管理器使用

```bash
# 首选 pnpm
pnpm install package-name
pnpm remove package-name
pnpm update package-name

# 避免混用包管理器
# ❌ 不要在同一项目中混用 npm/yarn/pnpm
```

### 依赖版本管理

```json
// package.json - 版本策略
{
  "dependencies": {
    "react": "^19.0.0", // 主要依赖使用 ^
    "next": "15.3.3" // 框架版本锁定
  },
  "devDependencies": {
    "typescript": "^5", // 开发工具使用 ^
    "@types/node": "^20" // 类型定义使用 ^
  }
}
```

### 依赖安全检查

```bash
# 定期检查依赖安全性
pnpm audit
pnpm audit --fix

# 检查过期依赖
pnpm outdated
```

## 🔍 代码审查清单

### 提交前自检

- [ ] **功能完整性**: 功能按需求正确实现
- [ ] **代码质量**: 通过所有 lint 检查
- [ ] **类型安全**: 无 TypeScript 错误
- [ ] **测试覆盖**: 新功能有对应测试
- [ ] **性能考虑**: 无明显性能问题
- [ ] **安全性**: 无安全漏洞
- [ ] **文档更新**: 相关文档已更新

### 代码审查要点

- [ ] **逻辑正确性**: 业务逻辑实现正确
- [ ] **边界条件**: 处理了各种边界情况
- [ ] **错误处理**: 有完善的错误处理机制
- [ ] **代码复用**: 避免重复代码
- [ ] **命名规范**: 变量和函数命名清晰
- [ ] **注释质量**: 复杂逻辑有清晰注释
- [ ] **架构一致**: 符合项目架构规范

## 🎯 业务逻辑规范

### 财务数据处理

```typescript
// ✅ 金额计算使用精确数值
import { Decimal } from 'decimal.js'

function calculateTotal(amounts: number[]): number {
  return amounts
    .map(amount => new Decimal(amount))
    .reduce((sum, amount) => sum.plus(amount), new Decimal(0))
    .toNumber()
}

// ✅ 货币格式化
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
```

### 账户类型区分

```typescript
// 项目核心概念：区分存量账户和流量账户
type AccountType = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'

// 存量账户 (Stock-type): 资产、负债
const STOCK_ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY']

// 流量账户 (Flow-type): 收入、支出
const FLOW_ACCOUNT_TYPES: AccountType[] = ['INCOME', 'EXPENSE']

// ✅ 根据账户类型使用不同的组件
function getAccountComponent(accountType: AccountType) {
  if (STOCK_ACCOUNT_TYPES.includes(accountType)) {
    return StockAccountComponent
  }
  return FlowAccountComponent
}
```

## 🌐 国际化 (i18n) 规范

### 文本国际化

```typescript
// ✅ 使用国际化键值
const t = useTranslation()

// 组件中使用
<h1>{t('dashboard.title')}</h1>
<p>{t('account.balance', { amount: formatCurrency(balance) })}</p>

// ❌ 避免硬编码文本
<h1>仪表板</h1>  // 不要硬编码中文
<h1>Dashboard</h1>  // 不要硬编码英文
```

### 日期和数字格式化

```typescript
// ✅ 使用通用格式
const formatDate = (date: Date) => {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// ✅ 图表中使用通用格式
const chartOptions = {
  xAxis: {
    axisLabel: {
      formatter: (value: string) => {
        // 使用 YYYY/MM 格式，避免语言特定格式
        return dayjs(value).format('YYYY/MM')
      },
    },
  },
}
```

## 🔄 Context 管理规范

### Context 架构设计

项目采用分层 Context 架构，避免单一巨型 Context：

```typescript
// ✅ 分层 Context 设计
AuthContext          // 用户认证状态
├── UserDataContext  // 用户数据（账户、分类、标签等）
├── BalanceContext   // 账户余额和汇总数据
├── ThemeContext     // 主题设置
├── LanguageContext  // 语言设置
└── ToastContext     // 通知消息
```

### Context 使用规范

```typescript
// ✅ Context Provider 组合
function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <UserDataProvider>
              <BalanceProvider>
                {children}
              </BalanceProvider>
            </UserDataProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

// ✅ Context Hook 使用
function MyComponent() {
  const { user, isAuthenticated } = useAuth()
  const { accounts, categories } = useUserData()
  const { formatCurrency } = useUserCurrencyFormatter()
  const { showSuccess, showError } = useToast()

  // 组件逻辑
}
```

### Context 性能优化

```typescript
// ✅ 使用 useMemo 优化 Context 值
const contextValue = useMemo(
  () => ({
    ...userData,
    refreshAll,
    updateAccount,
    // 其他方法
  }),
  [userData, refreshAll, updateAccount] // 依赖数组
)

// ✅ 避免在 Context 中存储频繁变化的状态
// ❌ 不要在 UserDataContext 中存储 loading 状态
// ✅ 使用局部状态或专门的 Context
```

## 🎨 主题和样式规范

### 深色主题支持

```css
/* ✅ 使用 Tailwind 深色主题类 */
.card {
  @apply bg-white dark:bg-gray-800;
  @apply text-gray-900 dark:text-gray-100;
  @apply border-gray-200 dark:border-gray-700;
}
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

// 组件中使用
function MyComponent() {
  const { isMobile } = useResponsive()

  return (
    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {/* 内容 */}
    </div>
  )
}
```

## � Context 管理规范

### Context 架构设计

项目采用分层 Context 架构，避免单一巨型 Context：

```typescript
// ✅ 分层 Context 设计
AuthContext          // 用户认证状态
├── UserDataContext  // 用户数据（账户、分类、标签等）
├── BalanceContext   // 账户余额和汇总数据
├── ThemeContext     // 主题设置
├── LanguageContext  // 语言设置
└── ToastContext     // 通知消息
```

### Context 使用规范

```typescript
// ✅ Context Provider 组合
function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <UserDataProvider>
              <BalanceProvider>
                {children}
              </BalanceProvider>
            </UserDataProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

// ✅ Context Hook 使用
function MyComponent() {
  const { user, isAuthenticated } = useAuth()
  const { accounts, categories } = useUserData()
  const { formatCurrency } = useUserCurrencyFormatter()
  const { showSuccess, showError } = useToast()

  // 组件逻辑
}
```

### Context 性能优化

```typescript
// ✅ 使用 useMemo 优化 Context 值
const contextValue = useMemo(
  () => ({
    ...userData,
    refreshAll,
    updateAccount,
    // 其他方法
  }),
  [userData, refreshAll, updateAccount] // 依赖数组
)

// ✅ 避免在 Context 中存储频繁变化的状态
// ❌ 不要在 UserDataContext 中存储 loading 状态
// ✅ 使用局部状态或专门的 Context
```

## 🔧 统一处理机制规范

### 货币转换和格式化

**核心原则**：所有货币相关操作必须使用统一的 Hook 和服务

```typescript
// ✅ 统一的货币格式化 Hook
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'

function MyComponent() {
  const { formatCurrency, formatNumber, getCurrencySymbol } = useUserCurrencyFormatter()

  // 自动使用用户语言设置和货币配置
  const formattedAmount = formatCurrency(1234.56, 'CNY')
  // 输出: ¥1,234.56 (根据用户语言设置)
}

// ❌ 避免硬编码格式化
const hardcoded = `¥${amount.toLocaleString('zh-CN')}`

// ❌ 避免重复的货币符号映射
const symbols = { CNY: '¥', USD: '$' } // 不要在组件中重复定义
```

### 颜色管理系统

**核心原则**：使用统一的颜色管理服务，避免重复的颜色逻辑

```typescript
// ✅ 统一的颜色管理
import { ColorManager } from '@/lib/utils/color'

// 获取账户颜色（优先自定义 → 类型默认 → 通用默认）
const accountColor = ColorManager.getAccountColor(accountId, customColor, accountType)

// 生成图表颜色序列
const chartColors = ColorManager.generateSmartChartColors(items, item => item.customColor)

// ❌ 避免在组件中重复颜色逻辑
const getColor = type => {
  switch (type) {
    case 'ASSET':
      return '#3b82f6'
    // 不要重复定义
  }
}
```

### API 调用模式

**核心原则**：使用统一的 API 调用模式和错误处理

```typescript
// ✅ 统一的 API 调用模式
async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || '请求失败')
    }

    return { success: true, data: result.data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

// ✅ 在组件中使用
const { showSuccess, showError } = useToast()

const handleSubmit = async () => {
  const result = await apiCall('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(formData),
  })

  if (result.success) {
    showSuccess('创建成功')
  } else {
    showError('创建失败', result.error)
  }
}
```

### 表单验证模式

**核心原则**：使用 Zod Schema 进行统一验证

```typescript
// ✅ 统一的表单验证
import { z } from 'zod'
import { validateData } from '@/lib/validation/schemas'

const AccountSchema = z.object({
  name: z.string().min(1, '账户名称不能为空'),
  type: z.enum(['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE']),
  currencyCode: z.string().length(3, '货币代码必须为3位'),
})

function AccountForm() {
  const handleSubmit = (formData: unknown) => {
    const validation = validateData(AccountSchema, formData)

    if (!validation.success) {
      setErrors(validation.errors)
      return
    }

    // 处理验证通过的数据
    processAccount(validation.data)
  }
}
```

### 模态框处理模式

**核心原则**：使用统一的模态框组件和状态管理

```typescript
// ✅ 统一的模态框使用
import Modal from '@/components/ui/feedback/Modal'
import { useToast } from '@/contexts/providers/ToastContext'

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { showSuccess, showError } = useToast()

  const handleSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const result = await apiCall('/api/endpoint', {
        method: 'POST',
        body: JSON.stringify(data)
      })

      if (result.success) {
        setIsModalOpen(false)
        showSuccess('操作成功')
        // 刷新数据
        refreshData()
      } else {
        showError('操作失败', result.error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title="标题"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        {/* 表单内容 */}
        <button type="submit" disabled={isLoading}>
          {isLoading ? '处理中...' : '提交'}
        </button>
      </form>
    </Modal>
  )
}
```

### 加载状态管理

**核心原则**：使用统一的加载状态组件和模式

```typescript
// ✅ 统一的加载状态
import LoadingScreen from '@/components/ui/feedback/LoadingScreen'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'

// 全屏加载
function PageComponent() {
  const [isLoading, setIsLoading] = useState(true)

  if (isLoading) {
    return <LoadingScreen messageType="loading-data" variant="pulse" />
  }

  return <div>{/* 页面内容 */}</div>
}

// 局部加载
function ComponentWithLoading() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <button disabled={isSubmitting}>
      {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
      {isSubmitting ? '提交中...' : '提交'}
    </button>
  )
}
```

## 🔧 自动化脚本使用

### 批量修复脚本

```bash
# 智能修复 lint 错误
node scripts/smart-lint-fix.js

# 批量修复特定类型错误
node scripts/targeted-fix.js

# 类型系统分析
node scripts/analyze-type-usage.js

# 重构进度跟踪
node scripts/track-refactor-progress.js
```

### 数据库维护脚本

```bash
# 添加示例汇率数据
node scripts/add-sample-exchange-rates.js

# 检查数据库数据完整性
tsx scripts/check-database-data.ts

# 迁移账户货币设置
node scripts/migrate-account-currencies.js
```

## 🚨 避免重复代码的关键原则

### 识别重复代码的信号

```typescript
// 🚨 重复代码信号
// 1. 相同的货币符号映射
const currencySymbols = { CNY: '¥', USD: '$' } // 在多个文件中出现

// 2. 相同的颜色定义
const accountColors = { ASSET: '#3b82f6', LIABILITY: '#f97316' } // 重复定义

// 3. 相同的 API 调用模式
const response = await fetch('/api/...') // 重复的错误处理逻辑

// 4. 相同的表单验证逻辑
if (!name) setError('名称不能为空') // 重复的验证规则
```

### 重构策略

```typescript
// ✅ 提取为共享服务
// 创建 src/lib/services/shared-service.ts
export class SharedService {
  static formatCurrency = useUserCurrencyFormatter
  static getAccountColor = ColorManager.getAccountColor
  static validateForm = validateData
}

// ✅ 提取为自定义 Hook
// 创建 src/hooks/useCommonLogic.ts
export function useCommonLogic() {
  const { formatCurrency } = useUserCurrencyFormatter()
  const { showSuccess, showError } = useToast()

  return { formatCurrency, showSuccess, showError }
}

// ✅ 提取为工具函数
// 创建 src/lib/utils/common.ts
export const commonUtils = {
  formatDate: (date: Date) => date.toLocaleDateString(),
  generateId: () => Math.random().toString(36).substr(2, 9),
  debounce: (fn: Function, delay: number) => {
    /* 实现 */
  },
}
```

### 代码审查检查清单

**提交前必检项目**：

- [ ] **货币格式化**：是否使用 `useUserCurrencyFormatter`？
- [ ] **颜色管理**：是否使用 `ColorManager`？
- [ ] **API 调用**：是否使用统一的错误处理？
- [ ] **表单验证**：是否使用 Zod Schema？
- [ ] **模态框**：是否使用统一的 Modal 组件？
- [ ] **加载状态**：是否使用统一的 Loading 组件？
- [ ] **国际化**：是否使用 `useLanguage` Hook？
- [ ] **主题适配**：是否支持深色/浅色主题？

### 重复代码检测工具

```bash
# 使用 ESLint 检测重复代码
pnpm lint

# 使用自定义脚本检测
node scripts/detect-duplicate-code.js

# 检查未使用的导入
node scripts/check-unused-imports.js
```

## � Context 使用最佳实践

### Context 数据流设计

```typescript
// ✅ 清晰的数据流向
AuthContext (用户认证)
    ↓
UserDataContext (用户基础数据)
    ↓
BalanceContext (计算数据)
    ↓
UI Components (展示层)

// ✅ Context 职责分离
- AuthContext: 仅处理认证状态
- UserDataContext: 管理用户的基础数据（账户、分类、标签）
- BalanceContext: 处理计算密集的余额数据
- ThemeContext: 管理主题设置
- LanguageContext: 管理语言设置
```

### Context 性能优化策略

```typescript
// ✅ 避免不必要的重新渲染
const UserDataProvider = ({ children }) => {
  // 使用 useCallback 包装函数
  const refreshAccounts = useCallback(async () => {
    // 刷新逻辑
  }, [])

  // 使用 useMemo 优化复杂计算
  const sortedAccounts = useMemo(() => {
    return accounts.sort((a, b) => a.name.localeCompare(b.name))
  }, [accounts])

  // 分离频繁变化的状态
  const contextValue = useMemo(
    () => ({
      accounts: sortedAccounts,
      refreshAccounts,
      // 不要包含 loading 状态
    }),
    [sortedAccounts, refreshAccounts]
  )
}
```

---

## �🔄 持续改进

这份规范文档会随着项目发展持续更新。如有建议或发现问题，请及时反馈并更新文档。

### 规范更新流程

1. 发现问题或改进点
2. 在团队中讨论
3. 更新相关配置文件
4. 更新此文档
5. 通知团队成员

### 定期检查项目

- [ ] 每月检查依赖更新
- [ ] 每季度审查代码规范
- [ ] 每半年评估工具链
- [ ] 年度架构回顾
- [ ] **新增**：每月检查重复代码
- [ ] **新增**：每季度审查 Context 性能

**最后更新**: 2025-06-22 **维护者**: 开发团队 **版本**: v1.1
