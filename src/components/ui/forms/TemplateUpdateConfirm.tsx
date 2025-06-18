'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'

interface TemplateUpdateConfirmProps {
  isVisible: boolean
  checked: boolean
  onChange: (checked: boolean) => void
  templateName: string
}

export default function TemplateUpdateConfirm({
  isVisible,
  checked,
  onChange,
  templateName,
}: TemplateUpdateConfirmProps) {
  const { t } = useLanguage()
  const { resolvedTheme } = useTheme()

  if (!isVisible) return null

  return (
    <div
      className={`
        mt-3 p-3 rounded-md border transition-all duration-200
        ${
          resolvedTheme === 'dark'
            ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-200'
            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
        }
      `}
    >
      <label className='flex items-center space-x-3 cursor-pointer'>
        <input
          type='checkbox'
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className={`
            h-4 w-4 rounded border-2 transition-colors
            ${
              resolvedTheme === 'dark'
                ? 'border-yellow-600 bg-yellow-900/30 text-yellow-500 focus:ring-yellow-500/20'
                : 'border-yellow-400 bg-yellow-100 text-yellow-600 focus:ring-yellow-500/20'
            }
            focus:ring-2 focus:ring-offset-0
          `}
        />
        <div className='flex-1'>
          <div
            className={`
              text-sm font-medium
              ${resolvedTheme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'}
            `}
          >
            {t('template.update.confirm.description', { templateName })}
          </div>
          {/* <div 
            className={`
              text-sm mt-1
              ${resolvedTheme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}
            `}
          >
            {t('template.update.confirm.description', { templateName })}
          </div> */}
        </div>
      </label>

      {/* 提示信息 */}
      {/* <div 
        className={`
          mt-2 text-xs
          ${resolvedTheme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'}
        `}
      >
        💡 {t('template.update.confirm.hint')}
      </div> */}
    </div>
  )
}
