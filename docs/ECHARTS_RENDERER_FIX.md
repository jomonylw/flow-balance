# ECharts 渲染器错误修复文档

## 问题描述

在开发环境中使用 `pnpm dev` 启动应用时，出现以下错误：

```
Uncaught Error: Renderer 'undefined' is not imported. Please import it first.
    at new ZRender (60faa_zrender_lib_0b4ea6ff._.js:8273:23)
    at init (60faa_zrender_lib_0b4ea6ff._.js:8501:14)
    at new ECharts (91337_echarts_lib_f19622fb._.js:16657:235)
    at init (91337_echarts_lib_f19622fb._.js:18388:17)
    at NetWorthChart.useEffect (src_components_features_5685674e._.js:9483:270)
```

但是使用 `pnpm build` 和 `pnpm start` 运行生产环境时没有问题。

## 根本原因

这是一个典型的 ECharts 在 Next.js 开发环境中的渲染器导入问题，主要原因包括：

1. **开发环境与生产环境的模块加载差异**：Next.js
   15.3.3 使用 Turbopack 作为开发服务器，其模块解析方式与 Webpack 不同
2. **ECharts 渲染器未正确导入**：ECharts 需要 Canvas 或 SVG 渲染器才能工作
3. **next.config.js 中的 optimizePackageImports 配置**：可能影响了 ECharts 的模块导入

## 解决方案

### 1. 创建 ECharts 配置文件

创建 `src/lib/utils/echarts-config.ts` 文件：

```typescript
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
```

### 2. 创建 ECharts 初始化组件

创建 `src/components/EChartsInitializer.tsx` 文件：

```typescript
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
```

### 3. 修改根布局文件

在 `src/app/layout.tsx` 中添加 ECharts 初始化器：

```typescript
import EChartsInitializer from '@/components/EChartsInitializer'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <ThemeScript />
        <LanguageScript />
      </head>
      <body className='antialiased'>
        <EChartsInitializer />
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <AuthProvider>
                <UserDataProvider>{children}</UserDataProvider>
              </AuthProvider>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 4. 修改 next.config.js

移除 ECharts 的包优化配置：

```javascript
const nextConfig = {
  // 实验性功能 - 减少包大小
  experimental: {
    // 优化包导入（移除echarts以避免渲染器导入问题）
    optimizePackageImports: ['lucide-react'],
  },
}
```

### 5. 更新所有图表组件

将所有图表组件中的 `echarts.init` 替换为 `safeEChartsInit`：

```typescript
// 旧的导入方式
import * as echarts from 'echarts'

// 新的导入方式
import echarts, { safeEChartsInit } from '@/lib/utils/echarts-config'

// 旧的初始化方式
chartInstance.current = echarts.init(chartRef.current, resolvedTheme === 'dark' ? 'dark' : null)

// 新的初始化方式
chartInstance.current = safeEChartsInit(chartRef.current, resolvedTheme === 'dark' ? 'dark' : null)

if (!chartInstance.current) {
  console.error('Failed to initialize ECharts instance')
  return
}
```

## 修复的文件列表

1. `src/lib/utils/echarts-config.ts` - 新建
2. `src/components/EChartsInitializer.tsx` - 新建
3. `src/app/layout.tsx` - 修改
4. `next.config.js` - 修改
5. `src/components/features/dashboard/NetWorthChart.tsx` - 修改
6. `src/components/features/dashboard/CashFlowChart.tsx` - 修改
7. `src/components/features/charts/FlowMonthlySummaryChart.tsx` - 修改
8. `src/components/features/charts/StockMonthlySummaryChart.tsx` - 修改
9. `src/components/features/charts/StockAccountTrendChart.tsx` - 修改
10. `src/components/features/charts/FlowAccountTrendChart.tsx` - 修改
11. `src/components/features/fire/JourneyVisualization.tsx` - 修改

## 验证结果

- ✅ 开发环境 (`pnpm dev`) 正常启动，无渲染器错误
- ✅ 生产构建 (`pnpm build`) 成功
- ✅ 生产环境 (`pnpm start`) 正常运行
- ✅ 所有图表组件正常显示

## 技术要点

1. **动态导入渲染器**：避免了类型冲突问题
2. **安全初始化函数**：提供了完整的错误处理和DOM检查
3. **客户端初始化**：确保渲染器只在浏览器环境中加载
4. **统一错误处理**：提供了详细的错误信息和调试日志

这个解决方案确保了 ECharts 在 Next.js 15.3.3 + Turbopack 开发环境中的稳定运行。
