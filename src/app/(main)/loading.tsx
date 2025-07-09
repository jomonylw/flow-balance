import { AppLayoutSkeleton } from '@/components/ui/data-display/page-skeletons'

export default function MainLayoutLoading() {
  // 主布局加载状态 - 包含侧边栏和顶部横条的完整骨架屏
  // 这个加载状态用于整个 (main) 路由组的初始加载
  return <AppLayoutSkeleton />
}
