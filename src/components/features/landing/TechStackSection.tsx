'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { APP_INFO } from '@/lib/constants/app-config'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

export default function TechStackSection() {
  const { t } = useLanguage()
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 })

  const techStack = [
    {
      category: 'landing.tech.frontend.title',
      technologies: [
        { name: 'Next.js 15', description: 'landing.tech.frontend.nextjs' },
        { name: 'React 19', description: 'landing.tech.frontend.react' },
        { name: 'TypeScript', description: 'landing.tech.frontend.typescript' },
        {
          name: 'Tailwind CSS 4',
          description: 'landing.tech.frontend.tailwind',
        },
      ],
      gradient: 'from-blue-500 to-indigo-600',
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
            d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
          />
        </svg>
      ),
    },
    {
      category: 'landing.tech.backend.title',
      technologies: [
        { name: 'Node.js', description: 'landing.tech.backend.nodejs' },
        { name: 'Prisma ORM', description: 'landing.tech.backend.prisma' },
        {
          name: 'SQLite/PostgreSQL',
          description: 'landing.tech.backend.database',
        },
        { name: 'JWT Auth', description: 'landing.tech.backend.auth' },
      ],
      gradient: 'from-green-500 to-emerald-600',
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
            d='M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01'
          />
        </svg>
      ),
    },
    {
      category: 'landing.tech.features.title',
      technologies: [
        { name: 'ECharts', description: 'landing.tech.features.echarts' },
        { name: 'i18n', description: 'landing.tech.features.i18n' },
        { name: 'Dark Mode', description: 'landing.tech.features.darkmode' },
        { name: 'Responsive', description: 'landing.tech.features.responsive' },
      ],
      gradient: 'from-purple-500 to-pink-600',
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
    },
  ]

  return (
    <section
      ref={ref}
      className='py-20 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800'
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <h2 className='text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-6'>
            {t('landing.tech.title')}
          </h2>
          <p className='text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto'>
            {t('landing.tech.subtitle')}
          </p>
        </div>

        {/* Tech Stack Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16'>
          {techStack.map((stack, index) => (
            <div
              key={index}
              className='group p-8 bg-white/80 dark:bg-gray-800/80 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all duration-300 hover:-translate-y-2'
            >
              {/* Category Header */}
              <div className='flex items-center mb-6'>
                <div
                  className={`w-12 h-12 bg-gradient-to-r ${stack.gradient} rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  {stack.icon}
                </div>
                <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                  {t(stack.category)}
                </h3>
              </div>

              {/* Technologies List */}
              <div className='space-y-4'>
                {stack.technologies.map((tech, techIndex) => (
                  <div key={techIndex} className='flex flex-col'>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='font-semibold text-gray-900 dark:text-gray-100'>
                        {tech.name}
                      </span>
                      <svg
                        className='w-4 h-4 text-green-500'
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
                    </div>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {t(tech.description)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Version Info */}
        <div className='text-center p-8 bg-white/60 dark:bg-gray-800/60 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm'>
          <div className='flex items-center justify-center mb-4'>
            <div className='w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3'>
              <svg
                className='w-4 h-4 text-white'
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
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              {APP_INFO.NAME} v{APP_INFO.VERSION}
            </h3>
          </div>
          <p className='text-gray-600 dark:text-gray-400 mb-4'>
            {t('landing.tech.version.description')}
          </p>
          <div className='flex flex-wrap justify-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
            <span>
              {t('landing.tech.version.build')}: {APP_INFO.BUILD_DATE}
            </span>
            <span>•</span>
            <span>
              {t('landing.tech.version.author')}: {APP_INFO.AUTHOR}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
