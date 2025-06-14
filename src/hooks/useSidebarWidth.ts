'use client'

import { useState, useEffect, useCallback } from 'react'

const SIDEBAR_WIDTH_KEY = 'sidebar-width'
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
  const setSidebarWidth = useCallback((newWidth: number) => {
    const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth))
    setWidth(clampedWidth)
    saveWidth(clampedWidth)
  }, [saveWidth])

  // 开始拖拽
  const startDragging = useCallback(() => {
    setIsDragging(true)
  }, [])

  // 停止拖拽
  const stopDragging = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 处理拖拽过程中的宽度变化
  const handleDrag = useCallback((clientX: number, sidebarRect: DOMRect) => {
    if (!isDragging) return
    
    const newWidth = clientX - sidebarRect.left
    setSidebarWidth(newWidth)
  }, [isDragging, setSidebarWidth])

  return {
    width,
    isDragging,
    setSidebarWidth,
    startDragging,
    stopDragging,
    handleDrag,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH
  }
}
