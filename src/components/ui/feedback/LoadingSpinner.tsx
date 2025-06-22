'use client'

import { useTheme } from '@/contexts/providers/ThemeContext'
import { useLanguage } from '@/contexts/providers/LanguageContext'

export interface LoadingSpinnerProps {
  /** 尺寸大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** 自定义类名 */
  className?: string
  /** 是否显示文本 */
  showText?: boolean
  /** 自定义文本 */
  text?: string
  /** 颜色主题 */
  color?: 'primary' | 'secondary' | 'white' | 'current' | 'muted'
  /** 是否为内联显示 */
  inline?: boolean
  /** 动画样式 */
  variant?: 'spin' | 'pulse' | 'dots' | 'bars' | 'ring'
}

/**
 * 统一的Loading Spinner组件
 * 支持多种尺寸、主题适配、动画样式和国际化
 */
export default function LoadingSpinner({
  size = 'md',
  className = '',
  showText = false,
  text = '',
  color = 'primary',
  inline = false,
  variant = 'spin',
}: LoadingSpinnerProps) {
  const { resolvedTheme } = useTheme()
  const { t } = useLanguage()

  // 尺寸映射
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  }

  // 获取主题颜色
  const getThemeColors = () => {
    const isDark = resolvedTheme === 'dark'

    switch (color) {
      case 'primary':
        return {
          main: isDark ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)', // blue-500/600
          light: isDark ? 'rgb(96, 165, 250)' : 'rgb(59, 130, 246)', // blue-400/500
          muted: isDark ? 'rgb(30, 58, 138)' : 'rgb(191, 219, 254)', // blue-900/200
        }
      case 'secondary':
        return {
          main: isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)', // gray-400/600
          light: isDark ? 'rgb(209, 213, 219)' : 'rgb(156, 163, 175)', // gray-300/400
          muted: isDark ? 'rgb(55, 65, 81)' : 'rgb(243, 244, 246)', // gray-700/100
        }
      case 'white':
        return {
          main: 'rgb(255, 255, 255)',
          light: 'rgb(255, 255, 255)',
          muted: 'rgba(255, 255, 255, 0.3)',
        }
      case 'current':
        return {
          main: 'currentColor',
          light: 'currentColor',
          muted: 'currentColor',
        }
      case 'muted':
        return {
          main: isDark ? 'rgb(107, 114, 128)' : 'rgb(156, 163, 175)', // gray-500/400
          light: isDark ? 'rgb(156, 163, 175)' : 'rgb(209, 213, 219)', // gray-400/300
          muted: isDark ? 'rgb(75, 85, 99)' : 'rgb(229, 231, 235)', // gray-600/200
        }
      default:
        return {
          main: isDark ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)',
          light: isDark ? 'rgb(96, 165, 250)' : 'rgb(59, 130, 246)',
          muted: isDark ? 'rgb(30, 58, 138)' : 'rgb(191, 219, 254)',
        }
    }
  }

  // 文本颜色
  const getTextColorClasses = () => {
    switch (color) {
      case 'white':
        return 'text-white'
      case 'current':
        return 'text-current'
      case 'muted':
        return resolvedTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'
      default:
        return resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
    }
  }

  // 渲染不同样式的加载器
  const renderSpinner = () => {
    const colors = getThemeColors()
    const sizeClass = sizeClasses[size]

    switch (variant) {
      case 'spin':
        return (
          <div
            className={`${sizeClass} ${inline ? '' : 'mx-auto'} relative`}
            style={{
              background: `conic-gradient(from 0deg, ${colors.muted}, ${colors.main})`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          >
            <div
              className='absolute inset-1 rounded-full'
              style={{
                backgroundColor:
                  resolvedTheme === 'dark'
                    ? 'rgb(26, 26, 26)'
                    : 'rgb(255, 255, 255)',
              }}
            />
          </div>
        )

      case 'pulse':
        return (
          <div className={`${sizeClass} ${inline ? '' : 'mx-auto'} relative`}>
            <div
              className='absolute inset-0 rounded-full animate-ping'
              style={{ backgroundColor: colors.light }}
            />
            <div
              className='relative rounded-full h-full w-full'
              style={{ backgroundColor: colors.main }}
            />
          </div>
        )

      case 'dots':
        const dotSize =
          size === 'xs'
            ? 'h-1 w-1'
            : size === 'sm'
              ? 'h-1.5 w-1.5'
              : size === 'md'
                ? 'h-2 w-2'
                : size === 'lg'
                  ? 'h-2.5 w-2.5'
                  : 'h-3 w-3'
        return (
          <div className={`flex space-x-1 ${inline ? '' : 'justify-center'}`}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`${dotSize} rounded-full`}
                style={{
                  backgroundColor: colors.main,
                  animation: `loading-pulse 1.4s ease-in-out ${i * 0.16}s infinite both`,
                }}
              />
            ))}
          </div>
        )

      case 'bars':
        const barHeight =
          size === 'xs'
            ? 'h-3'
            : size === 'sm'
              ? 'h-4'
              : size === 'md'
                ? 'h-6'
                : size === 'lg'
                  ? 'h-8'
                  : 'h-12'
        return (
          <div
            className={`flex items-end space-x-1 ${inline ? '' : 'justify-center'}`}
          >
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-1 ${barHeight} rounded-sm`}
                style={{
                  backgroundColor: colors.main,
                  animation: `loading-bars 1.2s ease-in-out ${i * 0.1}s infinite`,
                }}
              />
            ))}
          </div>
        )

      case 'ring':
      default:
        return (
          <div
            className={`${sizeClass} ${inline ? '' : 'mx-auto'} rounded-full border-2`}
            style={{
              borderColor: colors.muted,
              borderTopColor: colors.main,
              animation: 'spin 1s linear infinite',
            }}
          />
        )
    }
  }

  const spinnerElement = <div className={className}>{renderSpinner()}</div>

  if (!showText && !text) {
    return spinnerElement
  }

  const displayText = text || t('common.loading')

  return (
    <div
      className={`${inline ? 'inline-flex items-center space-x-2' : 'text-center'}`}
    >
      {spinnerElement}
      {(showText || text) && displayText && (
        <span
          className={`${getTextColorClasses()} ${size === 'xs' || size === 'sm' ? 'text-xs' : 'text-sm'} ${inline ? '' : 'mt-2 block'} font-medium`}
        >
          {displayText}
        </span>
      )}
    </div>
  )
}

/**
 * SVG版本的Loading Spinner（用于按钮等需要SVG的场景）
 */
export function LoadingSpinnerSVG({
  size = 'sm',
  className = '',
  color = 'current',
  variant = 'ring',
}: Pick<LoadingSpinnerProps, 'size' | 'className' | 'color' | 'variant'>) {
  const { resolvedTheme } = useTheme()

  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  }

  const getColorClass = () => {
    if (color === 'current') return 'text-current'
    if (color === 'white') return 'text-white'
    if (color === 'primary')
      return resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'
    if (color === 'secondary')
      return resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
    if (color === 'muted')
      return resolvedTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'
    return 'text-current'
  }

  const colorClass = getColorClass()

  if (variant === 'dots') {
    return (
      <div className={`flex space-x-0.5 ${sizeClasses[size]} ${className}`}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`w-1 h-1 rounded-full ${colorClass === 'text-current' ? 'bg-current' : colorClass.replace('text-', 'bg-')}`}
            style={{
              animation: `loading-pulse 1.4s ease-in-out ${i * 0.16}s infinite both`,
            }}
          />
        ))}
      </div>
    )
  }

  if (variant === 'bars') {
    return (
      <div
        className={`flex items-end space-x-0.5 ${sizeClasses[size]} ${className}`}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`w-0.5 h-full rounded-sm ${colorClass === 'text-current' ? 'bg-current' : colorClass.replace('text-', 'bg-')}`}
            style={{
              animation: `loading-bars 1.2s ease-in-out ${i * 0.1}s infinite`,
            }}
          />
        ))}
      </div>
    )
  }

  // 默认环形加载器
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClass} ${className}`}
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      viewBox='0 0 24 24'
    >
      <circle
        className='opacity-25'
        cx='12'
        cy='12'
        r='10'
        stroke='currentColor'
        strokeWidth='4'
      />
      <path
        className='opacity-75'
        fill='currentColor'
        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
      />
    </svg>
  )
}
