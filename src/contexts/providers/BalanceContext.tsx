'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import type {
  BalanceCategorySummary,
  ContextAccountBalance,
} from '@/types/components'

// Context 数据结构
interface BalanceContextType {
  // 账户余额数据
  accountBalances: Record<string, ContextAccountBalance>
  // 分类汇总数据（实时计算）
  categorySummaries: Record<string, BalanceCategorySummary>
  // 本位币信息
  baseCurrency: { code: string; symbol: string; name: string } | null
  // 加载状态
  isLoading: boolean
  // 错误状态
  error: string | null
  // 刷新数据
  refreshBalances: () => Promise<void>
  // 获取账户余额（本位币）
  getAccountBalance: (accountId: string) => number | null
  // 获取账户原始余额（指定货币）
  getAccountBalanceInCurrency: (
    accountId: string,
    currencyCode: string
  ) => number | null
  // 获取分类汇总
  getCategorySummary: (categoryId: string) => BalanceCategorySummary | null
  // 更新单个账户余额（用于实时更新）
  updateAccountBalance: (
    accountId: string,
    balances: ContextAccountBalance['balances']
  ) => void
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined)

interface CategoryNode {
  id: string
  name: string
  parentId: string | null
  children?: CategoryNode[]
}

interface BalanceProviderProps {
  children: React.ReactNode
  categories: CategoryNode[]
  accounts: Array<{
    id: string
    name: string
    categoryId: string
  }>
}

export function BalanceProvider({
  children,
  categories,
  accounts,
}: BalanceProviderProps) {
  const [accountBalances, setAccountBalances] = useState<
    Record<string, ContextAccountBalance>
  >({})
  const [baseCurrency, setBaseCurrency] = useState<{
    code: string
    symbol: string
    name: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取账户余额
  const fetchAccountBalances = useCallback(async () => {
    if (accounts.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/accounts/balances')
      if (!response.ok) {
        throw new Error('获取账户余额失败')
      }

      const result = await response.json()
      if (result.success) {
        setAccountBalances(result.data.accountBalances || {})
        setBaseCurrency(result.data.baseCurrency || null)
      } else {
        throw new Error(result.message || '获取账户余额失败')
      }
    } catch (err) {
      console.error('Error fetching account balances:', err)
      setError(err instanceof Error ? err.message : '获取账户余额失败')
    } finally {
      setIsLoading(false)
    }
  }, [accounts])

  // 初始加载
  useEffect(() => {
    fetchAccountBalances()
  }, [fetchAccountBalances])

  // 计算分类汇总（实时计算）
  const categorySummaries = React.useMemo(() => {
    const summaries: Record<string, BalanceCategorySummary> = {}

    // 构建分类树映射
    const categoryMap = new Map<
      string,
      {
        id: string
        name: string
        parentId: string | null
        children: string[]
      }
    >()

    categories.forEach(category => {
      categoryMap.set(category.id, {
        id: category.id,
        name: category.name,
        parentId: category.parentId,
        children: [],
      })
    })

    // 建立父子关系
    categories.forEach(category => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children.push(category.id)
        }
      }
    })

    // 递归计算分类汇总
    const calculateCategorySummary = (
      categoryId: string,
      currencyCode: string = 'CNY'
    ): BalanceCategorySummary => {
      if (summaries[`${categoryId}-${currencyCode}`]) {
        return summaries[`${categoryId}-${currencyCode}`]
      }

      const category = categoryMap.get(categoryId)
      if (!category) {
        return {
          id: categoryId,
          totalBalance: 0,
          currencySymbol: '¥',
          currencyCode,
          childrenBalance: 0,
          accountsBalance: 0,
        }
      }

      // 计算该分类下直接账户的余额（使用本位币）
      let accountsBalance = 0
      const currencySymbol = baseCurrency?.symbol || '¥'

      accounts
        .filter(account => account.categoryId === categoryId)
        .forEach(account => {
          const accountBalance = accountBalances[account.id]
          if (accountBalance) {
            accountsBalance += accountBalance.balanceInBaseCurrency
          }
        })

      // 计算子分类的余额
      let childrenBalance = 0
      category.children.forEach(childId => {
        const childSummary = calculateCategorySummary(childId, currencyCode)
        childrenBalance += childSummary.totalBalance
      })

      const summary: BalanceCategorySummary = {
        id: categoryId,
        totalBalance: accountsBalance + childrenBalance,
        currencySymbol,
        currencyCode: baseCurrency?.code || 'CNY',
        childrenBalance,
        accountsBalance,
      }

      summaries[`${categoryId}-${baseCurrency?.code || 'CNY'}`] = summary
      return summary
    }

    // 为所有分类计算汇总
    categories.forEach(category => {
      calculateCategorySummary(category.id, baseCurrency?.code || 'CNY')
    })

    return summaries
  }, [accountBalances, categories, accounts])

  // 获取账户余额的便捷方法（本位币）
  const getAccountBalance = useCallback(
    (accountId: string): number | null => {
      const accountBalance = accountBalances[accountId]
      if (!accountBalance) {
        return null
      }
      return accountBalance.balanceInBaseCurrency
    },
    [accountBalances]
  )

  // 获取账户原始余额的便捷方法（指定货币）
  const getAccountBalanceInCurrency = useCallback(
    (accountId: string, currencyCode: string): number | null => {
      const accountBalance = accountBalances[accountId]
      if (!accountBalance || !accountBalance.balances[currencyCode]) {
        return null
      }
      return accountBalance.balances[currencyCode].amount
    },
    [accountBalances]
  )

  // 获取分类汇总的便捷方法
  const getCategorySummary = useCallback(
    (categoryId: string): BalanceCategorySummary | null => {
      return (
        categorySummaries[`${categoryId}-${baseCurrency?.code || 'CNY'}`] ||
        null
      )
    },
    [categorySummaries, baseCurrency]
  )

  // 更新单个账户余额
  const updateAccountBalance = useCallback(
    (accountId: string, balances: ContextAccountBalance['balances']) => {
      setAccountBalances(prev => ({
        ...prev,
        [accountId]: {
          ...prev[accountId],
          balances,
        },
      }))
    },
    []
  )

  const value: BalanceContextType = {
    accountBalances,
    categorySummaries,
    baseCurrency,
    isLoading,
    error,
    refreshBalances: fetchAccountBalances,
    getAccountBalance,
    getAccountBalanceInCurrency,
    getCategorySummary,
    updateAccountBalance,
  }

  return (
    <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>
  )
}

export function useBalance() {
  const context = useContext(BalanceContext)
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider')
  }
  return context
}
