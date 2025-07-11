'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'

interface HeroSectionProps {
  onLogin: () => void
  onSignup: () => void
}

export default function HeroSection({ onLogin, onSignup }: HeroSectionProps) {
  const { t } = useLanguage()

  return (
    <section className='relative py-20 sm:py-32 overflow-hidden'>
      {/* Enhanced Background Decoration */}
      <div className='absolute inset-0'>
        {/* 主要装饰元素 */}
        <div className='absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse'></div>
        <div
          className='absolute bottom-0 right-1/4 w-64 h-64 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse'
          style={{ animationDelay: '1s' }}
        ></div>

        {/* 额外的浮动元素 */}
        <div
          className='absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-green-400/15 to-emerald-400/15 rounded-full blur-2xl animate-bounce'
          style={{ animationDelay: '2s', animationDuration: '3s' }}
        ></div>
        <div
          className='absolute top-3/4 right-1/3 w-48 h-48 bg-gradient-to-r from-orange-400/15 to-red-400/15 rounded-full blur-2xl animate-pulse'
          style={{ animationDelay: '0.5s' }}
        ></div>

        {/* 网格背景 */}
        <div className='absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:50px_50px] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]'></div>
      </div>

      <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center'>
          {/* Main Heading */}
          <h1 className='text-4xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-gray-100 dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent mb-6'>
            {t('landing.hero.title')}
          </h1>

          {/* Subtitle */}
          <p className='text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed'>
            {t('landing.hero.subtitle')}
          </p>

          {/* Description */}
          <p className='text-lg text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto'>
            {t('landing.hero.description')}
          </p>

          {/* Enhanced CTA Buttons */}
          <div className='flex flex-col sm:flex-row gap-4 justify-center items-center mb-16'>
            <button
              onClick={onSignup}
              className='group relative w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-2xl hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl overflow-hidden'
            >
              <span className='relative z-10 flex items-center justify-center gap-2'>
                ✨ {t('landing.hero.cta.primary')}
              </span>
              {/* 按钮光效 */}
              <div className='absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
            </button>
            <button
              onClick={onLogin}
              className='group relative w-full sm:w-auto px-8 py-4 bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 backdrop-blur-sm hover:border-blue-300 dark:hover:border-blue-500'
            >
              <span className='flex items-center justify-center gap-2'>
                🔑 {t('landing.hero.cta.secondary')}
              </span>
            </button>
          </div>

          {/* Feature Highlights */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto'>
            <div className='flex flex-col items-center p-6 bg-white/60 dark:bg-gray-800/60 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50'>
              <div className='w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4'>
                <svg
                  className='w-6 h-6 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                  />
                </svg>
              </div>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                {t('landing.hero.feature.professional.title')}
              </h3>
              <p className='text-gray-600 dark:text-gray-400 text-center'>
                {t('landing.hero.feature.professional.description')}
              </p>
            </div>

            <div className='flex flex-col items-center p-6 bg-white/60 dark:bg-gray-800/60 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50'>
              <div className='w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4'>
                <svg
                  className='w-6 h-6 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                {t('landing.hero.feature.multicurrency.title')}
              </h3>
              <p className='text-gray-600 dark:text-gray-400 text-center'>
                {t('landing.hero.feature.multicurrency.description')}
              </p>
            </div>

            <div className='flex flex-col items-center p-6 bg-white/60 dark:bg-gray-800/60 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50'>
              <div className='w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4'>
                <svg
                  className='w-6 h-6 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M13 10V3L4 14h7v7l9-11h-7z'
                  />
                </svg>
              </div>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                {t('landing.hero.feature.modern.title')}
              </h3>
              <p className='text-gray-600 dark:text-gray-400 text-center'>
                {t('landing.hero.feature.modern.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
