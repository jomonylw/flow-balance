'use client'

import { ReactNode } from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  animate?: boolean
  children?: ReactNode
}

/**
 * 基础骨架屏组件
 * 支持明暗主题自动适配
 */
export function Skeleton({
  className = '',
  width,
  height,
  rounded = true,
  animate = true,
  children,
}: SkeletonProps) {
  const roundedClass =
    typeof rounded === 'boolean'
      ? rounded
        ? 'rounded'
        : ''
      : `rounded-${rounded}`

  // 使用 CSS 类直接响应 DOM 上的主题类，避免 SSR 水合错误
  const baseClass = `bg-gray-200 dark:bg-gray-700 ${roundedClass} ${animate ? 'animate-pulse' : ''}`

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div className={`${baseClass} ${className}`} style={style}>
      {children}
    </div>
  )
}

/**
 * 文本骨架屏
 */
export function SkeletonText({
  lines = 1,
  className = '',
  lastLineWidth = '60%',
}: {
  lines?: number
  className?: string
  lastLineWidth?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height='1rem'
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  )
}

/**
 * 卡片骨架屏
 */
export function SkeletonCard({
  className = '',
  hasHeader = true,
  hasFooter = false,
  contentLines = 3,
}: {
  className?: string
  hasHeader?: boolean
  hasFooter?: boolean
  contentLines?: number
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}
    >
      {hasHeader && (
        <div className='mb-4'>
          <Skeleton height='1.5rem' width='40%' className='mb-2' />
          <Skeleton height='1rem' width='60%' />
        </div>
      )}

      <div className='space-y-3'>
        {Array.from({ length: contentLines }).map((_, i) => (
          <Skeleton
            key={i}
            height='1rem'
            width={i === contentLines - 1 ? '70%' : '100%'}
          />
        ))}
      </div>

      {hasFooter && (
        <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'>
          <Skeleton height='2rem' width='30%' />
        </div>
      )}
    </div>
  )
}

/**
 * 表格骨架屏
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${className}`}
    >
      {/* 表头 */}
      <div className='bg-gray-50 dark:bg-gray-700 px-6 py-3'>
        <div
          className='grid gap-4'
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} height='1rem' width='80%' />
          ))}
        </div>
      </div>

      {/* 表格内容 */}
      <div className='divide-y divide-gray-200 dark:divide-gray-700'>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className='px-6 py-4'>
            <div
              className='grid gap-4'
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  height='1rem'
                  width={colIndex === 0 ? '90%' : '70%'}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 图表骨架屏
 */
export function SkeletonChart({
  height = 400,
  hasTitle = true,
  hasLegend = false,
  className = '',
}: {
  height?: number
  hasTitle?: boolean
  hasLegend?: boolean
  className?: string
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}
    >
      {hasTitle && (
        <div className='mb-4'>
          <Skeleton height='1.5rem' width='30%' className='mb-2' />
          <Skeleton height='1rem' width='50%' />
        </div>
      )}

      {hasLegend && (
        <div className='mb-4 flex gap-4'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='flex items-center gap-2'>
              <Skeleton width='12px' height='12px' rounded='sm' />
              <Skeleton height='1rem' width='60px' />
            </div>
          ))}
        </div>
      )}

      <Skeleton
        height={`${height - (hasTitle ? 80 : 0) - (hasLegend ? 40 : 0)}px`}
        rounded='md'
      />
    </div>
  )
}
