'use client'

import { useState, useRef } from 'react'
import { useIsMobile } from '@/hooks/useResponsive'
import TopUserStatusBar from './TopUserStatusBar'
import NavigationSidebar from './NavigationSidebar'
import MobileSidebarOverlay from './MobileSidebarOverlay'
import { UserDataProvider } from '@/contexts/UserDataContext'


interface User {
  id: string
  email: string
  settings?: {
    baseCurrency?: {
      code: string
      name: string
      symbol: string
    }
  }
}

interface AppLayoutClientProps {
  children: React.ReactNode
  user: User
}

export default function AppLayoutClient({ children, user }: AppLayoutClientProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const isMobile = useIsMobile()

  // 侧边栏数据刷新引用
  const sidebarRefreshRef = useRef<((options?: {
    type?: 'category' | 'account' | 'full'
    silent?: boolean
  }) => void) | null>(null)

  // 移动端侧边栏控制
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen)
  }

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
  }

  // 数据刷新处理函数
  const handleSidebarRefresh = (options?: {
    type?: 'category' | 'account' | 'full'
    silent?: boolean
  }) => {
    sidebarRefreshRef.current?.(options)
  }

  const handleDashboardRefresh = () => {
    // 这里可以添加 Dashboard 特定的刷新逻辑
    console.log('Dashboard refresh requested')
  }

  const handlePageRefresh = () => {
    // 这里可以添加当前页面的刷新逻辑
    console.log('Page refresh requested')
  }

  return (
    <UserDataProvider>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* 顶部用户状态栏 */}
        <TopUserStatusBar
          user={user}
          onMenuClick={toggleMobileSidebar}
          showMenuButton={isMobile}
        />

        {/* 主内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 桌面端左侧导航栏 */}
          <div className={`${isMobile ? 'hidden' : 'block'}`}>
            <NavigationSidebar user={user} />
          </div>

          {/* 移动端侧边栏遮罩 */}
          {isMobile && (
            <MobileSidebarOverlay
              isOpen={isMobileSidebarOpen}
              onClose={closeMobileSidebar}
            >
              <NavigationSidebar
                user={user}
                isMobile={true}
                onNavigate={closeMobileSidebar}
              />
            </MobileSidebarOverlay>
          )}

          {/* 右侧主内容 */}
          <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
            {children}
          </main>
        </div>
      </div>
    </UserDataProvider>
  )
}
