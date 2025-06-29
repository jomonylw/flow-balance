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
  }
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
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(enableAnimation ? 0 : value)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number | undefined>(undefined)
  const startValueRef = useRef<number>(0)
  const { formatCurrencyById, findCurrencyByCode } = useUserCurrencyFormatter()

  useEffect(() => {
    if (!enableAnimation) {
      setDisplayValue(value)
      return
    }

    // 如果值没有变化，不需要动画
    if (Math.abs(displayValue - value) < 0.01) {
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

  // 格式化显示值
  const formatDisplayValue = () => {
    const absValue = Math.abs(displayValue)
    let formattedValue: string

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
          : `${absValue} ${currency.code}`
      }
    } else {
      // 纯数字格式化
      const precision = formatOptions?.precision ?? 2
      formattedValue = absValue.toLocaleString('zh-CN', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      })
    }

    // 添加正负号
    if (showSign) {
      const sign = displayValue >= 0 ? '+' : '-'
      return `${sign}${formattedValue}`
    }

    return displayValue < 0 ? `-${formattedValue}` : formattedValue
  }

  return (
    <span
      className={`${className} ${isAnimating ? 'transition-opacity duration-200' : ''}`}
      style={{
        fontVariantNumeric: 'tabular-nums', // 确保数字等宽，动画更平滑
      }}
    >
      {formatDisplayValue()}
    </span>
  )
}
