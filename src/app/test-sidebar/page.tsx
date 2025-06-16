import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import AppLayout from '@/components/layout/AppLayout'

export default async function TestSidebarPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">侧边栏状态保持测试页面</h1>
        
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">测试说明</h2>
            <p className="text-gray-600 dark:text-gray-400">
              这个页面用于测试侧边栏在路由变化时的状态保持功能。
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">测试步骤</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li>在左侧侧边栏中展开一些分类</li>
              <li>滚动侧边栏到某个位置</li>
              <li>点击不同的页面链接进行路由跳转</li>
              <li>观察侧边栏的展开状态和滚动位置是否保持</li>
            </ol>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">快速导航</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a 
                href="/dashboard" 
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-center"
              >
                仪表板
              </a>
              <a 
                href="/transactions" 
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-center"
              >
                交易记录
              </a>
              <a 
                href="/reports" 
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 text-center"
              >
                报表
              </a>
              <a 
                href="/test-sidebar" 
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-center"
              >
                测试页面
              </a>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">预期效果</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li>侧边栏的展开/收起状态在路由变化时保持不变</li>
              <li>侧边栏的滚动位置在路由变化时保持不变</li>
              <li>页面切换时没有明显的抖动或闪烁</li>
              <li>侧边栏组件不会重新挂载</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">技术实现</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li>使用 localStorage 保存展开状态</li>
              <li>使用防抖机制保存滚动位置</li>
              <li>使用稳定的 key 防止组件重新挂载</li>
              <li>添加平滑过渡效果减少视觉抖动</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
