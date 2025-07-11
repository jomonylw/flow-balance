'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { AppLogoVariants } from '@/components/ui/branding/AppLogo'
import LanguageToggle from '@/components/features/layout/LanguageToggle'
import ThemeToggle from '@/components/features/layout/ThemeToggle'
import type { Theme } from '@/types/core'

interface LandingHeaderProps {
  onLogin: () => void
  onSignup: () => void
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

export default function LandingHeader({
  onLogin,
  onSignup,
  theme: _theme,
  setTheme: _setTheme,
  resolvedTheme: _resolvedTheme,
}: LandingHeaderProps) {
  const { t } = useLanguage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className='bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-16'>
          {/* Logo */}
          <div className='flex items-center'>
            <AppLogoVariants.TopBar />
          </div>

          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center space-x-6'>
            {/* Language Toggle */}
            <LanguageToggle />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Login Button */}
            <button
              onClick={onLogin}
              className='px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200'
            >
              {t('auth.login')}
            </button>

            {/* Signup Button */}
            <button
              onClick={onSignup}
              className='px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl'
            >
              {t('auth.signup')}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className='md:hidden flex items-center space-x-2'>
            <ThemeToggle />
            <LanguageToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className='p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200'
            >
              <svg
                className='h-6 w-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                ) : (
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 6h16M4 12h16M4 18h16'
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className='md:hidden py-4 border-t border-gray-200 dark:border-gray-700'>
            <div className='flex flex-col space-y-3'>
              <button
                onClick={onLogin}
                className='px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200'
              >
                {t('auth.login')}
              </button>
              <button
                onClick={onSignup}
                className='px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg'
              >
                {t('auth.signup')}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
