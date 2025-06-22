'use client'

interface Option {
  value: string
  label: string
  disabled?: boolean
  id?: string // 可选的唯一标识符
}

interface SelectFieldProps {
  name: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: Option[]
  error?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  help?: string
}

export default function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  error,
  required = false,
  disabled = false,
  placeholder = '请选择...',
  className = '',
  help,
}: SelectFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor={name}
        className='block text-sm font-medium text-gray-700 dark:text-gray-300'
      >
        {label}
        {required && <span className='text-red-500 ml-1'>*</span>}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`
          w-full px-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm
          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none
          focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10
          disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400
          text-base sm:text-sm min-h-[44px] sm:min-h-[auto] transition-all duration-200
          hover:border-gray-400 dark:hover:border-gray-500
          ${error ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500 focus:shadow-rose-500/10' : ''}
        `}
      >
        <option value='' disabled>
          {placeholder}
        </option>
        {options.map((option, index) => (
          <option
            key={option.id || `${option.value}-${index}`}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {help && !error && (
        <p className='text-sm text-gray-500 dark:text-gray-400'>{help}</p>
      )}

      {error && (
        <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
      )}
    </div>
  )
}
