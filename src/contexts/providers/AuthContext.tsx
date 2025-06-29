'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import LoadingScreen from '@/components/ui/feedback/LoadingScreen'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import type { AuthState } from '@/types/core'
import { ApiEndpoints } from '@/lib/constants/api-endpoints'

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
  updateUser: (userData: Partial<AuthState['user']>) => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })
  const [hasInitialized, setHasInitialized] = useState(false)

  const publicRoutes = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
  ]
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isRootRoute = pathname === '/'

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch(ApiEndpoints.auth.ME, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.user) {
          setAuthState({
            user: result.data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          return true
        }
      }

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
      return false
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error:
          error instanceof Error ? error.message : t('auth.error.check.failed'),
      })
      return false
    }
  }, [t])

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

        const response = await fetch(ApiEndpoints.auth.LOGIN, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        })

        const result = await response.json()

        if (response.ok && result.success) {
          setAuthState({
            user: result.data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          return true
        } else {
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: result.error || t('auth.error.login.failed'),
          }))
          return false
        }
      } catch (error) {
        console.error('Login failed:', error)
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : t('auth.error.login.failed'),
        }))
        return false
      }
    },
    [t]
  )

  const logout = useCallback(async (): Promise<void> => {
    try {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
      })

      await fetch(ApiEndpoints.auth.LOGOUT, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
      router.replace('/login')
    }
  }, [router])

  const updateUser = useCallback((userData: Partial<AuthState['user']>) => {
    setAuthState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...userData } : null,
    }))
  }, [])

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }))
  }, [])

  useEffect(() => {
    if (hasInitialized) return

    let isMounted = true

    const initAuth = async () => {
      if (isPublicRoute) {
        if (isMounted) {
          setAuthState(prev => ({ ...prev, isLoading: false }))
          setHasInitialized(true)
        }
      } else {
        // 对于根路径和其他需要认证的路径，都进行认证检查
        try {
          const response = await fetch(ApiEndpoints.auth.ME, {
            method: 'GET',
            credentials: 'include',
          })

          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data?.user && isMounted) {
              setAuthState({
                user: result.data.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              })
              setHasInitialized(true)
              return
            }
          }

          if (isMounted) {
            setAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            })
            setHasInitialized(true)
          }
        } catch (error) {
          console.error('Initial auth check failed:', error)
          if (isMounted) {
            setAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            })
            setHasInitialized(true)
          }
        }
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [isPublicRoute, isRootRoute, hasInitialized])

  useEffect(() => {
    if (authState.isLoading || !hasInitialized) return

    // 不干预根路径的重定向逻辑，让根页面组件自己处理
    if (isRootRoute) return

    if (
      isPublicRoute &&
      authState.isAuthenticated &&
      pathname !== '/dashboard'
    ) {
      router.replace('/dashboard')
    } else if (
      !isPublicRoute &&
      !authState.isAuthenticated &&
      pathname !== '/login'
    ) {
      router.replace('/login')
    }
  }, [
    authState.isAuthenticated,
    authState.isLoading,
    isPublicRoute,
    isRootRoute,
    router,
    hasInitialized,
    pathname,
  ])

  useEffect(() => {
    const handleUnauthorized = () => {
      if (authState.isAuthenticated && !authState.isLoading) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: t('auth.error.session.expired'),
        })
        if (!isPublicRoute && pathname !== '/login') {
          router.replace('/login')
        }
      }
    }

    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      const url = args[0]?.toString() || ''
      if (response.status === 401 && !url.includes(ApiEndpoints.auth.LOGOUT)) {
        handleUnauthorized()
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [
    authState.isAuthenticated,
    authState.isLoading,
    isPublicRoute,
    router,
    pathname,
    t,
  ])

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    checkAuth,
    updateUser,
    clearError,
  }

  if (authState.isLoading && !isPublicRoute && !isRootRoute) {
    return <LoadingScreen messageType='auth-checking' variant='pulse' />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
