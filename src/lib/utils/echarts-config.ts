/**
 * ECharts 配置和渲染器初始化
 * 确保在开发和生产环境中都能正确加载渲染器
 */

import * as echarts from 'echarts'

// 确保渲染器被正确导入 - 使用动态导入避免类型冲突
if (typeof window !== 'undefined') {
  // 在客户端环境中动态导入渲染器
  import('echarts/renderers')
    .then(() => {
      console.log('✅ ECharts渲染器已加载')
    })
    .catch(error => {
      console.error('❌ ECharts渲染器加载失败:', error)
    })
}

/**
 * 初始化ECharts配置
 * 在应用启动时调用，确保渲染器可用
 */
export function initializeECharts(): void {
  // 检查渲染器是否可用
  if (typeof window !== 'undefined') {
    try {
      // 创建一个临时的测试图表来验证渲染器
      const testDiv = document.createElement('div')
      testDiv.style.width = '100px'
      testDiv.style.height = '100px'
      testDiv.style.position = 'absolute'
      testDiv.style.left = '-9999px'
      document.body.appendChild(testDiv)

      const testChart = echarts.init(testDiv)
      testChart.dispose()
      document.body.removeChild(testDiv)

      console.log('✅ ECharts渲染器初始化成功')
    } catch (error) {
      console.error('❌ ECharts渲染器初始化失败:', error)
    }
  }
}

/**
 * 安全的ECharts初始化函数
 * 包含错误处理和渲染器检查
 */
export function safeEChartsInit(
  dom: HTMLElement,
  theme?: string | null,
  opts?: {
    devicePixelRatio?: number
    renderer?: 'canvas' | 'svg'
    width?: number | string
    height?: number | string
  }
): echarts.ECharts | null {
  try {
    // 确保DOM元素有效
    if (!dom) {
      console.warn('ECharts: DOM元素为null或undefined')
      return null
    }

    // 检查DOM元素是否已挂载到文档中
    if (!document.contains(dom)) {
      console.warn('ECharts: DOM元素未挂载到文档中')
      return null
    }

    // 等待DOM元素有尺寸（异步检查）
    if (!dom.offsetWidth || !dom.offsetHeight) {
      // 给DOM一点时间来获得尺寸
      setTimeout(() => {
        if (dom.offsetWidth && dom.offsetHeight) {
          console.log('ECharts: DOM元素尺寸已就绪，可以重试初始化')
        }
      }, 100)
      console.warn('ECharts: DOM元素尺寸为0，稍后重试')
      return null
    }

    // 使用默认的Canvas渲染器
    const defaultOpts = {
      renderer: 'canvas' as const,
      ...opts,
    }

    const instance = echarts.init(dom, theme, defaultOpts)
    console.log('✅ ECharts实例初始化成功')
    return instance
  } catch (error) {
    console.error('❌ ECharts初始化失败:', error)

    // 提供更详细的错误信息
    if (error instanceof Error) {
      if (error.message.includes('renderer')) {
        console.error('渲染器错误: 请确保ECharts渲染器已正确导入')
      } else if (error.message.includes('canvas')) {
        console.error('Canvas错误: 浏览器可能不支持Canvas')
      }
    }

    return null
  }
}

export default echarts
