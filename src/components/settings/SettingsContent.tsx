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
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20'
      case 'incomplete':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* 内容标题栏 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {currentItem && (
            <div className="flex items-center space-x-3">
              <span className="text-xl">{currentItem.icon}</span>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">{currentItem.label}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{currentItem.description}</p>
              </div>
              {currentItem.status && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentItem.status)}`}>
                  {getStatusIcon(currentItem.status)} {
                    currentItem.status === 'complete' ? t('settings.status.complete') :
                    currentItem.status === 'warning' ? t('settings.status.warning') :
                    currentItem.status === 'incomplete' ? t('settings.status.incomplete') : ''
                  }
                </span>
              )}
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
