'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

export default function ThemeShowcaseSection() {
  const { t, language } = useLanguage()
  const { resolvedTheme } = useTheme()
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 })
  const [activeComparison, setActiveComparison] = useState('theme')
  const [activeThemeDemo, setActiveThemeDemo] = useState<'light' | 'dark'>(
    'light'
  )

  // 为主题对比生成特定的图片路径
  const getThemeComparisonImagePath = (themeType: 'light' | 'dark') => {
    return `/images/screenshots/theme-${themeType}-${resolvedTheme}-${language}.png`
  }

  const comparisons = [
    {
      id: 'theme',
      titleKey: 'landing.comparison.theme.title',
      descriptionKey: 'landing.comparison.theme.description',
      // 主题展示使用单一切换模式
      singleImage: getThemeComparisonImagePath(activeThemeDemo),
      themeOptions: [
        { key: 'light' as const, labelKey: 'landing.comparison.theme.light' },
        { key: 'dark' as const, labelKey: 'landing.comparison.theme.dark' },
      ],
    },
    {
      id: 'i18n',
      titleKey: 'landing.comparison.i18n.title',
      descriptionKey: 'landing.comparison.i18n.description',
      // 国际化展示保持左右对比模式
      leftImage: `/images/screenshots/interface-zh-${resolvedTheme}.png`,
      rightImage: `/images/screenshots/interface-en-${resolvedTheme}.png`,
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
          className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {/* 主题展示 - 单一切换模式 */}
          {activeComparison === 'theme' && (
            <div className='max-w-4xl mx-auto'>
              {/* 主题切换按钮 */}
              <div className='flex justify-center mb-8'>
                <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-2 border border-gray-200/50 dark:border-gray-700/50'>
                  {currentComparison.themeOptions?.map(option => (
                    <button
                      key={option.key}
                      onClick={() => setActiveThemeDemo(option.key)}
                      className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                        activeThemeDemo === option.key
                          ? option.key === 'light'
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {option.key === 'light' ? '☀️' : '🌙'}{' '}
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 主题展示图片 */}
              <div className='relative group'>
                <div className='relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 transform group-hover:scale-[1.02] transition-all duration-500'>
                  {/* 浏览器标题栏 */}
                  <div className='absolute top-0 left-0 right-0 h-10 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center px-4 border-b border-gray-200/50 dark:border-gray-600/50'>
                    <div className='flex space-x-2'>
                      <div className='w-3 h-3 bg-red-400 rounded-full'></div>
                      <div className='w-3 h-3 bg-yellow-400 rounded-full'></div>
                      <div className='w-3 h-3 bg-green-400 rounded-full'></div>
                    </div>
                    <div className='flex-1 text-center'>
                      <div className='text-xs text-gray-500 dark:text-gray-400 font-mono'>
                        Flow Balance -{' '}
                        {t(`landing.comparison.theme.${activeThemeDemo}`)}
                      </div>
                    </div>
                  </div>

                  {/* 图片容器 */}
                  <div className='pt-10 relative overflow-hidden'>
                    <img
                      src={currentComparison.singleImage}
                      alt={`${t(currentComparison.titleKey)} - ${t(`landing.comparison.theme.${activeThemeDemo}`)}`}
                      className='w-full h-auto transition-all duration-500'
                      loading='lazy'
                    />

                    {/* 主题指示器 */}
                    <div className='absolute top-4 right-4'>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          activeThemeDemo === 'light'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}
                      >
                        {activeThemeDemo === 'light' ? '☀️ Light' : '🌙 Dark'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 装饰性元素 */}
                <div
                  className={`absolute -top-6 -right-6 w-32 h-32 rounded-full blur-2xl transition-all duration-500 ${
                    activeThemeDemo === 'light'
                      ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20'
                      : 'bg-gradient-to-r from-indigo-400/20 to-purple-400/20'
                  }`}
                ></div>
                <div
                  className={`absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-xl transition-all duration-500 ${
                    activeThemeDemo === 'light'
                      ? 'bg-gradient-to-r from-orange-400/20 to-red-400/20'
                      : 'bg-gradient-to-r from-purple-400/20 to-pink-400/20'
                  }`}
                ></div>
              </div>
            </div>
          )}

          {/* 国际化展示 - 保持左右对比模式 */}
          {activeComparison === 'i18n' && (
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
              {/* 中文界面 */}
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
                    <img
                      src={currentComparison.leftImage}
                      alt={t(
                        currentComparison.leftLabel ||
                          'landing.comparison.i18n.chinese'
                      )}
                      className='w-full h-auto'
                      loading='lazy'
                    />
                  </div>
                </div>
                <div className='text-center mt-4'>
                  <span className='inline-block px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-medium'>
                    🇨🇳{' '}
                    {t(
                      currentComparison.leftLabel ||
                        'landing.comparison.i18n.chinese'
                    )}
                  </span>
                </div>
              </div>

              {/* 英文界面 */}
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
                    <img
                      src={currentComparison.rightImage}
                      alt={t(
                        currentComparison.rightLabel ||
                          'landing.comparison.i18n.english'
                      )}
                      className='w-full h-auto'
                      loading='lazy'
                    />
                  </div>
                </div>
                <div className='text-center mt-4'>
                  <span className='inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium'>
                    🇺🇸{' '}
                    {t(
                      currentComparison.rightLabel ||
                        'landing.comparison.i18n.english'
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
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
