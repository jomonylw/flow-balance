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
    <div className='max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8'>
      {/* 页面标题 */}
      <div className='mb-6 sm:mb-8'>
        <Skeleton height='2rem' width='25%' className='mb-2' />
        <Skeleton height='1rem' width='50%' />
      </div>

      {/* 汇率设置提醒 */}
      <div className='mb-4 sm:mb-6'>
        <SkeletonCard
          hasHeader={false}
          contentLines={1}
          className='bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
        />
      </div>

      {/* 系统更新状态卡片 */}
      <SkeletonCard hasHeader={false} contentLines={2} className='mb-6' />

      {/* 智能财务统计 */}
      <div className='mb-8'>
        <Skeleton height='1.5rem' width='30%' className='mb-4' />
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} hasHeader={false} contentLines={3} />
          ))}
        </div>
      </div>

      {/* 基础统计卡片 */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} hasHeader={false} contentLines={2} />
        ))}
      </div>

      {/* 快速操作 */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8'>
        <Skeleton height='1.125rem' width='20%' className='mb-4' />
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height='3rem' rounded='md' />
          ))}
        </div>
      </div>

      {/* 图表展示区域 */}
      <div className='space-y-6'>
        <Skeleton height='1.5rem' width='30%' className='mb-4' />
        <div className='space-y-6'>
          <SkeletonChart height={400} hasTitle={true} hasLegend={false} />
          <SkeletonChart height={400} hasTitle={true} hasLegend={false} />
        </div>
      </div>

      {/* 数据质量评分 */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6'>
        <div className='flex items-center justify-between mb-4'>
          <Skeleton height='1.5rem' width='25%' />
          <Skeleton height='2rem' width='80px' />
        </div>
        <Skeleton height='0.5rem' rounded='full' className='mb-4' />
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='text-center'>
              <Skeleton
                height='1.125rem'
                width='60%'
                className='mx-auto mb-1'
              />
              <Skeleton height='0.875rem' width='80%' className='mx-auto' />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 账户详情页骨架屏
 */
export function AccountDetailSkeleton() {
  return (
    <div className='max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8'>
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
 * 分类详情页骨架屏
 */
export function CategoryDetailSkeleton() {
  return (
    <div className='max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8'>
      {/* 面包屑导航 */}
      <nav
        className='flex items-center mb-4 sm:mb-6 overflow-x-auto scrollbar-hide'
        aria-label='Breadcrumb'
      >
        <div className='inline-flex items-center space-x-0.5 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg p-1 sm:p-1.5 shadow-sm backdrop-blur-sm min-w-0'>
          {/* 导航图标骨架 */}
          <div className='flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-blue-100 dark:bg-blue-900/40 mr-1 flex-shrink-0'>
            <Skeleton height='12px' width='12px' className='rounded-sm' />
          </div>

          <div className='inline-flex items-center space-x-0.5 whitespace-nowrap min-w-0'>
            {/* 第一个面包屑项 */}
            <div className='inline-flex items-center min-w-0'>
              <div className='inline-flex items-center rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 min-h-[32px] sm:min-h-[36px]'>
                <Skeleton height='14px' width='60px' className='rounded-sm' />
              </div>
            </div>

            {/* 分隔符 */}
            <div className='flex items-center mx-0.5 sm:mx-1 flex-shrink-0'>
              <svg
                className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-500'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
                  clipRule='evenodd'
                />
              </svg>
            </div>

            {/* 第二个面包屑项 */}
            <div className='inline-flex items-center min-w-0'>
              <div className='inline-flex items-center rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 min-h-[32px] sm:min-h-[36px]'>
                <Skeleton height='14px' width='80px' className='rounded-sm' />
              </div>
            </div>

            {/* 分隔符 */}
            <div className='flex items-center mx-0.5 sm:mx-1 flex-shrink-0'>
              <svg
                className='w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 dark:text-gray-500'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
                  clipRule='evenodd'
                />
              </svg>
            </div>

            {/* 第三个面包屑项 */}
            <div className='inline-flex items-center min-w-0'>
              <div className='inline-flex items-center rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 min-h-[32px] sm:min-h-[36px]'>
                <Skeleton height='14px' width='100px' className='rounded-sm' />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 分类信息卡片 */}
      <SkeletonCard hasHeader={true} contentLines={3} hasFooter={false} />

      {/* 子分类和账户概览 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* 子分类 */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
          <Skeleton height='1.5rem' width='40%' className='mb-4' />
          <div className='space-y-3'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='flex items-center justify-between'>
                <Skeleton height='1rem' width='60%' />
                <Skeleton height='1rem' width='20%' />
              </div>
            ))}
          </div>
        </div>

        {/* 账户列表 */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
          <Skeleton height='1.5rem' width='40%' className='mb-4' />
          <div className='space-y-3'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='flex items-center justify-between'>
                <Skeleton height='1rem' width='70%' />
                <Skeleton height='1rem' width='25%' />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 分类趋势图表 */}
      <SkeletonChart height={350} hasTitle={true} hasLegend={true} />

      {/* 交易列表 */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
        <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
          <Skeleton height='1.5rem' width='30%' className='mb-2' />
          <Skeleton height='1rem' width='50%' />
        </div>
        <SkeletonTable rows={10} columns={6} className='shadow-none' />
      </div>
    </div>
  )
}

/**
 * 交易列表页骨架屏
 */
export function TransactionListSkeleton() {
  return (
    <div className='max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8'>
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
    <div className='max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8'>
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
      {/* 搜索框区域 */}
      <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
        <Skeleton height='2.5rem' rounded='md' />
      </div>

      {/* 侧边栏内容 */}
      <div className='flex-1 overflow-y-auto overflow-x-visible'>
        <div className='p-4 space-y-4'>
          {/* Dashboard 链接 */}
          <div className='mb-4'>
            <div className='flex items-center px-4 py-3 rounded-xl'>
              <div className='flex items-center flex-1'>
                <div className='flex items-center justify-center w-10 h-10 rounded-lg mr-3'>
                  <Skeleton width='40px' height='40px' rounded='lg' />
                </div>
                <Skeleton height='0.875rem' width='60px' />
              </div>
            </div>
          </div>

          {/* FIRE 征途链接 */}
          <div className='mb-4'>
            <div className='flex items-center px-4 py-3 rounded-xl'>
              <div className='flex items-center flex-1'>
                <div className='flex items-center justify-center w-10 h-10 rounded-lg mr-3'>
                  <Skeleton width='40px' height='40px' rounded='lg' />
                </div>
                <Skeleton height='0.875rem' width='80px' />
              </div>
            </div>
          </div>

          {/* 交易链接 */}
          <div className='mb-4'>
            <div className='flex items-center px-4 py-3 rounded-xl'>
              <div className='flex items-center flex-1'>
                <div className='flex items-center justify-center w-10 h-10 rounded-lg mr-3'>
                  <Skeleton width='40px' height='40px' rounded='lg' />
                </div>
                <Skeleton height='0.875rem' width='50px' />
              </div>
            </div>
          </div>

          {/* 报表链接 */}
          <div className='mb-4'>
            <div className='flex items-center px-4 py-3 rounded-xl'>
              <div className='flex items-center flex-1'>
                <div className='flex items-center justify-center w-10 h-10 rounded-lg mr-3'>
                  <Skeleton width='40px' height='40px' rounded='lg' />
                </div>
                <Skeleton height='0.875rem' width='50px' />
              </div>
            </div>
          </div>

          {/* 分类和账户树区域 */}
          <div>
            {/* 账户分类标题区域 */}
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center space-x-2'>
                <Skeleton height='1.125rem' width='80px' />
                <Skeleton width='28px' height='28px' rounded='md' />
              </div>
              <div className='flex items-center space-x-2'>
                <Skeleton width='28px' height='28px' rounded='md' />
                <Skeleton width='28px' height='28px' rounded='md' />
              </div>
            </div>

            {/* 账户类型分组 */}
            <div className='space-y-3'>
              {/* 资产分组 */}
              <div className='rounded-lg border bg-blue-50/20 dark:bg-blue-950/15 border-blue-200/50 dark:border-blue-700/30 mx-1'>
                {/* 分组头部 */}
                <div className='flex items-center justify-between px-3 py-2.5'>
                  <div className='flex items-center space-x-3'>
                    <Skeleton width='20px' height='20px' />
                    <Skeleton height='0.875rem' width='40px' />
                  </div>
                  <Skeleton height='0.875rem' width='60px' />
                </div>

                {/* 分组内容 */}
                <div className='space-y-1 px-2 pb-2'>
                  {/* 分类项 */}
                  <div
                    className='flex items-center px-3 py-2.5 rounded-lg'
                    style={{ paddingLeft: '12px' }}
                  >
                    <Skeleton width='20px' height='20px' className='mr-2' />
                    <div className='mr-3 flex-shrink-0'>
                      <Skeleton width='32px' height='32px' rounded='xl' />
                    </div>
                    <div className='flex-1 py-3 min-w-0'>
                      <Skeleton
                        height='0.875rem'
                        width='80px'
                        className='mb-1.5'
                      />
                      <Skeleton height='0.75rem' width='60px' />
                    </div>
                    <Skeleton width='32px' height='32px' rounded='lg' />
                  </div>

                  {/* 账户项 */}
                  <div
                    className='flex items-center px-3 py-2.5 rounded-lg'
                    style={{ paddingLeft: '28px' }}
                  >
                    <div className='mr-3 flex-shrink-0'>
                      <Skeleton width='24px' height='20px' rounded='sm' />
                    </div>
                    <div className='flex-1 py-3 min-w-0'>
                      <Skeleton
                        height='0.875rem'
                        width='100px'
                        className='mb-1.5'
                      />
                      <Skeleton height='0.75rem' width='70px' />
                    </div>
                    <Skeleton width='32px' height='32px' rounded='lg' />
                  </div>

                  <div
                    className='flex items-center px-3 py-2.5 rounded-lg'
                    style={{ paddingLeft: '28px' }}
                  >
                    <div className='mr-3 flex-shrink-0'>
                      <Skeleton width='24px' height='20px' rounded='sm' />
                    </div>
                    <div className='flex-1 py-3 min-w-0'>
                      <Skeleton
                        height='0.875rem'
                        width='90px'
                        className='mb-1.5'
                      />
                      <Skeleton height='0.75rem' width='50px' />
                    </div>
                    <Skeleton width='32px' height='32px' rounded='lg' />
                  </div>
                </div>
              </div>

              {/* 负债分组 */}
              <div className='rounded-lg border bg-orange-50/20 dark:bg-orange-950/15 border-orange-200/50 dark:border-orange-700/30 mx-1'>
                <div className='flex items-center justify-between px-3 py-2.5'>
                  <div className='flex items-center space-x-3'>
                    <Skeleton width='20px' height='20px' />
                    <Skeleton height='0.875rem' width='40px' />
                  </div>
                  <Skeleton height='0.875rem' width='60px' />
                </div>
              </div>

              {/* 收入分组 */}
              <div className='rounded-lg border bg-green-50/20 dark:bg-green-950/15 border-green-200/50 dark:border-green-700/30 mx-1'>
                <div className='flex items-center justify-between px-3 py-2.5'>
                  <div className='flex items-center space-x-3'>
                    <Skeleton width='20px' height='20px' />
                    <Skeleton height='0.875rem' width='40px' />
                  </div>
                  <Skeleton height='0.875rem' width='60px' />
                </div>

                <div className='space-y-1 px-2 pb-2'>
                  <div
                    className='flex items-center px-3 py-2.5 rounded-lg'
                    style={{ paddingLeft: '12px' }}
                  >
                    <Skeleton width='20px' height='20px' className='mr-2' />
                    <div className='mr-3 flex-shrink-0'>
                      <Skeleton width='32px' height='32px' rounded='xl' />
                    </div>
                    <div className='flex-1 py-3 min-w-0'>
                      <Skeleton
                        height='0.875rem'
                        width='70px'
                        className='mb-1.5'
                      />
                      <Skeleton height='0.75rem' width='50px' />
                    </div>
                    <Skeleton width='32px' height='32px' rounded='lg' />
                  </div>
                </div>
              </div>

              {/* 支出分组 */}
              <div className='rounded-lg border bg-red-50/20 dark:bg-red-950/15 border-red-200/50 dark:border-red-700/30 mx-1'>
                <div className='flex items-center justify-between px-3 py-2.5'>
                  <div className='flex items-center space-x-3'>
                    <Skeleton width='20px' height='20px' />
                    <Skeleton height='0.875rem' width='40px' />
                  </div>
                  <Skeleton height='0.875rem' width='60px' />
                </div>

                <div className='space-y-1 px-2 pb-2'>
                  <div
                    className='flex items-center px-3 py-2.5 rounded-lg'
                    style={{ paddingLeft: '12px' }}
                  >
                    <Skeleton width='20px' height='20px' className='mr-2' />
                    <div className='mr-3 flex-shrink-0'>
                      <Skeleton width='32px' height='32px' rounded='xl' />
                    </div>
                    <div className='flex-1 py-3 min-w-0'>
                      <Skeleton
                        height='0.875rem'
                        width='60px'
                        className='mb-1.5'
                      />
                      <Skeleton height='0.75rem' width='40px' />
                    </div>
                    <Skeleton width='32px' height='32px' rounded='lg' />
                  </div>

                  <div
                    className='flex items-center px-3 py-2.5 rounded-lg'
                    style={{ paddingLeft: '28px' }}
                  >
                    <div className='mr-3 flex-shrink-0'>
                      <Skeleton width='24px' height='20px' rounded='sm' />
                    </div>
                    <div className='flex-1 py-3 min-w-0'>
                      <Skeleton
                        height='0.875rem'
                        width='85px'
                        className='mb-1.5'
                      />
                      <Skeleton height='0.75rem' width='55px' />
                    </div>
                    <Skeleton width='32px' height='32px' rounded='lg' />
                  </div>
                </div>
              </div>
            </div>
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
    <div className='max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8'>
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
      {/* 标题和描述 */}
      <div>
        <Skeleton height='1.125rem' width='150px' className='mb-2' />
        <Skeleton height='0.875rem' width='250px' />
      </div>

      {/* 表单字段 */}
      <div className='space-y-4'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton height='1rem' width='80px' className='mb-2' />
            <Skeleton height='2.5rem' rounded='md' />
            <Skeleton height='0.75rem' width='180px' className='mt-1' />
          </div>
        ))}

        {/* 提交按钮 */}
        <div className='pt-4'>
          <Skeleton height='1.75rem' width='80px' rounded='md' />
        </div>
      </div>

      {/* 说明信息 */}
      <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4'>
        <Skeleton height='1rem' width='120px' className='mb-3' />
        <div className='space-y-2'>
          <Skeleton height='0.875rem' width='100%' />
          <Skeleton height='0.875rem' width='85%' />
          <Skeleton height='0.875rem' width='70%' />
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
    <div className='max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8'>
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
      {/* 基本信息表单 */}
      <div>
        <Skeleton height='1.125rem' width='100px' className='mb-2' />
        <Skeleton height='0.875rem' width='200px' className='mb-4' />

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
            <Skeleton height='1.75rem' width='80px' rounded='md' />
          </div>
        </div>
      </div>

      {/* 头像设置 */}
      {/* <div>
        <Skeleton height='1rem' width='80px' className='mb-3' />
        <Skeleton height='0.875rem' width='180px' className='mb-4' />
        <Skeleton height='1.75rem' width='80px' rounded='md' />
      </div> */}

      {/* 账户统计 */}
      <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4'>
        <Skeleton height='1rem' width='80px' className='mb-3' />
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <Skeleton height='0.875rem' width='80px' className='mb-1' />
            <Skeleton height='0.875rem' width='100px' />
          </div>
          <div>
            <Skeleton height='0.875rem' width='70px' className='mb-1' />
            <Skeleton height='0.875rem' width='60px' />
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
      {/* 密码修改表单 */}
      <div>
        <Skeleton height='1.125rem' width='80px' className='mb-2' />
        <Skeleton height='0.875rem' width='220px' className='mb-4' />

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
            <Skeleton height='1.75rem' width='80px' rounded='md' />
          </div>
        </div>
      </div>

      {/* 安全提示 */}
      <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4'>
        <Skeleton height='1rem' width='80px' className='mb-3' />
        <div className='space-y-1'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height='0.875rem' width={`${80 + i * 10}%`} />
          ))}
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
      {/* 外观设置 */}
      <div>
        <Skeleton height='1.125rem' width='120px' className='mb-2' />
        <Skeleton height='0.875rem' width='250px' className='mb-4' />

        <div className='space-y-4'>
          {/* 主题设置 */}
          <div>
            <Skeleton height='1rem' width='60px' className='mb-2' />
            <Skeleton height='2.5rem' rounded='md' />
            <Skeleton height='0.75rem' width='150px' className='mt-1' />
          </div>

          {/* 语言设置 */}
          <div>
            <Skeleton height='1rem' width='60px' className='mb-2' />
            <Skeleton height='2.5rem' rounded='md' />
            <Skeleton height='0.75rem' width='120px' className='mt-1' />
          </div>

          {/* 货币设置 */}
          <div className='pt-6'>
            <Skeleton height='1rem' width='80px' className='mb-3' />
            <Skeleton height='0.875rem' width='200px' className='mb-4' />

            <div>
              <Skeleton height='1rem' width='80px' className='mb-2' />
              <Skeleton height='2.5rem' rounded='md' />
              <Skeleton height='0.75rem' width='180px' className='mt-1' />
            </div>
          </div>

          {/* FIRE设置 */}
          <div className='pt-6'>
            <Skeleton height='1rem' width='100px' className='mb-3' />
            <Skeleton height='0.875rem' width='220px' className='mb-4' />

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
            <Skeleton height='1.75rem' width='80px' rounded='md' />
          </div>
        </div>
      </div>

      {/* 说明信息 */}
      <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4'>
        <Skeleton height='1rem' width='120px' className='mb-3' />
        <div className='space-y-2'>
          <Skeleton height='0.875rem' width='100%' />
          <Skeleton height='0.875rem' width='85%' />
          <Skeleton height='0.875rem' width='90%' />
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
      {/* 标题和描述 */}
      <div>
        <Skeleton height='1.125rem' width='120px' className='mb-2' />
        <Skeleton height='0.875rem' width='250px' />
      </div>

      {/* 已选择的货币 */}
      <div>
        <Skeleton height='1rem' width='120px' className='mb-3' />

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-blue-50 dark:bg-blue-900/20'
            >
              <div className='flex items-center space-x-3'>
                <Skeleton width='20px' height='20px' rounded='sm' />
                <div>
                  <Skeleton height='0.875rem' width='40px' className='mb-1' />
                  <Skeleton height='0.75rem' width='60px' />
                </div>
              </div>
              <Skeleton width='24px' height='24px' rounded='sm' />
            </div>
          ))}
        </div>
      </div>

      {/* 可用货币 */}
      <div>
        <div className='flex items-center justify-between mb-3'>
          <Skeleton height='1rem' width='100px' />
          <Skeleton height='1.75rem' width='120px' rounded='md' />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg'
            >
              <div className='flex items-center space-x-3'>
                <Skeleton width='20px' height='20px' rounded='sm' />
                <div>
                  <Skeleton height='0.875rem' width='40px' className='mb-1' />
                  <Skeleton height='0.75rem' width='80px' />
                </div>
              </div>
              <div className='flex space-x-1'>
                <Skeleton width='24px' height='24px' rounded='sm' />
                <Skeleton width='24px' height='24px' rounded='sm' />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 说明信息 */}
      <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4'>
        <Skeleton height='0.875rem' width='120px' className='mb-2' />
        <div className='space-y-1'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height='0.875rem' width={`${70 + i * 10}%`} />
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
      {/* 标题和操作按钮 */}
      <div>
        <Skeleton height='1.125rem' width='100px' className='mb-2' />
        <Skeleton height='0.875rem' width='200px' />
      </div>

      <div className='flex justify-between items-center'>
        <Skeleton height='1rem' width='80px' />
        <Skeleton height='1.75rem' width='80px' rounded='md' />
      </div>

      {/* 标签列表 */}
      <div className='space-y-3'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className='flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg'
          >
            <div className='flex items-center space-x-3'>
              <Skeleton width='16px' height='16px' rounded='full' />
              <div>
                <Skeleton height='0.875rem' width='80px' className='mb-1' />
                <Skeleton height='0.75rem' width='60px' />
              </div>
            </div>
            <div className='flex items-center space-x-1'>
              <Skeleton width='24px' height='24px' rounded='sm' />
              <Skeleton width='24px' height='24px' rounded='sm' />
            </div>
          </div>
        ))}
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
      {/* <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4'>
        <div className='flex items-start space-x-3'>
          <span className='text-yellow-600 dark:text-yellow-400'>⚠️</span>
          <div className='flex-1'>
            <Skeleton height='1rem' width='180px' className='mb-2' />
            <Skeleton height='0.875rem' width='320px' />
          </div>
        </div>
      </div> */}

      {/* 操作按钮 */}
      <div className='flex justify-between items-center'>
        <Skeleton height='0.875rem' width='120px' />
        <Skeleton height='1.75rem' width='80px' rounded='md' />
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
                <div className='flex items-center space-x-1'>
                  <Skeleton width='24px' height='24px' rounded='sm' />
                  <Skeleton width='24px' height='24px' rounded='sm' />
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
      <div>
        <Skeleton height='1rem' width='100px' className='mb-3' />
        <Skeleton height='0.875rem' width='250px' className='mb-4' />

        <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4'>
          <Skeleton height='0.875rem' width='120px' className='mb-2' />
          <div className='space-y-1'>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height='0.875rem' width={`${60 + i * 15}px`} />
            ))}
          </div>
        </div>

        <Skeleton height='1.75rem' width='80px' rounded='md' />
      </div>

      {/* 数据删除 */}
      <div>
        <Skeleton height='1rem' width='120px' className='mb-3' />

        <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4'>
          <Skeleton height='0.875rem' width='150px' className='mb-2' />
          <Skeleton height='0.875rem' width='120px' className='mb-3' />
          <div className='space-y-1 mb-3'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height='0.875rem' width={`${80 + i * 20}px`} />
            ))}
          </div>
          <Skeleton height='0.875rem' width='180px' />
        </div>

        <Skeleton height='1.75rem' width='80px' rounded='md' />
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
 * 顶部用户状态栏骨架屏
 */
export function TopUserStatusBarSkeleton() {
  return (
    <div className='bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm'>
      <div className='flex items-center justify-between'>
        {/* 左侧：移动端菜单按钮 + Logo */}
        <div className='flex items-center'>
          {/* 移动端菜单按钮 */}
          <div className='mr-3 lg:hidden'>
            <Skeleton width='40px' height='40px' rounded='xl' />
          </div>

          {/* Logo */}
          <div className='flex items-center space-x-3'>
            <Skeleton width='32px' height='32px' rounded='lg' />
            <Skeleton height='1.5rem' width='120px' />
          </div>
        </div>

        {/* 右侧：基础货币 + 用户菜单 */}
        <div className='flex items-center space-x-3'>
          {/* 基础货币显示 */}
          <Skeleton height='2rem' width='80px' rounded='md' />

          {/* 用户菜单 */}
          <Skeleton width='32px' height='32px' rounded='full' />
        </div>
      </div>
    </div>
  )
}

/**
 * 完整应用布局骨架屏
 */
export function AppLayoutSkeleton({
  children,
}: {
  children?: React.ReactNode
}) {
  return (
    <div className='h-screen flex flex-col bg-gray-50 dark:bg-gray-900'>
      {/* 顶部用户状态栏 */}
      <TopUserStatusBarSkeleton />

      {/* 主内容区域 */}
      <div className='flex-1 flex overflow-hidden'>
        {/* 左侧导航栏 - 桌面端 */}
        <div className='hidden lg:block flex-shrink-0'>
          <SidebarSkeleton />
        </div>

        {/* 右侧主内容 */}
        <main className='flex-1 overflow-y-auto bg-white dark:bg-gray-800'>
          <div className='min-h-full'>{children || <DashboardSkeleton />}</div>
        </main>
      </div>
    </div>
  )
}

/**
 * 仪表板应用布局骨架屏
 */
export function DashboardAppLayoutSkeleton() {
  return (
    <AppLayoutSkeleton>
      <DashboardSkeleton />
    </AppLayoutSkeleton>
  )
}

/**
 * 设置页面应用布局骨架屏
 */
export function SettingsAppLayoutSkeleton() {
  return (
    <AppLayoutSkeleton>
      <SettingsPageSkeleton />
    </AppLayoutSkeleton>
  )
}

/**
 * FIRE页面应用布局骨架屏
 */
export function FireAppLayoutSkeleton() {
  return (
    <AppLayoutSkeleton>
      <FirePageSkeleton />
    </AppLayoutSkeleton>
  )
}

/**
 * 报表页面应用布局骨架屏
 */
export function ReportsAppLayoutSkeleton() {
  return (
    <AppLayoutSkeleton>
      <ReportsSkeleton />
    </AppLayoutSkeleton>
  )
}

/**
 * 交易页面应用布局骨架屏
 */
export function TransactionsAppLayoutSkeleton() {
  return (
    <AppLayoutSkeleton>
      <TransactionListSkeleton />
    </AppLayoutSkeleton>
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

/**
 * 流量类分类摘要卡片骨架屏
 */
export function FlowCategorySummaryCardSkeleton() {
  return (
    <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* 本月总流量 */}
        <div className='text-center'>
          <Skeleton height='0.875rem' width='60%' className='mx-auto mb-1' />
          <Skeleton height='2rem' width='80%' className='mx-auto' />
        </div>

        {/* 本年总流量 */}
        <div className='text-center'>
          <Skeleton height='0.875rem' width='60%' className='mx-auto mb-1' />
          <Skeleton height='2rem' width='80%' className='mx-auto' />
          <Skeleton height='0.75rem' width='50%' className='mx-auto mt-1' />
        </div>

        {/* 去年总流量 */}
        <div className='text-center'>
          <Skeleton height='0.875rem' width='60%' className='mx-auto mb-1' />
          <Skeleton height='2rem' width='80%' className='mx-auto' />
          <Skeleton height='0.75rem' width='50%' className='mx-auto mt-1' />
        </div>
      </div>

      {/* 币种分布 */}
      <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
        <Skeleton height='0.875rem' width='30%' className='mb-3' />
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className='text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'
            >
              <Skeleton
                height='0.875rem'
                width='60%'
                className='mx-auto mb-1'
              />
              <Skeleton height='1.125rem' width='70%' className='mx-auto' />
              <Skeleton height='0.75rem' width='50%' className='mx-auto mt-1' />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 存量类分类摘要卡片骨架屏
 */
export function StockCategorySummaryCardSkeleton() {
  return (
    <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* 当前净值 */}
        <div className='text-center'>
          <Skeleton height='0.875rem' width='60%' className='mx-auto mb-1' />
          <Skeleton height='2rem' width='80%' className='mx-auto' />
        </div>

        {/* 上月净值 */}
        <div className='text-center'>
          <Skeleton height='0.875rem' width='60%' className='mx-auto mb-1' />
          <Skeleton height='2rem' width='80%' className='mx-auto' />
          <Skeleton height='0.75rem' width='50%' className='mx-auto mt-1' />
        </div>

        {/* 年初净值 */}
        <div className='text-center'>
          <Skeleton height='0.875rem' width='60%' className='mx-auto mb-1' />
          <Skeleton height='2rem' width='80%' className='mx-auto' />
          <Skeleton height='0.75rem' width='50%' className='mx-auto mt-1' />
        </div>
      </div>

      {/* 币种分布 */}
      <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
        <Skeleton height='0.875rem' width='30%' className='mb-3' />
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className='text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'
            >
              <Skeleton
                height='0.875rem'
                width='60%'
                className='mx-auto mb-1'
              />
              <Skeleton height='1.125rem' width='70%' className='mx-auto' />
              <Skeleton height='0.75rem' width='50%' className='mx-auto mt-1' />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 分类摘要项骨架屏
 */
export function CategorySummaryItemSkeleton() {
  return (
    <div className='flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg'>
      <div className='flex flex-col'>
        <Skeleton height='1rem' width='120px' className='mb-1' />
        <Skeleton height='0.75rem' width='80px' />
      </div>
      <div className='text-sm'>
        <Skeleton height='0.875rem' width='60px' />
      </div>
    </div>
  )
}

/**
 * 分类账户树骨架屏
 * 专门用于 OptimizedCategoryAccountTree 组件的加载状态
 */
export function CategoryAccountTreeSkeleton() {
  return (
    <div className='space-y-3'>
      {/* 资产分组 */}
      <div className='rounded-lg border bg-blue-50/20 dark:bg-blue-950/15 border-blue-200/50 dark:border-blue-700/30 mx-1'>
        {/* 分组头部 */}
        <div className='flex items-center justify-between px-3 py-2.5'>
          <div className='flex items-center space-x-3'>
            <Skeleton width='20px' height='20px' />
            <Skeleton height='0.875rem' width='40px' />
          </div>
          <Skeleton height='0.875rem' width='60px' />
        </div>

        {/* 分组内容 */}
        <div className='space-y-1 px-2 pb-2'>
          {/* 分类项 */}
          <div
            className='flex items-center px-3 py-2.5 rounded-lg'
            style={{ paddingLeft: '12px' }}
          >
            <Skeleton width='20px' height='20px' className='mr-2' />
            <div className='mr-3 flex-shrink-0'>
              <Skeleton width='32px' height='32px' rounded='xl' />
            </div>
            <div className='flex-1 py-3 min-w-0'>
              <Skeleton height='0.875rem' width='80px' className='mb-1.5' />
              <Skeleton height='0.75rem' width='60px' />
            </div>
            <Skeleton width='32px' height='32px' rounded='lg' />
          </div>

          {/* 账户项 */}
          <div
            className='flex items-center px-3 py-2.5 rounded-lg'
            style={{ paddingLeft: '28px' }}
          >
            <div className='mr-3 flex-shrink-0'>
              <Skeleton width='24px' height='20px' rounded='sm' />
            </div>
            <div className='flex-1 py-3 min-w-0'>
              <Skeleton height='0.875rem' width='100px' className='mb-1.5' />
              <Skeleton height='0.75rem' width='70px' />
            </div>
            <Skeleton width='32px' height='32px' rounded='lg' />
          </div>

          <div
            className='flex items-center px-3 py-2.5 rounded-lg'
            style={{ paddingLeft: '28px' }}
          >
            <div className='mr-3 flex-shrink-0'>
              <Skeleton width='24px' height='20px' rounded='sm' />
            </div>
            <div className='flex-1 py-3 min-w-0'>
              <Skeleton height='0.875rem' width='90px' className='mb-1.5' />
              <Skeleton height='0.75rem' width='50px' />
            </div>
            <Skeleton width='32px' height='32px' rounded='lg' />
          </div>
        </div>
      </div>

      {/* 负债分组 */}
      <div className='rounded-lg border bg-orange-50/20 dark:bg-orange-950/15 border-orange-200/50 dark:border-orange-700/30 mx-1'>
        <div className='flex items-center justify-between px-3 py-2.5'>
          <div className='flex items-center space-x-3'>
            <Skeleton width='20px' height='20px' />
            <Skeleton height='0.875rem' width='40px' />
          </div>
          <Skeleton height='0.875rem' width='60px' />
        </div>
      </div>

      {/* 收入分组 */}
      <div className='rounded-lg border bg-green-50/20 dark:bg-green-950/15 border-green-200/50 dark:border-green-700/30 mx-1'>
        <div className='flex items-center justify-between px-3 py-2.5'>
          <div className='flex items-center space-x-3'>
            <Skeleton width='20px' height='20px' />
            <Skeleton height='0.875rem' width='40px' />
          </div>
          <Skeleton height='0.875rem' width='60px' />
        </div>

        <div className='space-y-1 px-2 pb-2'>
          <div
            className='flex items-center px-3 py-2.5 rounded-lg'
            style={{ paddingLeft: '12px' }}
          >
            <Skeleton width='20px' height='20px' className='mr-2' />
            <div className='mr-3 flex-shrink-0'>
              <Skeleton width='32px' height='32px' rounded='xl' />
            </div>
            <div className='flex-1 py-3 min-w-0'>
              <Skeleton height='0.875rem' width='70px' className='mb-1.5' />
              <Skeleton height='0.75rem' width='50px' />
            </div>
            <Skeleton width='32px' height='32px' rounded='lg' />
          </div>
        </div>
      </div>

      {/* 支出分组 */}
      <div className='rounded-lg border bg-red-50/20 dark:bg-red-950/15 border-red-200/50 dark:border-red-700/30 mx-1'>
        <div className='flex items-center justify-between px-3 py-2.5'>
          <div className='flex items-center space-x-3'>
            <Skeleton width='20px' height='20px' />
            <Skeleton height='0.875rem' width='40px' />
          </div>
          <Skeleton height='0.875rem' width='60px' />
        </div>

        <div className='space-y-1 px-2 pb-2'>
          <div
            className='flex items-center px-3 py-2.5 rounded-lg'
            style={{ paddingLeft: '12px' }}
          >
            <Skeleton width='20px' height='20px' className='mr-2' />
            <div className='mr-3 flex-shrink-0'>
              <Skeleton width='32px' height='32px' rounded='xl' />
            </div>
            <div className='flex-1 py-3 min-w-0'>
              <Skeleton height='0.875rem' width='60px' className='mb-1.5' />
              <Skeleton height='0.75rem' width='40px' />
            </div>
            <Skeleton width='32px' height='32px' rounded='lg' />
          </div>

          <div
            className='flex items-center px-3 py-2.5 rounded-lg'
            style={{ paddingLeft: '28px' }}
          >
            <div className='mr-3 flex-shrink-0'>
              <Skeleton width='24px' height='20px' rounded='sm' />
            </div>
            <div className='flex-1 py-3 min-w-0'>
              <Skeleton height='0.875rem' width='85px' className='mb-1.5' />
              <Skeleton height='0.75rem' width='55px' />
            </div>
            <Skeleton width='32px' height='32px' rounded='lg' />
          </div>
        </div>
      </div>
    </div>
  )
}
