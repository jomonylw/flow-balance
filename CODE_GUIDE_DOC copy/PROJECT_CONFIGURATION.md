# ⚙️ Flow Balance 项目配置详解

## 📋 配置文件概览

### 核心配置文件

```
├── package.json              # 项目依赖和脚本
├── tsconfig.json            # TypeScript 配置
├── eslint.config.mjs        # ESLint 规则配置
├── .prettierrc.js           # Prettier 格式化配置
├── jest.config.js           # Jest 测试配置
├── next.config.ts           # Next.js 配置
├── tailwind.config.ts       # Tailwind CSS 配置
├── prisma/schema.prisma     # 数据库模式
└── .lintstagedrc.js        # Git hooks 配置
```

## 🔧 TypeScript 配置

### tsconfig.json 关键配置

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true, // 启用严格模式
    "noImplicitAny": true, // 禁止隐式 any
    "noImplicitReturns": true, // 要求明确返回值
    "noImplicitThis": true, // 禁止隐式 this
    "noImplicitOverride": true, // 要求明确 override
    "forceConsistentCasingInFileNames": true,

    // 路径映射
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/contexts/*": ["./src/contexts/*"],
      "@/utils/*": ["./src/lib/utils/*"],
      "@/services/*": ["./src/lib/services/*"],
      "@/api/*": ["./src/lib/api/*"],
      "@/ui/*": ["./src/components/ui/*"]
    }
  }
}
```

### 严格模式检查

```bash
# 使用严格配置检查
pnpm type-check:strict

# 详细类型检查报告
pnpm type-check:detailed
```

## 🔍 ESLint 配置

### eslint.config.mjs 规则详解

```javascript
{
  rules: {
    // TypeScript 规则
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // React 规则
    'react/jsx-key': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // 代码质量
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'prefer-const': 'error',

    // 代码风格
    'max-len': ['warn', { code: 100 }],
    'object-curly-spacing': ['error', 'always'],
    'semi': ['error', 'never'],
    'quotes': ['error', 'single']
  }
}
```

### 测试文件特殊规则

```javascript
{
  files: ['**/*.test.ts', '**/*.test.tsx'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'no-console': 'off'
  }
}
```

## 🎨 Prettier 配置

### .prettierrc.js 格式化规则

```javascript
{
  semi: false,                    // 不使用分号
  singleQuote: true,             // 使用单引号
  trailingComma: 'es5',          // ES5 兼容的尾随逗号
  tabWidth: 2,                   // 缩进宽度
  printWidth: 80,                // 行宽限制
  jsxSingleQuote: true,          // JSX 使用单引号
  arrowParens: 'avoid',          // 箭头函数参数括号

  // 文件特定配置
  overrides: [
    {
      files: '*.json',
      options: { printWidth: 120 }
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always'
      }
    }
  ]
}
```

## 🧪 Jest 测试配置

### jest.config.js 测试环境

```javascript
{
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // 模块路径映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // ... 其他路径映射
  },

  // 覆盖率配置
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**'  // 排除 Next.js 路由文件
  ],

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
}
```

## 🔄 Git Hooks 配置

### .lintstagedrc.js 预提交检查

```javascript
{
  // TypeScript 和 JavaScript 文件
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix --max-warnings=1000',
    'prettier --write'
  ],

  // 其他文件类型
  '*.json': ['prettier --write'],
  '*.{css,scss,sass,less}': ['prettier --write'],
  '*.md': ['prettier --write'],
  '*.{yml,yaml}': ['prettier --write']
}
```

### .husky/pre-commit Hook

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

## 📦 Package.json 脚本

### 开发脚本

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",

    // 代码质量
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "type-check:detailed": "node scripts/type-check.js",
    "type-check:strict": "tsc --noEmit --project tsconfig.strict.json",

    // 测试
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",

    // 数据库
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset --force",

    // 工具
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "analyze": "ANALYZE=true npm run build",
    "clean": "rm -rf .next out dist build"
  }
}
```

### 依赖版本策略

```json
{
  "dependencies": {
    "next": "15.3.3", // 框架版本锁定
    "react": "^19.0.0", // 主要依赖使用 ^
    "prisma": "^6.9.0" // 工具依赖使用 ^
  },
  "devDependencies": {
    "typescript": "^5", // 开发工具使用 ^
    "eslint": "^9", // 代码检查工具
    "prettier": "^3.5.3" // 格式化工具
  }
}
```

## 🗄️ Prisma 配置

### schema.prisma 数据库配置

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 模型定义示例
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  accounts Account[]

  @@map("users")
}
```

## 🎯 Next.js 配置

### next.config.ts 构建配置

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // 构建优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 图片优化
  images: {
    domains: ['localhost'],
  },
}

export default nextConfig
```

## 🎨 Tailwind CSS 配置

### tailwind.config.ts 样式配置

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        // 自定义颜色
      },
      fontFamily: {
        // 自定义字体
      },
    },
  },

  plugins: [],
}

export default config
```

## 🔧 IDE 配置建议

### VSCode 设置 (.vscode/settings.json)

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### 推荐扩展

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

## 🚀 部署配置

### 环境变量

```bash
# 开发环境
NODE_ENV=development
DATABASE_URL="file:./dev.db"

# 生产环境
NODE_ENV=production
DATABASE_URL="your-production-db-url"
```

### 构建检查

```bash
# 构建前检查
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

---

## 📝 配置维护

### 定期检查项目

- [ ] 依赖更新检查 (`pnpm outdated`)
- [ ] 安全漏洞检查 (`pnpm audit`)
- [ ] 配置文件同步
- [ ] 工具版本兼容性

### 配置变更流程

1. 讨论配置变更需求
2. 在开发环境测试
3. 更新相关文档
4. 通知团队成员
5. 应用到生产环境

**配置文档版本**: v1.0  
**最后更新**: 2025-06-18
