# 📋 Flow Balance 代码质量检查清单

## 🔧 基础代码质量检查

### ESLint & TypeScript 检查

- [ ] 代码通过 ESLint 检查 - `pnpm lint`
- [ ] 代码通过 TypeScript 类型检查 - `pnpm type-check`
- [ ] 代码格式化正确 - `pnpm format:check`
- [ ] 详细类型检查无错误 - `pnpm type-check:detailed`
- [ ] 严格模式类型检查通过 - `pnpm type-check:strict`

### 代码规范检查

- [ ] 文件命名符合规范（组件PascalCase，工具kebab-case，Hook camelCase）
- [ ] 目录结构符合项目规范
- [ ] 无未使用的导入和变量 - `node scripts/check-unused-imports.js`
- [ ] 无console.log调试代码（允许console.warn/error）
- [ ] 函数和变量命名清晰语义化
- [ ] TypeScript 类型定义无重复 - 使用统一的类型定义模块

## 🏗️ 架构规范检查

### 组件设计

- [ ] 组件遵循单一职责原则
- [ ] Props使用TypeScript接口定义
- [ ] 合理使用React.memo/useMemo/useCallback优化性能
- [ ] 重要组件有错误边界处理

### Context使用规范

- [ ] 使用分层Context架构，避免单一巨型Context
- [ ] Context值使用useMemo优化 - 检查依赖数组正确性
- [ ] 避免在Context中存储频繁变化的状态
- [ ] Context Hook使用正确（useAuth, useUserData等）

## 🔄 统一处理机制检查

### 货币格式化统一性

- [ ] 所有货币显示使用useUserCurrencyFormatter Hook
- [ ] 无硬编码货币符号映射 - `grep -r "CNY.*¥\|USD.*\$" src/`
- [ ] 无重复的formatCurrency函数定义 - `grep -r "formatCurrency.*=" src/`

### 颜色管理统一性

- [ ] 使用ColorManager统一管理颜色 - `grep -r "getAccountColor\|generateSmartChartColors" src/`
- [ ] 无重复的颜色定义逻辑 - `grep -r "ASSET.*#3b82f6\|LIABILITY.*#f97316" src/`
- [ ] 图表颜色使用统一生成方法

### API调用模式统一性

- [ ] API调用使用统一错误处理模式
- [ ] 使用统一的Toast通知 - useToast Hook
- [ ] 表单验证使用Zod Schema统一验证
- [ ] 模态框使用统一Modal组件

## 🌐 国际化检查

### 文本国际化

- [ ] 无硬编码中文文本 - `grep -r "[\u4e00-\u9fa5]" src/ --include="*.tsx" --include="*.ts"`
- [ ] 使用useTranslation Hook处理文本
- [ ] 日期格式使用通用格式（YYYY/MM/DD）
- [ ] 图表标签使用国际化键值

### 主题适配

- [ ] 组件支持深色/浅色主题切换
- [ ] 使用Tailwind深色主题类（dark:）
- [ ] 模态框和弹窗支持主题切换

## 🎨 UI/UX规范检查

### 响应式设计

- [ ] 组件在移动端和PC端正常显示
- [ ] 使用useResponsive Hook处理响应式逻辑
- [ ] 侧边栏宽度可调整且保持滚动位置

### 加载状态

- [ ] 使用统一LoadingScreen/LoadingSpinner组件
- [ ] 加载状态匹配页面结构（骨架屏）
- [ ] 按钮提交状态有loading指示

## 🔒 安全和性能检查

### 输入验证

- [ ] 所有用户输入使用Zod Schema验证
- [ ] API端点有服务端验证
- [ ] 避免在客户端暴露敏感信息

### 性能优化

- [ ] 大组件使用React.lazy动态导入
- [ ] 列表渲染使用虚拟化（长列表）
- [ ] 图片使用Next.js Image组件优化

## 📦 依赖管理检查

### 包管理规范

- [ ] 使用pnpm作为包管理器
- [ ] 依赖版本策略正确（主要依赖^，框架锁定）
- [ ] 定期检查依赖安全性 - `pnpm audit`
- [ ] 检查过期依赖 - `pnpm outdated`

## 🔍 重复代码检查

### 关键重复代码检测

- [ ] 无重复货币符号映射 - `grep -r "currencySymbols\|CNY.*¥" src/`
- [ ] 无重复颜色定义 - `grep -r "accountColors\|ASSET.*#" src/`
- [ ] 无重复API调用模式 - `grep -r "fetch.*api" src/`
- [ ] 无重复表单验证逻辑 - `grep -r "setError.*不能为空" src/`
- [ ] 无重复 interface/type 定义 - 检查 PrismaTransaction, Account, AuthState 等
- [ ] 业务类型统一从 @/types/core 导入 -
      `grep -r "interface.*Account\|interface.*Transaction" src/components/`

### TypeScript 类型定义检查

- [ ] 无重复的 interface/type 定义 - `node scripts/check-duplicate-types.js`
- [ ] 详细类型使用分析 - `node scripts/analyze-type-usage.js`
- [ ] 核心业务类型统一使用 @/types/core 导入
- [ ] 避免在组件中重复定义业务类型 -
      `grep -r "interface.*Account\|interface.*Transaction" src/components/`
- [ ] 类型导入路径统一 - 检查是否从正确的模块导入类型
- [ ] PrismaTransaction 等工具类型无重复定义

### 自动化检测

- [ ] 运行重复代码检测脚本 - `node scripts/detect-duplicate-code.js`
- [ ] 智能修复lint错误 - `node scripts/smart-lint-fix.js`
- [ ] 类型系统使用分析 - `node scripts/analyze-type-usage.js`
- [ ] 重构进度跟踪 - `node scripts/track-refactor-progress.js`

## 🚀 构建和部署检查

### 构建质量

- [ ] 生产构建成功 - `pnpm build`
- [ ] 构建分析无异常 - `pnpm analyze`
- [ ] 数据库迁移正常 - `pnpm db:migrate`
- [x] 种子数据运行正常 - `pnpm db:seed`（留意不要执行，会重置数据）

### 代码提交检查

- [ ] Pre-commit钩子正常工作（Husky + lint-staged）
- [ ] 提交信息符合规范
- [ ] 分支命名符合规范
- [ ] 无调试代码和临时文件

## 📊 业务逻辑检查

### 财务数据处理

- [ ] 金额计算使用Decimal.js确保精度
- [ ] 账户类型区分正确（存量vs流量）
- [ ] 货币转换逻辑正确
- [ ] 汇率数据处理正确

### 数据一致性

- [ ] 数据库关系正确
- [ ] 外键约束正确
- [ ] 数据验证规则一致
- [ ] 事务处理正确

## ✅ 提交前最终检查

### 必检项目

- [ ] 所有自动化检查通过
- [ ] 功能按需求正确实现
- [ ] 无明显性能问题
- [ ] 相关文档已更新
- [ ] 测试覆盖新功能
- [ ] 无安全漏洞

### 团队协作

- [ ] 代码审查要点已确认
- [ ] 架构变更已讨论
- [ ] 破坏性变更已通知
- [ ] 部署计划已制定

---

## 🚨 当前已知问题

### TypeScript 类型重复定义问题

根据 `node scripts/check-duplicate-types.js` 检查发现：

- [ ] **PrismaTransaction** (3处重复) - 需要统一定义
- [ ] **Account** (2处重复) - 组件中应导入而非重新定义
- [ ] **AuthState** (2处重复) - 需要统一认证状态类型
- [ ] **CategoryTransaction** (2处重复) - 需要统一分类交易类型
- [ ] **FlowCategory/StockCategory** (各2处重复) - 需要统一分类类型
- [ ] **DashboardSummaryResponse** (2处重复) - API类型重复

### 修复优先级

1. **高优先级**: PrismaTransaction, Account, AuthState - 影响核心功能
2. **中优先级**: Category相关类型 - 影响分类功能
3. **低优先级**: 其他组件特定类型

---

**使用说明**：

1. 每次提交前运行此检查清单
2. 优先使用自动化命令检查
3. 发现问题使用批量修复脚本
4. 定期更新检查清单内容
5. **新增**: 重点关注 TypeScript 类型重复定义问题

**快速检查命令**：

```bash
# 一键运行所有关键检查
pnpm lint && pnpm type-check && node scripts/check-duplicate-types.js
```

**最后更新**: 2025-06-22 **版本**: v1.1
