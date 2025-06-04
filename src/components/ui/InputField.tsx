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
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({
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
    autoFocus = false
  }, ref) => {
    return (
      <div className={`space-y-2 ${className}`}>
        <label 
          htmlFor={name} 
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
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
          className={`
            w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
            placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
            focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          `}
        />

        {help && !error && (
          <p className="text-sm text-gray-500">{help}</p>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

InputField.displayName = 'InputField'

export default InputField
