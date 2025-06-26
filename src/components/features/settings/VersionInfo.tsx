'use client'

import { useState } from 'react'
import {
  ExternalLink,
  GitBranch,
  Calendar,
  Code,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { APP_INFO } from '@/lib/constants/app-config'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import AppLogo from '@/components/ui/branding/AppLogo'

interface VersionInfoProps {
  className?: string
}

export default function VersionInfo({ className = '' }: VersionInfoProps) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleRepositoryClick = () => {
    window.open(APP_INFO.REPOSITORY, '_blank', 'noopener,noreferrer')
  }

  const handleHomepageClick = () => {
    window.open(APP_INFO.HOMEPAGE, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-sm ${className}`}
    >
      {/* 版本信息标题 */}
      <div className='px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-gray-700 dark:to-gray-700/50 border-b border-gray-100 dark:border-gray-700'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <Info className='w-4 h-4 text-gray-600 dark:text-gray-400' />
            <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
              {t('settings.version.info')}
            </h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className='p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors'
            aria-label={
              isExpanded
                ? t('settings.version.collapse')
                : t('settings.version.expand')
            }
          >
            {isExpanded ? (
              <ChevronUp className='w-4 h-4 text-gray-500 dark:text-gray-400' />
            ) : (
              <ChevronDown className='w-4 h-4 text-gray-500 dark:text-gray-400' />
            )}
          </button>
        </div>
      </div>

      {/* 基础版本信息 */}
      <div className='p-4 space-y-3'>
        {/* 应用名称和版本 */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <AppLogo size='md' showText={false} />
            <div>
              <h4 className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                {APP_INFO.NAME}
              </h4>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {t('settings.version.current')}: v{APP_INFO.VERSION}
              </p>
            </div>
          </div>
        </div>

        {/* 快捷链接 */}
        <div className='flex space-x-2'>
          <button
            onClick={handleRepositoryClick}
            className='flex items-center space-x-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors group'
          >
            <GitBranch className='w-3 h-3 text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300' />
            <span className='text-gray-700 dark:text-gray-300'>
              {t('settings.version.repository')}
            </span>
            <ExternalLink className='w-3 h-3 text-gray-500 dark:text-gray-400' />
          </button>

          <button
            onClick={handleHomepageClick}
            className='flex items-center space-x-1 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md transition-colors group'
          >
            <ExternalLink className='w-3 h-3' />
            <span>{t('settings.version.homepage')}</span>
          </button>
        </div>

        {/* 展开的详细信息 */}
        {isExpanded && (
          <div className='mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3'>
            {/* 构建信息 */}
            <div className='space-y-2'>
              <h5 className='text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide'>
                {t('settings.version.build.info')}
              </h5>
              <div className='grid grid-cols-1 gap-2 text-xs'>
                <div className='flex items-center space-x-2'>
                  <Calendar className='w-3 h-3 text-gray-500 dark:text-gray-400' />
                  <span className='text-gray-600 dark:text-gray-400'>
                    {t('settings.version.build.date')}: {APP_INFO.BUILD_DATE}
                  </span>
                </div>
              </div>
            </div>

            {/* 技术栈信息 */}
            <div className='space-y-2'>
              <h5 className='text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide'>
                {t('settings.version.tech.stack')}
              </h5>
              <div className='grid grid-cols-1 gap-1 text-xs'>
                <div className='flex items-center space-x-2'>
                  <Code className='w-3 h-3 text-gray-500 dark:text-gray-400' />
                  <span className='text-gray-600 dark:text-gray-400'>
                    {t('settings.version.frontend')}:{' '}
                    {APP_INFO.TECH_STACK.FRONTEND}
                  </span>
                </div>
                <div className='flex items-center space-x-2'>
                  <Code className='w-3 h-3 text-gray-500 dark:text-gray-400' />
                  <span className='text-gray-600 dark:text-gray-400'>
                    {t('settings.version.backend')}:{' '}
                    {APP_INFO.TECH_STACK.BACKEND}
                  </span>
                </div>
                <div className='flex items-center space-x-2'>
                  <Code className='w-3 h-3 text-gray-500 dark:text-gray-400' />
                  <span className='text-gray-600 dark:text-gray-400'>
                    {t('settings.version.database')}:{' '}
                    {APP_INFO.TECH_STACK.DATABASE}
                  </span>
                </div>
                <div className='flex items-center space-x-2'>
                  <Code className='w-3 h-3 text-gray-500 dark:text-gray-400' />
                  <span className='text-gray-600 dark:text-gray-400'>
                    {t('settings.version.styling')}:{' '}
                    {APP_INFO.TECH_STACK.STYLING}
                  </span>
                </div>
                <div className='flex items-center space-x-2'>
                  <Code className='w-3 h-3 text-gray-500 dark:text-gray-400' />
                  <span className='text-gray-600 dark:text-gray-400'>
                    {t('settings.version.charts')}: {APP_INFO.TECH_STACK.CHARTS}
                  </span>
                </div>
              </div>
            </div>

            {/* 作者信息 */}
            <div className='pt-2 border-t border-gray-100 dark:border-gray-700'>
              <p className='text-xs text-gray-500 dark:text-gray-400 text-center'>
                {t('settings.version.developed.by')} {APP_INFO.AUTHOR}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
