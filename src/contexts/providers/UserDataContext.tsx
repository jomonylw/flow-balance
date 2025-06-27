'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'
import { useAuth } from './AuthContext'
import { Language, Theme } from '@/types/core/constants'
import { ApiEndpoints } from '@/lib/constants/api-endpoints'
import type {
  SimpleCurrency,
  SimpleTag,
  SimpleAccount,
  SimpleCategory,
  CategoryType,
  SimpleTransactionTemplate,
  SyncStatus,
  ExchangeRateData,
} from '@/types/core'

// 本地类型定义（用于这个组件的特定需求）
interface UserDataTag extends SimpleTag {
  userId: string
  _count?: {
    transactions: number
  }
}

interface UserDataAccount extends SimpleAccount {
  description?: string
  color?: string
  currencyCode: string
  categoryId: string
  userId: string
  category: {
    id: string
    name: string
    type: CategoryType
  }
}

interface UserDataCategory extends SimpleCategory {
  parentId?: string | null
  order: number
  userId: string
  children?: UserDataCategory[]
}

interface UserDataTemplate extends SimpleTransactionTemplate {
  userId: string
  createdAt: Date
  updatedAt: Date
}

interface UserDataSettings {
  id: string
  userId: string
  baseCurrencyId: string
  baseCurrencyCode: string
  dateFormat: string
  language: Language
  theme: Theme
  fireEnabled?: boolean
  fireSWR: number
  futureDataDays: number
  autoUpdateExchangeRates: boolean
  lastExchangeRateUpdate: Date | null
  baseCurrency: SimpleCurrency
}

interface UserDataAccountBalances {
  [accountId: string]: {
    id: string
    name: string
    categoryId: string
    accountType: string
    balances: Record<
      string,
      {
        amount: number
        currency: SimpleCurrency
      }
    >
    balanceInBaseCurrency: number
  }
}

interface UserData {
  // 用户可用货币
  currencies: SimpleCurrency[]
  // 用户标签
  tags: UserDataTag[]
  // 用户账户
  accounts: UserDataAccount[]
  // 用户分类
  categories: UserDataCategory[]
  // 用户交易模板
  templates: UserDataTemplate[]
  // 用户设置
  userSettings: UserDataSettings | null
  // 账户余额
  accountBalances: UserDataAccountBalances | null
  // 汇率数据
  exchangeRates: ExchangeRateData[]
  // 加载状态
  isLoading: boolean
  isLoadingBalances: boolean
  isLoadingTemplates: boolean
  // 错误状态
  error: string | null
  balancesError: string | null
  templatesError: string | null
  // 最后更新时间
  lastUpdated: Date | null
  // 同步相关状态
  syncStatus: SyncStatus
  isInitialSyncComplete: boolean
}

export interface UserDataContextType extends UserData {
  // 刷新所有数据
  refreshAll: () => Promise<void>
  // 刷新特定数据
  refreshCurrencies: () => Promise<void>
  refreshTags: () => Promise<void>
  refreshAccounts: () => Promise<void>
  refreshCategories: () => Promise<void>
  refreshUserSettings: () => Promise<void>
  refreshTemplates: () => Promise<void>
  refreshExchangeRates: () => Promise<void>
  fetchBalances: (force?: boolean) => Promise<void>
  refreshBalances: () => Promise<void>
  // 更新数据（用于同步修改）
  updateTag: (tag: UserDataTag) => void
  addTag: (tag: UserDataTag) => void
  removeTag: (tagId: string) => void
  updateAccount: (account: UserDataAccount) => void
  addAccount: (account: UserDataAccount) => void
  removeAccount: (accountId: string) => void
  updateCategory: (category: UserDataCategory) => void
  addCategory: (category: UserDataCategory) => void
  removeCategory: (categoryId: string) => void
  updateUserSettings: (settings: UserDataSettings) => void
  updateTemplate: (template: UserDataTemplate) => void
  addTemplate: (template: UserDataTemplate) => void
  removeTemplate: (templateId: string) => void
  // 获取基础货币
  getBaseCurrency: () => SimpleCurrency | null
  // 获取模板（支持过滤）
  getTemplates: (filters?: {
    type?: 'INCOME' | 'EXPENSE'
    accountId?: string
    categoryId?: string
  }) => UserDataTemplate[]
  // 检查账户是否有交易记录的缓存
  accountTransactionCache: Record<string, boolean>
  setAccountHasTransactions: (
    accountId: string,
    hasTransactions: boolean
  ) => void
  // 更新单个账户余额
  updateAccountBalance: (
    accountId: string,
    newBalance: number,
    currencyCode: string
  ) => void
  // 同步相关方法
  triggerSync: (force?: boolean) => Promise<void>
  refreshSyncStatus: () => Promise<void>
}

const UserDataContext = createContext<UserDataContextType | undefined>(
  undefined
)

export const useUserData = () => {
  const context = useContext(UserDataContext)
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider')
  }
  return context
}

// 默认状态
const defaultUserData: UserData = {
  currencies: [],
  tags: [],
  accounts: [],
  categories: [],
  templates: [],
  userSettings: null,
  accountBalances: null,
  exchangeRates: [],
  isLoading: true,
  isLoadingBalances: true,
  isLoadingTemplates: false,
  error: null,
  balancesError: null,
  templatesError: null,
  lastUpdated: null,
  syncStatus: { status: 'idle' },
  isInitialSyncComplete: false,
}

interface UserDataProviderProps {
  children: React.ReactNode
}

export const UserDataProvider: React.FC<UserDataProviderProps> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth()
  const [userData, setUserData] = useState<UserData>(defaultUserData)
  const [accountTransactionCache, setAccountTransactionCache] = useState<
    Record<string, boolean>
  >({})

  // API调用函数
  const fetchCurrencies = async (): Promise<SimpleCurrency[]> => {
    const response = await fetch(ApiEndpoints.user.CURRENCIES)
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED')
      }
      throw new Error('获取货币数据失败')
    }
    const result = await response.json()
    return result.data?.currencies || []
  }

  const fetchTags = async (): Promise<UserDataTag[]> => {
    const response = await fetch(ApiEndpoints.tag.LIST)
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED')
      }
      throw new Error('获取标签数据失败')
    }
    const result = await response.json()
    return result.data || []
  }

  const fetchAccounts = async (): Promise<UserDataAccount[]> => {
    const response = await fetch(ApiEndpoints.account.LIST)
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED')
      }
      throw new Error('获取账户数据失败')
    }
    const result = await response.json()
    const accounts = result.data || []

    // 转换账户数据格式，添加 currencyCode 字段
    return accounts.map(
      (account: {
        id: string
        name: string
        description?: string | null
        color?: string | null
        currencyId: string
        categoryId: string
        userId: string
        currency: { code: string; symbol: string; name: string }
        category: { id: string; name: string; type: CategoryType }
      }) => ({
        ...account,
        currencyCode: account.currency?.code || 'USD',
        category: {
          id: account.category.id,
          name: account.category.name,
          type: account.category.type,
        },
      })
    )
  }

  const fetchCategories = async (): Promise<UserDataCategory[]> => {
    const response = await fetch(ApiEndpoints.category.LIST)
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED')
      }
      throw new Error('获取分类数据失败')
    }
    const result = await response.json()
    return result.data || []
  }

  const fetchUserSettings = async (): Promise<UserDataSettings | null> => {
    const response = await fetch(ApiEndpoints.user.SETTINGS)
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED')
      }
      throw new Error('获取用户设置失败')
    }
    const result = await response.json()
    return result.data?.userSettings || null
  }

  const fetchTemplates = async (): Promise<UserDataTemplate[]> => {
    const response = await fetch(ApiEndpoints.transaction.TEMPLATES)
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED')
      }
      throw new Error('获取模板数据失败')
    }
    const result = await response.json()
    return result.templates || []
  }

  const fetchExchangeRates = async (
    baseCurrencyCode?: string
  ): Promise<ExchangeRateData[]> => {
    // 构建查询参数，只获取 toCurrency 为本位币的汇率记录
    const params = new URLSearchParams()
    if (baseCurrencyCode) {
      params.append('toCurrency', baseCurrencyCode)
    }

    const url = ApiEndpoints.buildUrl(
      ApiEndpoints.currency.EXCHANGE_RATES,
      params.toString() ? Object.fromEntries(params) : {}
    )
    const response = await fetch(url)
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED')
      }
      throw new Error('获取汇率数据失败')
    }
    const result = await response.json()
    return result.data || []
  }

  const fetchBalancesData = async (): Promise<{
    accountBalances: UserDataAccountBalances
    baseCurrency: SimpleCurrency
  }> => {
    const response = await fetch(ApiEndpoints.account.BALANCES)
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED')
      }
      throw new Error('获取账户余额失败')
    }
    const result = await response.json()
    if (!result.success) throw new Error(result.message || '获取账户余额失败')
    return result.data
  }

  // 同步相关API调用
  const fetchSyncStatus = async (): Promise<SyncStatus> => {
    const response = await fetch(ApiEndpoints.sync.STATUS)
    if (!response.ok) throw new Error('获取同步状态失败')
    const result = await response.json()
    if (!result.success) throw new Error(result.error || '获取同步状态失败')
    return result.data
  }

  const checkNeedsSync = async (): Promise<boolean> => {
    const response = await fetch(ApiEndpoints.sync.CHECK)
    if (!response.ok) throw new Error('检查同步状态失败')
    const result = await response.json()
    if (!result.success) throw new Error(result.error || '检查同步状态失败')
    return result.data?.needsSync || false
  }

  const triggerSyncAPI = async (force: boolean = false): Promise<void> => {
    const response = await fetch(ApiEndpoints.sync.TRIGGER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    })
    if (!response.ok) throw new Error('触发同步失败')
    const result = await response.json()
    if (!result.success) throw new Error(result.error || '触发同步失败')
  }

  // 刷新所有数据
  const refreshAll = useCallback(async () => {
    try {
      setUserData(prev => ({
        ...prev,
        isLoading: true,
        isLoadingBalances: true,
        error: null,
        balancesError: null,
      }))

      // 先获取基础数据（不包括汇率，因为汇率需要用户设置中的本位币信息）
      const [currencies, tags, accounts, categories, userSettings, templates] =
        await Promise.all([
          fetchCurrencies(),
          fetchTags(),
          fetchAccounts(),
          fetchCategories(),
          fetchUserSettings(),
          fetchTemplates(),
        ])

      // 更新基础数据（不包括汇率）
      setUserData(prev => ({
        ...prev,
        currencies,
        tags,
        accounts,
        categories,
        userSettings,
        templates,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      }))

      // 获取汇率数据（需要用户设置中的本位币信息）
      try {
        const baseCurrencyCode = userSettings?.baseCurrency?.code
        if (baseCurrencyCode) {
          const params = new URLSearchParams()
          params.append('toCurrency', baseCurrencyCode)
          const url = ApiEndpoints.buildUrl(
            ApiEndpoints.currency.EXCHANGE_RATES,
            { toCurrency: baseCurrencyCode }
          )
          const response = await fetch(url)
          if (response.ok) {
            const result = await response.json()
            const exchangeRates = result.data || []
            setUserData(prev => ({
              ...prev,
              exchangeRates,
              lastUpdated: new Date(),
            }))
          }
        }
      } catch (exchangeRateError) {
        console.error(
          'Error fetching exchange rates in refreshAll:',
          exchangeRateError
        )
        // 汇率获取失败不影响其他功能，只记录错误
        setUserData(prev => ({
          ...prev,
          exchangeRates: [],
        }))
      }

      // 然后获取余额数据
      try {
        const { accountBalances } = await fetchBalancesData()
        setUserData(prev => ({
          ...prev,
          accountBalances,
          isLoadingBalances: false,
          lastUpdated: new Date(),
        }))
      } catch (balanceError) {
        console.error('Error fetching balances in refreshAll:', balanceError)
        setUserData(prev => ({
          ...prev,
          isLoadingBalances: false,
          balancesError:
            balanceError instanceof Error
              ? balanceError.message
              : '获取余额数据失败',
        }))
      }
    } catch (error) {
      console.error('Error refreshing user data:', error)

      // 如果是未授权错误，不设置错误状态，让AuthContext处理重定向
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        setUserData(prev => ({
          ...prev,
          isLoading: false,
          isLoadingBalances: false,
          error: null,
        }))
        return
      }

      setUserData(prev => ({
        ...prev,
        isLoading: false,
        isLoadingBalances: false,
        error: error instanceof Error ? error.message : '获取数据失败',
      }))
    }
  }, [])

  // 刷新特定数据的函数
  const refreshCurrencies = useCallback(async () => {
    try {
      const currencies = await fetchCurrencies()
      setUserData(prev => ({ ...prev, currencies, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Error refreshing currencies:', error)
    }
  }, [])

  const refreshTags = useCallback(async () => {
    try {
      const tags = await fetchTags()
      setUserData(prev => ({ ...prev, tags, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Error refreshing tags:', error)
    }
  }, [])

  const refreshAccounts = useCallback(async () => {
    try {
      const accounts = await fetchAccounts()
      setUserData(prev => ({ ...prev, accounts, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Error refreshing accounts:', error)
    }
  }, [])

  const refreshCategories = useCallback(async () => {
    try {
      const categories = await fetchCategories()
      setUserData(prev => ({ ...prev, categories, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Error refreshing categories:', error)
    }
  }, [])

  const refreshUserSettings = useCallback(async () => {
    try {
      const userSettings = await fetchUserSettings()
      setUserData(prev => ({ ...prev, userSettings, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Error refreshing user settings:', error)
    }
  }, [])

  const refreshTemplates = useCallback(async () => {
    try {
      setUserData(prev => ({
        ...prev,
        isLoadingTemplates: true,
        templatesError: null,
      }))
      const templates = await fetchTemplates()
      setUserData(prev => ({
        ...prev,
        templates,
        isLoadingTemplates: false,
        lastUpdated: new Date(),
      }))
    } catch (error) {
      console.error('Error refreshing templates:', error)
      setUserData(prev => ({
        ...prev,
        isLoadingTemplates: false,
        templatesError:
          error instanceof Error ? error.message : '获取模板数据失败',
      }))
    }
  }, [])

  const refreshExchangeRates = useCallback(async () => {
    try {
      const exchangeRates = await fetchExchangeRates()
      setUserData(prev => ({
        ...prev,
        exchangeRates,
        lastUpdated: new Date(),
      }))
    } catch (error) {
      console.error('Error refreshing exchange rates:', error)
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        // 处理未授权错误，可能需要重新登录
        return
      }
      // 汇率获取失败不影响其他功能，只记录错误
      setUserData(prev => ({
        ...prev,
        exchangeRates: [],
      }))
    }
  }, [])

  const fetchBalances = useCallback(
    async (force = false) => {
      try {
        // 如果是强制刷新，直接获取数据
        if (force) {
          // 设置加载状态
          setUserData(prev => ({
            ...prev,
            isLoadingBalances: true,
            balancesError: null,
          }))

          const { accountBalances } = await fetchBalancesData()

          setUserData(prev => ({
            ...prev,
            accountBalances,
            isLoadingBalances: false,
            lastUpdated: new Date(),
          }))
          return
        }

        // 非强制刷新时，检查是否已有数据
        let shouldFetch = false
        setUserData(prev => {
          if (prev.accountBalances) {
            shouldFetch = false
            return prev
          }

          shouldFetch = true
          return {
            ...prev,
            isLoadingBalances: true,
            balancesError: null,
          }
        })

        // 如果不需要获取，直接返回
        if (!shouldFetch) {
          return
        }

        const { accountBalances } = await fetchBalancesData()
        setUserData(prev => ({
          ...prev,
          accountBalances,
          isLoadingBalances: false,
          lastUpdated: new Date(),
        }))
      } catch (error) {
        console.error('Error fetching balances:', error)
        setUserData(prev => ({
          ...prev,
          isLoadingBalances: false,
          balancesError:
            error instanceof Error ? error.message : '获取余额数据失败',
        }))
      }
    },
    [] // 移除依赖项，避免循环依赖
  )

  // 强制刷新余额数据
  const refreshBalances = useCallback(async () => {
    return fetchBalances(true)
  }, [fetchBalances])

  // 刷新同步状态
  const refreshSyncStatus = useCallback(async () => {
    try {
      const syncStatus = await fetchSyncStatus()
      setUserData(prev => ({
        ...prev,
        syncStatus,
        lastUpdated: new Date(),
      }))
    } catch (error) {
      console.error('Failed to refresh sync status:', error)
      setUserData(prev => ({
        ...prev,
        syncStatus: {
          ...prev.syncStatus,
          status: 'failed',
          errorMessage:
            error instanceof Error ? error.message : '获取同步状态失败',
        },
      }))
    }
  }, [])

  // 触发同步
  const triggerSync = useCallback(
    async (force: boolean = false) => {
      try {
        // 设置处理状态
        setUserData(prev => ({
          ...prev,
          syncStatus: { ...prev.syncStatus, status: 'processing' },
        }))

        // 触发同步
        await triggerSyncAPI(force)

        // 延迟刷新状态（给后台处理时间）
        setTimeout(refreshSyncStatus, 2000)
      } catch (error) {
        console.error('Failed to trigger sync:', error)
        setUserData(prev => ({
          ...prev,
          syncStatus: {
            ...prev.syncStatus,
            status: 'failed',
            errorMessage:
              error instanceof Error ? error.message : '触发同步失败',
          },
        }))
      }
    },
    [refreshSyncStatus]
  )

  // 检查并触发同步（初始化时使用）
  const checkAndTriggerSync = useCallback(async () => {
    try {
      const needsSync = await checkNeedsSync()
      if (needsSync) {
        await triggerSync()
      }
      setUserData(prev => ({
        ...prev,
        isInitialSyncComplete: true,
      }))
    } catch (error) {
      console.error('Failed to check sync status:', error)
      setUserData(prev => ({
        ...prev,
        isInitialSyncComplete: true,
      }))
    }
  }, [triggerSync])

  // 更新单个账户余额（用于实时更新）
  const updateAccountBalance = useCallback(
    (accountId: string, newBalance: number, currencyCode: string) => {
      setUserData(prev => {
        if (!prev.accountBalances) return prev

        const currentAccountBalance = prev.accountBalances[accountId]
        if (!currentAccountBalance) return prev

        const updatedBalances = {
          ...currentAccountBalance.balances,
          [currencyCode]: {
            ...currentAccountBalance.balances[currencyCode],
            amount: newBalance,
          },
        }

        // 重新计算基础货币余额
        const baseCurrencyCode = prev.userSettings?.baseCurrency?.code || 'CNY'
        let balanceInBaseCurrency = 0

        Object.entries(updatedBalances).forEach(([code, balance]) => {
          if (code === baseCurrencyCode) {
            balanceInBaseCurrency += balance.amount
          } else {
            // 这里应该使用汇率转换，暂时使用原值
            balanceInBaseCurrency += balance.amount
          }
        })

        return {
          ...prev,
          accountBalances: {
            ...prev.accountBalances,
            [accountId]: {
              ...currentAccountBalance,
              balances: updatedBalances,
              balanceInBaseCurrency,
            },
          },
          lastUpdated: new Date(),
        }
      })
    },
    []
  )

  // 监听认证状态变化，当用户登录成功后自动刷新数据
  useEffect(() => {
    if (isAuthenticated && user) {
      // 用户已登录，刷新数据
      refreshAll()
    } else if (!isAuthenticated) {
      // 用户未登录，重置数据到默认状态
      setUserData(defaultUserData)
    }
  }, [isAuthenticated, user, refreshAll])

  // 初始化同步检查
  useEffect(() => {
    // 只有在用户数据加载完成且还未进行初始同步时才检查
    if (
      !userData.isLoading &&
      userData.userSettings &&
      !userData.isInitialSyncComplete
    ) {
      checkAndTriggerSync()
    }
  }, [
    userData.isLoading,
    userData.userSettings,
    userData.isInitialSyncComplete,
    checkAndTriggerSync,
  ])

  // 数据更新函数（用于同步修改）
  const updateTag = useCallback((tag: UserDataTag) => {
    setUserData(prev => ({
      ...prev,
      tags: prev.tags.map(t => (t.id === tag.id ? tag : t)),
      lastUpdated: new Date(),
    }))
  }, [])

  const addTag = useCallback((tag: UserDataTag) => {
    setUserData(prev => ({
      ...prev,
      tags: [...prev.tags, tag],
      lastUpdated: new Date(),
    }))
  }, [])

  const removeTag = useCallback((tagId: string) => {
    setUserData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t.id !== tagId),
      lastUpdated: new Date(),
    }))
  }, [])

  const updateAccount = useCallback((account: UserDataAccount) => {
    setUserData(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => (a.id === account.id ? account : a)),
      lastUpdated: new Date(),
    }))
  }, [])

  const addAccount = useCallback((account: UserDataAccount) => {
    setUserData(prev => ({
      ...prev,
      accounts: [...prev.accounts, account],
      lastUpdated: new Date(),
    }))
  }, [])

  const removeAccount = useCallback((accountId: string) => {
    setUserData(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== accountId),
      lastUpdated: new Date(),
    }))
    // 同时清除交易缓存
    setAccountTransactionCache(prev => {
      const newCache = { ...prev }
      delete newCache[accountId]
      return newCache
    })
  }, [])

  const updateCategory = useCallback((category: UserDataCategory) => {
    setUserData(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === category.id ? category : c
      ),
      lastUpdated: new Date(),
    }))
  }, [])

  const addCategory = useCallback((category: UserDataCategory) => {
    setUserData(prev => ({
      ...prev,
      categories: [...prev.categories, category],
      lastUpdated: new Date(),
    }))
  }, [])

  const removeCategory = useCallback((categoryId: string) => {
    setUserData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== categoryId),
      lastUpdated: new Date(),
    }))
  }, [])

  const updateUserSettings = useCallback((settings: UserDataSettings) => {
    setUserData(prev => ({
      ...prev,
      userSettings: settings,
      lastUpdated: new Date(),
    }))
  }, [])

  // 模板相关的更新函数
  const updateTemplate = useCallback((template: UserDataTemplate) => {
    setUserData(prev => ({
      ...prev,
      templates: prev.templates.map(t => (t.id === template.id ? template : t)),
      lastUpdated: new Date(),
    }))
  }, [])

  const addTemplate = useCallback((template: UserDataTemplate) => {
    setUserData(prev => ({
      ...prev,
      templates: [...prev.templates, template],
      lastUpdated: new Date(),
    }))
  }, [])

  const removeTemplate = useCallback((templateId: string) => {
    setUserData(prev => ({
      ...prev,
      templates: prev.templates.filter(t => t.id !== templateId),
      lastUpdated: new Date(),
    }))
  }, [])

  // 获取基础货币
  const getBaseCurrency = useCallback((): SimpleCurrency | null => {
    return userData.userSettings?.baseCurrency || null
  }, [userData.userSettings])

  // 获取模板（支持过滤）
  const getTemplates = useCallback(
    (filters?: {
      type?: 'INCOME' | 'EXPENSE'
      accountId?: string
      categoryId?: string
    }) => {
      let filteredTemplates = userData.templates

      if (filters?.type) {
        filteredTemplates = filteredTemplates.filter(
          t => t.type === filters.type
        )
      }

      if (filters?.accountId) {
        filteredTemplates = filteredTemplates.filter(
          t => t.accountId === filters.accountId
        )
      }

      if (filters?.categoryId) {
        // 现在通过账户的分类ID进行过滤
        filteredTemplates = filteredTemplates.filter(
          t => t.account?.category?.id === filters.categoryId
        )
      }

      return filteredTemplates
    },
    [userData.templates]
  )

  // 设置账户交易记录缓存
  const setAccountHasTransactions = useCallback(
    (accountId: string, hasTransactions: boolean) => {
      setAccountTransactionCache(prev => ({
        ...prev,
        [accountId]: hasTransactions,
      }))
    },
    []
  )

  const contextValue = useMemo(
    () => ({
      ...userData,
      refreshAll,
      refreshCurrencies,
      refreshTags,
      refreshAccounts,
      refreshCategories,
      refreshUserSettings,
      refreshTemplates,
      refreshExchangeRates,
      fetchBalances,
      refreshBalances,
      updateTag,
      addTag,
      removeTag,
      updateAccount,
      addAccount,
      removeAccount,
      updateCategory,
      addCategory,
      removeCategory,
      updateUserSettings,
      updateTemplate,
      addTemplate,
      removeTemplate,
      getBaseCurrency,
      getTemplates,
      accountTransactionCache,
      setAccountHasTransactions,
      updateAccountBalance,
      triggerSync,
      refreshSyncStatus,
    }),
    [
      userData,
      refreshAll,
      refreshCurrencies,
      refreshTags,
      refreshAccounts,
      refreshCategories,
      refreshUserSettings,
      refreshTemplates,
      refreshExchangeRates,
      fetchBalances,
      refreshBalances,
      updateTag,
      addTag,
      removeTag,
      updateAccount,
      addAccount,
      removeAccount,
      updateCategory,
      addCategory,
      removeCategory,
      updateUserSettings,
      updateTemplate,
      addTemplate,
      removeTemplate,
      getBaseCurrency,
      getTemplates,
      accountTransactionCache,
      setAccountHasTransactions,
      updateAccountBalance,
      triggerSync,
      refreshSyncStatus,
    ]
  )

  return (
    <UserDataContext.Provider value={contextValue}>
      {children}
    </UserDataContext.Provider>
  )
}

export default UserDataProvider
