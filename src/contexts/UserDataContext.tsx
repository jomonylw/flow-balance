'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

// 类型定义
interface Currency {
  code: string
  name: string
  symbol: string
  isCustom?: boolean
  createdBy?: string | null
}

interface Tag {
  id: string
  name: string
  color?: string
  userId: string
  _count?: {
    transactions: number
  }
}

interface Account {
  id: string
  name: string
  description?: string
  color?: string
  currencyCode: string
  categoryId: string
  userId: string
  category: {
    id: string
    name: string
    type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  }
}

interface Category {
  id: string
  name: string
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE'
  parentId?: string | null
  order: number
  userId: string
  children?: Category[]
}

interface UserSettings {
  id: string
  userId: string
  baseCurrencyId: string
  language: string
  theme: string
  fireEnabled?: boolean
  fireSWR?: number
  baseCurrency: Currency
}

interface AccountBalances {
  [accountId: string]: {
    id: string;
    name: string;
    categoryId: string;
    accountType: string;
    balances: Record<string, {
      amount: number;
      currency: {
        code: string;
        symbol: string;
        name: string;
      };
    }>;
    balanceInBaseCurrency: number;
  };
}

interface UserData {
  // 用户可用货币
  currencies: Currency[]
  // 用户标签
  tags: Tag[]
  // 用户账户
  accounts: Account[]
  // 用户分类
  categories: Category[]
  // 用户设置
  userSettings: UserSettings | null
  // 账户余额
  accountBalances: AccountBalances | null
  // 加载状态
  isLoading: boolean
  isLoadingBalances: boolean
  // 错误状态
  error: string | null
  balancesError: string | null
  // 最后更新时间
  lastUpdated: Date | null
}

interface UserDataContextType extends UserData {
  // 刷新所有数据
  refreshAll: () => Promise<void>
  // 刷新特定数据
  refreshCurrencies: () => Promise<void>
  refreshTags: () => Promise<void>
  refreshAccounts: () => Promise<void>
  refreshCategories: () => Promise<void>
  refreshUserSettings: () => Promise<void>
  fetchBalances: () => Promise<void>
  // 更新数据（用于同步修改）
  updateTag: (tag: Tag) => void
  addTag: (tag: Tag) => void
  removeTag: (tagId: string) => void
  updateAccount: (account: Account) => void
  addAccount: (account: Account) => void
  removeAccount: (accountId: string) => void
  updateCategory: (category: Category) => void
  addCategory: (category: Category) => void
  removeCategory: (categoryId: string) => void
  updateUserSettings: (settings: UserSettings) => void
  // 获取基础货币
  getBaseCurrency: () => Currency | null
  // 检查账户是否有交易记录的缓存
  accountTransactionCache: Record<string, boolean>
  setAccountHasTransactions: (accountId: string, hasTransactions: boolean) => void
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined)

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
  userSettings: null,
  accountBalances: null,
  isLoading: true,
  isLoadingBalances: true,
  error: null,
  balancesError: null,
  lastUpdated: null
}

interface UserDataProviderProps {
  children: React.ReactNode
}

export const UserDataProvider: React.FC<UserDataProviderProps> = ({ children }) => {
  const [userData, setUserData] = useState<UserData>(defaultUserData)
  const [accountTransactionCache, setAccountTransactionCache] = useState<Record<string, boolean>>({})

  // API调用函数
  const fetchCurrencies = async (): Promise<Currency[]> => {
    const response = await fetch('/api/user/currencies')
    if (!response.ok) throw new Error('获取货币数据失败')
    const result = await response.json()
    return result.data?.currencies || []
  }

  const fetchTags = async (): Promise<Tag[]> => {
    const response = await fetch('/api/tags')
    if (!response.ok) throw new Error('获取标签数据失败')
    const result = await response.json()
    return result.data || []
  }

  const fetchAccounts = async (): Promise<Account[]> => {
    const response = await fetch('/api/accounts')
    if (!response.ok) throw new Error('获取账户数据失败')
    const result = await response.json()
    return result.data || []
  }

  const fetchCategories = async (): Promise<Category[]> => {
    const response = await fetch('/api/categories')
    if (!response.ok) throw new Error('获取分类数据失败')
    const result = await response.json()
    return result.data || []
  }

  const fetchUserSettings = async (): Promise<UserSettings | null> => {
    const response = await fetch('/api/user/settings')
    if (!response.ok) throw new Error('获取用户设置失败')
    const result = await response.json()
    return result.data?.userSettings || null
  }
  
  const fetchBalancesData = async (): Promise<{ accountBalances: AccountBalances, baseCurrency: Currency }> => {
    const response = await fetch('/api/accounts/balances')
    if (!response.ok) throw new Error('获取账户余额失败')
    const result = await response.json()
    if (!result.success) throw new Error(result.message || '获取账户余额失败')
    return result.data
  }

  // 刷新所有数据
  const refreshAll = useCallback(async () => {
    try {
      setUserData(prev => ({ ...prev, isLoading: true, error: null }))
      
      const [currencies, tags, accounts, categories, userSettings] = await Promise.all([
        fetchCurrencies(),
        fetchTags(),
        fetchAccounts(),
        fetchCategories(),
        fetchUserSettings()
      ])

      setUserData(prev => ({
        ...prev,
        currencies,
        tags,
        accounts,
        categories,
        userSettings,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      }))
    } catch (error) {
      console.error('Error refreshing user data:', error)
      setUserData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : '获取数据失败'
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

  const fetchBalances = useCallback(async () => {
    // 如果已经有余额数据，则不重新获取，避免不必要的加载状态
    if (userData.accountBalances) {
      return
    }
    try {
      setUserData(prev => ({ ...prev, isLoadingBalances: true, balancesError: null }))
      const { accountBalances } = await fetchBalancesData()
      setUserData(prev => ({
        ...prev,
        accountBalances,
        isLoadingBalances: false,
        lastUpdated: new Date()
      }))
    } catch (error) {
      console.error('Error fetching balances:', error)
      setUserData(prev => ({
        ...prev,
        isLoadingBalances: false,
        balancesError: error instanceof Error ? error.message : '获取余额数据失败'
      }))
    }
  }, [userData.accountBalances])

  // 初始化数据
  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  // 数据更新函数（用于同步修改）
  const updateTag = useCallback((tag: Tag) => {
    setUserData(prev => ({
      ...prev,
      tags: prev.tags.map(t => t.id === tag.id ? tag : t),
      lastUpdated: new Date()
    }))
  }, [])

  const addTag = useCallback((tag: Tag) => {
    setUserData(prev => ({
      ...prev,
      tags: [...prev.tags, tag],
      lastUpdated: new Date()
    }))
  }, [])

  const removeTag = useCallback((tagId: string) => {
    setUserData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t.id !== tagId),
      lastUpdated: new Date()
    }))
  }, [])

  const updateAccount = useCallback((account: Account) => {
    setUserData(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => a.id === account.id ? account : a),
      lastUpdated: new Date()
    }))
  }, [])

  const addAccount = useCallback((account: Account) => {
    setUserData(prev => ({
      ...prev,
      accounts: [...prev.accounts, account],
      lastUpdated: new Date()
    }))
  }, [])

  const removeAccount = useCallback((accountId: string) => {
    setUserData(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== accountId),
      lastUpdated: new Date()
    }))
    // 同时清除交易缓存
    setAccountTransactionCache(prev => {
      const newCache = { ...prev }
      delete newCache[accountId]
      return newCache
    })
  }, [])

  const updateCategory = useCallback((category: Category) => {
    setUserData(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === category.id ? category : c),
      lastUpdated: new Date()
    }))
  }, [])

  const addCategory = useCallback((category: Category) => {
    setUserData(prev => ({
      ...prev,
      categories: [...prev.categories, category],
      lastUpdated: new Date()
    }))
  }, [])

  const removeCategory = useCallback((categoryId: string) => {
    setUserData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== categoryId),
      lastUpdated: new Date()
    }))
  }, [])

  const updateUserSettings = useCallback((settings: UserSettings) => {
    setUserData(prev => ({
      ...prev,
      userSettings: settings,
      lastUpdated: new Date()
    }))
  }, [])

  // 获取基础货币
  const getBaseCurrency = useCallback((): Currency | null => {
    return userData.userSettings?.baseCurrency || null
  }, [userData.userSettings])

  // 设置账户交易记录缓存
  const setAccountHasTransactions = useCallback((accountId: string, hasTransactions: boolean) => {
    setAccountTransactionCache(prev => ({
      ...prev,
      [accountId]: hasTransactions
    }))
  }, [])

  const contextValue = useMemo(() => ({
    ...userData,
    refreshAll,
    refreshCurrencies,
    refreshTags,
    refreshAccounts,
    refreshCategories,
    refreshUserSettings,
    fetchBalances,
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
    getBaseCurrency,
    accountTransactionCache,
    setAccountHasTransactions
  }), [
    userData,
    refreshAll,
    refreshCurrencies,
    refreshTags,
    refreshAccounts,
    refreshCategories,
    refreshUserSettings,
    fetchBalances,
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
    getBaseCurrency,
    accountTransactionCache,
    setAccountHasTransactions
  ])

  return (
    <UserDataContext.Provider value={contextValue}>
      {children}
    </UserDataContext.Provider>
  )
}

export default UserDataProvider
