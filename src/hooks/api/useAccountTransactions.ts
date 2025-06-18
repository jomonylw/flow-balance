'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUserData } from '@/contexts/providers/UserDataContext'

// API响应类型定义
interface TransactionCheckResponse {
  data?: {
    transactions?: unknown[]
  }
}

interface BatchTransactionCheckResponse {
  data?: Record<string, { hasTransactions: boolean }>
}

/**
 * Hook for checking if an account has transactions
 * 优化版本：减少不必要的API调用，只在真正需要时检查
 */
export const useAccountTransactions = (
  accountId: string,
  autoCheck: boolean = false,
) => {
  const { accountTransactionCache, setAccountHasTransactions } = useUserData()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 检查缓存中是否已有数据
  const hasTransactions = accountTransactionCache[accountId]
  const isCached = accountId in accountTransactionCache

  // 获取账户交易记录状态
  const checkTransactions = useCallback(async () => {
    if (isCached || isLoading) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(
        `/api/accounts/${accountId}/transactions?limit=1`,
      )
      if (!response.ok) {
        throw new Error('获取交易记录失败')
      }

      const result: TransactionCheckResponse = await response.json()
      const hasTransactionsResult = (result.data?.transactions?.length || 0) > 0

      // 更新缓存
      setAccountHasTransactions(accountId, hasTransactionsResult)
    } catch (err) {
      console.error('Error checking account transactions:', err)
      setError(err instanceof Error ? err.message : '检查交易记录失败')
    } finally {
      setIsLoading(false)
    }
  }, [accountId, isCached, isLoading, setAccountHasTransactions])

  // 强制刷新（清除缓存并重新获取）
  const refresh = useCallback(async () => {
    // 清除缓存
    const newCache = { ...accountTransactionCache }
    delete newCache[accountId]

    // 重新获取
    await checkTransactions()
  }, [accountId, accountTransactionCache, checkTransactions])

  // 只有在autoCheck为true时才自动检查
  useEffect(() => {
    if (autoCheck && !isCached && !isLoading) {
      checkTransactions()
    }
  }, [autoCheck, isCached, isLoading, checkTransactions])

  return {
    hasTransactions: hasTransactions ?? false,
    isLoading,
    error,
    isCached,
    refresh,
    checkTransactions,
  }
}

/**
 * Hook for batch checking multiple accounts' transaction status
 * 优化版本：使用新的批量检查API
 */
export const useBatchAccountTransactions = (accountIds: string[]) => {
  const { accountTransactionCache, setAccountHasTransactions } = useUserData()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 检查哪些账户需要获取数据
  const uncachedAccountIds = accountIds.filter(
    id => !(id in accountTransactionCache),
  )

  // 批量获取账户交易记录状态 - 使用新的批量API
  const checkBatchTransactions = useCallback(async () => {
    if (uncachedAccountIds.length === 0 || isLoading) return

    try {
      setIsLoading(true)
      setError(null)

      // 使用批量检查API
      const response = await fetch('/api/accounts/batch-transaction-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountIds: uncachedAccountIds,
        }),
      })

      if (!response.ok) {
        throw new Error('批量检查交易记录失败')
      }

      const result: BatchTransactionCheckResponse = await response.json()
      const batchResults = result.data || {}

      // 更新缓存
      Object.entries(batchResults).forEach(
        ([accountId, data]: [string, { hasTransactions: boolean }]) => {
          setAccountHasTransactions(accountId, data.hasTransactions)
        },
      )
    } catch (err) {
      console.error('Error in batch checking account transactions:', err)
      setError(err instanceof Error ? err.message : '批量检查交易记录失败')
    } finally {
      setIsLoading(false)
    }
  }, [uncachedAccountIds, isLoading, setAccountHasTransactions])

  // 自动检查未缓存的账户
  useEffect(() => {
    if (uncachedAccountIds.length > 0 && !isLoading) {
      checkBatchTransactions()
    }
  }, [uncachedAccountIds.length, isLoading, checkBatchTransactions])

  // 获取所有账户的交易状态
  const getTransactionStatus = useCallback(
    (accountId: string) => {
      return {
        hasTransactions: accountTransactionCache[accountId] ?? false,
        isCached: accountId in accountTransactionCache,
      }
    },
    [accountTransactionCache],
  )

  return {
    isLoading,
    error,
    getTransactionStatus,
    checkBatchTransactions,
    uncachedCount: uncachedAccountIds.length,
  }
}

export default useAccountTransactions
