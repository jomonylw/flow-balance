'use client'

interface CurrencyTagProps {
  currencyCode: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * 货币标签组件
 * 用于显示货币代码，支持自定义颜色和大小
 */
export default function CurrencyTag({ 
  currencyCode, 
  color, 
  size = 'sm',
  className = '' 
}: CurrencyTagProps) {
  const sizeClasses = {
    sm: 'px-0.5 py-0 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-2.5 py-1.5 text-base'
  }

  const backgroundColor = color || '#6B7280' // 默认灰色
  
  return (
    <span
      className={`
        inline-flex items-center justify-center rounded font-bold
        border border-opacity-30 text-white
        ${sizeClasses[size]}
        ${className}
      `}
      style={{
        backgroundColor,
        borderColor: backgroundColor,
        color: '#ffffff',
      }}
      title={`货币: ${currencyCode}`}
    >
      {currencyCode}
    </span>
  )
}
