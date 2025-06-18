'use client'

import { useState, useCallback } from 'react'
import { useIsMobile } from '@/hooks/ui/useResponsive'
import TopUserStatusBar from './TopUserStatusBar'
import NavigationSidebar from './NavigationSidebar'
import MobileSidebarOverlay from './MobileSidebarOverlay'
import type { SimpleUser, SimpleCurrency } from '@/types/core'

interface UserWithSettings extends SimpleUser {
  settings?: {
    baseCurrency?: SimpleCurrency
  }
}

interface AppLayoutClientProps {
  children: React.ReactNode
  user: UserWithSettings
}

export default function AppLayoutClient({
  children,
  user,
}: AppLayoutClientProps) {
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
    <div className='h-screen flex flex-col bg-gray-50 dark:bg-gray-900'>
      {/* 顶部用户状态栏 */}
      <TopUserStatusBar
        user={user}
        onMenuClick={toggleMobileSidebar}
        showMenuButton={isMobile}
      />

      {/* 主内容区域 */}
      <div className='flex-1 flex overflow-hidden'>
        {/* 桌面端左侧导航栏 */}
        <div className={`${isMobile ? 'hidden' : 'block'} flex-shrink-0`}>
          <NavigationSidebar key='desktop-sidebar-stable' />
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
        <main className='flex-1 overflow-y-auto bg-white dark:bg-gray-800 transition-opacity duration-150 ease-in-out main-content'>
          <div className='min-h-full route-transition'>{children}</div>
        </main>
      </div>
    </div>
  )
}
