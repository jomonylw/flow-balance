# 🚀 项目质量优化快速开始指南

**适用对象**: 开发人员  
**预计时间**: 第一阶段 1-2 天  
**前置条件**: 熟悉项目基础架构

## 📋 第一阶段: 紧急修复 (立即开始)

### 步骤 1: 修复 Jest 配置 (30分钟)

```bash
# 1. 打开 jest.config.js
# 2. 将第14行的 moduleNameMapping 改为 moduleNameMapper
```

<augment_code_snippet path="jest.config.js" mode="EXCERPT">

```javascript
// 修改前 (第14行)
moduleNameMapping: {

// 修改后
moduleNameMapper: {
```

</augment_code_snippet>

```bash
# 3. 验证修复
pnpm test
```

### 步骤 2: 修复失败的测试用例 (30分钟)

```bash
# 查看失败的测试
pnpm test src/lib/utils/format.test.ts
```

需要修复的测试期望值：

- `formatCurrency(-1234.56, 'CNY')` 应返回 `'¥-1,234.56'` 而不是 `'-¥1,234.56'`
- `formatNumber(1000)` 应返回 `'1,000.00'` 而不是 `'1,000'`
- `formatNumber(0)` 应返回 `'0.00'` 而不是 `'0'`

### 步骤 3: 代码格式化统一 (15分钟)

```bash
# 格式化所有代码
pnpm format

# 验证格式化结果
pnpm format:check
```

### 步骤 4: 批量修复 ESLint 错误 (2-4小时)

```bash
# 使用项目提供的智能修复脚本
node scripts/smart-lint-fix.js

# 手动修复剩余问题
pnpm lint:fix

# 验证修复结果
pnpm lint
```

**常见问题快速修复**:

1. **未使用变量**: 在变量名前加 `_` 或删除

   ```typescript
   // 修改前
   const theme = useTheme()

   // 修改后 (如果未使用)
   const _theme = useTheme()
   // 或直接删除
   ```

2. **console.log 语句**: 改为 console.warn 或 console.error

   ```typescript
   // 修改前
   console.log('debug info')

   // 修改后
   console.warn('debug info') // 或删除
   ```

3. **行长度超限**: 拆分长行

   ```typescript
   // 修改前
   const veryLongVariableName = someFunction(param1, param2, param3, param4)

   // 修改后
   const veryLongVariableName = someFunction(param1, param2, param3, param4)
   ```

### 验收标准 ✅

完成第一阶段后，以下命令应该全部通过：

```bash
# 测试通过
pnpm test
# ✅ 应显示: Tests: X passed, X total

# 格式检查通过
pnpm format:check
# ✅ 应显示: All matched files use Prettier code style!

# Lint 检查通过或警告 < 10
pnpm lint
# ✅ 应显示: ✓ No ESLint warnings or errors 或警告数 < 10
```

## 🔧 第二阶段预览: 类型优化 (下周开始)

### 优先修复的重复类型

1. **User 类型重复**

   ```typescript
   // 删除 src/contexts/providers/AuthContext.tsx 中的本地定义
   // 改为导入
   import type { User } from '@/types/core'
   ```

2. **Currency/UserSettings/Tag 重复**

   ```typescript
   // 修改 src/lib/validation/schemas.ts
   // 删除 z.infer 定义，改为导入核心类型
   import type { UserSettings, Currency, Tag } from '@/types/core'
   ```

3. **CircularCheckbox 组件重复**
   ```typescript
   // 提取为共享组件
   // 创建 src/components/ui/form/CircularCheckbox.tsx
   ```

## 🛠️ 常用工具和命令

### 质量检查命令

```bash
# 完整质量检查
pnpm lint && pnpm type-check && pnpm test && pnpm format:check

# 类型分析
node scripts/analyze-type-usage.js

# 进度跟踪
node scripts/track-refactor-progress.js
```

### 调试命令

```bash
# 详细类型检查
pnpm type-check:detailed

# 严格模式类型检查
pnpm type-check:strict

# 测试覆盖率
pnpm test:coverage
```

## 📊 进度跟踪

### 第一阶段检查清单

- [ ] Jest 配置修复完成
- [ ] 测试用例全部通过
- [ ] 代码格式化 100% 一致
- [ ] ESLint 错误数量 < 10
- [ ] 构建流程正常运行

### 每日检查

```bash
# 每天开始工作前运行
pnpm lint && pnpm test && pnpm type-check
```

### 提交前检查

```bash
# Git hooks 会自动运行，也可手动执行
pnpm pre-commit
```

## 🆘 常见问题解决

### Q: Jest 测试一直失败怎么办？

A: 检查 `moduleNameMapper` 配置是否正确，确保路径映射正确

### Q: ESLint 错误太多，如何批量修复？

A: 使用 `node scripts/smart-lint-fix.js`，然后手动处理剩余问题

### Q: 类型检查通过但 IDE 报错？

A: 重启 TypeScript 服务：VSCode 中按 `Ctrl+Shift+P`，选择 "TypeScript: Restart TS Server"

### Q: 格式化后代码变乱了？

A: 检查 `.prettierrc.js` 配置，确保与团队设置一致

## 📞 获取帮助

### 技术支持

- **项目文档**: 查看 `docs/` 目录下的相关文档
- **开发规范**: 参考 `CODE_GUIDE_DOC/DEVELOPMENT_STANDARDS.md`
- **问题反馈**: 创建 GitHub Issue 或联系项目负责人

### 有用的资源

- **TypeScript 手册**: https://www.typescriptlang.org/docs/
- **ESLint 规则**: https://eslint.org/docs/rules/
- **Jest 文档**: https://jestjs.io/docs/getting-started
- **Prettier 配置**: https://prettier.io/docs/en/configuration.html

---

**开始时间**: 现在就开始！  
**预计完成**: 1-2 天内完成第一阶段  
**下一步**: 完成后查看完整优化计划文档
