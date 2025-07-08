'use client'

import { useEffect } from 'react'
import { initializeECharts } from '@/lib/utils/echarts-config'

/**
 * ECharts初始化组件
 * 确保在客户端环境中正确初始化ECharts渲染器
 */
export default function EChartsInitializer() {
  useEffect(() => {
    // 在客户端初始化ECharts
    initializeECharts()
  }, [])

  // 这个组件不渲染任何内容
  return null
}
