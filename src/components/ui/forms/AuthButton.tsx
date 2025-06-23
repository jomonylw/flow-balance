'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { LoadingSpinnerSVG } from '@/components/ui/feedback/LoadingSpinner'
import { COMPONENT_SIZE, SPACING } from '@/lib/constants/dimensions'

interface AuthButtonProps {
  label: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  isLoading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  className?: string
}

export default function AuthButton({
  label,
  onClick,
  type = 'button',
  isLoading = false,
  disabled = false,
  variant = 'primary',
  className = '',
}: AuthButtonProps) {
  const { t } = useLanguage()
  const baseClasses = `
    w-full text-base sm:text-sm font-medium rounded-md transition-colors
    focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50
    disabled:cursor-not-allowed flex items-center justify-center
    touch-manipulation
  `

  const sizeStyles = {
    padding: `${SPACING.LG}px ${SPACING.XL}px`,
    minHeight: `${COMPONENT_SIZE.BUTTON.LG}px`,
  }

  const variantClasses = {
    primary: `
      bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500
      disabled:bg-blue-300
    `,
    secondary: `
      bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500
      disabled:bg-gray-100
    `,
    danger: `
      bg-red-600 text-white hover:bg-red-700 focus:ring-red-500
      disabled:bg-red-300
    `,
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={sizeStyles}
    >
      {isLoading ? (
        <>
          <LoadingSpinnerSVG size='sm' color='white' className='-ml-1 mr-2' />
          {t('common.processing')}
        </>
      ) : (
        label
      )}
    </button>
  )
}
