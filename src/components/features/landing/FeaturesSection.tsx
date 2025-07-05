'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

export default function FeaturesSection() {
  const { t } = useLanguage()
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 })

  const features = [
    {
      icon: (
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
            d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h10M7 15h10'
          />
        </svg>
      ),
      gradient: 'from-blue-500 to-indigo-600',
      titleKey: 'landing.features.accounts.title',
      descriptionKey: 'landing.features.accounts.description',
      highlights: [
        'landing.features.accounts.highlight.1',
        'landing.features.accounts.highlight.2',
        'landing.features.accounts.highlight.3',
      ],
    },
    {
      icon: (
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
            d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
          />
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-600',
      titleKey: 'landing.features.reports.title',
      descriptionKey: 'landing.features.reports.description',
      highlights: [
        'landing.features.reports.highlight.1',
        'landing.features.reports.highlight.2',
        'landing.features.reports.highlight.3',
      ],
    },
    {
      icon: (
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
      ),
      gradient: 'from-purple-500 to-pink-600',
      titleKey: 'landing.features.currency.title',
      descriptionKey: 'landing.features.currency.description',
      highlights: [
        'landing.features.currency.highlight.1',
        'landing.features.currency.highlight.2',
        'landing.features.currency.highlight.3',
      ],
    },
    {
      icon: (
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
            d='M13 10V3L4 14h7v7l9-11h-7z'
          />
        </svg>
      ),
      gradient: 'from-orange-500 to-red-600',
      titleKey: 'landing.features.fire.title',
      descriptionKey: 'landing.features.fire.description',
      highlights: [
        'landing.features.fire.highlight.1',
        'landing.features.fire.highlight.2',
        'landing.features.fire.highlight.3',
      ],
    },
    {
      icon: (
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
            d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
          />
        </svg>
      ),
      gradient: 'from-teal-500 to-cyan-600',
      titleKey: 'landing.features.experience.title',
      descriptionKey: 'landing.features.experience.description',
      highlights: [
        'landing.features.experience.highlight.1',
        'landing.features.experience.highlight.2',
        'landing.features.experience.highlight.3',
      ],
    },
    {
      icon: (
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
            d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
          />
        </svg>
      ),
      gradient: 'from-indigo-500 to-purple-600',
      titleKey: 'landing.features.smart.title',
      descriptionKey: 'landing.features.smart.description',
      highlights: [
        'landing.features.smart.highlight.1',
        'landing.features.smart.highlight.2',
        'landing.features.smart.highlight.3',
      ],
    },
  ]

  return (
    <section ref={ref} className='py-20 bg-white/50 dark:bg-gray-800/50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <h2 className='text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-6'>
            {t('landing.features.title')}
          </h2>
          <p className='text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto'>
            {t('landing.features.subtitle')}
          </p>
        </div>

        {/* Features Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group p-8 bg-white/80 dark:bg-gray-800/80 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all duration-300 hover:-translate-y-2 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: isVisible ? `${index * 100}ms` : '0ms',
                transitionDuration: '600ms',
              }}
            >
              {/* Icon */}
              <div
                className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-4'>
                {t(feature.titleKey)}
              </h3>

              {/* Description */}
              <p className='text-gray-600 dark:text-gray-400 mb-6 leading-relaxed'>
                {t(feature.descriptionKey)}
              </p>

              {/* Highlights */}
              <ul className='space-y-2'>
                {feature.highlights.map((highlightKey, highlightIndex) => (
                  <li key={highlightIndex} className='flex items-start'>
                    <svg
                      className='w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      {t(highlightKey)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
