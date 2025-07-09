import { FirePageSkeleton } from '@/components/ui/data-display/page-skeletons'

export default function FireLoading() {
  // 由于使用共享布局，只需要显示主内容区域的骨架屏
  return <FirePageSkeleton />
}
