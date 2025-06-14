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
    sm: 'px-2 py-1 text-xs min-w-[2.5rem]',
    md: 'px-2.5 py-1.5 text-sm min-w-[3rem]',
    lg: 'px-3 py-2 text-base min-w-[3.5rem]'
  }

  const backgroundColor = color || '#6B7280' // 默认灰色

  // 生成更亮的边框颜色
  const lightenColor = (hex: string, percent: number) => {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
  }

  const borderColor = lightenColor(backgroundColor, 20)

  return (
    <span
      className={`
        inline-flex items-center justify-center rounded-lg font-bold
        border shadow-sm transition-all duration-200
        hover:shadow-md hover:scale-105
        ${sizeClasses[size]}
        ${className}
      `}
      style={{
        backgroundColor,
        borderColor,
        color: '#ffffff',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
        background: `linear-gradient(135deg, ${backgroundColor} 0%, ${lightenColor(backgroundColor, -10)} 100%)`,
      }}
      title={`货币: ${currencyCode}`}
    >
      {currencyCode}
    </span>
  )
}
