# ✅ Flow Balance 代码审查检查清单

## 🎯 审查前准备

### 提交者自检清单

在提交 PR 之前，请确保完成以下检查：

- [ ] **功能测试**: 新功能在本地环境正常工作
- [ ] **代码检查**: 通过所有 lint 和类型检查
- [ ] **测试覆盖**: 新代码有对应的单元测试
- [ ] **文档更新**: 相关文档已更新
- [ ] **依赖检查**: 新增依赖已经过评估

### 运行检查命令

```bash
# 必须通过的检查
pnpm lint                    # ESLint 检查
pnpm type-check             # TypeScript 类型检查
pnpm test                   # 单元测试
pnpm build                  # 构建检查

# 推荐运行的检查
pnpm format:check           # 代码格式检查
pnpm test:coverage          # 测试覆盖率
```

## 🔍 代码审查要点

### 1. 代码质量 (必检项)

#### TypeScript 类型安全

- [ ] 没有使用 `any` 类型 (除非有充分理由)
- [ ] 接口和类型定义完整准确
- [ ] 函数参数和返回值有明确类型
- [ ] 没有类型断言滥用 (`as` 关键字)

```typescript
// ✅ 好的类型定义
interface UserData {
  id: string
  name: string
  email: string
}

// ❌ 避免的写法
const userData: any = fetchUserData()
```

#### 变量和函数命名

- [ ] 变量名清晰表达意图
- [ ] 函数名动词开头，表达具体行为
- [ ] 常量使用 UPPER_SNAKE_CASE
- [ ] 组件使用 PascalCase

```typescript
// ✅ 清晰的命名
const userAccountBalance = calculateBalance(transactions)
function formatCurrencyAmount(amount: number): string

// ❌ 模糊的命名
const data = calc(items)
function process(x: number): string
```

#### 代码结构

- [ ] 函数职责单一，长度合理 (< 50 行)
- [ ] 避免深层嵌套 (< 4 层)
- [ ] 没有重复代码
- [ ] 适当的代码注释

### 2. React 组件规范

#### 组件设计

- [ ] 组件职责单一
- [ ] Props 接口定义完整
- [ ] 使用 TypeScript 接口而非 PropTypes
- [ ] 合理使用 React.memo 优化性能

```typescript
// ✅ 好的组件设计
interface AccountCardProps {
  account: Account
  onEdit?: (account: Account) => void
  className?: string
}

const AccountCard = React.memo(function AccountCard({
  account,
  onEdit,
  className = '',
}: AccountCardProps) {
  // 组件实现
})
```

#### Hooks 使用

- [ ] useEffect 依赖数组正确
- [ ] 自定义 Hook 命名以 `use` 开头
- [ ] 状态更新逻辑清晰
- [ ] 避免不必要的重渲染

```typescript
// ✅ 正确的 useEffect 依赖
useEffect(() => {
  fetchAccountData(accountId)
}, [accountId]) // 明确列出所有依赖

// ❌ 错误的依赖数组
useEffect(() => {
  fetchAccountData(accountId)
}, []) // 缺少 accountId 依赖
```

### 3. 业务逻辑检查

#### 财务计算准确性

- [ ] 金额计算使用精确数值类型
- [ ] 货币转换逻辑正确
- [ ] 账户类型区分正确 (存量 vs 流量)
- [ ] 数据验证完整

```typescript
// ✅ 精确的金额计算
import { Decimal } from 'decimal.js'

function calculateTotal(amounts: number[]): number {
  return amounts
    .map(amount => new Decimal(amount))
    .reduce((sum, amount) => sum.plus(amount), new Decimal(0))
    .toNumber()
}
```

#### 数据处理

- [ ] 输入数据验证 (使用 Zod)
- [ ] 错误处理完善
- [ ] 边界条件考虑周全
- [ ] API 响应格式一致

### 4. 性能考虑

#### 组件性能

- [ ] 合理使用 useMemo 和 useCallback
- [ ] 避免在渲染函数中创建对象
- [ ] 列表渲染使用正确的 key
- [ ] 大型组件考虑代码分割

```typescript
// ✅ 性能优化
const expensiveCalculation = useMemo(() => {
  return transactions.reduce((sum, t) => sum + t.amount, 0)
}, [transactions])

const handleClick = useCallback(
  (id: string) => {
    onItemClick(id)
  },
  [onItemClick]
)
```

#### 数据获取

- [ ] 避免不必要的 API 调用
- [ ] 合理使用缓存策略
- [ ] 分页处理大量数据
- [ ] 加载状态处理

### 5. 安全性检查

#### 输入验证

- [ ] 所有用户输入都经过验证
- [ ] SQL 注入防护 (使用 Prisma)
- [ ] XSS 防护 (避免 dangerouslySetInnerHTML)
- [ ] 敏感数据不在客户端暴露

#### API 安全

- [ ] 服务端验证所有输入
- [ ] 适当的错误信息 (不暴露内部信息)
- [ ] 权限检查完整
- [ ] 日志记录适当

### 6. 测试质量

#### 测试覆盖

- [ ] 核心业务逻辑有单元测试
- [ ] 组件有基本的渲染测试
- [ ] 边界条件有测试覆盖
- [ ] 错误情况有测试

```typescript
// ✅ 好的测试结构
describe('formatCurrency', () => {
  it('should format positive amounts correctly', () => {
    expect(formatCurrency(1234.56, 'CNY')).toBe('¥1,234.56')
  })

  it('should handle zero amount', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00')
  })

  it('should handle negative amounts', () => {
    expect(formatCurrency(-100, 'EUR')).toBe('-€100.00')
  })
})
```

## 🚨 常见问题检查

### 代码异味 (Code Smells)

- [ ] 没有过长的函数 (> 50 行)
- [ ] 没有过多的参数 (> 5 个)
- [ ] 没有深层嵌套 (> 4 层)
- [ ] 没有魔法数字 (使用常量)
- [ ] 没有重复代码

### React 特定问题

- [ ] 没有在循环中使用 Hooks
- [ ] 没有忘记清理副作用 (useEffect cleanup)
- [ ] 没有直接修改 state
- [ ] 没有在渲染函数中进行副作用操作

### TypeScript 问题

- [ ] 没有忽略 TypeScript 错误 (`@ts-ignore`)
- [ ] 没有使用 `!` 非空断言 (除非确实安全)
- [ ] 没有类型转换错误
- [ ] 接口定义完整

## 📋 审查结果分类

### 🔴 必须修复 (Blocking)

- 功能错误
- 安全漏洞
- 性能严重问题
- 类型错误
- 测试失败

### 🟡 建议修复 (Non-blocking)

- 代码风格问题
- 性能优化建议
- 可读性改进
- 测试覆盖率提升

### 🟢 可选改进 (Optional)

- 重构建议
- 架构优化
- 文档完善

## 💬 审查反馈模板

### 问题反馈格式

```
**问题类型**: [必须修复/建议修复/可选改进]
**文件**: src/components/example.tsx:25
**问题描述**: 具体问题说明
**建议方案**: 推荐的解决方案
**参考**: 相关文档或示例链接
```

### 正面反馈

- 好的设计模式使用
- 清晰的代码结构
- 完善的错误处理
- 良好的测试覆盖

---

## 🔄 审查流程

1. **自检**: 提交者完成自检清单
2. **自动检查**: CI/CD 运行自动化检查
3. **人工审查**: 审查者按照此清单进行检查
4. **反馈**: 提供具体的改进建议
5. **修复**: 提交者根据反馈进行修复
6. **复审**: 确认问题已解决
7. **合并**: 通过所有检查后合并代码

**检查清单版本**: v1.0  
**最后更新**: 2025-06-18
