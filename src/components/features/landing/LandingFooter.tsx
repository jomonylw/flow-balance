'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { APP_INFO } from '@/lib/constants/app-config'
import { AppLogoVariants } from '@/components/ui/branding/AppLogo'

export default function LandingFooter() {
  const { t } = useLanguage()

  return (
    <footer className='relative bg-white/80 dark:bg-gray-900/80 border-t border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md overflow-hidden'>
      {/* 背景装饰 */}
      <div className='absolute inset-0'>
        <div className='absolute top-0 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-400/5 to-indigo-400/5 rounded-full blur-3xl'></div>
        <div className='absolute bottom-0 right-1/4 w-48 h-48 bg-gradient-to-r from-purple-400/5 to-pink-400/5 rounded-full blur-2xl'></div>
      </div>

      <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
          {/* Brand Section */}
          <div className='md:col-span-2'>
            <div className='mb-6'>
              <AppLogoVariants.Auth />
            </div>
            <p className='text-gray-600 dark:text-gray-400 mb-6 max-w-md'>
              {t('landing.footer.description')}
            </p>
            <div className='flex space-x-4'>
              {/* GitHub Link */}
              <a
                href={APP_INFO.REPOSITORY}
                target='_blank'
                rel='noopener noreferrer'
                className='w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200'
              >
                <svg
                  className='w-5 h-5'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                </svg>
              </a>
              {/* Homepage Link */}
              <a
                href={APP_INFO.HOMEPAGE}
                target='_blank'
                rel='noopener noreferrer'
                className='w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200'
              >
                <svg
                  className='w-5 h-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9'
                  />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
              {t('landing.footer.links.title')}
            </h3>
            <ul className='space-y-3'>
              <li>
                <a
                  href='/login'
                  className='text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200'
                >
                  {t('auth.login')}
                </a>
              </li>
              <li>
                <a
                  href='/signup'
                  className='text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200'
                >
                  {t('auth.signup')}
                </a>
              </li>
              <li>
                <a
                  href='/forgot-password'
                  className='text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200'
                >
                  {t('auth.forgot.password')}
                </a>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
              {t('landing.footer.features.title')}
            </h3>
            <ul className='space-y-3'>
              <li>
                <span className='text-gray-600 dark:text-gray-400'>
                  {t('landing.footer.features.accounts')}
                </span>
              </li>
              <li>
                <span className='text-gray-600 dark:text-gray-400'>
                  {t('landing.footer.features.reports')}
                </span>
              </li>
              <li>
                <span className='text-gray-600 dark:text-gray-400'>
                  {t('landing.footer.features.multicurrency')}
                </span>
              </li>
              <li>
                <span className='text-gray-600 dark:text-gray-400'>
                  {t('landing.footer.features.fire')}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className='mt-12 pt-8 border-t border-gray-200 dark:border-gray-700'>
          <div className='flex flex-col md:flex-row justify-between items-center'>
            <div className='text-gray-500 dark:text-gray-400 text-sm mb-4 md:mb-0'>
              © 2024 {APP_INFO.AUTHOR}. {t('landing.footer.copyright')}
            </div>
            <div className='flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400'>
              <span>v{APP_INFO.VERSION}</span>
              <span>•</span>
              <span>{APP_INFO.TECH_STACK.FRONTEND}</span>
              <span>•</span>
              <span>
                {t('landing.footer.build')}: {APP_INFO.BUILD_DATE}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
