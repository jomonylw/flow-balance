'use client'

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
            relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed shadow-sm
            ${
              checked
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-500 dark:to-blue-600 shadow-blue-500/20'
                : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
            }
          `}
        >
          <span className='sr-only'>{label}</span>
          <span
            aria-hidden='true'
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0
              transition-all duration-300 ease-in-out
              ${checked ? 'translate-x-5 shadow-blue-500/20' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {help && (
        <p className='text-sm text-gray-500 dark:text-gray-400'>{help}</p>
      )}
    </div>
  )
}
