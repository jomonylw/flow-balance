'use client'

import { forwardRef } from 'react'

interface InputFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'date'
  name: string
  label: string
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
  help?: string
  autoFocus?: boolean
  step?: string
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      type = 'text',
      name,
      label,
      placeholder,
      value,
      onChange,
      error,
      required = false,
      disabled = false,
      className = '',
      help,
      autoFocus = false,
      step,
    },
    ref
  ) => {
    return (
      <div className={`space-y-2 ${className}`}>
        <label
          htmlFor={name}
          className='block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </label>

        <input
          ref={ref}
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          step={step}
          className={`
            w-full px-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm
            bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10
            disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400
            text-base sm:text-sm min-h-[44px] sm:min-h-[auto] transition-all duration-200
            hover:border-gray-400 dark:hover:border-gray-500
            ${error ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500 focus:shadow-rose-500/10' : ''}
          `}
          style={{
            colorScheme: 'light dark',
          }}
        />

        {help && !error && (
          <p className='text-sm text-gray-500 dark:text-gray-400'>{help}</p>
        )}

        {error && (
          <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
        )}
      </div>
    )
  }
)

InputField.displayName = 'InputField'

export default InputField
