'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { User, UserSettings, Currency } from '@prisma/client'
import { useIsMobile } from '@/hooks/useResponsive'
import PageContainer from '@/components/ui/PageContainer'
import ProfileSettingsForm from './ProfileSettingsForm'
import ChangePasswordForm from './ChangePasswordForm'
import PreferencesForm from './PreferencesForm'
import CurrencyManagement from './CurrencyManagement'
import DataManagementSection from './DataManagementSection'
import ExchangeRateManagement from './ExchangeRateManagement'
import TagManagement from './TagManagement'
import SettingsNavigation, { TabType, SettingGroup } from './SettingsNavigation'
import SettingsContent from './SettingsContent'
import { useLanguage } from '@/contexts/LanguageContext'
import TranslationLoader from '@/components/ui/TranslationLoader'
import {
  SettingsPageSkeleton,
  ProfileFormSkeleton,
  PasswordFormSkeleton,
  PreferencesFormSkeleton,
  DataManagementSkeleton
} from '@/components/ui/page-skeletons'

interface UserSettingsPageProps {
  user: User
  userSettings: (UserSettings & { baseCurrency: Currency | null }) | null
  currencies: Currency[]
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
  const [isLoading, setIsLoading] = useState(false)

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

  const renderTabContentSkeleton = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileFormSkeleton />
      case 'security':
        return <PasswordFormSkeleton />
      case 'preferences':
        return <PreferencesFormSkeleton />
      case 'data':
        return <DataManagementSkeleton />
      default:
        return <ProfileFormSkeleton />
    }
  }

  const renderTabContent = () => {
    if (isLoading) {
      return renderTabContentSkeleton()
    }

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

  const handleTabChange = (tab: TabType) => {
    setIsLoading(true)
    setActiveTab(tab)

    // 模拟加载延迟以显示骨架屏
    setTimeout(() => {
      setIsLoading(false)
    }, 300)
  }

  // 移动端卡片式布局
  if (isMobile) {
    return (
      <TranslationLoader
        fallback={<SettingsPageSkeleton isMobile={true} />}
      >
        <PageContainer
          title={t('settings.page.title')}
          subtitle={t('settings.page.description')}
          className="min-h-screen bg-gray-50 dark:bg-gray-900"
        >
          {/* 设置分组卡片 */}
          <div className="space-y-4">
            {settingGroups.map((group) => (
              <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                {/* 设置项目列表 */}
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        activeTab === item.id ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500 dark:border-blue-400' : ''
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
                        <div className="flex items-center space-x-2">
                          {item.status && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              item.status === 'complete' ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20' :
                              item.status === 'warning' ? 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20' :
                              item.status === 'incomplete' ? 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20' :
                              'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
                            }`}>
                              {item.status === 'complete' ? '✓' : item.status === 'warning' ? '⚠' : item.status === 'incomplete' ? '!' : ''}
                            </span>
                          )}
                          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            {renderTabContent()}
          </div>
        </PageContainer>
      </TranslationLoader>
    )
  }

  // 桌面端两栏布局
  return (
    <TranslationLoader
      fallback={<SettingsPageSkeleton isMobile={false} />}
    >
      <PageContainer
        title={t('settings.page.title')}
        subtitle={t('settings.page.description')}
      >
        {/* 桌面端两栏布局 */}
        <div className="flex gap-8">
          {/* 左侧导航栏 */}
          <SettingsNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            settingGroups={settingGroups}
          />

          {/* 右侧内容区域 */}
          <SettingsContent
            activeTab={activeTab}
            settingGroups={settingGroups}
          >
            {renderTabContent()}
          </SettingsContent>
        </div>
      </PageContainer>
    </TranslationLoader>
  )
}
