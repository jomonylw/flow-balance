# 🤖 AI Agent 开发指南

## 🎯 项目核心信息

**项目**: Flow Balance - Next.js + Prisma 个人财务管理应用  
**技术栈**: Next.js 15.3.3, React 19, TypeScript, Tailwind CSS, Prisma  
**包管理**: pnpm (必须使用)

## 📋 必须遵循的规范

### 🔧 代码质量要求

- **TypeScript**: 严格模式，禁用 `any` 类型
- **ESLint**: 无错误，警告控制在合理范围
- **测试**: 新功能必须有单元测试
- **格式化**: 使用 Prettier 统一格式

### 📁 命名规范

```bash
# 组件文件 - PascalCase
UserProfile.tsx
AccountCard.tsx

# 工具函数 - kebab-case
format-currency.ts
validate-email.ts

# Hook文件 - camelCase (use开头)
useAccountData.ts
useResponsive.ts

# 目录 - kebab-case
user-management/
account-settings/
```

### 🏗️ 组件设计原则

- 单一职责，组件功能明确
- Props 使用 TypeScript 接口定义
- 合理使用 React.memo, useMemo, useCallback
- 区分存量账户(资产/负债)和流量账户(收入/支出)组件

### 💰 业务逻辑核心

- **存量账户**: 资产/负债，关注余额更新
- **流量账户**: 收入/支出，关注交易记录
- **金额计算**: 使用精确数值，避免浮点误差
- **多币种**: 每账户单一货币，统一转换为本位币汇总

## 🚀 常用命令

### 开发检查

```bash
pnpm lint                # ESLint检查
pnpm type-check         # TypeScript检查
pnpm test               # 运行测试
pnpm format:check       # 格式检查
```

### 自动修复

```bash
pnpm lint:fix           # 修复ESLint错误
pnpm format             # 格式化代码
node scripts/smart-lint-fix.js  # 智能批量修复
```

### 数据库操作

```bash
pnpm db:generate        # 生成Prisma客户端
pnpm db:migrate         # 运行迁移
pnpm db:studio          # 打开数据库管理界面
```

## ✅ 代码提交检查清单

### 必须通过的检查

- [ ] `pnpm lint` 无错误
- [ ] `pnpm type-check` 无错误
- [ ] `pnpm test` 全部通过
- [ ] 新功能有对应测试
- [ ] 无 console.log 调试代码

### 代码质量要求

- [ ] 组件职责单一，命名清晰
- [ ] TypeScript 类型定义完整
- [ ] 错误处理完善
- [ ] 性能考虑(避免不必要重渲染)

## 🎨 UI/UX 规范

### 样式规范

- 使用 Tailwind CSS 类名
- 支持深色/浅色主题: `bg-white dark:bg-gray-800`
- 响应式设计: 移动端优先
- 金额显示: 负数红色，正数绿色，千位分隔符

### 组件结构

```
src/components/
├── ui/           # 基础UI组件
├── features/     # 功能组件
└── layout/       # 布局组件
```

## 🔒 安全和性能

### 安全要求

- 服务端验证所有输入 (使用 Zod)
- 避免 XSS (不使用 dangerouslySetInnerHTML)
- 敏感数据不在客户端暴露

### 性能优化

- 大列表使用分页 (10条/页)
- 图表组件懒加载
- API 调用去重和缓存
- 合理使用 React 优化 hooks

## 🚨 常见错误避免

### ❌ 禁止的做法

- 使用 `any` 类型
- 硬编码字符串 (应使用国际化)
- 在生产代码中使用 `console.log`
- 混用包管理器 (只用 pnpm)
- 直接修改 state
- 忽略 TypeScript 错误

### ✅ 推荐做法

- 使用严格的 TypeScript 类型
- 组件使用 memo 优化
- 错误边界处理
- 单元测试覆盖核心逻辑
- 清晰的变量和函数命名

## 📝 代码模板

### 组件模板

```typescript
import React from 'react'

interface ComponentProps {
  // Props定义
}

export default function ComponentName({
  // Props解构
}: ComponentProps) {
  return (
    <div>
      {/* 组件内容 */}
    </div>
  )
}
```

### API路由模板

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 处理逻辑
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
```

## 🎯 AI Agent 特别注意

1. **包管理**: 必须使用 pnpm，不要建议 npm/yarn
2. **类型安全**: 严格避免 any，充分利用 TypeScript
3. **业务理解**: 区分存量/流量账户的不同处理方式
4. **测试优先**: 重要功能必须有测试覆盖
5. **性能意识**: 考虑组件重渲染和API调用优化
6. **错误处理**: 完善的错误边界和用户友好的错误信息

## 📚 详细文档参考

如需更详细信息，参考：

- `docs/DEVELOPMENT_STANDARDS.md` - 完整开发规范
- `docs/QUICK_REFERENCE.md` - 命令速查
- `docs/CODE_REVIEW_CHECKLIST.md` - 代码审查标准

---

**版本**: v1.0 | **更新**: 2025-06-18
