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

## 最终解决方案

### 使用 Next.js 路由组实现侧边栏分离

通过使用 Next.js 的路由组 `(main)`，我们成功实现了侧边栏与页面内容的分离：

1. **侧边栏布局分离**：侧边栏在 `src/app/(main)/layout.tsx` 中定义，不会随路由变化重新挂载
2. **自然的滚动位置保持**：由于侧边栏组件不重新挂载，滚动位置自然保持
3. **组件状态保持**：展开/折叠状态、搜索状态等都自然保持

### 移除滚动条记忆功能

由于侧边栏已经分离，之前实现的滚动条记忆功能已不再需要：

- ✅ 移除了 `useSidebarScrollPosition` Hook
- ✅ 移除了相关的 localStorage 存储逻辑
- ✅ 简化了 NavigationSidebar 组件
- ✅ 保留了组件稳定性和平滑过渡功能

## 保留的优化功能

### 1. 组件稳定性保证

#### Hook: `useStableComponentKey`

```typescript
// src/hooks/useSidebarState.ts
export function useStableComponentKey(baseKey: string = 'sidebar') {
  // 使用固定的key，避免路由变化时组件重新挂载
  return `${baseKey}-stable`
}
```

### 2. 平滑过渡效果

#### Hook: `useSmoothTransition`

```typescript
// src/hooks/useSidebarState.ts
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

  return { transitionRef }
}
```

### 3. 路由组布局

#### 主布局 (`src/app/(main)/layout.tsx`)

```typescript
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    include: { baseCurrency: true },
  })

  const userWithSettings = { ...user, settings: userSettings }

  return <AppLayoutClient user={userWithSettings}>{children}</AppLayoutClient>
}
```

#### AppLayoutClient组件

```typescript
// src/components/features/layout/AppLayoutClient.tsx
export default function AppLayoutClient({ children, user }: AppLayoutClientProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const isMobile = useIsMobile()

  return (
    <div className='h-screen flex flex-col bg-gray-50 dark:bg-gray-900'>
      <TopUserStatusBar user={user} onMenuClick={toggleMobileSidebar} showMenuButton={isMobile} />

      <div className='flex-1 flex overflow-hidden'>
        {/* 桌面端左侧导航栏 - 使用稳定的key */}
        <div className={`${isMobile ? 'hidden' : 'block'} flex-shrink-0`}>
          <NavigationSidebar key='desktop-sidebar-stable' />
        </div>

        {/* 右侧主内容 */}
        <main className='flex-1 overflow-y-auto bg-white dark:bg-gray-800'>
          <div className='min-h-full'>{children}</div>
        </main>
      </div>
    </div>
  )
}

## 技术特性

### ✅ 已实现功能

1. **侧边栏分离**

   - 使用 Next.js 路由组 `(main)` 实现侧边栏与页面内容分离
   - 侧边栏在路由变化时不重新挂载
   - 自然保持滚动位置和组件状态

2. **组件稳定性**

   - 使用稳定的 key 防止重新挂载
   - 组件状态在路由变化时保持

3. **平滑过渡**

   - 添加 CSS 过渡效果
   - 减少视觉抖动

4. **状态持久化**
   - 展开状态保存在 localStorage
   - 视图模式保存在 localStorage
   - 侧边栏宽度保存在 localStorage

### 🔧 技术实现细节

1. **路由组架构**：使用 `(main)` 路由组确保侧边栏布局稳定
2. **组件稳定性**：使用 `useStableComponentKey` 提供稳定的组件 key
3. **平滑过渡**：使用 `useSmoothTransition` 提供路由变化时的视觉过渡
4. **兼容性**：支持服务端渲染，客户端激活时正确恢复状态

## 测试验证

### 测试步骤

1. 展开侧边栏中的多个分类
2. 滚动侧边栏到特定位置
3. 点击不同页面进行路由跳转
4. 验证展开状态和滚动位置是否保持

### 预期结果

- ✅ 侧边栏展开状态保持
- ✅ 滚动位置自然保持（无需额外代码）
- ✅ 无明显抖动或闪烁
- ✅ 组件不重新挂载
- ✅ 视图模式和宽度设置保持

## 性能影响

### 正面影响

- 减少了不必要的组件重新挂载
- 提升了用户体验的流畅性
- 减少了DOM操作和重绘
- 简化了代码复杂度（移除了滚动位置记忆逻辑）

### 资源消耗

- localStorage存储：约50字节（展开状态 + 视图模式 + 侧边栏宽度）
- 内存消耗：减少了滚动位置相关的ref和状态管理
- 计算开销：移除了防抖机制，减少了计算开销

## 后续优化建议

1. **性能监控**：添加路由变化性能监控
2. **用户偏好**：允许用户选择是否启用状态保持功能
3. **移动端优化**：针对移动端的特殊处理

## 总结

通过使用 Next.js 路由组实现侧边栏分离，成功解决了侧边栏在路由变化时的状态重置问题。这种方案比之前的滚动位置记忆功能更加简洁和高效，用户现在可以在不同页面间切换时自然保持侧边栏的所有状态，大大提升了使用体验。
```
