'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const SIDEBAR_WIDTH_KEY = 'sidebar-width'
const SIDEBAR_SCROLL_KEY = 'sidebar-scroll-position'
const DEFAULT_WIDTH = 320 // 默认宽度 (w-80 = 320px)
const MIN_WIDTH = 240 // 最小宽度
const MAX_WIDTH = 480 // 最大宽度

export function useSidebarWidth() {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isDragging, setIsDragging] = useState(false)

  // 从localStorage加载保存的宽度
  useEffect(() => {
    const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10)
      if (parsedWidth >= MIN_WIDTH && parsedWidth <= MAX_WIDTH) {
        setWidth(parsedWidth)
      }
    }
  }, [])

  // 保存宽度到localStorage
  const saveWidth = useCallback((newWidth: number) => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, newWidth.toString())
  }, [])

  // 设置宽度（带边界检查）
  const setSidebarWidth = useCallback(
    (newWidth: number) => {
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth))
      setWidth(clampedWidth)
      saveWidth(clampedWidth)
    },
    [saveWidth],
  )

  // 开始拖拽
  const startDragging = useCallback(() => {
    setIsDragging(true)
  }, [])

  // 停止拖拽
  const stopDragging = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 处理拖拽过程中的宽度变化
  const handleDrag = useCallback(
    (clientX: number, sidebarRect: DOMRect) => {
      if (!isDragging) return

      const newWidth = clientX - sidebarRect.left
      setSidebarWidth(newWidth)
    },
    [isDragging, setSidebarWidth],
  )

  return {
    width,
    isDragging,
    setSidebarWidth,
    startDragging,
    stopDragging,
    handleDrag,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
  }
}

/**
 * 侧边栏滚动位置保持 Hook
 */
export function useSidebarScrollPosition() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // 保存滚动位置到localStorage（防抖）
  const saveScrollPosition = useCallback((scrollTop: number) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(SIDEBAR_SCROLL_KEY, scrollTop.toString())
      } catch (error) {
        console.error('Error saving scroll position:', error)
      }
    }, 100) // 100ms防抖
  }, [])

  // 恢复滚动位置
  const restoreScrollPosition = useCallback(() => {
    if (!scrollContainerRef.current) return

    try {
      const savedScrollTop = localStorage.getItem(SIDEBAR_SCROLL_KEY)
      if (savedScrollTop) {
        const scrollTop = parseInt(savedScrollTop, 10)
        if (!isNaN(scrollTop)) {
          // 使用多重 requestAnimationFrame 确保DOM完全渲染
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (scrollContainerRef.current) {
                // 平滑滚动到目标位置
                scrollContainerRef.current.scrollTo({
                  top: scrollTop,
                  behavior: 'auto', // 使用 auto 避免动画延迟
                })
              }
            })
          })
        }
      }
    } catch (error) {
      console.error('Error restoring scroll position:', error)
    }
  }, [])

  // 处理滚动事件
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop
      saveScrollPosition(scrollTop)
    },
    [saveScrollPosition],
  )

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    scrollContainerRef,
    handleScroll,
    restoreScrollPosition,
  }
}
