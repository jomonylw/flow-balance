'use client'

import { useState, useEffect, useRef } from 'react'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'

interface AnimatedNumberProps {
  /** 目标数值 */
  value: number
  /** 货币信息（如果需要货币格式化） */
  currency?: { code: string; symbol: string; name: string; id?: string }
  /** 动画持续时间（毫秒），默认 1000ms */
  duration?: number
  /** 是否显示正负号 */
  showSign?: boolean
  /** 自定义类名 */
  className?: string
  /** 是否启用动画，默认 true */
  enableAnimation?: boolean
  /** 格式化选项 */
  formatOptions?: {
    showSymbol?: boolean
    precision?: number
    /** 是否使用紧凑格式（如 4.39M 而不是 4,386,516.31） */
    compact?: boolean
    /** 紧凑格式的阈值，默认 1000000 (1M) */
    compactThreshold?: number
  }
  /** 是否启用响应式字体大小 */
  responsiveSize?: boolean
  /** 是否启用文字换行 */
  allowWrap?: boolean
}

/**
 * 数字滚动动画组件
 * 支持货币格式化和平滑的数字滚动效果
 */
export default function AnimatedNumber({
  value,
  currency,
  duration = 1000,
  showSign = false,
  className = '',
  enableAnimation = true,
  formatOptions,
  responsiveSize = false,
  allowWrap = false,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(enableAnimation ? 0 : value)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number | undefined>(undefined)
  const startValueRef = useRef<number>(0)
  const { formatCurrencyById, findCurrencyByCode, findCurrencyById } =
    useUserCurrencyFormatter()

  useEffect(() => {
    if (!enableAnimation) {
      setDisplayValue(value)
      return
    }

    // 如果值没有变化，不需要动画，但要确保显示值是准确的
    if (Math.abs(displayValue - value) < 0.001) {
      // 使用更小的阈值，并确保最终值是准确的
      setDisplayValue(value)
      return
    }

    setIsAnimating(true)
    startValueRef.current = displayValue
    startTimeRef.current = undefined

    const animate = (currentTime: number) => {
      if (startTimeRef.current === undefined) {
        startTimeRef.current = currentTime
      }

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // 使用 easeOutCubic 缓动函数，让动画更自然
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
      const easedProgress = easeOutCubic(progress)

      const currentValue =
        startValueRef.current + (value - startValueRef.current) * easedProgress
      setDisplayValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        setIsAnimating(false)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration, enableAnimation, displayValue])

  // 格式化紧凑数字
  const formatCompactNumber = (value: number): string => {
    const absValue = Math.abs(value)
    const threshold = formatOptions?.compactThreshold ?? 1000000 // 默认1M

    if (!formatOptions?.compact || absValue < threshold) {
      return value.toString()
    }

    const units = [
      { value: 1e12, symbol: 'T' },
      { value: 1e9, symbol: 'B' },
      { value: 1e6, symbol: 'M' },
      { value: 1e3, symbol: 'K' },
    ]

    for (const unit of units) {
      if (absValue >= unit.value) {
        const compactValue = value / unit.value
        return `${compactValue.toFixed(2)}${unit.symbol}`
      }
    }

    return value.toString()
  }

  // 格式化显示值
  const formatDisplayValue = () => {
    // 确保 displayValue 在动画过程中不会显示过多小数位
    // 根据货币的小数位数或格式选项来限制显示精度
    let precision = 2 // 默认精度

    // 如果明确指定了 precision，使用指定值
    if (formatOptions?.precision !== undefined) {
      precision = formatOptions.precision
    } else if (currency?.id) {
      // 否则，如果有货币ID，使用货币的 decimalPlaces
      const currencyInfo = findCurrencyById(currency.id)
      precision = currencyInfo?.decimalPlaces ?? 2
    } else if (currency?.code) {
      // 否则，如果有货币代码，使用货币的 decimalPlaces
      const currencyInfo = findCurrencyByCode(currency.code)
      precision = currencyInfo?.decimalPlaces ?? 2
    }

    // 在格式化之前先将 displayValue 四舍五入到正确的精度
    const roundedDisplayValue =
      Math.round(displayValue * Math.pow(10, precision)) /
      Math.pow(10, precision)
    const absValue = Math.abs(roundedDisplayValue)
    let formattedValue: string

    // 如果启用紧凑格式，先检查是否需要紧凑显示
    if (formatOptions?.compact) {
      const compactValue = formatCompactNumber(roundedDisplayValue)
      if (compactValue !== roundedDisplayValue.toString()) {
        // 使用紧凑格式
        const sign =
          roundedDisplayValue < 0
            ? '-'
            : showSign && roundedDisplayValue >= 0
              ? '+'
              : ''
        const currencySymbol = currency?.symbol || ''
        return `${sign}${currencySymbol}${compactValue.replace('-', '')}`
      }
    }

    if (currency) {
      if (currency.id) {
        // 使用货币ID格式化（推荐）
        formattedValue = formatCurrencyById(
          absValue,
          currency.id,
          formatOptions
        )
      } else {
        // 使用货币代码格式化 - 回退到基于代码的查找
        const currencyInfo = findCurrencyByCode(currency.code)
        formattedValue = currencyInfo?.id
          ? formatCurrencyById(absValue, currencyInfo.id, formatOptions)
          : `${absValue.toLocaleString('zh-CN', {
              minimumFractionDigits: precision,
              maximumFractionDigits: precision,
            })} ${currency.code}`
      }
    } else {
      // 纯数字格式化
      formattedValue = absValue.toLocaleString('zh-CN', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      })
    }

    // 添加正负号
    if (showSign) {
      const sign = roundedDisplayValue >= 0 ? '+' : '-'
      return `${sign}${formattedValue}`
    }

    return roundedDisplayValue < 0 ? `-${formattedValue}` : formattedValue
  }

  // 计算响应式字体大小
  const getResponsiveFontSize = () => {
    if (!responsiveSize) return ''

    const formattedText = formatDisplayValue()
    const textLength = formattedText.length

    // 根据文字长度调整字体大小
    if (textLength > 20) return 'text-lg' // 长文本使用较小字体
    if (textLength > 15) return 'text-xl' // 中等长度文本
    return '' // 使用默认字体大小
  }

  // 组合所有样式类
  const combinedClassName = [
    className,
    isAnimating ? 'transition-opacity duration-200' : '',
    getResponsiveFontSize(),
    allowWrap ? 'break-words' : 'whitespace-nowrap',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      className={combinedClassName}
      style={{
        fontVariantNumeric: 'tabular-nums', // 确保数字等宽，动画更平滑
        wordBreak: allowWrap ? 'break-word' : 'normal',
        overflowWrap: allowWrap ? 'break-word' : 'normal',
        hyphens: allowWrap ? 'auto' : 'none',
      }}
    >
      {formatDisplayValue()}
    </span>
  )
}
