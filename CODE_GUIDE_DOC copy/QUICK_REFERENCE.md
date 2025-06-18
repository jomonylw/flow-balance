# 🚀 Flow Balance 快速参考指南

## 📋 常用命令速查

### 🔧 开发环境

```bash
# 启动开发服务器
pnpm dev

# 安装依赖
pnpm install

# 清理项目
pnpm clean
```

### 🔍 代码检查

```bash
# 基础检查
pnpm lint                    # ESLint 检查
pnpm type-check             # TypeScript 类型检查
pnpm format:check           # Prettier 格式检查

# 自动修复
pnpm lint:fix               # 自动修复 ESLint 错误
pnpm format                 # 自动格式化代码

# 详细检查
pnpm type-check:detailed    # 详细类型检查报告
pnpm type-check:strict      # 严格模式类型检查
```

### 🧪 测试命令

```bash
pnpm test                   # 运行所有测试
pnpm test:watch            # 监听模式运行测试
pnpm test:coverage         # 生成覆盖率报告
pnpm test:ci               # CI 环境测试
```

### 🗄️ 数据库操作

```bash
pnpm db:generate           # 生成 Prisma 客户端
pnpm db:migrate            # 运行数据库迁移
pnpm db:seed               # 运行种子数据
pnpm db:studio             # 打开 Prisma Studio
pnpm db:reset              # 重置数据库
```

### 🏗️ 构建和部署

```bash
pnpm build                 # 生产构建
pnpm start                 # 启动生产服务器
pnpm analyze               # 构建分析
```

## 🛠️ 自动化脚本

### 代码质量修复

```bash
# 智能修复 lint 错误
node scripts/smart-lint-fix.js

# 批量修复特定类型错误
node scripts/targeted-fix.js

# 修复 console.log 语句
node scripts/fix-console-logs.js
```

### 类型系统工具

```bash
# 分析类型使用情况
node scripts/analyze-type-usage.js

# 重构类型定义
node scripts/refactor-types.js

# 跟踪重构进度
node scripts/track-refactor-progress.js
```

### 数据库维护

```bash
# 添加示例汇率数据
node scripts/add-sample-exchange-rates.js

# 检查数据库数据
tsx scripts/check-database-data.ts

# 迁移账户货币
node scripts/migrate-account-currencies.js
```

## 📁 重要文件路径

### 配置文件

```
eslint.config.mjs           # ESLint 配置
.prettierrc.js              # Prettier 配置
tsconfig.json               # TypeScript 配置
jest.config.js              # Jest 测试配置
.lintstagedrc.js           # lint-staged 配置
.husky/pre-commit          # Git pre-commit hook
```

### 核心目录

```
src/app/                   # Next.js 页面路由
src/components/ui/         # 基础 UI 组件
src/components/features/   # 功能组件
src/lib/utils/            # 工具函数
src/lib/services/         # 业务服务
src/types/                # TypeScript 类型
src/hooks/                # 自定义 Hooks
```

## 🔧 故障排除

### 常见问题快速解决

#### TypeScript 错误

```bash
# 检查类型错误
pnpm type-check:detailed

# 重新生成类型
pnpm db:generate
```

#### ESLint 错误

```bash
# 自动修复
pnpm lint:fix

# 批量智能修复
node scripts/smart-lint-fix.js
```

#### 构建失败

```bash
# 清理并重新构建
pnpm clean
pnpm install
pnpm build
```

#### 数据库问题

```bash
# 重置数据库
pnpm db:reset

# 检查数据库状态
pnpm db:studio
```

## 📝 代码模板

### 组件模板

```typescript
import React from 'react'

interface ComponentNameProps {
  // Props 定义
}

export default function ComponentName({
  // Props 解构
}: ComponentNameProps) {
  return (
    <div>
      {/* 组件内容 */}
    </div>
  )
}
```

### Hook 模板

```typescript
import { useState, useEffect } from 'react'

export function useCustomHook() {
  const [state, setState] = useState()

  useEffect(() => {
    // 副作用逻辑
  }, [])

  return { state, setState }
}
```

### API 路由模板

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

## 🎯 开发最佳实践速查

### ✅ 推荐做法

- 使用 TypeScript 严格模式
- 组件使用 PascalCase 命名
- 文件使用 kebab-case 命名
- 使用 pnpm 作为包管理器
- 提交前运行所有检查
- 编写单元测试
- 使用语义化的变量名

### ❌ 避免做法

- 使用 `any` 类型
- 硬编码字符串
- 在生产代码中使用 `console.log`
- 混用不同的包管理器
- 跳过代码检查
- 提交未测试的代码
- 使用过于简短的变量名

## 🔗 有用链接

### 官方文档

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [TypeScript 文档](https://www.typescriptlang.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

### 工具文档

- [ESLint 规则](https://eslint.org/docs/rules)
- [Prettier 配置](https://prettier.io/docs/en/configuration.html)
- [Jest 测试](https://jestjs.io/docs/getting-started)

---

**快速参考版本**: v1.0  
**最后更新**: 2025-06-18
