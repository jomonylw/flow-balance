'use client'

import { ReactNode } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { TabType, SettingGroup } from './SettingsNavigation'

interface SettingsContentProps {
  activeTab: TabType
  settingGroups: SettingGroup[]
  children: ReactNode
}

export default function SettingsContent({
  activeTab,
  settingGroups,
  children
}: SettingsContentProps) {
  const { t } = useLanguage()

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'complete':
        return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
      case 'warning':
        return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      case 'incomplete':
        return 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'complete':
        return '✓'
      case 'warning':
        return '⚠'
      case 'incomplete':
        return '!'
      default:
        return ''
    }
  }

  const currentItem = settingGroups
    .flatMap(group => group.items)
    .find(item => item.id === activeTab)

  return (
    <div className="flex-1 min-w-0">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 backdrop-blur-sm overflow-hidden">
        {/* 内容标题栏 */}
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50/50 to-white dark:from-gray-700/50 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
          {currentItem && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200/50 dark:border-blue-700/50">
                  <span className="text-xl">{currentItem.icon}</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">{currentItem.label}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{currentItem.description}</p>
                </div>
              </div>
              {currentItem.status && (
                <span className={`
                  inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                  ${getStatusColor(currentItem.status)}
                `}>
                  <span className="mr-1.5">{getStatusIcon(currentItem.status)}</span>
                  {currentItem.status === 'complete' ? t('settings.status.complete') :
                   currentItem.status === 'warning' ? t('settings.status.warning') :
                   currentItem.status === 'incomplete' ? t('settings.status.incomplete') : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="p-6 bg-gradient-to-b from-white to-gray-50/30 dark:from-gray-800 dark:to-gray-800/50">
          {children}
        </div>
      </div>
    </div>
  )
}
