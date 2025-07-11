'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

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
