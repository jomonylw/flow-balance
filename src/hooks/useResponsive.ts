'use client'

import { useState, useEffect } from 'react'
import { 
  isMobile, 
  isTablet, 
  isDesktop, 
  isTouchDevice, 
  getScreenSize, 
  debounce,
  type ResponsiveListener 
} from '@/lib/responsive'

/**
 * 响应式监听 Hook
 * 监听屏幕尺寸变化并返回当前设备信息
 */
export const useResponsive = (): ResponsiveListener => {
  const [responsive, setResponsive] = useState<ResponsiveListener>({
    mobile: false,
    tablet: false,
    desktop: true,
    touchDevice: false,
    screenSize: 'desktop'
  })

  useEffect(() => {
    // 更新响应式状态
    const updateResponsive = () => {
      setResponsive({
        mobile: isMobile(),
        tablet: isTablet(),
        desktop: isDesktop(),
        touchDevice: isTouchDevice(),
        screenSize: getScreenSize()
      })
    }

    // 初始化
    updateResponsive()

    // 防抖的 resize 处理函数
    const debouncedResize = debounce(updateResponsive, 150)

    // 监听窗口大小变化
    window.addEventListener('resize', debouncedResize)
    
    // 监听设备方向变化（移动设备）
    window.addEventListener('orientationchange', debouncedResize)

    return () => {
      window.removeEventListener('resize', debouncedResize)
      window.removeEventListener('orientationchange', debouncedResize)
    }
  }, [])

  return responsive
}

/**
 * 简化的移动端检测 Hook
 */
export const useIsMobile = (): boolean => {
  const { mobile } = useResponsive()
  return mobile
}

/**
 * 简化的触摸设备检测 Hook
 */
export const useIsTouchDevice = (): boolean => {
  const { touchDevice } = useResponsive()
  return touchDevice
}

/**
 * 屏幕尺寸分类 Hook
 */
export const useScreenSize = (): 'mobile' | 'tablet' | 'desktop' => {
  const { screenSize } = useResponsive()
  return screenSize
}

/**
 * 断点检测 Hook
 * @param breakpoint 断点名称
 * @param direction 检测方向：'up' 表示大于等于该断点，'down' 表示小于该断点
 */
export const useBreakpoint = (
  breakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl',
  direction: 'up' | 'down' = 'up'
): boolean => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const breakpoints = {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536
    }

    const checkBreakpoint = () => {
      const width = window.innerWidth
      const breakpointValue = breakpoints[breakpoint]
      
      if (direction === 'up') {
        setMatches(width >= breakpointValue)
      } else {
        setMatches(width < breakpointValue)
      }
    }

    checkBreakpoint()

    const debouncedCheck = debounce(checkBreakpoint, 150)
    window.addEventListener('resize', debouncedCheck)

    return () => {
      window.removeEventListener('resize', debouncedCheck)
    }
  }, [breakpoint, direction])

  return matches
}

/**
 * 媒体查询 Hook
 * @param query CSS 媒体查询字符串
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // 现代浏览器使用 addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } 
    // 旧版浏览器使用 addListener
    else {
      mediaQuery.addListener(handler)
      return () => mediaQuery.removeListener(handler)
    }
  }, [query])

  return matches
}

/**
 * 视口尺寸 Hook
 */
export const useViewportSize = () => {
  const [size, setSize] = useState({
    width: 0,
    height: 0
  })

  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateSize()

    const debouncedUpdate = debounce(updateSize, 150)
    window.addEventListener('resize', debouncedUpdate)

    return () => {
      window.removeEventListener('resize', debouncedUpdate)
    }
  }, [])

  return size
}

/**
 * 安全区域检测 Hook（用于支持刘海屏等）
 */
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  })

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement)
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0')
      })
    }

    updateSafeArea()

    // 监听设备方向变化
    window.addEventListener('orientationchange', updateSafeArea)

    return () => {
      window.removeEventListener('orientationchange', updateSafeArea)
    }
  }, [])

  return safeArea
}

/**
 * 设备像素比 Hook
 */
export const useDevicePixelRatio = (): number => {
  const [dpr, setDpr] = useState(1)

  useEffect(() => {
    const updateDpr = () => {
      setDpr(window.devicePixelRatio || 1)
    }

    updateDpr()

    // 监听像素比变化（例如用户缩放页面）
    const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateDpr)
      return () => mediaQuery.removeEventListener('change', updateDpr)
    }
  }, [])

  return dpr
}
