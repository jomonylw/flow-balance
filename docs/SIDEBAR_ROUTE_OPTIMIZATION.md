# 侧边栏路由变化优化方案

## 问题描述

用户反馈点击左侧tree item会导致页面重绘，导致抖动及侧边栏滚动条重置，影响用户体验。

## 问题分析

### 根本原因
1. **路由变化导致组件重新渲染**：Next.js App Router在路由变化时会重新渲染页面组件
2. **侧边栏滚动位置丢失**：没有保存和恢复滚动位置的机制
3. **组件重新挂载**：缺乏稳定的key导致组件在某些情况下重新挂载
4. **视觉抖动**：缺少平滑过渡效果

### 影响范围
- 用户体验：每次路由变化都需要重新定位到之前的位置
- 操作效率：频繁的状态重置影响操作流畅性
- 视觉体验：页面抖动和闪烁

## 解决方案

### 1. 滚动位置保持

#### 新增Hook: `useSidebarScrollPosition`
```typescript
// src/hooks/useSidebarWidth.ts (扩展)
export function useSidebarScrollPosition() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  // 防抖保存滚动位置
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
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollTop
            }
          })
        }
      }
    } catch (error) {
      console.error('Error restoring scroll position:', error)
    }
  }, [])

  return {
    scrollContainerRef,
    handleScroll,
    restoreScrollPosition
  }
}
```

### 2. 组件稳定性保证

#### 新增Hook: `useSidebarState`
```typescript
// src/hooks/useSidebarState.ts
export function useStableComponentKey(baseKey: string = 'sidebar') {
  // 使用固定的key，避免路由变化时组件重新挂载
  return `${baseKey}-stable`
}

export function useSmoothTransition() {
  const pathname = usePathname()
  const transitionRef = useRef<HTMLDivElement>(null)

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
  }, [pathname])

  return { transitionRef }
}
```

### 3. 路由状态保持

#### 新增Hook: `useRoutePreservation`
```typescript
// src/hooks/useRoutePreservation.ts
export function useRoutePreservation() {
  const pathname = usePathname()
  const preservationStateRef = useRef<Map<string, any>>(new Map())

  // 保存状态到内存
  const preserveState = useCallback((key: string, state: any) => {
    preservationStateRef.current.set(key, state)
  }, [])

  // 获取保存的状态
  const getPreservedState = useCallback((key: string) => {
    return preservationStateRef.current.get(key)
  }, [])

  return {
    currentPath: pathname,
    preserveState,
    getPreservedState
  }
}
```

### 4. 组件更新

#### NavigationSidebar组件优化
```typescript
// src/components/layout/NavigationSidebar.tsx
export default function NavigationSidebar({ isMobile = false, onNavigate }: NavigationSidebarProps) {
  // 侧边栏滚动位置保持
  const {
    scrollContainerRef,
    handleScroll,
    restoreScrollPosition
  } = useSidebarScrollPosition()

  // 稳定的组件key，防止路由变化时重新挂载
  const stableKey = useStableComponentKey('navigation-sidebar')

  // 平滑过渡效果
  const { transitionRef } = useSmoothTransition()

  // 恢复滚动位置
  useEffect(() => {
    const timer = setTimeout(() => {
      restoreScrollPosition()
    }, 100)
    return () => clearTimeout(timer)
  }, [restoreScrollPosition])

  return (
    <TranslationLoader key={stableKey}>
      <div
        ref={(el) => {
          sidebarRef.current = el
          if (transitionRef) {
            transitionRef.current = el
          }
        }}
        className="... transition-opacity duration-150 ease-in-out"
      >
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-visible"
          onScroll={handleScroll}
        >
          {/* 侧边栏内容 */}
        </div>
      </div>
    </TranslationLoader>
  )
}
```

#### AppLayoutClient组件优化
```typescript
// src/components/layout/AppLayoutClient.tsx
<div className={`${isMobile ? 'hidden' : 'block'} flex-shrink-0`}>
  <NavigationSidebar key="desktop-sidebar-stable" />
</div>
```

## 技术特性

### ✅ 已实现功能

1. **滚动位置保持**
   - 使用 localStorage 保存滚动位置
   - 防抖机制避免频繁保存
   - 路由变化后自动恢复位置

2. **组件稳定性**
   - 使用稳定的 key 防止重新挂载
   - 组件状态在路由变化时保持

3. **平滑过渡**
   - 添加 CSS 过渡效果
   - 减少视觉抖动

4. **状态持久化**
   - 展开状态保存在 localStorage
   - 滚动位置保存在 localStorage

### 🔧 技术实现细节

1. **防抖机制**：滚动位置保存使用100ms防抖，避免频繁写入localStorage
2. **错误处理**：所有localStorage操作都有try-catch保护
3. **性能优化**：使用requestAnimationFrame确保DOM渲染完成后再恢复滚动位置
4. **兼容性**：支持服务端渲染，客户端激活时正确恢复状态

## 测试验证

### 测试页面
创建了专门的测试页面 `/test-sidebar` 用于验证优化效果。

### 测试步骤
1. 展开侧边栏中的多个分类
2. 滚动侧边栏到特定位置
3. 点击不同页面进行路由跳转
4. 验证展开状态和滚动位置是否保持

### 预期结果
- ✅ 侧边栏展开状态保持
- ✅ 滚动位置保持
- ✅ 无明显抖动或闪烁
- ✅ 组件不重新挂载

## 性能影响

### 正面影响
- 减少了不必要的组件重新挂载
- 提升了用户体验的流畅性
- 减少了DOM操作和重绘

### 资源消耗
- localStorage存储：约100字节（展开状态 + 滚动位置）
- 内存消耗：增加了几个ref和状态管理
- 计算开销：防抖机制的轻微开销

## 后续优化建议

1. **缓存策略优化**：考虑使用IndexedDB替代localStorage存储更复杂的状态
2. **性能监控**：添加路由变化性能监控
3. **用户偏好**：允许用户选择是否启用状态保持功能
4. **移动端优化**：针对移动端的特殊处理

## 总结

通过实现滚动位置保持、组件稳定性保证和平滑过渡效果，成功解决了侧边栏在路由变化时的状态重置问题。用户现在可以在不同页面间切换时保持侧边栏的状态，大大提升了使用体验。
