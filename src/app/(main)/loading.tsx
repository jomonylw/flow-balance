import { DashboardSkeleton } from '@/components/ui/data-display/page-skeletons'

export default function MainLayoutLoading() {
  // 主布局加载状态 - 由于使用共享布局，只需要显示主内容区域的骨架屏
  // 侧边栏和顶栏已经由 AppLayoutClient 渲染，不需要重复显示
  // 这个加载状态用于整个 (main) 路由组的页面导航时的加载
  return <DashboardSkeleton />
}
