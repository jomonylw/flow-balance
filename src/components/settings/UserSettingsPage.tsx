'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { User, UserSettings, Currency } from '@prisma/client'
import { useIsMobile } from '@/hooks/useResponsive'
import ProfileSettingsForm from './ProfileSettingsForm'
import ChangePasswordForm from './ChangePasswordForm'
import PreferencesForm from './PreferencesForm'
import CurrencyManagement from './CurrencyManagement'
import DataManagementSection from './DataManagementSection'
import ExchangeRateManagement from './ExchangeRateManagement'
import TagManagement from './TagManagement'
import { useLanguage } from '@/contexts/LanguageContext'

interface UserSettingsPageProps {
  user: User
  userSettings: (UserSettings & { baseCurrency: Currency | null }) | null
  currencies: Currency[]
}

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

export default function UserSettingsPage({
  user,
  userSettings,
  currencies
}: UserSettingsPageProps) {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<TabType>('profile')

  useEffect(() => {
    // 检查URL参数中是否指定了标签页
    const tab = searchParams.get('tab') as TabType
    if (tab && ['profile', 'security', 'preferences', 'currencies', 'exchange-rates', 'tags', 'data'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // 设置项目分组
  const settingGroups: SettingGroup[] = [
    {
      id: 'personal',
      title: t('settings.personal.settings'),
      description: t('settings.personal.settings.description'),
      icon: '👤',
      items: [
        {
          id: 'profile',
          label: t('settings.profile'),
          description: t('settings.profile.description'),
          icon: '👤',
          status: user.email ? 'complete' : 'incomplete'
        },
        {
          id: 'security',
          label: t('settings.security'),
          description: t('settings.security.description'),
          icon: '🔒'
        },
        {
          id: 'preferences',
          label: t('settings.preferences.tab'),
          description: t('settings.preferences.description'),
          icon: '⚙️',
          status: userSettings?.baseCurrencyCode ? 'complete' : 'warning'
        },
        {
          id: 'currencies',
          label: t('settings.currencies'),
          description: t('settings.currencies.description'),
          icon: '💰'
        },
        {
          id: 'exchange-rates',
          label: t('settings.exchange.rates'),
          description: t('settings.exchange.rates.description'),
          icon: '💱'
        },
        {
          id: 'tags',
          label: t('settings.tags'),
          description: t('settings.tags.description'),
          icon: '🏷️'
        },
        {
          id: 'data',
          label: t('settings.data'),
          description: t('settings.data.description'),
          icon: '📊'
        }
      ]
    }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettingsForm user={user} />
      case 'security':
        return <ChangePasswordForm />
      case 'preferences':
        return (
          <PreferencesForm
            userSettings={userSettings}
            currencies={currencies}
          />
        )
      case 'currencies':
        return <CurrencyManagement />
      case 'exchange-rates':
        return <ExchangeRateManagement currencies={currencies} />
      case 'tags':
        return <TagManagement />
      case 'data':
        return <DataManagementSection />
      default:
        return null
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-600 bg-green-100'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      case 'incomplete':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
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

  // 移动端卡片式布局
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4">
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('settings.page.title')}</h1>
            <p className="text-sm text-gray-600 mt-1">{t('settings.page.description')}</p>
          </div>

          {/* 设置分组卡片 */}
          <div className="space-y-4">
            {settingGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* 设置项目列表 */}
                <div className="divide-y divide-gray-200">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        activeTab === item.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-base">{item.icon}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.label}</p>
                            <p className="text-xs text-gray-500">{item.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {item.status && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                            </span>
                          )}
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 当前选中的设置内容 */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            {renderTabContent()}
          </div>
        </div>
      </div>
    )
  }

  // 桌面端两栏布局
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('settings.page.title')}</h1>
        <p className="text-base text-gray-600 mt-2">{t('settings.page.description')}</p>
      </div>

      {/* 桌面端两栏布局 */}
      <div className="flex gap-8">
        {/* 左侧导航栏 */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {settingGroups.map((group) => (
              <div key={group.id} className="border-b border-gray-200 last:border-b-0">
                {/* 设置项目列表 */}
                <div className="divide-y divide-gray-100">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        activeTab === item.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-base">{item.icon}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.label}</p>
                            <p className="text-xs text-gray-500">{item.description}</p>
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
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">{t('settings.quick.actions')}</h4>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('preferences')}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                ⚙️ {t('settings.system.preferences')}
              </button>
              <button
                onClick={() => setActiveTab('currencies')}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                💰 {t('settings.currency.management')}
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                🔒 {t('password.change')}
              </button>
            </div>
          </div>
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* 内容标题栏 */}
            <div className="px-6 py-4 border-b border-gray-200">
              {(() => {
                const currentItem = settingGroups
                  .flatMap(group => group.items)
                  .find(item => item.id === activeTab)

                return currentItem ? (
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{currentItem.icon}</span>
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">{currentItem.label}</h2>
                      <p className="text-sm text-gray-500">{currentItem.description}</p>
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
                ) : null
              })()}
            </div>

            {/* 内容区域 */}
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
