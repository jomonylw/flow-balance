'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import LanguageToggle from '@/components/features/layout/LanguageToggle'
import ThemeToggle from '@/components/features/layout/ThemeToggle'

interface SetupLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function SetupLayout({
  children,
  title,
  subtitle,
}: SetupLayoutProps) {
  const { t: _t } = useLanguage()

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-6 sm:py-12 px-4 sm:px-6 lg:px-8 safe-area-inset-top safe-area-inset-bottom transition-colors duration-200'>
      {/* 顶部工具栏 */}
      <div className='absolute top-4 right-4 flex items-center space-x-2'>
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className='max-w-4xl w-full space-y-8'>
        <div className='text-center'>
          <h2 className='mt-6 text-3xl font-extrabold text-gray-900 dark:text-white transition-colors duration-200'>
            {title}
          </h2>
          {subtitle && (
            <p className='mt-2 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200'>
              {subtitle}
            </p>
          )}
        </div>

        <div className='bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 transition-colors duration-200'>
          {children}
        </div>
      </div>
    </div>
  )
}
