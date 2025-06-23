'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import LoadingScreen from '@/components/ui/feedback/LoadingScreen'
import { ApiEndpoints } from '@/lib/constants'

interface AuthGuardProps {
  children: React.ReactNode
}

interface SimpleAuthState {
  isAuthenticated: boolean | null
  isLoading: boolean
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [authState, setAuthState] = useState<SimpleAuthState>({
    isAuthenticated: null,
    isLoading: true,
  })

  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ]
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  const checkAuth = async () => {
    try {
      const response = await fetch(ApiEndpoints.auth.ME, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.user) {
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
          })
          return true
        }
      }

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
      })
      return false
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
      })
      return false
    }
  }

  useEffect(() => {
    if (isPublicRoute) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
      })
      return
    }

    checkAuth()
  }, [pathname, isPublicRoute])

  useEffect(() => {
    if (authState.isLoading) return

    if (isPublicRoute) {
      if (authState.isAuthenticated) {
        router.replace('/dashboard')
      }
    } else {
      if (!authState.isAuthenticated) {
        router.replace('/login')
      }
    }
  }, [authState, isPublicRoute, router])

  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
      })
      if (!isPublicRoute) {
        router.replace('/login')
      }
    }

    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      if (response.status === 401) {
        handleUnauthorized()
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [isPublicRoute, router])

  if (authState.isLoading) {
    return <LoadingScreen messageType='auth-checking' variant='pulse' />
  }

  if (
    (isPublicRoute && !authState.isAuthenticated) ||
    (!isPublicRoute && authState.isAuthenticated)
  ) {
    return <>{children}</>
  }

  return <LoadingScreen messageType='redirecting' variant='dots' />
}
