# 🔄 定期交易与贷款合约功能开发任务清单

## 📋 项目概述

基于 `RECURRING_TRANSACTIONS_FINAL_SPECIFICATION.md`
规范文档，本任务清单详细列出了定期交易和贷款合约功能的开发进度和待完成任务。

## 🎯 核心功能模块

### 1. **定期交易管理** - 自动化重复性收支记录

### 2. **贷款合约管理** - 负债账户的贷款信息和自动还款

### 3. **统一同步机制** - 用户登录时的智能数据同步

### 4. **Dashboard 状态监控** - 同步状态的可视化管理

---

## 📊 当前实施进度总览

| 模块                        | 进度 | 状态      | 备注                                        |
| --------------------------- | ---- | --------- | ------------------------------------------- |
| 数据库设计                  | 100% | ✅ 已完成 | 所有表结构已创建并迁移                      |
| TypeScript 类型定义         | 100% | ✅ 已完成 | 所有类型已在 src/types/core/index.ts 中定义 |
| 核心服务类                  | 100% | ✅ 已完成 | 所有服务已实现并测试                        |
| API 接口                    | 100% | ✅ 已完成 | 所有接口已实现，包括账户关联接口            |
| 前端组件                    | 90%  | 🔄 进行中 | 主要组件已完成，集成工作基本完成            |
| Dashboard 集成              | 100% | ✅ 已完成 | SyncStatusCard已集成到Dashboard             |
| StockAccountDetailView 集成 | 100% | ✅ 已完成 | 贷款合约管理界面已集成                      |
| FlowAccountDetailView 集成  | 100% | ✅ 已完成 | 定期交易管理界面已集成                      |
| UserDataContext 扩展        | 100% | ✅ 已完成 | 同步状态管理已实现                          |

---

## 🏗️ 阶段一：基础同步机制（2-3天）

### ✅ 已完成任务

#### 1.1 数据库表结构 ✅ 100%

- [x] **用户设置表扩展** - `user_settings` 表已添加同步字段
  - `lastRecurringSync` DATETIME
  - `recurringProcessingStatus` TEXT DEFAULT 'idle'
- [x] **定期交易处理日志表** - `recurring_processing_logs` 表已创建
- [x] **定期交易表** - `recurring_transactions` 表已创建
- [x] **贷款合约表** - `loan_contracts` 表已创建
- [x] **贷款还款记录表** - `loan_payments` 表已创建
- [x] **交易表扩展** - `transactions` 表已添加贷款关联字段
  - `recurringTransactionId` 关联定期交易
  - `loanContractId` 关联贷款合约
  - `loanPaymentId` 关联贷款还款记录
  - `status` 交易状态（COMPLETED/PENDING/CANCELLED）
  - `scheduledDate` 计划执行日期

#### 1.2 TypeScript 类型定义 ✅ 100%

- [x] **核心类型定义** - `src/types/core/index.ts` 已完整实现
  - `RecurringTransaction` 定期交易接口
  - `LoanContract` 贷款合约接口
  - `LoanPayment` 贷款还款记录接口
  - `SyncStatus` 同步状态接口
  - `RecurringProcessingLog` 处理日志接口
  - `RepaymentType` 还款类型枚举
  - `RecurrenceFrequency` 重复频率枚举
  - `TransactionStatus` 交易状态枚举

#### 1.3 核心服务类实现 ✅ 95%

- [x] **RecurringTransactionService** - `src/lib/services/recurring-transaction.service.ts`
  - 创建、更新、删除定期交易
  - 计算下次执行日期
  - 执行定期交易生成记录
  - 获取用户定期交易列表
- [x] **LoanContractService** - `src/lib/services/loan-contract.service.ts`
  - 创建、更新、删除贷款合约
  - 处理贷款还款
  - 贷款计算功能
  - 获取账户贷款合约
- [x] **SyncStatusService** - `src/lib/services/sync-status.service.ts`
  - 检查是否需要同步
  - 获取同步状态
  - 更新同步状态
  - 未来数据刷新检查
- [x] **UnifiedSyncService** - `src/lib/services/unified-sync.service.ts`
  - 触发用户同步
  - 处理定期交易和贷款合约
  - 异步处理机制
- [x] **FutureDataGenerationService** - `src/lib/services/future-data-generation.service.ts`
  - 生成未来7天的定期交易
  - 生成未来7天的贷款还款
  - 清理过期数据
  - 处理到期交易
- [x] **LoanCalculationService** - `src/lib/services/loan-calculation.service.ts`
  - 贷款计算算法
  - 还款计划生成
  - 参数验证

#### 1.4 API 接口开发 ✅ 90%

- [x] **定期交易 API** - `/api/recurring-transactions/*`
  - GET/POST `/api/recurring-transactions` - 列表和创建
  - PUT/DELETE `/api/recurring-transactions/[id]` - 更新和删除
  - 支持标签关联和分页
- [x] **贷款合约 API** - `/api/loan-contracts/*`
  - GET/POST `/api/loan-contracts` - 列表和创建
  - PUT/DELETE `/api/loan-contracts/[id]` - 更新和删除
  - 包含贷款计算和验证
- [x] **同步管理 API** - `/api/sync/*`
  - POST `/api/sync/trigger` - 触发同步
  - GET `/api/sync/status` - 获取同步状态
  - GET `/api/sync/check` - 检查是否需要同步
  - GET `/api/sync/summary` - 获取同步摘要
- [x] **账户关联 API** - ✅ 已完成
  - ✅ GET `/api/accounts/[id]/recurring-transactions` - 获取账户定期交易
  - ✅ GET `/api/accounts/[id]/loan-contracts` - 获取账户贷款合约

### ✅ 已完成任务

#### 1.4 UserDataContext 扩展 ✅ 100%

- [x] **扩展 Context 接口**

  ```typescript
  interface UserDataContextType {
    // 现有属性...

    // 同步相关
    syncStatus: SyncStatus
    triggerSync: (force?: boolean) => Promise<void>
    refreshSyncStatus: () => Promise<void>
    isInitialSyncComplete: boolean
  }
  ```

- [x] **添加同步状态管理**
  - 初始化时检查同步状态
  - 自动触发同步检查
  - 同步状态更新机制
- [x] **集成同步 API 调用**
  - `/api/sync/status` 状态查询
  - `/api/sync/check` 需要同步检查
  - `/api/sync/trigger` 触发同步

---

## 🎨 阶段二：Dashboard 集成（1-2天）

### ✅ 已完成任务

#### 2.1 SyncStatusCard 组件开发 ✅ 100%

- [x] **创建同步状态卡片组件**
  - 文件：`src/components/features/dashboard/SyncStatusCard.tsx`
  - 显示同步状态（idle/processing/completed/failed）
  - 显示最后同步时间
  - 显示处理统计（定期交易数、贷款合约数）
  - 显示未来数据生成状态
  - 支持手动触发同步

#### 2.2 Dashboard 页面集成 ✅ 100%

- [x] **在 DashboardContent.tsx 中集成同步状态**
  - 添加 SyncStatusCard 组件
  - 位置：在财务统计卡片区域
  - 响应式布局适配

#### 2.3 手动触发功能实现 ✅ 100%

- [x] **同步重试按钮**
  - 失败状态时显示重试按钮
  - 调用 `triggerSync(true)` 强制同步
  - 显示处理进度

#### 2.4 状态显示优化 ✅ 100%

- [x] **国际化支持**
  - 添加同步相关翻译键值
  - 中英文双语支持
- [x] **主题适配**
  - 深色/浅色主题支持
  - 状态颜色适配

---

## 🏦 阶段三：贷款合约功能（3-4天）

### ❌ 待完成任务

#### 3.1 贷款管理组件开发 ❌

- [ ] **LoanContractsList 组件**

  - 文件：`src/components/features/loans/LoanContractsList.tsx`
  - 贷款合约列表显示
  - 支持编辑、删除操作
  - 响应式设计
  - 进度条显示

- [ ] **LoanContractModal 组件**
  - 文件：`src/components/features/loans/LoanContractModal.tsx`
  - 创建/编辑贷款合约表单
  - 贷款计算预览
  - 表单验证
  - 还款方式选择

#### 3.2 StockAccountDetailView 集成 ❌

- [ ] **扩展 StockAccountDetailView.tsx**
  - 添加贷款合约管理区域
  - 仅在 LIABILITY 类型账户显示
  - 集成 LoanContractsList 和 LoanContractModal
  - 加载贷款合约数据

#### 3.3 贷款合约 API 集成 ❌

- [ ] **账户贷款合约接口**
  - GET `/api/accounts/[id]/loan-contracts` - 获取账户贷款合约
  - 在 StockAccountDetailView 中调用

---

## 🔧 阶段四：FlowTransactionModal 扩展（2-3天）

### ❌ 待完成任务

#### 4.1 定期交易功能集成 ❌

- [ ] **扩展 FlowTransactionModal.tsx**
  - 添加定期交易复选框
  - 定期交易选项面板
  - 频率选择（日/周/月/季/年）
  - 间隔设置
  - 结束条件设置

#### 4.2 表单验证增强 ❌

- [ ] **定期交易数据验证**
  - 日期逻辑验证
  - 次数限制验证
  - 频率参数验证

#### 4.3 FlowAccountDetailView 扩展 ❌

- [ ] **定期交易管理区域**
  - 在账户详情页添加定期交易列表
  - 显示定期交易状态
  - 支持暂停/恢复操作

---

## 🧪 阶段五：测试和优化（1-2天）

### ❌ 待完成任务

#### 5.1 端到端功能测试 ❌

- [ ] **定期交易流程测试**

  - 创建定期交易
  - 自动生成交易记录
  - 同步机制测试

- [ ] **贷款合约流程测试**
  - 创建贷款合约
  - 自动还款处理
  - 余额更新测试

#### 5.2 错误处理完善 ❌

- [ ] **异常情况处理**
  - 网络错误处理
  - 数据验证错误
  - 同步失败恢复

#### 5.3 性能优化 ❌

- [ ] **数据库查询优化**
  - 索引优化
  - 批量操作优化
- [ ] **前端性能优化**
  - 组件懒加载
  - 数据缓存策略

#### 5.4 文档更新 ❌

- [ ] **API 文档更新**
- [ ] **组件使用文档**
- [ ] **部署指南更新**

---

## 📝 开发优先级建议

### 🔥 高优先级（立即开始）

1. ✅ **UserDataContext 扩展** - 基础同步机制的前端支持（已完成）
2. ✅ **SyncStatusCard 组件** - Dashboard 同步状态显示（已完成）
3. ✅ **LoanContractsList 组件** - 贷款合约列表显示（已完成）
4. ✅ **LoanContractModal 组件** - 贷款合约创建/编辑（已完成）
5. ✅ **RecurringTransactionsList 组件** - 定期交易列表显示（已完成）
6. ✅ **RecurringTransactionModal 组件** - 定期交易创建/编辑（已完成）
7. ✅ **StockAccountDetailView 集成** - 贷款合约管理界面（已完成）
8. ✅ **FlowAccountDetailView 集成** - 定期交易管理界面（已完成）

### 🔶 中优先级（后续开发）

1. **LoanContractModal 组件** - 贷款合约创建/编辑
2. **StockAccountDetailView 集成** - 贷款合约管理
3. **FlowTransactionModal 扩展** - 定期交易功能

### 🔵 低优先级（最后完成）

1. **FlowAccountDetailView 扩展** - 定期交易管理
2. **测试和优化** - 功能完善和性能优化

---

## 🚀 下一步行动计划

### 本周任务（优先完成）

1. ✅ **扩展 UserDataContext** - 添加同步状态管理（已完成）
2. ✅ **创建 SyncStatusCard 组件** - Dashboard 同步状态显示（已完成）
3. ✅ **集成 Dashboard 同步状态** - 在 DashboardContent 中显示（已完成）

### 下周任务

1. **开发贷款合约组件** - LoanContractsList 和 LoanContractModal
2. **集成 StockAccountDetailView** - 贷款合约管理功能
3. **扩展 FlowTransactionModal** - 定期交易功能

---

## 📊 技术债务和注意事项

### 🔧 技术要点

1. **异步处理** - 使用 `setImmediate` 避免阻塞
2. **状态管理** - 防止重复触发和并发问题
3. **事务处理** - 确保数据一致性
4. **错误隔离** - 单个失败不影响整体

### ⚠️ 注意事项

1. **数据同步** - 修改数据后记得调用相应的更新方法
2. **权限检查** - 确保用户只能访问自己的数据
3. **国际化** - 所有新增文本都需要添加翻译
4. **主题适配** - 确保深色/浅色主题都正常显示

---

## 💻 详细实施指南

### 1. UserDataContext 扩展实施

#### 1.1 接口扩展

```typescript
// src/contexts/providers/UserDataContext.tsx
interface UserDataContextType {
  // 现有属性...

  // 同步相关
  syncStatus: SyncStatus
  triggerSync: (force?: boolean) => Promise<void>
  refreshSyncStatus: () => Promise<void>
  isInitialSyncComplete: boolean
}

interface SyncStatus {
  status: 'idle' | 'processing' | 'completed' | 'failed'
  lastSyncTime?: Date
  processedRecurring?: number
  processedLoans?: number
  failedCount?: number
  errorMessage?: string
  futureDataGenerated?: boolean
  futureDataUntil?: Date
}
```

#### 1.2 状态管理实现

```typescript
// 在 UserDataProvider 中添加
const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' })
const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(false)

// 初始化时检查同步状态
useEffect(() => {
  if (user && !isInitialSyncComplete) {
    checkAndTriggerSync()
  }
}, [user])

const checkAndTriggerSync = async () => {
  try {
    const response = await fetch('/api/sync/check')
    const result = await response.json()
    if (result.success && result.data.needsSync) {
      await triggerSync()
    }
    setIsInitialSyncComplete(true)
  } catch (error) {
    console.error('Failed to check sync status:', error)
    setIsInitialSyncComplete(true)
  }
}

const refreshSyncStatus = async () => {
  try {
    const response = await fetch('/api/sync/status')
    const result = await response.json()
    if (result.success) {
      setSyncStatus(result.data)
    }
  } catch (error) {
    console.error('Failed to refresh sync status:', error)
  }
}

const triggerSync = async (force: boolean = false) => {
  try {
    const response = await fetch('/api/sync/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    })

    const result = await response.json()
    if (result.success) {
      setSyncStatus(prev => ({ ...prev, status: 'processing' }))

      // 延迟刷新状态（给后台处理时间）
      setTimeout(refreshSyncStatus, 2000)
    }
  } catch (error) {
    console.error('Failed to trigger sync:', error)
  }
}
```

### 2. SyncStatusCard 组件实施

#### 2.1 组件结构

```typescript
// src/components/features/dashboard/SyncStatusCard.tsx
'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from 'next-themes'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { format } from 'date-fns'

export default function SyncStatusCard() {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()
  const { syncStatus, triggerSync } = useUserData()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400'
      case 'processing': return 'text-blue-600 dark:text-blue-400'
      case 'failed': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅'
      case 'processing': return '🔄'
      case 'failed': return '❌'
      default: return '⏸️'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('dashboard.sync.status')}
          </h3>
          <div className={`flex items-center mt-1 ${getStatusColor(syncStatus.status)}`}>
            <span className="mr-2">{getStatusIcon(syncStatus.status)}</span>
            <span className="text-sm">{t(`sync.status.${syncStatus.status}`)}</span>
          </div>
        </div>

        {syncStatus.status === 'failed' && (
          <button
            onClick={() => triggerSync(true)}
            className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400
                     border border-blue-300 dark:border-blue-600 rounded-md
                     hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            {t('sync.retry')}
          </button>
        )}
      </div>

      {syncStatus.lastSyncTime && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {t('sync.last.time')}: {format(syncStatus.lastSyncTime, 'yyyy-MM-dd HH:mm')}
        </p>
      )}

      {syncStatus.status === 'completed' && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1">
          <div>
            {t('sync.processed.summary', {
              recurring: syncStatus.processedRecurring || 0,
              loans: syncStatus.processedLoans || 0
            })}
          </div>
          {syncStatus.futureDataGenerated && syncStatus.futureDataUntil && (
            <div className="flex items-center space-x-1">
              <span className="text-green-600 dark:text-green-400">📅</span>
              <span>
                {t('sync.future.data.generated', {
                  until: format(syncStatus.futureDataUntil, 'MM-dd')
                })}
              </span>
            </div>
          )}
        </div>
      )}

      {syncStatus.status === 'failed' && syncStatus.errorMessage && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          {syncStatus.errorMessage}
        </p>
      )}
    </div>
  )
}
```

### 3. Dashboard 集成实施

#### 3.1 DashboardContent.tsx 修改

```typescript
// 在 DashboardContent.tsx 中添加
import SyncStatusCard from './SyncStatusCard'

// 在财务统计区域添加同步状态卡片
<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
  {/* 现有的财务统计卡片 */}
  {summaryData && (
    <>
      {/* 现有卡片... */}
    </>
  )}

  {/* 新增同步状态卡片 */}
  <div className="md:col-span-2 lg:col-span-1">
    <SyncStatusCard />
  </div>
</div>
```

### 4. 国际化支持

#### 4.1 翻译键值添加

```json
// public/locales/zh/common.json
{
  "dashboard.sync.status": "同步状态",
  "sync.status.idle": "待机",
  "sync.status.processing": "处理中",
  "sync.status.completed": "已完成",
  "sync.status.failed": "失败",
  "sync.retry": "重试",
  "sync.last.time": "最后同步",
  "sync.processed.summary": "已处理 {{recurring}} 个定期交易，{{loans}} 个贷款合约",
  "sync.future.data.generated": "已生成未来数据至 {{until}}"
}

// public/locales/en/common.json
{
  "dashboard.sync.status": "Sync Status",
  "sync.status.idle": "Idle",
  "sync.status.processing": "Processing",
  "sync.status.completed": "Completed",
  "sync.status.failed": "Failed",
  "sync.retry": "Retry",
  "sync.last.time": "Last Sync",
  "sync.processed.summary": "Processed {{recurring}} recurring transactions, {{loans}} loan contracts",
  "sync.future.data.generated": "Future data generated until {{until}}"
}
```

---

## 🔍 代码审查检查清单

### ✅ 开发标准遵循

- [ ] TypeScript 类型定义完整
- [ ] ESLint 规则通过
- [ ] 组件命名使用 PascalCase
- [ ] 服务文件使用 kebab-case
- [ ] 错误处理机制完善

### ✅ 用户体验

- [ ] 响应式设计适配
- [ ] 深色主题支持
- [ ] 加载状态指示
- [ ] 友好的错误提示
- [ ] 国际化支持

### ✅ 性能优化

- [ ] 避免不必要的重新渲染
- [ ] 合理的数据缓存策略
- [ ] 异步操作优化
- [ ] 数据库查询优化

---

---

## 📈 当前状态详细分析

### 🎯 已完成的核心基础设施（约 60%）

#### ✅ 后端基础设施 - 完成度 95%

- **数据库设计**：100% 完成，所有表结构已创建并迁移
- **类型定义**：100% 完成，所有 TypeScript 接口已定义
- **核心服务**：95% 完成，主要业务逻辑已实现
- **API 接口**：90% 完成，主要端点已实现

#### 🔧 缺失的后端组件

- [ ] 账户关联 API 接口（2个接口）
- [ ] 部分辅助服务优化

### 🎨 待开发的前端组件（约 15%）

#### ❌ 关键前端组件 - 完成度 15%

- **UserDataContext 扩展**：0% - 同步状态管理
- **Dashboard 集成**：0% - 同步状态显示
- **贷款合约组件**：0% - 管理界面
- **定期交易组件**：0% - FlowTransactionModal 扩展
- **StockAccountDetailView 集成**：0% - 贷款合约管理

### 🚀 立即可开始的任务

由于后端基础设施已基本完成，可以立即开始前端开发：

1. **UserDataContext 扩展** - 基础同步机制
2. **SyncStatusCard 组件** - Dashboard 状态显示
3. **账户关联 API** - 补充缺失接口

---

## 🎯 下一步具体行动计划

### 📅 第1天：UserDataContext 扩展

**目标**：实现同步状态管理基础设施

**任务清单**：

- [ ] 扩展 UserDataContext 接口定义
- [ ] 添加同步状态 state 管理
- [ ] 实现 triggerSync 和 refreshSyncStatus 方法
- [ ] 添加初始化时的自动同步检查
- [ ] 测试同步状态更新机制

**预计工时**：4-6 小时

### 📅 第2天：SyncStatusCard 组件开发

**目标**：创建 Dashboard 同步状态显示组件

**任务清单**：

- [ ] 创建 SyncStatusCard 组件文件
- [ ] 实现状态图标和颜色逻辑
- [ ] 添加重试按钮功能
- [ ] 实现响应式布局
- [ ] 添加国际化支持
- [ ] 集成到 DashboardContent

**预计工时**：4-6 小时

### 📅 第3天：账户关联 API 补充

**目标**：完善缺失的 API 接口

**任务清单**：

- [ ] 创建 `/api/accounts/[id]/recurring-transactions` 接口
- [ ] 创建 `/api/accounts/[id]/loan-contracts` 接口
- [ ] 添加适当的权限检查和验证
- [ ] 测试接口功能

**预计工时**：2-3 小时

### 📅 第4-5天：贷款合约组件开发

**目标**：实现贷款合约管理界面

**任务清单**：

- [ ] 创建 LoanContractsList 组件
- [ ] 创建 LoanContractModal 组件
- [ ] 实现贷款计算预览功能
- [ ] 添加表单验证和错误处理
- [ ] 实现响应式设计

**预计工时**：8-10 小时

### 📅 第6-7天：StockAccountDetailView 集成

**目标**：在负债账户中集成贷款合约管理

**任务清单**：

- [ ] 扩展 StockAccountDetailView 组件
- [ ] 添加贷款合约管理区域
- [ ] 集成 LoanContractsList 和 LoanContractModal
- [ ] 实现数据加载和更新逻辑
- [ ] 测试完整流程

**预计工时**：6-8 小时

### 📅 第8-10天：FlowTransactionModal 扩展

**目标**：添加定期交易功能

**任务清单**：

- [ ] 扩展 FlowTransactionModal 表单
- [ ] 添加定期交易选项面板
- [ ] 实现频率和间隔设置
- [ ] 添加表单验证
- [ ] 集成到 FlowAccountDetailView

**预计工时**：8-10 小时

---

## 🔥 本周重点任务（优先级排序）

### 🥇 最高优先级（必须完成）

1. **UserDataContext 扩展** - 基础同步机制
2. **SyncStatusCard 组件** - Dashboard 状态显示
3. **账户关联 API 补充** - 完善后端接口

### 🥈 高优先级（尽量完成）

4. **LoanContractsList 组件** - 贷款合约列表
5. **LoanContractModal 组件** - 贷款合约创建/编辑

### 🥉 中优先级（时间允许）

6. **StockAccountDetailView 集成** - 贷款合约管理界面

---

**总体进度：约 100% 完成（后端）+ 95% 完成（前端）= 98% 总体完成**

**预计完成时间：1 个工作日（测试和优化）**

**下一步：功能测试、用户体验优化、文档完善**

---

## 🚀 快速开始指南

### 1. 验证后端基础设施

在开始前端开发之前，确保后端基础设施正常工作：

```bash
# 检查数据库迁移状态
pnpm db:migrate:status

# 如果需要，应用迁移
pnpm db:migrate:deploy

# 重新生成 Prisma 客户端
pnpm db:generate

# 启动开发服务器
pnpm dev
```

### 2. 测试现有 API 接口

使用以下 API 端点测试后端功能：

```bash
# 测试同步状态
curl http://localhost:3000/api/sync/status

# 测试同步检查
curl http://localhost:3000/api/sync/check

# 测试触发同步
curl -X POST http://localhost:3000/api/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{"force": false}'
```

### 3. 开始前端开发

按照优先级顺序开始开发：

1. **UserDataContext 扩展**

   - 文件：`src/contexts/providers/UserDataContext.tsx`
   - 参考：任务清单中的详细实施指南

2. **SyncStatusCard 组件**

   - 文件：`src/components/features/dashboard/SyncStatusCard.tsx`
   - 参考：任务清单中的组件实现代码

3. **Dashboard 集成**
   - 文件：`src/components/features/dashboard/DashboardContent.tsx`
   - 添加 SyncStatusCard 到财务统计区域

### 4. 开发环境配置

确保开发环境已正确配置：

```bash
# 安装依赖
pnpm install

# 检查 TypeScript 类型
pnpm type-check

# 运行 ESLint 检查
pnpm lint

# 运行测试（如果有）
pnpm test
```

### 5. 调试和测试

开发过程中的调试建议：

- 使用浏览器开发者工具监控网络请求
- 检查 Console 中的错误信息
- 使用 React DevTools 检查组件状态
- 测试不同的同步状态场景

---

## 📞 支持和资源

### 📚 相关文档

- [RECURRING_TRANSACTIONS_FINAL_SPECIFICATION.md](./RECURRING_TRANSACTIONS_FINAL_SPECIFICATION.md) - 完整技术规范
- [USER_DATA_CONTEXT_USAGE.md](./USER_DATA_CONTEXT_USAGE.md) - UserDataContext 使用指南
- [CODE_GUIDE_DOC/DEVELOPMENT_STANDARDS.md](../CODE_GUIDE_DOC/DEVELOPMENT_STANDARDS.md) - 开发标准

### 🔧 关键文件位置

- **类型定义**：`src/types/core/index.ts`
- **服务类**：`src/lib/services/`
- **API 路由**：`src/app/api/`
- **组件**：`src/components/features/`
- **数据库模式**：`prisma/schema.prisma`

### ⚠️ 注意事项

1. 所有新增文本都需要添加国际化翻译
2. 确保深色/浅色主题都正常显示
3. 遵循项目的 ESLint 规则和代码规范
4. 测试响应式设计在移动端的表现
5. 确保错误处理机制完善

---

---

## 📋 本次开发会话完成内容

### ✅ 已完成功能（2024-06-19）

#### 1. UserDataContext 扩展 ✅

- **文件**: `src/contexts/providers/UserDataContext.tsx`
- **新增功能**:
  - 扩展接口定义，添加 `syncStatus` 和 `isInitialSyncComplete` 状态
  - 添加 `triggerSync()` 和 `refreshSyncStatus()` 方法
  - 实现同步状态管理和API调用集成
  - 添加初始化时的自动同步检查逻辑
  - 完整的错误处理和状态更新机制

#### 2. SyncStatusCard 组件 ✅

- **文件**: `src/components/features/dashboard/SyncStatusCard.tsx`
- **功能特性**:
  - 显示同步状态（idle/processing/completed/failed）
  - 显示最后同步时间和处理统计
  - 支持手动重试功能
  - 完整的国际化支持（中英文）
  - 深色/浅色主题适配
  - 响应式设计和动画效果

#### 3. Dashboard 集成 ✅

- **文件**: `src/components/features/dashboard/DashboardContent.tsx`
- **集成内容**:
  - 将 SyncStatusCard 添加到财务统计卡片区域
  - 调整网格布局以适应新组件
  - 修复 ESLint 依赖问题

#### 4. 国际化支持 ✅

- **文件**:
  - `public/locales/zh/dashboard.json`
  - `public/locales/en/dashboard.json`
- **新增翻译**:
  - 同步状态相关的所有文本
  - 错误信息和操作按钮文本
  - 支持参数化翻译

#### 5. 验证现有API ✅

- **确认**: 所有账户关联API已存在并正常工作
  - `GET /api/accounts/[id]/recurring-transactions`
  - `GET /api/accounts/[id]/loan-contracts`

#### 6. LoanContractsList 组件 ✅

- **文件**: `src/components/features/accounts/LoanContractsList.tsx`
- **功能特性**:
  - 显示账户关联的贷款合约列表
  - 支持编辑和删除操作
  - 完整的加载状态和错误处理
  - 响应式设计和状态颜色标识
  - 完整的国际化支持

#### 7. LoanContractModal 组件 ✅

- **文件**: `src/components/features/accounts/LoanContractModal.tsx`
- **功能特性**:
  - 创建和编辑贷款合约
  - 完整的表单验证
  - 支持所有贷款合约字段
  - 响应式模态框设计
  - 完整的国际化支持

#### 8. 贷款合约国际化 ✅

- **文件**:
  - `public/locales/zh/loan.json`
  - `public/locales/en/loan.json`
- **新增翻译**:
  - 贷款合约相关的所有文本
  - 状态、频率、类型等枚举值翻译
  - 表单字段和操作按钮文本

#### 9. RecurringTransactionsList 组件 ✅

- **文件**: `src/components/features/accounts/RecurringTransactionsList.tsx`
- **功能特性**:
  - 显示账户关联的定期交易列表
  - 支持编辑和删除操作
  - 完整的加载状态和错误处理
  - 交易类型和状态的颜色标识
  - 完整的国际化支持

#### 10. RecurringTransactionModal 组件 ✅

- **文件**: `src/components/features/accounts/RecurringTransactionModal.tsx`
- **功能特性**:
  - 创建和编辑定期交易
  - 完整的表单验证
  - 支持收入/支出类型选择
  - 分类筛选和频率设置
  - 响应式模态框设计

#### 11. 定期交易国际化 ✅

- **文件**:
  - `public/locales/zh/recurring.json`
  - `public/locales/en/recurring.json`
- **新增翻译**:
  - 定期交易相关的所有文本
  - 交易类型、状态、频率翻译
  - 表单字段和操作按钮文本

#### 12. StockAccountDetailView 集成 ✅

- **文件**: `src/components/features/accounts/StockAccountDetailView.tsx`
- **集成内容**:
  - 添加贷款合约标签页
  - 集成 LoanContractsList 和 LoanContractModal
  - 完整的CRUD操作支持
  - 仅对LIABILITY类型账户显示

#### 13. FlowAccountDetailView 集成 ✅

- **文件**: `src/components/features/accounts/FlowAccountDetailView.tsx`
- **集成内容**:
  - 添加定期交易标签页
  - 集成 RecurringTransactionsList 和 RecurringTransactionModal
  - 完整的CRUD操作支持
  - 分类数据传递和处理

### 🎯 当前状态

- **后端基础设施**: 100% 完成
- **前端基础组件**: 95% 完成
- **Dashboard 集成**: 100% 完成
- **同步机制**: 100% 完成
- **贷款合约功能**: 100% 完成
- **定期交易功能**: 100% 完成
- **账户详情页集成**: 100% 完成

### 🚀 下一步开发重点

1. ✅ **LoanContractsList 组件** - 贷款合约列表显示（已完成）
2. ✅ **LoanContractModal 组件** - 贷款合约创建/编辑（已完成）
3. ✅ **StockAccountDetailView 集成** - 贷款合约管理界面（已完成）
4. ✅ **RecurringTransactionsList 组件** - 定期交易列表显示（已完成）
5. ✅ **RecurringTransactionModal 组件** - 定期交易创建/编辑（已完成）
6. ✅ **FlowAccountDetailView 集成** - 定期交易管理界面（已完成）
7. **FlowTransactionModal 扩展** - 添加定期交易功能（可选）
8. **测试和优化** - 完整功能测试

---

**准备就绪！可以开始开发了！** 🎉
