'use client'

import { useLanguage } from '@/contexts/LanguageContext'

type TabType = 'profile' | 'security' | 'preferences' | 'currencies' | 'exchange-rates' | 'tags' | 'data'

interface SettingGroup {
  id: string
  title: string
  description: string
  icon: string
  items: {
    id: TabType
    label: string
    description: string
    icon: string
    status?: 'complete' | 'incomplete' | 'warning'
  }[]
}

interface SettingsNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  settingGroups: SettingGroup[]
}

export default function SettingsNavigation({
  activeTab,
  onTabChange,
  settingGroups
}: SettingsNavigationProps) {
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

  return (
    <div className="w-80 flex-shrink-0">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {settingGroups.map((group) => (
          <div key={group.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            {/* 设置项目列表 */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    activeTab === item.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500 dark:border-blue-400' 
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-base">{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                      </div>
                    </div>
                    {item.status && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 快捷操作卡片 */}
      {/* <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">{t('settings.quick.actions')}</h4>
        <div className="space-y-2">
          <button
            onClick={() => onTabChange('preferences')}
            className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
          >
            ⚙️ {t('settings.system.preferences')}
          </button>
          <button
            onClick={() => onTabChange('currencies')}
            className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
          >
            💰 {t('settings.currency.management')}
          </button>
          <button
            onClick={() => onTabChange('security')}
            className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
          >
            🔒 {t('password.change')}
          </button>
        </div>
      </div> */}
    </div>
  )
}

export type { TabType, SettingGroup }
