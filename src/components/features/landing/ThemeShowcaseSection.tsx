'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import PlaceholderImage from './PlaceholderImage'

export default function ThemeShowcaseSection() {
  const { t } = useLanguage()
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 })
  const [activeComparison, setActiveComparison] = useState('theme')

  const comparisons = [
    {
      id: 'theme',
      titleKey: 'landing.comparison.theme.title',
      descriptionKey: 'landing.comparison.theme.description',
      leftImage: '/images/screenshots/theme-light.png',
      rightImage: '/images/screenshots/theme-dark.png',
      leftLabel: 'landing.comparison.theme.light',
      rightLabel: 'landing.comparison.theme.dark',
    },
    {
      id: 'i18n',
      titleKey: 'landing.comparison.i18n.title',
      descriptionKey: 'landing.comparison.i18n.description',
      leftImage: '/images/screenshots/interface-zh.png',
      rightImage: '/images/screenshots/interface-en.png',
      leftLabel: 'landing.comparison.i18n.chinese',
      rightLabel: 'landing.comparison.i18n.english',
    },
  ]

  const currentComparison =
    comparisons.find(comp => comp.id === activeComparison) || comparisons[0]

  return (
    <section ref={ref} className='py-20 bg-white/50 dark:bg-gray-900/50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <h2 className='text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-6'>
            {t('landing.comparison.title')}
          </h2>
          <p className='text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto'>
            {t('landing.comparison.subtitle')}
          </p>
        </div>

        {/* Toggle Buttons */}
        <div
          className={`flex justify-center mb-12 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-2 border border-gray-200/50 dark:border-gray-700/50'>
            {comparisons.map(comparison => (
              <button
                key={comparison.id}
                onClick={() => setActiveComparison(comparison.id)}
                className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeComparison === comparison.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t(comparison.titleKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div
          className={`text-center mb-12 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4'>
            {t(currentComparison.titleKey)}
          </h3>
          <p className='text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto'>
            {t(currentComparison.descriptionKey)}
          </p>
        </div>

        {/* Comparison Images */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {/* Left Image */}
          <div className='relative group'>
            <div className='relative bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 transform group-hover:scale-105 transition-transform duration-300'>
              <div className='absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center px-4'>
                <div className='flex space-x-2'>
                  <div className='w-3 h-3 bg-red-400 rounded-full'></div>
                  <div className='w-3 h-3 bg-yellow-400 rounded-full'></div>
                  <div className='w-3 h-3 bg-green-400 rounded-full'></div>
                </div>
              </div>
              <div className='pt-8'>
                <PlaceholderImage
                  width={600}
                  height={400}
                  text={t(currentComparison.leftLabel)}
                  className='w-full h-auto'
                />
              </div>
            </div>
            <div className='text-center mt-4'>
              <span className='inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium'>
                {t(currentComparison.leftLabel)}
              </span>
            </div>
          </div>

          {/* Right Image */}
          <div className='relative group'>
            <div className='relative bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 transform group-hover:scale-105 transition-transform duration-300'>
              <div className='absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center px-4'>
                <div className='flex space-x-2'>
                  <div className='w-3 h-3 bg-red-400 rounded-full'></div>
                  <div className='w-3 h-3 bg-yellow-400 rounded-full'></div>
                  <div className='w-3 h-3 bg-green-400 rounded-full'></div>
                </div>
              </div>
              <div className='pt-8'>
                <PlaceholderImage
                  width={600}
                  height={400}
                  text={t(currentComparison.rightLabel)}
                  className='w-full h-auto'
                />
              </div>
            </div>
            <div className='text-center mt-4'>
              <span className='inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium'>
                {t(currentComparison.rightLabel)}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Features */}
        <div
          className={`mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className='text-center p-8 bg-white/60 dark:bg-gray-800/60 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm'>
            <div className='w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <svg
                className='w-8 h-8 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z'
                />
              </svg>
            </div>
            <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-3'>
              {t('landing.comparison.responsive.title')}
            </h3>
            <p className='text-gray-600 dark:text-gray-400'>
              {t('landing.comparison.responsive.description')}
            </p>
          </div>

          <div className='text-center p-8 bg-white/60 dark:bg-gray-800/60 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm'>
            <div className='w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <svg
                className='w-8 h-8 text-white'
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
            <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-3'>
              {t('landing.comparison.currency.title')}
            </h3>
            <p className='text-gray-600 dark:text-gray-400'>
              {t('landing.comparison.currency.description')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
