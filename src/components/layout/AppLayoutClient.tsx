'use client'

import { useState, useCallback } from 'react'
import { useIsMobile } from '@/hooks/useResponsive'
import TopUserStatusBar from './TopUserStatusBar'
import NavigationSidebar from './NavigationSidebar'
import MobileSidebarOverlay from './MobileSidebarOverlay'


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
  // 移动端侧边栏控制
  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev)
  }, [])

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false)
  }, [])

  return (
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
          <div className={`${isMobile ? 'hidden' : 'block'} flex-shrink-0`}>
            <NavigationSidebar />
          </div>

          {/* 移动端侧边栏遮罩 */}
          {isMobile && (
            <MobileSidebarOverlay
              isOpen={isMobileSidebarOpen}
              onClose={closeMobileSidebar}
            >
              <NavigationSidebar
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
  )
}
