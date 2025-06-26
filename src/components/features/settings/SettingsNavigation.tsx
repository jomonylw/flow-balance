'use client'

import VersionInfo from './VersionInfo'
// import { useLanguage } from '@/contexts/providers/LanguageContext'

type TabType =
  | 'profile'
  | 'security'
  | 'preferences'
  | 'currencies'
  | 'exchange-rates'
  | 'tags'
  | 'data'

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
  settingGroups,
}: SettingsNavigationProps) {
  // const { t } = useLanguage()

  return (
    <div className='w-80 flex-shrink-0'>
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-sm'>
        {settingGroups.map((group, groupIndex) => (
          <div
            key={group.id}
            className={`${groupIndex > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}
          >
            {/* 设置分组标题 */}
            <div className='px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-gray-700 dark:to-gray-700/50 border-b border-gray-100 dark:border-gray-700'>
              <div className='flex items-center space-x-2'>
                <span className='text-lg'>{group.icon}</span>
                <div>
                  <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    {group.title}
                  </h3>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {group.description}
                  </p>
                </div>
              </div>
            </div>

            {/* 设置项目列表 */}
            <div className='divide-y divide-gray-50 dark:divide-gray-700/50'>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`
                    w-full px-4 py-3.5 text-left transition-all duration-200 group relative
                    ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-blue-50 to-blue-50/30 dark:from-blue-900/30 dark:to-blue-900/10 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-50/30 dark:hover:from-gray-700/50 dark:hover:to-gray-700/20'
                    }
                  `}
                >
                  {/* 选中状态指示器 */}
                  {activeTab === item.id && (
                    <div className='absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-600 rounded-r-full' />
                  )}

                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-3'>
                      <div
                        className={`
                        flex items-center justify-center w-8 h-8 rounded-lg transition-colors
                        ${
                          activeTab === item.id
                            ? 'bg-blue-100 dark:bg-blue-800/50'
                            : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                        }
                      `}
                      >
                        <span className='text-sm'>{item.icon}</span>
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium transition-colors ${
                            activeTab === item.id
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          {item.label}
                        </p>
                        <p
                          className={`text-xs transition-colors ${
                            activeTab === item.id
                              ? 'text-blue-600/70 dark:text-blue-400/70'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 版本信息 */}
      <VersionInfo className='mt-6' />
    </div>
  )
}

export type { TabType, SettingGroup }
