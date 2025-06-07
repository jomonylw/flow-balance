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

interface UserSettingsPageProps {
  user: User
  userSettings: (UserSettings & { baseCurrency: Currency }) | null
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
      title: '个人设置',
      description: '管理您的个人资料和账户安全',
      icon: '👤',
      items: [
        {
          id: 'profile',
          label: '个人资料',
          description: '更新您的基本信息',
          icon: '👤',
          status: user.email ? 'complete' : 'incomplete'
        },
        {
          id: 'security',
          label: '安全设置',
          description: '修改密码和安全选项',
          icon: '🔒'
        },
        {
          id: 'preferences',
          label: '偏好设置',
          description: '设置本位币和日期格式',
          icon: '⚙️',
          status: userSettings?.baseCurrencyCode ? 'complete' : 'warning'
        },
        {
          id: 'currencies',
          label: '货币管理',
          description: '管理可用的货币类型',
          icon: '💰'
        },
        {
          id: 'exchange-rates',
          label: '汇率管理',
          description: '设置和更新汇率信息',
          icon: '💱'
        },
        {
          id: 'tags',
          label: '标签管理',
          description: '创建和管理交易标签',
          icon: '🏷️'
        },
        {
          id: 'data',
          label: '数据管理',
          description: '导出数据或删除账户',
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
            <h1 className="text-2xl font-bold text-gray-900">账户设置</h1>
            <p className="text-sm text-gray-600 mt-1">管理您的个人资料、安全设置和偏好</p>
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
        <h1 className="text-3xl font-bold text-gray-900">账户设置</h1>
        <p className="text-base text-gray-600 mt-2">管理您的个人资料、安全设置和偏好</p>
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
            <h4 className="text-sm font-medium text-gray-900 mb-3">快捷操作</h4>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('preferences')}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                ⚙️ 系统偏好
              </button>
              <button
                onClick={() => setActiveTab('currencies')}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                💰 管理货币
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                🔒 修改密码
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
                          currentItem.status === 'complete' ? '已完成' :
                          currentItem.status === 'warning' ? '需要注意' :
                          currentItem.status === 'incomplete' ? '未完成' : ''
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
