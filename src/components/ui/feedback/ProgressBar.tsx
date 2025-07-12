'use client'

import { useEffect, useState } from 'react'

interface ProgressBarProps {
  /** 进度百分比 (0-100) */
  percentage: number
  /** 进度条高度 */
  height?: 'sm' | 'md' | 'lg'
  /** 进度条颜色主题 */
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
  /** 是否显示百分比文字 */
  showPercentage?: boolean
  /** 是否显示动画效果 */
  animated?: boolean
  /** 是否显示条纹效果 */
  striped?: boolean
  /** 自定义类名 */
  className?: string
  /** 进度条标签 */
  label?: string
}

export default function ProgressBar({
  percentage,
  height = 'md',
  color = 'blue',
  showPercentage = false,
  animated = true,
  striped = false,
  className = '',
  label,
}: ProgressBarProps) {
  const [displayPercentage, setDisplayPercentage] = useState(0)

  // 动画效果：逐渐增加到目标百分比
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayPercentage(percentage)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setDisplayPercentage(percentage)
    }
    return undefined
  }, [percentage, animated])

  // 高度样式
  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }

  // 颜色样式
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500',
  }

  // 条纹样式
  const stripedClass = striped
    ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_100%] animate-pulse'
    : ''

  const clampedPercentage = Math.max(0, Math.min(100, displayPercentage))

  return (
    <div className={`w-full ${className}`}>
      {/* 标签 */}
      {label && (
        <div className='flex justify-between items-center mb-2'>
          <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            {label}
          </span>
          {showPercentage && (
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              {Math.round(clampedPercentage)}%
            </span>
          )}
        </div>
      )}

      {/* 进度条容器 */}
      <div
        className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${heightClasses[height]}`}
      >
        {/* 进度条 */}
        <div
          className={`
            ${heightClasses[height]} 
            ${colorClasses[color]} 
            ${stripedClass}
            rounded-full transition-all duration-500 ease-out relative
          `}
          style={{
            width: `${clampedPercentage}%`,
          }}
        >
          {/* 光泽效果 */}
          {animated && clampedPercentage > 0 && (
            <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full' />
          )}
        </div>
      </div>

      {/* 底部百分比显示 */}
      {showPercentage && !label && (
        <div className='mt-2 text-center'>
          <span className='text-sm text-gray-600 dark:text-gray-400'>
            {Math.round(clampedPercentage)}%
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * 多段进度条组件
 */
interface MultiProgressBarProps {
  /** 进度段数据 */
  segments: Array<{
    percentage: number
    color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
    label?: string
  }>
  /** 进度条高度 */
  height?: 'sm' | 'md' | 'lg'
  /** 是否显示动画效果 */
  animated?: boolean
  /** 自定义类名 */
  className?: string
}

export function MultiProgressBar({
  segments,
  height = 'md',
  animated = true,
  className = '',
}: MultiProgressBarProps) {
  const [displaySegments, setDisplaySegments] = useState(
    segments.map(segment => ({ ...segment, percentage: 0 }))
  )

  // 动画效果
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplaySegments(segments)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setDisplaySegments(segments)
    }
    return undefined
  }, [segments, animated])

  // 高度样式
  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }

  // 颜色样式
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500',
  }

  const totalPercentage = displaySegments.reduce(
    (sum, segment) => sum + Math.max(0, Math.min(100, segment.percentage)),
    0
  )

  return (
    <div className={`w-full ${className}`}>
      {/* 图例 */}
      {displaySegments.some(segment => segment.label) && (
        <div className='flex flex-wrap gap-4 mb-3'>
          {displaySegments.map(
            (segment, index) =>
              segment.label && (
                <div key={index} className='flex items-center gap-2'>
                  <div
                    className={`w-3 h-3 rounded-full ${colorClasses[segment.color]}`}
                  />
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    {segment.label}: {Math.round(segment.percentage)}%
                  </span>
                </div>
              )
          )}
        </div>
      )}

      {/* 多段进度条 */}
      <div
        className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${heightClasses[height]}`}
      >
        <div className='flex h-full'>
          {displaySegments.map((segment, index) => {
            const clampedPercentage = Math.max(
              0,
              Math.min(100, segment.percentage)
            )
            const widthPercentage =
              totalPercentage > 0
                ? (clampedPercentage / totalPercentage) * 100
                : 0

            return (
              <div
                key={index}
                className={`
                  ${colorClasses[segment.color]} 
                  transition-all duration-500 ease-out relative
                `}
                style={{
                  width: `${widthPercentage}%`,
                }}
              >
                {/* 光泽效果 */}
                {animated && widthPercentage > 0 && (
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent' />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 总进度显示 */}
      <div className='mt-2 text-center'>
        <span className='text-sm text-gray-600 dark:text-gray-400'>
          总进度: {Math.round(Math.min(100, totalPercentage))}%
        </span>
      </div>
    </div>
  )
}
