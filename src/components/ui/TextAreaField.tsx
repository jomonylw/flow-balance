'use client'

interface TextAreaFieldProps {
  name: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  rows?: number
  className?: string
}

export default function TextAreaField({
  name,
  label,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  rows = 3,
  className = ''
}: TextAreaFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label 
        htmlFor={name} 
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
          placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
          focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500
          resize-vertical
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
        `}
      />
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
