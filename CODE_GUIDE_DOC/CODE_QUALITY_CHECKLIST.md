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
- [ ] 使用枚举替代硬编码字符串字面量 - 检查 AccountType, TransactionType 等

## 🏗️ 架构规范检查

### 组件设计

- [ ] 组件遵循单一职责原则
- [ ] Props使用TypeScript接口定义
- [ ] 合理使用React.memo/useMemo/useCallback优化性能
- [ ] 重要组件有错误边界处理
- [ ] 使用TranslationLoader包装需要国际化的组件
- [ ] 骨架屏组件匹配对应页面结构
- [ ] 复用现有组件模式（如复制CashFlowChart.tsx作为模板）

### Context使用规范

- [ ] 使用分层Context架构，避免单一巨型Context
- [ ] Context值使用useMemo优化 - 检查依赖数组正确性
- [ ] 避免在Context中存储频繁变化的状态
- [ ] Context Hook使用正确（useAuth, useUserData等）

## 🏛️ 架构模式检查

### 常量管理模式

- [ ] 使用ConstantsManager统一管理常量
- [ ] 枚举替代字符串字面量联合类型
- [ ] Zod Schema使用ConstantsManager提供的枚举值
- [ ] 类型守卫函数正确使用（isStockAccountType, isFlowAccountType）

### 类型系统架构

- [ ] 核心业务类型从@/types/core导入
- [ ] API类型从@/types/api导入
- [ ] UI组件类型从@/types/ui导入
- [ ] 数据库类型从@/types/database导入
- [ ] 避免在组件中重复定义业务类型

### 服务层架构

- [ ] 业务逻辑封装在service层
- [ ] 统一的错误处理模式
- [ ] 事件驱动的数据刷新机制
- [ ] 避免直接调用refreshBalance()，使用事件通知

## 🔄 统一处理机制检查

### 货币格式化统一性

- [ ] 所有货币显示使用useUserCurrencyFormatter Hook
- [ ] 无硬编码货币符号映射 - `grep -r "CNY.*¥\|USD.*\$" src/`
- [ ] 无重复的formatCurrency函数定义 - `grep -r "formatCurrency.*=" src/`
- [ ] 使用currencyId而非currencyCode进行货币处理 - 检查API和组件一致性

### 颜色管理统一性

- [ ] 使用ColorManager统一管理颜色 - `grep -r "getAccountColor\|generateSmartChartColors" src/`
- [ ] 无重复的颜色定义逻辑 - `grep -r "ASSET.*#3b82f6\|LIABILITY.*#f97316" src/`
- [ ] 图表颜色使用统一生成方法
- [ ] 使用ACCOUNT_TYPE_COLORS常量替代硬编码颜色值

### API调用模式统一性

- [ ] API调用使用统一错误处理模式
- [ ] 使用统一的Toast通知 - useToast Hook
- [ ] 表单验证使用Zod Schema统一验证
- [ ] 模态框使用统一Modal组件
- [ ] 批量操作API使用统一的验证和错误处理模式

## 🌐 国际化检查

### 文本国际化

- [ ] 无硬编码中文文本 - `grep -r "[\u4e00-\u9fa5]" src/ --include="*.tsx" --include="*.ts"`
- [ ] 使用useTranslation Hook处理文本
- [ ] 日期格式使用通用格式（YYYY/MM/DD）
- [ ] 图表标签使用国际化键值
- [ ] 智能粘贴表格占位符文本已国际化 - 检查"Select account"等硬编码文本
- [ ] FIRE功能标签和描述已国际化
- [ ] 自动生成的注释和备注使用国际化键值

### 主题适配

- [ ] 组件支持深色/浅色主题切换
- [ ] 使用Tailwind深色主题类（dark:）
- [ ] 模态框和弹窗支持主题切换
- [ ] 批量录入模块主题适配正确

## 🎨 UI/UX规范检查

### 响应式设计

- [ ] 组件在移动端和PC端正常显示
- [ ] 使用useResponsive Hook处理响应式逻辑
- [ ] 侧边栏宽度可调整且保持滚动位置
- [ ] 智能粘贴表格在移动端正常显示和操作

### 加载状态

- [ ] 使用统一LoadingScreen/LoadingSpinner组件
- [ ] 加载状态匹配页面结构（骨架屏）
- [ ] 按钮提交状态有loading指示
- [ ] FIRE页面使用FirePageSkeleton骨架屏

### 交互体验

- [ ] 智能粘贴表格支持键盘导航（方向键、Tab、Enter）
- [ ] 表格单元格双击编辑交互正确实现
- [ ] 图表支持独立时间范围控制和平滑过渡
- [ ] 弹出菜单在模态框中正确显示（不被容器边界裁剪）

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
- [ ] 无硬编码字符串字面量 - 使用ConstantsManager和枚举替代

### TypeScript 类型定义检查

- [ ] 无重复的 interface/type 定义 - `node scripts/check-duplicate-types.js`
- [ ] 详细类型使用分析 - `node scripts/analyze-type-usage.js`
- [ ] 核心业务类型统一使用 @/types/core 导入
- [ ] 避免在组件中重复定义业务类型 -
      `grep -r "interface.*Account\|interface.*Transaction" src/components/`
- [ ] 类型导入路径统一 - 检查是否从正确的模块导入类型
- [ ] PrismaTransaction 等工具类型无重复定义
- [ ] 使用统一的常量枚举 - AccountType, TransactionType, Theme, Language
- [ ] Zod Schema使用ConstantsManager提供的枚举值

### 自动化检测

- [ ] 运行重复代码检测脚本 - `node scripts/detect-duplicate-code.js`
- [ ] 智能修复lint错误 - `node scripts/smart-lint-fix.js`
- [ ] 类型系统使用分析 - `node scripts/analyze-type-usage.js`
- [ ] 重构进度跟踪 - `node scripts/track-refactor-progress.js`
- [ ] 硬编码字符串检测 -
      `grep -r "'INCOME'\|'EXPENSE'\|'ASSET'" src/ --include="*.ts" --include="*.tsx"`
- [ ] 常量使用检查 - 确保使用ConstantsManager而非直接字符串

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
- [ ] FIRE计算逻辑正确（安全提取率、年化收益率等）
- [ ] 批量交易处理支持事务回滚

### 数据一致性

- [ ] 数据库关系正确
- [ ] 外键约束正确
- [ ] 数据验证规则一致
- [ ] 事务处理正确
- [ ] 货币复合主键约束正确（createdBy + code）
- [ ] 用户级货币隔离正确实现

### 智能粘贴功能

- [ ] 批量数据验证逻辑正确
- [ ] 单元格级、行级、全局级验证反馈正确
- [ ] 历史记录管理（撤销/重做）功能正常
- [ ] Excel风格的复制粘贴功能正确实现

## 🆕 新功能特定检查

### FIRE功能检查

- [ ] FIRE计算参数验证正确
- [ ] 图表可视化数据准确
- [ ] 用户设置中FIRE开关正常工作
- [ ] 财务自由路径计算逻辑正确

### 智能粘贴功能检查

- [ ] 支持最多100行批量录入限制
- [ ] 三层验证反馈系统正常工作
- [ ] 键盘快捷键功能完整
- [ ] 数据暂存与最终提交分离正确

### 货币管理检查

- [ ] 用户级货币隔离正确实现
- [ ] 自定义货币创建和管理功能正常
- [ ] 汇率自动更新功能正常（24小时限制）
- [ ] 货币ID与货币代码使用一致性

## ✅ 提交前最终检查

### 必检项目

- [ ] 所有自动化检查通过
- [ ] 功能按需求正确实现
- [ ] 无明显性能问题
- [ ] 相关文档已更新
- [ ] 测试覆盖新功能
- [ ] 无安全漏洞
- [ ] 无硬编码字符串和魔法数字
- [ ] 国际化文本完整

### 团队协作

- [ ] 代码审查要点已确认
- [ ] 架构变更已讨论
- [ ] 破坏性变更已通知
- [ ] 部署计划已制定

## 📝 最新开发模式检查

### 组件复用模式

- [ ] 优先复制现有工作组件作为模板（如CashFlowChart.tsx）
- [ ] 避免复杂重构，采用渐进式改进
- [ ] 统一的Logo组件使用（从TopUserStatusBar.tsx提取）
- [ ] 自定义Calendar.tsx组件替代原生日期选择器

### 数据处理模式

- [ ] 使用统一的货币格式化组件
- [ ] 混合货币场景正确处理
- [ ] 图表数据对齐处理（同时期数据在同一轴线）
- [ ] 负债金额在图表中显示为负值（零轴以下）

### 验证和反馈模式

- [ ] 使用"提示/建议"而非"警告"术语
- [ ] 黄色指示器用于提示，红色用于错误
- [ ] 清晰的验证消息和错误提示
- [ ] 批量操作的进度反馈和结果统计

---

**最后更新**: 2025-06-26 **版本**: v2.1 - 新增FIRE功能、智能粘贴、货币管理等检查项
