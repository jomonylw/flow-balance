'use client'

import { COLORS } from '@/types/core/constants'

interface SliderProps {
  name: string
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  disabled?: boolean
  className?: string
  help?: string
  unit?: string
  formatValue?: (value: number) => string
}

export default function Slider({
  name,
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled = false,
  className = '',
  help,
  unit = '',
  formatValue,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  const displayValue = formatValue ? formatValue(value) : `${value}${unit}`

  return (
    <div className={`space-y-3 ${className}`}>
      <div className='flex items-center justify-between'>
        <label
          htmlFor={name}
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          {label}
        </label>
        <span className='text-sm font-medium text-blue-600 dark:text-blue-400'>
          {displayValue}
        </span>
      </div>

      <div className='relative'>
        <input
          type='range'
          id={name}
          name={name}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className={`
            w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            slider
          `}
          style={{
            background: `linear-gradient(to right, ${COLORS.PRIMARY} 0%, ${COLORS.PRIMARY} ${percentage}%, ${COLORS.BORDER} ${percentage}%, ${COLORS.BORDER} 100%)`,
          }}
        />

        {/* 自定义滑块样式 */}
        {/* eslint-disable-next-line react/no-unknown-property */}
        <style jsx={true}>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: ${COLORS.PRIMARY};
            cursor: pointer;
            border: 2px solid ${COLORS.BACKGROUND};
            box-shadow: 0 2px 4px ${COLORS.GRAY_900}1a;
          }

          .slider::-webkit-slider-thumb:hover {
            background: ${COLORS.PRIMARY};
            box-shadow: 0 4px 8px ${COLORS.GRAY_900}26;
          }

          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: ${COLORS.PRIMARY};
            cursor: pointer;
            border: 2px solid ${COLORS.BACKGROUND};
            box-shadow: 0 2px 4px ${COLORS.GRAY_900}1a;
          }

          .slider::-moz-range-thumb:hover {
            background: ${COLORS.PRIMARY};
            box-shadow: 0 4px 8px ${COLORS.GRAY_900}26;
          }

          .dark .slider::-webkit-slider-thumb {
            background: ${COLORS.PRIMARY};
            border: 2px solid ${COLORS.BACKGROUND_DARK};
          }

          .dark .slider::-webkit-slider-thumb:hover {
            background: ${COLORS.PRIMARY};
          }

          .dark .slider::-moz-range-thumb {
            background: ${COLORS.PRIMARY};
            border: 2px solid ${COLORS.BACKGROUND_DARK};
          }

          .dark .slider::-moz-range-thumb:hover {
            background: ${COLORS.PRIMARY};
          }
        `}</style>
      </div>

      <div className='flex justify-between text-xs text-gray-500 dark:text-gray-400'>
        <span>{formatValue ? formatValue(min) : `${min}${unit}`}</span>
        <span>{formatValue ? formatValue(max) : `${max}${unit}`}</span>
      </div>

      {help && (
        <p className='text-sm text-gray-500 dark:text-gray-400'>{help}</p>
      )}
    </div>
  )
}
