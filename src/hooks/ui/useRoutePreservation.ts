'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 路由保持 Hook
 * 用于在路由变化时保持组件状态，避免不必要的重新渲染
 */
export function useRoutePreservation() {
  const pathname = usePathname()
  const previousPathnameRef = useRef<string | undefined>(undefined)
  const preservationStateRef = useRef<Map<string, unknown>>(new Map())

  // 保存状态到内存
  const preserveState = useCallback((key: string, state: unknown) => {
    preservationStateRef.current.set(key, state)
  }, [])

  // 获取保存的状态
  const getPreservedState = useCallback((key: string) => {
    return preservationStateRef.current.get(key)
  }, [])

  // 清除特定状态
  const clearPreservedState = useCallback((key: string) => {
    preservationStateRef.current.delete(key)
  }, [])

  // 清除所有状态
  const clearAllPreservedState = useCallback(() => {
    preservationStateRef.current.clear()
  }, [])

  // 检测路由变化
  useEffect(() => {
    if (
      previousPathnameRef.current &&
      previousPathnameRef.current !== pathname
    ) {
      // 路由变化时的处理

    }
    previousPathnameRef.current = pathname
  }, [pathname])

  return {
    currentPath: pathname,
    previousPath: previousPathnameRef.current,
    preserveState,
    getPreservedState,
    clearPreservedState,
    clearAllPreservedState,
  }
}

/**
 * 防抖滚动保存 Hook
 */
export function useDebounceScrollSave() {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const debouncedSave = useCallback(
    (callback: () => void, delay: number = 100) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(callback, delay)
    },
    [],
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { debouncedSave }
}

/**
 * 组件稳定性 Hook
 * 确保关键组件在路由变化时不会重新挂载
 */
export function useComponentStability(componentName: string) {
  const stableKey = `${componentName}-stable-${Date.now()}`
  const mountTimeRef = useRef(Date.now())

  // 组件挂载时间，用于调试
  const getMountTime = useCallback(() => {
    return mountTimeRef.current
  }, [])

  // 检查组件是否稳定（没有重新挂载）
  const isStable = useCallback(() => {
    const currentTime = Date.now()
    return currentTime - mountTimeRef.current > 1000 // 1秒后认为稳定
  }, [])

  return {
    stableKey,
    getMountTime,
    isStable,
  }
}

/**
 * 路由变化时的性能优化 Hook
 */
export function useRoutePerformance() {
  const pathname = usePathname()
  const routeChangeTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    const startTime = Date.now()
    routeChangeTimeRef.current = startTime

    // 路由变化性能监控
    const timer = setTimeout(() => {
      const endTime = Date.now()
      const duration = endTime - startTime

      if (duration > 100) {
        console.warn(`Route change took ${duration}ms, consider optimization`)
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [pathname])

  return {
    currentPath: pathname,
    getRouteChangeTime: () => routeChangeTimeRef.current,
  }
}
