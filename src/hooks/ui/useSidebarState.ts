'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 侧边栏状态保持 Hook
 * 用于在路由变化时保持侧边栏的状态，避免重新渲染导致的抖动
 */
export function useSidebarState() {
  const pathname = usePathname()
  const previousPathnameRef = useRef<string | undefined>(undefined)
  const isInitialRenderRef = useRef(true)

  // 检测路由变化
  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false
      previousPathnameRef.current = pathname
      return
    }

    const hasRouteChanged = previousPathnameRef.current !== pathname

    if (hasRouteChanged) {
      // 路由变化时的处理逻辑

      // 这里可以添加路由变化时的特殊处理
      // 比如保存当前状态、准备恢复状态等

      previousPathnameRef.current = pathname
    }
  }, [pathname])

  return {
    currentPath: pathname,
    previousPath: previousPathnameRef.current,
    isInitialRender: isInitialRenderRef.current,
  }
}

/**
 * 防止组件重新挂载的 Hook
 * 通过稳定的key来确保组件在路由变化时不会重新挂载
 */
export function useStableComponentKey(baseKey: string = 'sidebar') {
  // 使用固定的key，避免路由变化时组件重新挂载
  return `${baseKey}-stable`
}

/**
 * 路由变化时的平滑过渡 Hook
 */
export function useSmoothTransition() {
  const pathname = usePathname()
  const transitionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (transitionRef.current) {
      // 添加过渡效果，减少视觉抖动
      transitionRef.current.style.transition = 'opacity 0.15s ease-in-out'
      transitionRef.current.style.opacity = '0.95'

      const timer = setTimeout(() => {
        if (transitionRef.current) {
          transitionRef.current.style.opacity = '1'
        }
      }, 50)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [pathname])

  return {
    transitionRef,
  }
}

/**
 * 页面内容平滑过渡 Hook
 * 用于减少路由变化时的页面闪烁
 */
export function usePageTransition() {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const previousPathnameRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    // 检测路由变化
    if (
      previousPathnameRef.current &&
      previousPathnameRef.current !== pathname
    ) {
      setIsTransitioning(true)

      // 短暂的过渡效果
      const timer = setTimeout(() => {
        setIsTransitioning(false)
      }, 100)

      return () => clearTimeout(timer)
    }

    previousPathnameRef.current = pathname
    return undefined
  }, [pathname])

  return {
    isTransitioning,
    transitionClass: isTransitioning ? 'opacity-95' : 'opacity-100',
  }
}
