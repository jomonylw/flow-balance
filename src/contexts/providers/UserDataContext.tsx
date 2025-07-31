'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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
  forceStopSync: () => void
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
    // 只有在用户已认证时才刷新数据
    if (!isAuthenticated) return

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
  }, [isAuthenticated])

  // 刷新特定数据的函数
  const refreshCurrencies = useCallback(async () => {
    // 只有在用户已认证时才刷新数据
    if (!isAuthenticated) return

    try {
      const currencies = await fetchCurrencies()
      setUserData(prev => ({ ...prev, currencies, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Error refreshing currencies:', error)
    }
  }, [isAuthenticated])

  const refreshTags = useCallback(async () => {
    // 只有在用户已认证时才刷新数据
    if (!isAuthenticated) return

    try {
      const tags = await fetchTags()
      setUserData(prev => ({ ...prev, tags, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Error refreshing tags:', error)
    }
  }, [isAuthenticated])

  const refreshAccounts = useCallback(async () => {
    // 只有在用户已认证时才刷新数据
    if (!isAuthenticated) return

    try {
      const accounts = await fetchAccounts()
      setUserData(prev => ({ ...prev, accounts, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Error refreshing accounts:', error)
    }
  }, [isAuthenticated])

  const refreshCategories = useCallback(async () => {
    // 只有在用户已认证时才刷新数据
    if (!isAuthenticated) return

    try {
      const categories = await fetchCategories()
      setUserData(prev => ({ ...prev, categories, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Error refreshing categories:', error)
    }
  }, [isAuthenticated])

  const refreshUserSettings = useCallback(async () => {
    // 只有在用户已认证时才刷新数据
    if (!isAuthenticated) return

    try {
      const userSettings = await fetchUserSettings()
      setUserData(prev => ({ ...prev, userSettings, lastUpdated: new Date() }))
    } catch (error) {
      console.error('Error refreshing user settings:', error)
    }
  }, [isAuthenticated])

  const refreshTemplates = useCallback(async () => {
    // 只有在用户已认证时才刷新数据
    if (!isAuthenticated) return

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
  }, [isAuthenticated])

  const refreshExchangeRates = useCallback(async () => {
    // 只有在用户已认证时才刷新数据
    if (!isAuthenticated) return

    try {
      // 获取当前用户设置中的本位币代码
      let baseCurrencyCode: string | undefined
      setUserData(prev => {
        baseCurrencyCode = prev.userSettings?.baseCurrency?.code
        return prev
      })

      const exchangeRates = await fetchExchangeRates(baseCurrencyCode)
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
  }, [isAuthenticated])

  const fetchBalances = useCallback(
    async (force = false) => {
      // 只有在用户已认证时才获取数据
      if (!isAuthenticated) return

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
    [isAuthenticated] // 添加认证状态依赖
  )

  // 强制刷新余额数据
  const refreshBalances = useCallback(async () => {
    // 只有在用户已认证时才刷新数据
    if (!isAuthenticated) return

    return fetchBalances(true)
  }, [fetchBalances, isAuthenticated])

  // 刷新同步状态
  const refreshSyncStatus = useCallback(async () => {
    // 只有在用户已认证时才刷新数据
    if (!isAuthenticated) return

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
  }, [isAuthenticated])

  // 轮询控制器引用，用于取消正在进行的轮询
  const pollControllerRef = useRef<{ cancel: () => void } | null>(null)

  // 触发同步
  const triggerSync = useCallback(async (force: boolean = false) => {
    try {
      // 如果已有轮询在进行，先取消它
      if (pollControllerRef.current) {
        pollControllerRef.current.cancel()
        pollControllerRef.current = null
      }

      // 设置处理状态，清理旧的stages数据
      setUserData(prev => ({
        ...prev,
        syncStatus: {
          ...prev.syncStatus,
          status: 'processing',
          stages: undefined, // 清理旧的stages数据
          currentStage: undefined, // 清理当前阶段
        },
      }))

      // 触发同步
      await triggerSyncAPI(force)

      // 轮询配置
      const startTime = Date.now()
      const maxPollDuration = 5 * 60 * 1000 // 5分钟最大轮询时间
      const initialDelay = 2000 // 初始1秒间隔
      const maxDelay = 5000 // 最大5秒间隔
      const backoffMultiplier = 1.2 // 退避倍数

      let currentDelay = initialDelay
      let consecutiveErrors = 0
      let isCancelled = false

      // 创建轮询控制器
      const controller = {
        cancel: () => {
          isCancelled = true
          pollControllerRef.current = null
        },
      }
      pollControllerRef.current = controller

      const pollStatus = async (): Promise<void> => {
        // 检查是否已被取消
        if (isCancelled) {
          return
        }

        // 检查是否超过最大轮询时间
        if (Date.now() - startTime > maxPollDuration) {
          console.warn('Sync polling timeout after 5 minutes')
          setUserData(prev => ({
            ...prev,
            syncStatus: {
              ...prev.syncStatus,
              status: 'failed',
              errorMessage: '同步超时，请重试',
            },
          }))
          pollControllerRef.current = null
          return
        }

        try {
          const syncStatus = await fetchSyncStatus()

          // 重置错误计数和延迟
          consecutiveErrors = 0
          currentDelay = initialDelay

          setUserData(prev => ({
            ...prev,
            syncStatus,
            lastUpdated: new Date(),
          }))

          // 如果同步完成或失败，停止轮询
          if (
            syncStatus.status === 'completed' ||
            syncStatus.status === 'failed'
          ) {
            pollControllerRef.current = null
            return // 停止递归轮询
          }

          // 如果状态仍然是 processing，安排下一次轮询
          if (syncStatus.status === 'processing' && !isCancelled) {
            setTimeout(pollStatus, currentDelay)
          }
        } catch (error) {
          consecutiveErrors++
          console.error(
            `Failed to poll sync status (attempt ${consecutiveErrors}):`,
            error
          )

          // 实现指数退避，但有最大重试次数限制
          if (consecutiveErrors >= 3) {
            console.error('Too many consecutive polling errors, stopping')
            setUserData(prev => ({
              ...prev,
              syncStatus: {
                ...prev.syncStatus,
                status: 'failed',
                errorMessage: '轮询状态失败次数过多，请重试',
              },
            }))
            pollControllerRef.current = null
            return
          }

          // 增加延迟时间（指数退避）
          currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelay)

          // 继续轮询，但使用更长的延迟
          if (!isCancelled) {
            setTimeout(pollStatus, currentDelay)
          }
        }
      }

      // 开始第一次轮询
      setTimeout(pollStatus, initialDelay)
    } catch (error) {
      console.error('Failed to trigger sync:', error)
      pollControllerRef.current = null
      setUserData(prev => ({
        ...prev,
        syncStatus: {
          ...prev.syncStatus,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : '触发同步失败',
        },
      }))
    }
  }, [])

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

  // 强制停止同步轮询
  const forceStopSync = useCallback(() => {
    // 取消正在进行的轮询
    if (pollControllerRef.current) {
      pollControllerRef.current.cancel()
      pollControllerRef.current = null
    }

    // 立即将状态设置为待机
    setUserData(prev => ({
      ...prev,
      syncStatus: {
        ...prev.syncStatus,
        status: 'idle',
        stages: undefined,
        currentStage: undefined,
        errorMessage: undefined,
      },
    }))
  }, [])

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
      forceStopSync,
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
      forceStopSync,
    ]
  )

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      if (pollControllerRef.current) {
        pollControllerRef.current.cancel()
        pollControllerRef.current = null
      }
    }
  }, [])

  return (
    <UserDataContext.Provider value={contextValue}>
      {children}
    </UserDataContext.Provider>
  )
}

export default UserDataProvider
