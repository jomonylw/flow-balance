'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { User, UserSettings, Currency } from '@prisma/client'
import { useIsMobile } from '@/hooks/ui/useResponsive'
import PageContainer from '@/components/ui/layout/PageContainer'
import ProfileSettingsForm from './ProfileSettingsForm'
import ChangePasswordForm from './ChangePasswordForm'
import PreferencesForm from './PreferencesForm'
import CurrencyManagement from './CurrencyManagement'
import DataManagementSection from './DataManagementSection'
import ExchangeRateManagement from './ExchangeRateManagement'
import TagManagement from './TagManagement'
import RecoveryKeyManagement from './RecoveryKeyManagement'
import SettingsNavigation, { TabType, SettingGroup } from './SettingsNavigation'
import SettingsContent from './SettingsContent'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import TranslationLoader from '@/components/ui/data-display/TranslationLoader'
import {
  SettingsPageSkeleton,
  ProfileFormSkeleton,
  PasswordFormSkeleton,
  PreferencesFormSkeleton,
  DataManagementSkeleton,
} from '@/components/ui/data-display/page-skeletons'

interface UserSettingsPageProps {
  user: User
  userSettings?: (UserSettings & { baseCurrency: Currency | null }) | null
  currencies?: Currency[]
}

export default function UserSettingsPage({
  user,
  userSettings: initialUserSettings,
  currencies: initialCurrencies,
}: UserSettingsPageProps) {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [userSettings, setUserSettings] = useState<
    (UserSettings & { baseCurrency: Currency | null }) | null
  >(initialUserSettings || null)
  const [currencies, setCurrencies] = useState<Currency[]>(
    initialCurrencies || []
  )

  // 客户端数据获取
  useEffect(() => {
    const fetchData = async () => {
      if (!initialUserSettings || !initialCurrencies) {
        try {
          const [settingsResponse, currenciesResponse] = await Promise.all([
            fetch('/api/user/settings'),
            fetch('/api/currencies'),
          ])

          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json()
            setUserSettings(settingsData.data.userSettings)
          }

          if (currenciesResponse.ok) {
            const currenciesData = await currenciesResponse.json()
            setCurrencies(currenciesData.data)
          }
        } catch (error) {
          console.error('Failed to fetch settings data:', error)
        }
      }
    }

    fetchData()
  }, [initialUserSettings, initialCurrencies])

  useEffect(() => {
    // 检查URL参数中是否指定了标签页
    const tab = searchParams.get('tab') as TabType
    if (
      tab &&
      [
        'profile',
        'security',
        'preferences',
        'currencies',
        'exchange-rates',
        'tags',
        'data',
      ].includes(tab)
    ) {
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
        },
        {
          id: 'security',
          label: t('settings.security'),
          description: t('settings.security.description'),
          icon: '🔒',
        },
        {
          id: 'preferences',
          label: t('settings.preferences.tab'),
          description: t('settings.preferences.description'),
          icon: '⚙️',
        },
        {
          id: 'currencies',
          label: t('settings.currencies'),
          description: t('settings.currencies.description'),
          icon: '💰',
        },
        {
          id: 'exchange-rates',
          label: t('settings.exchange.rates'),
          description: t('settings.exchange.rates.description'),
          icon: '💱',
        },
        {
          id: 'tags',
          label: t('settings.tags'),
          description: t('settings.tags.description'),
          icon: '🏷️',
        },
        {
          id: 'data',
          label: t('settings.data'),
          description: t('settings.data.description'),
          icon: '📊',
        },
      ],
    },
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
        return (
          <div className='space-y-6'>
            <ChangePasswordForm />
            <RecoveryKeyManagement />
          </div>
        )
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
      <TranslationLoader fallback={<SettingsPageSkeleton isMobile={true} />}>
        <PageContainer
          title={t('settings.page.title')}
          subtitle={t('settings.page.description')}
          className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-900/80'
        >
          {/* 设置分组卡片 */}
          <div className='space-y-6'>
            {settingGroups.map(group => (
              <div
                key={group.id}
                className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-sm'
              >
                {/* 分组标题 */}
                <div className='px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-50/30 dark:from-gray-700 dark:to-gray-700/30 border-b border-gray-100 dark:border-gray-700'>
                  <div className='flex items-center space-x-3'>
                    <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30'>
                      <span className='text-sm'>{group.icon}</span>
                    </div>
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
                      onClick={() => handleTabChange(item.id)}
                      className={`
                        w-full px-4 py-4 text-left transition-all duration-200 group
                        ${
                          activeTab === item.id
                            ? 'bg-gradient-to-r from-blue-50 to-blue-50/30 dark:from-blue-900/30 dark:to-blue-900/10'
                            : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-50/30 dark:hover:from-gray-700/30 dark:hover:to-gray-700/10'
                        }
                      `}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-3'>
                          <div
                            className={`
                            flex items-center justify-center w-10 h-10 rounded-xl transition-colors
                            ${
                              activeTab === item.id
                                ? 'bg-blue-100 dark:bg-blue-800/50'
                                : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                            }
                          `}
                          >
                            <span className='text-base'>{item.icon}</span>
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
                        <svg
                          className={`w-5 h-5 transition-colors ${
                            activeTab === item.id
                              ? 'text-blue-400'
                              : 'text-gray-400'
                          }`}
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M9 5l7 7-7 7'
                          />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 当前选中的设置内容 */}
          <div className='mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-sm'>
            <div className='p-6 bg-gradient-to-b from-white to-gray-50/30 dark:from-gray-800 dark:to-gray-800/50'>
              {renderTabContent()}
            </div>
          </div>
        </PageContainer>
      </TranslationLoader>
    )
  }

  // 桌面端两栏布局
  return (
    <TranslationLoader fallback={<SettingsPageSkeleton isMobile={false} />}>
      <PageContainer
        title={t('settings.page.title')}
        subtitle={t('settings.page.description')}
      >
        {/* 桌面端两栏布局 */}
        <div className='flex gap-8'>
          {/* 左侧导航栏 */}
          <SettingsNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            settingGroups={settingGroups}
          />

          {/* 右侧内容区域 */}
          <SettingsContent activeTab={activeTab} settingGroups={settingGroups}>
            {renderTabContent()}
          </SettingsContent>
        </div>
      </PageContainer>
    </TranslationLoader>
  )
}
