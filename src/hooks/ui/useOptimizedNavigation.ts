'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef } from 'react'

/**
 * 优化的导航Hook
 * 提供平滑的路由跳转体验，减少页面闪烁
 */
export function useOptimizedNavigation() {
  const router = useRouter()
  const isNavigatingRef = useRef(false)

  /**
   * 优化的导航函数
   * @param path 目标路径
   * @param options 导航选项
   */
  const navigateTo = useCallback(
    (
      path: string,
      options?: {
        replace?: boolean
        scroll?: boolean
        delay?: number
      },
    ) => {
      // 防止重复导航
      if (isNavigatingRef.current) {
        return
      }

      isNavigatingRef.current = true
      const { replace = false, scroll = true, delay = 0 } = options || {}

      // 添加轻微延迟，让用户感受到点击反馈
      setTimeout(() => {
        try {
          if (replace) {
            router.replace(path, { scroll })
          } else {
            router.push(path, { scroll })
          }
        } catch (error) {
          console.error('Navigation error:', error)
        } finally {
          // 重置导航状态
          setTimeout(() => {
            isNavigatingRef.current = false
          }, 100)
        }
      }, delay)
    },
    [router],
  )

  /**
   * 带视觉反馈的导航函数
   * @param element 触发导航的DOM元素
   * @param path 目标路径
   * @param options 导航选项
   */
  const navigateWithFeedback = useCallback(
    (
      element: HTMLElement,
      path: string,
      options?: {
        replace?: boolean
        scroll?: boolean
        feedbackDuration?: number
      },
    ) => {
      const { feedbackDuration = 50, ...navOptions } = options || {}

      // 添加视觉反馈
      const originalTransform = element.style.transform
      const originalTransition = element.style.transition

      element.style.transition = 'transform 0.1s ease-out'
      element.style.transform = 'scale(0.98)'

      // 导航
      setTimeout(() => {
        element.style.transform = originalTransform
        navigateTo(path, { ...navOptions, delay: 0 })

        // 恢复原始样式
        setTimeout(() => {
          element.style.transition = originalTransition
        }, 100)
      }, feedbackDuration)
    },
    [navigateTo],
  )

  /**
   * 预加载路由
   * @param path 要预加载的路径
   */
  const prefetchRoute = useCallback(
    (path: string) => {
      try {
        router.prefetch(path)
      } catch (error) {
        console.error('Prefetch error:', error)
      }
    },
    [router],
  )

  return {
    navigateTo,
    navigateWithFeedback,
    prefetchRoute,
    isNavigating: isNavigatingRef.current,
  }
}

/**
 * 侧边栏导航Hook
 * 专门为侧边栏tree item优化的导航体验
 */
export function useSidebarNavigation() {
  const { navigateWithFeedback, prefetchRoute } = useOptimizedNavigation()

  /**
   * 分类导航
   */
  const navigateToCategory = useCallback(
    (event: React.MouseEvent<HTMLElement>, categoryId: string) => {
      event.preventDefault()
      const target = event.currentTarget
      navigateWithFeedback(target, `/categories/${categoryId}`)
    },
    [navigateWithFeedback],
  )

  /**
   * 账户导航
   */
  const navigateToAccount = useCallback(
    (
      event: React.MouseEvent<HTMLElement>,
      accountId: string,
      onNavigate?: () => void,
    ) => {
      event.preventDefault()
      const target = event.currentTarget
      navigateWithFeedback(target, `/accounts/${accountId}`)
      onNavigate?.()
    },
    [navigateWithFeedback],
  )

  /**
   * 预加载分类
   */
  const prefetchCategory = useCallback(
    (categoryId: string) => {
      prefetchRoute(`/categories/${categoryId}`)
    },
    [prefetchRoute],
  )

  /**
   * 预加载账户
   */
  const prefetchAccount = useCallback(
    (accountId: string) => {
      prefetchRoute(`/accounts/${accountId}`)
    },
    [prefetchRoute],
  )

  return {
    navigateToCategory,
    navigateToAccount,
    prefetchCategory,
    prefetchAccount,
  }
}
