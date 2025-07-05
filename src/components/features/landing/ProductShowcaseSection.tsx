'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import PlaceholderImage from './PlaceholderImage'

export default function ProductShowcaseSection() {
  const { t } = useLanguage()
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 })
  const [activeTab, setActiveTab] = useState('dashboard')

  const showcaseItems = [
    {
      id: 'dashboard',
      titleKey: 'landing.showcase.dashboard.title',
      descriptionKey: 'landing.showcase.dashboard.description',
      image: '/images/screenshots/dashboard-overview.png',
      features: [
        'landing.showcase.dashboard.feature.1',
        'landing.showcase.dashboard.feature.2',
        'landing.showcase.dashboard.feature.3',
      ],
    },
    {
      id: 'reports',
      titleKey: 'landing.showcase.reports.title',
      descriptionKey: 'landing.showcase.reports.description',
      image: '/images/screenshots/financial-reports.png',
      features: [
        'landing.showcase.reports.feature.1',
        'landing.showcase.reports.feature.2',
        'landing.showcase.reports.feature.3',
      ],
    },
    {
      id: 'fire',
      titleKey: 'landing.showcase.fire.title',
      descriptionKey: 'landing.showcase.fire.description',
      image: '/images/screenshots/fire-calculator.png',
      features: [
        'landing.showcase.fire.feature.1',
        'landing.showcase.fire.feature.2',
        'landing.showcase.fire.feature.3',
      ],
    },
    {
      id: 'smart',
      titleKey: 'landing.showcase.smart.title',
      descriptionKey: 'landing.showcase.smart.description',
      image: '/images/screenshots/smart-paste.png',
      features: [
        'landing.showcase.smart.feature.1',
        'landing.showcase.smart.feature.2',
        'landing.showcase.smart.feature.3',
      ],
    },
  ]

  const currentItem =
    showcaseItems.find(item => item.id === activeTab) || showcaseItems[0]

  return (
    <section
      ref={ref}
      className='py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800'
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <h2 className='text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-6'>
            {t('landing.showcase.title')}
          </h2>
          <p className='text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto'>
            {t('landing.showcase.subtitle')}
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex flex-wrap justify-center mb-12 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-2 border border-gray-200/50 dark:border-gray-700/50'>
            {showcaseItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t(item.titleKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {/* Left: Description */}
          <div className='space-y-6'>
            <h3 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100'>
              {t(currentItem.titleKey)}
            </h3>
            <p className='text-lg text-gray-600 dark:text-gray-400 leading-relaxed'>
              {t(currentItem.descriptionKey)}
            </p>
            <ul className='space-y-3'>
              {currentItem.features.map((featureKey, index) => (
                <li key={index} className='flex items-start'>
                  <svg
                    className='w-6 h-6 text-green-500 mr-3 mt-0.5 flex-shrink-0'
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
                  <span className='text-gray-700 dark:text-gray-300'>
                    {t(featureKey)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Screenshot */}
          <div className='relative'>
            <div className='relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50'>
              <div className='absolute top-0 left-0 right-0 h-8 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center px-4'>
                <div className='flex space-x-2'>
                  <div className='w-3 h-3 bg-red-400 rounded-full'></div>
                  <div className='w-3 h-3 bg-yellow-400 rounded-full'></div>
                  <div className='w-3 h-3 bg-green-400 rounded-full'></div>
                </div>
              </div>
              <div className='pt-8'>
                <PlaceholderImage
                  width={800}
                  height={600}
                  text={`${t(currentItem.titleKey)} 截图`}
                  className='w-full h-auto'
                />
              </div>
            </div>
            {/* Decorative elements */}
            <div className='absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-xl'></div>
            <div className='absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-xl'></div>
          </div>
        </div>
      </div>
    </section>
  )
}
