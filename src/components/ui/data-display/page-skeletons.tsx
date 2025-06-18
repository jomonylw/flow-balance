'use client'

import {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
} from './skeleton'

/**
 * 仪表板骨架屏
 */
export function DashboardSkeleton() {
  return (
    <div className='p-6 space-y-6'>
      {/* 页面标题 */}
      <div>
        <Skeleton height='2rem' width='25%' className='mb-2' />
        <Skeleton height='1rem' width='50%' />
      </div>

      {/* 快速操作按钮 */}
      <div className='flex gap-4'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height='2.5rem' width='120px' rounded='md' />
        ))}
      </div>

      {/* 财务统计卡片 */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} hasHeader={false} contentLines={2} />
        ))}
      </div>

      {/* 图表区域 */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <SkeletonChart height={400} hasTitle={true} hasLegend={true} />
        <SkeletonChart height={400} hasTitle={true} hasLegend={true} />
      </div>
    </div>
  )
}

/**
 * 账户详情页骨架屏
 */
export function AccountDetailSkeleton() {
  return (
    <div className='p-6 space-y-6'>
      {/* 面包屑导航 */}
      <div className='flex items-center space-x-2'>
        <Skeleton height='1rem' width='60px' />
        <span className='text-gray-500 dark:text-gray-400'>/</span>
        <Skeleton height='1rem' width='80px' />
        <span className='text-gray-500 dark:text-gray-400'>/</span>
        <Skeleton height='1rem' width='100px' />
      </div>

      {/* 账户信息卡片 */}
      <SkeletonCard hasHeader={true} contentLines={4} hasFooter={true} />

      {/* 趋势图表 */}
      <SkeletonChart height={400} hasTitle={true} hasLegend={false} />

      {/* 交易列表 */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
        <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
          <Skeleton height='1.5rem' width='30%' className='mb-2' />
          <Skeleton height='1rem' width='60%' />
        </div>
        <SkeletonTable rows={8} columns={5} className='shadow-none' />
      </div>
    </div>
  )
}

/**
 * 交易列表页骨架屏
 */
export function TransactionListSkeleton() {
  return (
    <div className='p-6 space-y-6'>
      {/* 页面标题和过滤器 */}
      <div>
        <Skeleton height='2rem' width='25%' className='mb-4' />
        <div className='flex gap-4 mb-4'>
          <Skeleton height='2.5rem' width='200px' rounded='md' />
          <Skeleton height='2.5rem' width='150px' rounded='md' />
          <Skeleton height='2.5rem' width='120px' rounded='md' />
        </div>
      </div>

      {/* 统计卡片 */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} hasHeader={false} contentLines={2} />
        ))}
      </div>

      {/* 交易表格 */}
      <SkeletonTable rows={10} columns={6} />
    </div>
  )
}

/**
 * 报表页面骨架屏
 */
export function ReportsSkeleton() {
  return (
    <div className='p-6 space-y-6'>
      {/* 页面标题 */}
      <div>
        <Skeleton height='2rem' width='20%' className='mb-2' />
        <Skeleton height='1rem' width='40%' />
      </div>

      {/* 标签页导航 */}
      <div className='flex gap-2 border-b border-gray-200 dark:border-gray-700'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            height='2.5rem'
            width='120px'
            rounded='md'
            className='mb-2'
          />
        ))}
      </div>

      {/* 报表内容 */}
      <div className='space-y-6'>
        {/* 汇总信息 */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} hasHeader={false} contentLines={2} />
          ))}
        </div>

        {/* 详细报表 */}
        <SkeletonTable rows={12} columns={4} />
      </div>
    </div>
  )
}

/**
 * 侧边栏骨架屏
 */
export function SidebarSkeleton({ isMobile = false }: { isMobile?: boolean }) {
  // 使用 CSS 变量和 Tailwind 的 dark: 前缀来避免 SSR 水合错误
  return (
    <div
      className={`${isMobile ? 'w-full' : 'w-80'} bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full`}
    >
      <div className='p-4 space-y-4'>
        {/* 搜索框 */}
        <Skeleton height='2.5rem' rounded='md' />

        {/* 导航链接 */}
        <div className='space-y-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height='2rem' rounded='md' />
          ))}
        </div>

        {/* 分隔线 */}
        <div className='border-t border-gray-200 dark:border-gray-700 my-4' />

        {/* 账户分类树 */}
        <div className='space-y-2'>
          <Skeleton height='1.5rem' width='60%' />
          <div className='ml-4 space-y-2'>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                height='1.5rem'
                width={`${70 + (i % 3) * 10}%`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * FIRE页面骨架屏
 */
export function FirePageSkeleton() {
  return (
    <div className='p-6 space-y-8'>
      {/* 页面标题 */}
      <div>
        <Skeleton height='2rem' width='30%' className='mb-2' />
        <Skeleton height='1rem' width='50%' />
      </div>

      {/* 现实快照 */}
      <SkeletonCard hasHeader={true} contentLines={4} />

      {/* 核心指标 */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} hasHeader={false} contentLines={3} />
        ))}
      </div>

      {/* 可视化图表 */}
      <SkeletonChart height={500} hasTitle={true} hasLegend={true} />

      {/* 控制面板 */}
      <SkeletonCard hasHeader={true} contentLines={6} hasFooter={true} />
    </div>
  )
}

/**
 * 设置页面导航骨架屏
 */
export function SettingsNavigationSkeleton() {
  return (
    <div className='w-80 flex-shrink-0'>
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden'>
        {/* 设置分组 */}
        <div className='divide-y divide-gray-100 dark:divide-gray-700'>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className='px-4 py-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  <Skeleton width='16px' height='16px' rounded='sm' />
                  <div>
                    <Skeleton height='0.875rem' width='80px' className='mb-1' />
                    <Skeleton height='0.75rem' width='120px' />
                  </div>
                </div>
                <div className='flex items-center space-x-2'>
                  <Skeleton width='20px' height='16px' rounded='full' />
                  <Skeleton width='16px' height='16px' />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 设置页面内容骨架屏
 */
export function SettingsContentSkeleton() {
  return (
    <div className='flex-1 min-w-0'>
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700'>
        {/* 内容标题栏 */}
        <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center space-x-3'>
            <Skeleton width='20px' height='20px' rounded='sm' />
            <div>
              <Skeleton height='1.125rem' width='150px' className='mb-1' />
              <Skeleton height='0.875rem' width='200px' />
            </div>
            <Skeleton width='60px' height='24px' rounded='full' />
          </div>
        </div>

        {/* 内容区域 */}
        <div className='p-6'>
          <SettingsFormSkeleton />
        </div>
      </div>
    </div>
  )
}

/**
 * 设置表单骨架屏
 */
export function SettingsFormSkeleton() {
  return (
    <div className='space-y-6'>
      {/* 表单卡片 */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6'>
        <div className='mb-4'>
          <div className='flex items-center mb-2'>
            <Skeleton
              width='20px'
              height='20px'
              rounded='sm'
              className='mr-2'
            />
            <Skeleton height='1.125rem' width='120px' />
          </div>
          <Skeleton height='0.875rem' width='250px' />
        </div>

        <div className='space-y-4'>
          {/* 表单字段 */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton height='1rem' width='80px' className='mb-2' />
              <Skeleton height='2.5rem' rounded='md' />
              <Skeleton height='0.75rem' width='180px' className='mt-1' />
            </div>
          ))}

          {/* 提交按钮 */}
          <div className='pt-4'>
            <Skeleton height='2.5rem' width='120px' rounded='md' />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 设置页面骨架屏（移动端）
 */
export function SettingsPageMobileSkeleton() {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* 页面标题 */}
      <div className='p-6'>
        <Skeleton height='2rem' width='30%' className='mb-2' />
        <Skeleton height='1rem' width='50%' />
      </div>

      {/* 设置分组卡片 */}
      <div className='px-6 space-y-4'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700'>
          <div className='divide-y divide-gray-200 dark:divide-gray-700'>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className='px-4 py-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-3'>
                    <Skeleton width='16px' height='16px' rounded='sm' />
                    <div>
                      <Skeleton
                        height='0.875rem'
                        width='100px'
                        className='mb-1'
                      />
                      <Skeleton height='0.75rem' width='150px' />
                    </div>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Skeleton width='20px' height='16px' rounded='full' />
                    <Skeleton width='16px' height='16px' />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 当前选中的设置内容 */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4'>
          <SettingsFormSkeleton />
        </div>
      </div>
    </div>
  )
}

/**
 * 设置页面骨架屏（桌面端）
 */
export function SettingsPageDesktopSkeleton() {
  return (
    <div className='p-6'>
      {/* 页面标题 */}
      <div className='mb-6'>
        <Skeleton height='2rem' width='25%' className='mb-2' />
        <Skeleton height='1rem' width='45%' />
      </div>

      {/* 桌面端两栏布局 */}
      <div className='flex gap-8'>
        <SettingsNavigationSkeleton />
        <SettingsContentSkeleton />
      </div>
    </div>
  )
}

/**
 * 个人资料表单骨架屏
 */
export function ProfileFormSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6'>
        <div className='mb-4'>
          <div className='flex items-center mb-2'>
            <span className='mr-2'>👤</span>
            <Skeleton height='1.125rem' width='100px' />
          </div>
          <Skeleton height='0.875rem' width='200px' />
        </div>

        <div className='space-y-4'>
          {/* 邮箱字段 */}
          <div>
            <Skeleton height='1rem' width='60px' className='mb-2' />
            <Skeleton height='2.5rem' rounded='md' />
            <Skeleton height='0.75rem' width='150px' className='mt-1' />
          </div>

          {/* 昵称字段 */}
          <div>
            <Skeleton height='1rem' width='70px' className='mb-2' />
            <Skeleton height='2.5rem' rounded='md' />
            <Skeleton height='0.75rem' width='180px' className='mt-1' />
          </div>

          {/* 提交按钮 */}
          <div className='pt-4'>
            <Skeleton height='2.5rem' width='100px' rounded='md' />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 密码修改表单骨架屏
 */
export function PasswordFormSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6'>
        <div className='mb-4'>
          <div className='flex items-center mb-2'>
            <span className='mr-2'>🔒</span>
            <Skeleton height='1.125rem' width='80px' />
          </div>
          <Skeleton height='0.875rem' width='220px' />
        </div>

        <div className='space-y-4'>
          {/* 密码字段 */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton
                height='1rem'
                width={`${60 + i * 10}px`}
                className='mb-2'
              />
              <Skeleton height='2.5rem' rounded='md' />
              {i === 1 && (
                <Skeleton height='0.75rem' width='160px' className='mt-1' />
              )}
            </div>
          ))}

          {/* 提交按钮 */}
          <div className='pt-4'>
            <Skeleton height='2.5rem' width='100px' rounded='md' />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 偏好设置表单骨架屏
 */
export function PreferencesFormSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6'>
        <div className='mb-4'>
          <div className='flex items-center mb-2'>
            <span className='mr-2'>⚙️</span>
            <Skeleton height='1.125rem' width='120px' />
          </div>
          <Skeleton height='0.875rem' width='250px' />
        </div>

        <div className='space-y-6'>
          {/* 基础货币 */}
          <div>
            <Skeleton height='1rem' width='80px' className='mb-2' />
            <Skeleton height='2.5rem' rounded='md' />
          </div>

          {/* 主题设置 */}
          <div>
            <Skeleton height='1rem' width='60px' className='mb-2' />
            <div className='flex gap-2'>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height='2.5rem' width='80px' rounded='md' />
              ))}
            </div>
          </div>

          {/* 语言设置 */}
          <div>
            <Skeleton height='1rem' width='60px' className='mb-2' />
            <Skeleton height='2.5rem' rounded='md' />
          </div>

          {/* FIRE设置 */}
          <div>
            <div className='flex items-center justify-between mb-4'>
              <Skeleton height='1rem' width='100px' />
              <Skeleton height='1.5rem' width='40px' rounded='full' />
            </div>
            <div>
              <Skeleton height='1rem' width='120px' className='mb-2' />
              <Skeleton height='2rem' rounded='md' />
            </div>
          </div>

          {/* 提交按钮 */}
          <div className='pt-4'>
            <Skeleton height='2.5rem' width='100px' rounded='md' />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 货币管理骨架屏
 */
export function CurrencyManagementSkeleton() {
  return (
    <div className='space-y-6'>
      {/* 已选择的货币 */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6'>
        <div className='mb-4'>
          <Skeleton height='1.125rem' width='120px' className='mb-2' />
          <Skeleton height='0.875rem' width='200px' />
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg'
            >
              <div className='flex items-center space-x-2'>
                <Skeleton width='20px' height='20px' rounded='sm' />
                <div>
                  <Skeleton height='0.875rem' width='40px' className='mb-1' />
                  <Skeleton height='0.75rem' width='60px' />
                </div>
              </div>
              <Skeleton width='20px' height='20px' rounded='sm' />
            </div>
          ))}
        </div>
      </div>

      {/* 可用货币 */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6'>
        <div className='mb-4'>
          <Skeleton height='1.125rem' width='100px' className='mb-2' />
          <Skeleton height='0.875rem' width='180px' />
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg'
            >
              <div className='flex items-center space-x-2'>
                <Skeleton width='20px' height='20px' rounded='sm' />
                <div>
                  <Skeleton height='0.875rem' width='40px' className='mb-1' />
                  <Skeleton height='0.75rem' width='80px' />
                </div>
              </div>
              <Skeleton width='60px' height='24px' rounded='md' />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 标签管理骨架屏
 */
export function TagManagementSkeleton() {
  return (
    <div className='space-y-6'>
      {/* 操作按钮 */}
      <div className='flex justify-between items-center'>
        <Skeleton height='1.5rem' width='100px' />
        <Skeleton height='2.5rem' width='100px' rounded='md' />
      </div>

      {/* 标签列表 */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
        <div className='divide-y divide-gray-200 dark:divide-gray-700'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className='p-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  <Skeleton width='16px' height='16px' rounded='full' />
                  <div>
                    <Skeleton height='1rem' width='80px' className='mb-1' />
                    <Skeleton height='0.75rem' width='60px' />
                  </div>
                </div>
                <div className='flex items-center space-x-2'>
                  <Skeleton width='60px' height='24px' rounded='md' />
                  <Skeleton width='60px' height='24px' rounded='md' />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 汇率管理骨架屏
 */
export function ExchangeRateManagementSkeleton() {
  return (
    <div className='space-y-6'>
      {/* 页面标题 */}
      <div>
        <Skeleton height='1.5rem' width='150px' className='mb-2' />
        <Skeleton height='1rem' width='300px' />
      </div>

      {/* 缺失汇率提示 */}
      <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4'>
        <div className='flex items-start space-x-3'>
          <span className='text-yellow-600 dark:text-yellow-400'>⚠️</span>
          <div className='flex-1'>
            <Skeleton height='1rem' width='180px' className='mb-2' />
            <Skeleton height='0.875rem' width='320px' />
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className='flex justify-between items-center'>
        <Skeleton height='1.5rem' width='120px' />
        <Skeleton height='2.5rem' width='120px' rounded='md' />
      </div>

      {/* 汇率表格 */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
        {/* 表头 */}
        <div className='bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600'>
          <div className='grid grid-cols-5 gap-4'>
            <Skeleton height='1rem' width='60px' />
            <Skeleton height='1rem' width='60px' />
            <Skeleton height='1rem' width='40px' />
            <Skeleton height='1rem' width='80px' />
            <Skeleton height='1rem' width='60px' />
          </div>
        </div>

        {/* 表格内容 */}
        <div className='divide-y divide-gray-200 dark:divide-gray-700'>
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div key={rowIndex} className='px-6 py-4'>
              <div className='grid grid-cols-5 gap-4 items-center'>
                <div className='flex items-center space-x-2'>
                  <Skeleton width='16px' height='16px' rounded='sm' />
                  <Skeleton height='1rem' width='35px' />
                </div>
                <div className='flex items-center space-x-2'>
                  <Skeleton width='16px' height='16px' rounded='sm' />
                  <Skeleton height='1rem' width='35px' />
                </div>
                <Skeleton height='1rem' width='50px' />
                <Skeleton height='1rem' width='70px' />
                <div className='flex items-center space-x-2'>
                  <Skeleton width='50px' height='24px' rounded='md' />
                  <Skeleton width='50px' height='24px' rounded='md' />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 空状态提示 */}
      <div className='text-center py-8'>
        <Skeleton height='1rem' width='200px' className='mx-auto' />
      </div>
    </div>
  )
}

/**
 * 数据管理骨架屏
 */
export function DataManagementSkeleton() {
  return (
    <div className='space-y-6'>
      {/* 数据导出 */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6'>
        <div className='mb-4'>
          <div className='flex items-center mb-2'>
            <span className='mr-2'>📊</span>
            <Skeleton height='1.125rem' width='100px' />
          </div>
          <Skeleton height='0.875rem' width='250px' />
        </div>

        <div className='space-y-4'>
          <Skeleton height='0.875rem' width='300px' />
          <Skeleton height='2.5rem' width='120px' rounded='md' />
        </div>
      </div>

      {/* 数据删除 */}
      <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 sm:p-6'>
        <div className='mb-4'>
          <div className='flex items-center mb-2'>
            <span className='mr-2'>⚠️</span>
            <Skeleton height='1.125rem' width='120px' />
          </div>
          <Skeleton height='0.875rem' width='280px' />
        </div>

        <div className='space-y-4'>
          <Skeleton height='0.875rem' width='350px' />
          <Skeleton height='2.5rem' width='100px' rounded='md' />
        </div>
      </div>
    </div>
  )
}

/**
 * 设置页面骨架屏（响应式）
 */
export function SettingsPageSkeleton({
  isMobile = false,
}: {
  isMobile?: boolean
}) {
  return isMobile ? (
    <SettingsPageMobileSkeleton />
  ) : (
    <SettingsPageDesktopSkeleton />
  )
}

/**
 * 通用设置加载骨架屏
 * 用于在切换标签页时显示
 */
export function SettingsTabLoadingSkeleton() {
  return (
    <div className='space-y-4'>
      <div className='animate-pulse'>
        <div className='flex items-center space-x-3 mb-4'>
          <Skeleton width='20px' height='20px' rounded='sm' />
          <Skeleton height='1.125rem' width='120px' />
        </div>
        <div className='space-y-3'>
          <Skeleton height='1rem' width='100%' />
          <Skeleton height='1rem' width='85%' />
          <Skeleton height='1rem' width='70%' />
        </div>
      </div>
    </div>
  )
}
