# 📋 数据质量检查系统集成指南

## 🎯 概述

本指南介绍如何将新实现的数据质量检查系统集成到Flow Balance项目中，包括API集成、前端集成和使用示例。

## 📁 文件结构

```
src/lib/validation/
├── data-quality-engine.ts          # 统一数据质量检查引擎
├── loan-contract-validator.ts      # 贷款合约验证器
├── exchange-rate-validator.ts      # 汇率数据验证器
├── data-consistency-validator.ts   # 数据一致性验证器
├── recurring-transaction-validator.ts # 定期交易验证器
├── time-logic-validator.ts         # 时间逻辑验证器
└── deletion-impact-analyzer.ts     # 删除影响分析器
```

## 🔧 API集成示例

### 1. 贷款合约API集成

```typescript
// src/app/api/loan-contracts/route.ts
import { DataQualityEngine } from '@/lib/validation/data-quality-engine'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const data = await request.json()

    // 数据质量验证
    const validation = await DataQualityEngine.validateLoanContract(user.id, data)

    if (!validation.isValid) {
      return errorResponse(`数据验证失败: ${validation.errors.join(', ')}`, 400)
    }

    // 显示警告信息（如果有）
    if (validation.warnings.length > 0) {
      console.warn('贷款合约创建警告:', validation.warnings)
    }

    // 继续创建贷款合约...
    const loanContract = await LoanContractService.createLoanContract(user.id, data)

    return successResponse(loanContract, '贷款合约创建成功')
  } catch (error) {
    return errorResponse('创建贷款合约失败', 500)
  }
}
```

### 2. 汇率数据API集成

```typescript
// src/app/api/exchange-rates/route.ts
import { DataQualityEngine } from '@/lib/validation/data-quality-engine'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const data = await request.json()

    // 汇率数据验证
    const validation = await DataQualityEngine.validateExchangeRate(user.id, data)

    if (!validation.isValid) {
      return errorResponse(`汇率数据验证失败: ${validation.errors.join(', ')}`, 400)
    }

    // 继续创建汇率记录...
    const exchangeRate = await ExchangeRateService.createExchangeRate(user.id, data)

    return successResponse(exchangeRate, '汇率创建成功')
  } catch (error) {
    return errorResponse('创建汇率失败', 500)
  }
}
```

### 3. 数据质量检查API

```typescript
// src/app/api/data-quality/check/route.ts
import { DataQualityEngine } from '@/lib/validation/data-quality-engine'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'full'

    let result
    if (type === 'quick') {
      result = await DataQualityEngine.runQuickDataQualityCheck(user.id)
    } else {
      result = await DataQualityEngine.runFullDataQualityCheck(user.id)
    }

    return successResponse(result)
  } catch (error) {
    return errorResponse('数据质量检查失败', 500)
  }
}
```

### 4. 数据质量报告API

```typescript
// src/app/api/data-quality/report/route.ts
import { DataQualityEngine } from '@/lib/validation/data-quality-engine'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const report = await DataQualityEngine.generateDataQualityReport(user.id)

    return successResponse(report)
  } catch (error) {
    return errorResponse('生成数据质量报告失败', 500)
  }
}
```

### 5. 删除影响分析API

```typescript
// src/app/api/deletion-impact/route.ts
import { DataQualityEngine } from '@/lib/validation/data-quality-engine'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    const { type, targetId } = await request.json()

    const impact = await DataQualityEngine.analyzeDeletionImpact(type, user.id, targetId)

    return successResponse(impact)
  } catch (error) {
    return errorResponse('分析删除影响失败', 500)
  }
}
```

## 🎨 前端集成示例

### 1. 数据质量检查Hook

```typescript
// src/hooks/useDataQuality.ts
import { useState, useCallback } from 'react'
import { apiCall } from '@/lib/api/client'

interface DataQualityResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
  score: number
}

export function useDataQuality() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DataQualityResult | null>(null)

  const runCheck = useCallback(async (type: 'full' | 'quick' = 'full') => {
    setLoading(true)
    try {
      const response = await apiCall(`/api/data-quality/check?type=${type}`)
      if (response.success) {
        setResult(response.data)
      }
    } catch (error) {
      console.error('数据质量检查失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const generateReport = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiCall('/api/data-quality/report')
      return response.success ? response.data : null
    } catch (error) {
      console.error('生成数据质量报告失败:', error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    result,
    runCheck,
    generateReport,
  }
}
```

### 2. 数据质量状态组件

```typescript
// src/components/DataQualityStatus.tsx
import React from 'react'
import { useDataQuality } from '@/hooks/useDataQuality'

interface DataQualityStatusProps {
  showDetails?: boolean
}

export function DataQualityStatus({ showDetails = false }: DataQualityStatusProps) {
  const { loading, result, runCheck } = useDataQuality()

  React.useEffect(() => {
    runCheck('quick')
  }, [runCheck])

  if (loading) {
    return <div className="animate-pulse">检查数据质量中...</div>
  }

  if (!result) {
    return <div className="text-gray-500">暂无数据质量信息</div>
  }

  const getStatusColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusText = (score: number) => {
    if (score >= 90) return '优秀'
    if (score >= 70) return '良好'
    return '需要改进'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">数据质量</h3>
        <div className={`text-2xl font-bold ${getStatusColor(result.score)}`}>
          {result.score}分
        </div>
      </div>

      <div className="mt-2">
        <span className={`text-sm ${getStatusColor(result.score)}`}>
          {getStatusText(result.score)}
        </span>
      </div>

      {showDetails && (
        <div className="mt-4 space-y-2">
          {result.errors.length > 0 && (
            <div className="text-red-600">
              <strong>错误 ({result.errors.length}):</strong>
              <ul className="list-disc list-inside text-sm mt-1">
                {result.errors.slice(0, 3).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="text-yellow-600">
              <strong>警告 ({result.warnings.length}):</strong>
              <ul className="list-disc list-inside text-sm mt-1">
                {result.warnings.slice(0, 3).map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {result.suggestions.length > 0 && (
            <div className="text-blue-600">
              <strong>建议:</strong>
              <ul className="list-disc list-inside text-sm mt-1">
                {result.suggestions.slice(0, 2).map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => runCheck('full')}
        className="mt-4 text-sm text-blue-600 hover:text-blue-800"
      >
        运行完整检查
      </button>
    </div>
  )
}
```

### 3. 删除确认对话框

```typescript
// src/components/DeleteConfirmDialog.tsx
import React, { useState, useEffect } from 'react'
import { apiCall } from '@/lib/api/client'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  type: 'account' | 'category' | 'currency'
  targetId: string
  targetName: string
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  type,
  targetId,
  targetName,
}: DeleteConfirmDialogProps) {
  const [impact, setImpact] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && targetId) {
      analyzeDeletionImpact()
    }
  }, [isOpen, targetId])

  const analyzeDeletionImpact = async () => {
    setLoading(true)
    try {
      const response = await apiCall('/api/deletion-impact', {
        method: 'POST',
        body: JSON.stringify({ type, targetId }),
      })
      if (response.success) {
        setImpact(response.data)
      }
    } catch (error) {
      console.error('分析删除影响失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-green-600'
      case 'MEDIUM': return 'text-yellow-600'
      case 'HIGH': return 'text-orange-600'
      case 'CRITICAL': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium mb-4">
          确认删除 {targetName}
        </h3>

        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">分析删除影响中...</p>
          </div>
        ) : impact ? (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">风险等级:</span>
                <span className={`text-sm font-bold ${getRiskColor(impact.impactSummary.riskLevel)}`}>
                  {impact.impactSummary.riskLevel}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm">影响记录数:</span>
                <span className="text-sm">{impact.impactSummary.affectedRecords}</span>
              </div>
            </div>

            {impact.errors.length > 0 && (
              <div className="text-red-600">
                <strong className="text-sm">阻止删除的问题:</strong>
                <ul className="list-disc list-inside text-sm mt-1">
                  {impact.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {impact.warnings.length > 0 && (
              <div className="text-yellow-600">
                <strong className="text-sm">警告:</strong>
                <ul className="list-disc list-inside text-sm mt-1">
                  {impact.warnings.slice(0, 3).map((warning: string, index: number) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {impact.recommendations.alternativeActions.length > 0 && (
              <div className="text-blue-600">
                <strong className="text-sm">建议操作:</strong>
                <ul className="list-disc list-inside text-sm mt-1">
                  {impact.recommendations.alternativeActions.map((action: string, index: number) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600">无法分析删除影响</p>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={impact && !impact.recommendations.canDelete}
            className={`px-4 py-2 rounded ${
              impact && !impact.recommendations.canDelete
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  )
}
```

## 🔄 定时任务集成

### 1. 数据质量定时检查

```typescript
// src/lib/cron/data-quality-check.ts
import { DataQualityEngine } from '@/lib/validation/data-quality-engine'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function runScheduledDataQualityCheck() {
  try {
    console.log('开始定时数据质量检查...')

    // 获取所有用户
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    })

    const results = []

    for (const user of users) {
      try {
        const result = await DataQualityEngine.runQuickDataQualityCheck(user.id)

        // 如果发现严重问题，记录日志
        if (result.errors.length > 0) {
          console.warn(`用户 ${user.email} 数据质量问题:`, result.errors)
        }

        results.push({
          userId: user.id,
          email: user.email,
          score: result.score,
          issues: result.errors.length + result.warnings.length,
        })
      } catch (error) {
        console.error(`检查用户 ${user.email} 数据质量失败:`, error)
      }
    }

    // 生成汇总报告
    const averageScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length
    const totalIssues = results.reduce((sum, r) => sum + r.issues, 0)

    console.log(`数据质量检查完成: 平均分数 ${averageScore.toFixed(1)}, 总问题数 ${totalIssues}`)

    return {
      totalUsers: users.length,
      averageScore,
      totalIssues,
      results,
    }
  } catch (error) {
    console.error('定时数据质量检查失败:', error)
    throw error
  }
}
```

## 📝 使用建议

### 1. 渐进式集成

- 先在新功能中集成验证器
- 逐步在现有功能中添加验证
- 监控验证性能影响

### 2. 错误处理策略

- 错误级别问题阻止操作
- 警告级别问题记录日志但允许操作
- 建议级别问题仅提示用户

### 3. 性能优化

- 对于频繁调用的验证，考虑添加缓存
- 大数据量验证时使用分页处理
- 异步执行非关键验证

### 4. 用户体验

- 提供清晰的错误信息和修复建议
- 在适当的地方显示数据质量状态
- 允许用户手动触发数据质量检查

### 5. 监控和维护

- 定期检查验证器的准确性
- 根据业务变化更新验证规则
- 监控验证性能和错误率

通过以上集成方案，可以将数据质量检查系统无缝集成到Flow Balance项目中，提升整体数据质量和用户体验。
