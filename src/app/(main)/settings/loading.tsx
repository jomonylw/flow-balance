import { SettingsAppLayoutSkeleton } from '@/components/ui/data-display/page-skeletons'

export default function Loading() {
  // 这个 loading.tsx 主要用于客户端导航时的加载状态
  // 页面刷新时的骨架屏由 TranslationLoader 处理
  return <SettingsAppLayoutSkeleton />
}
