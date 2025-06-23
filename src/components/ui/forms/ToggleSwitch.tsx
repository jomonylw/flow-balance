'use client'

import { COMPONENT_SIZE } from '@/lib/constants/dimensions'

interface ToggleSwitchProps {
  name: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  help?: string
}

export default function ToggleSwitch({
  name,
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
  help,
}: ToggleSwitchProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className='flex items-center justify-between'>
        <label
          htmlFor={name}
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          {label}
        </label>

        <button
          type='button'
          id={name}
          role='switch'
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`
            relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed shadow-sm
            ${
              checked
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-500 dark:to-blue-600 shadow-blue-500/20'
                : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
            }
          `}
          style={{
            height: `${COMPONENT_SIZE.TOGGLE.HEIGHT}px`,
            width: `${COMPONENT_SIZE.TOGGLE.WIDTH}px`,
          }}
        >
          <span className='sr-only'>{label}</span>
          <span
            aria-hidden='true'
            className={`
              pointer-events-none inline-block transform rounded-full bg-white shadow-lg ring-0
              transition-all duration-300 ease-in-out
              ${checked ? 'shadow-blue-500/20' : 'translate-x-0'}
            `}
            style={{
              height: `${COMPONENT_SIZE.TOGGLE.THUMB_SIZE}px`,
              width: `${COMPONENT_SIZE.TOGGLE.THUMB_SIZE}px`,
              transform: checked
                ? `translateX(${COMPONENT_SIZE.TOGGLE.THUMB_OFFSET}px)`
                : 'translateX(0)',
            }}
          />
        </button>
      </div>

      {help && (
        <p className='text-sm text-gray-500 dark:text-gray-400'>{help}</p>
      )}
    </div>
  )
}
