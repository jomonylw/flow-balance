'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { User, UserSettings, Currency } from '@prisma/client'
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

export default function UserSettingsPage({
  user,
  userSettings,
  currencies
}: UserSettingsPageProps) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>('profile')

  useEffect(() => {
    // 检查URL参数中是否指定了标签页
    const tab = searchParams.get('tab') as TabType
    if (tab && ['profile', 'security', 'preferences', 'currencies', 'exchange-rates', 'tags', 'data'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const tabs = [
    { id: 'profile' as TabType, label: '个人资料', icon: '👤' },
    { id: 'security' as TabType, label: '安全设置', icon: '🔒' },
    { id: 'preferences' as TabType, label: '偏好设置', icon: '⚙️' },
    { id: 'currencies' as TabType, label: '货币管理', icon: '💰' },
    { id: 'exchange-rates' as TabType, label: '汇率管理', icon: '💱' },
    { id: 'tags' as TabType, label: '标签管理', icon: '🏷️' },
    { id: 'data' as TabType, label: '数据管理', icon: '📊' }
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

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">账户设置</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">管理您的个人资料、安全设置和偏好</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        {/* 标签页导航 */}
        <div className="border-b border-gray-200">
          {/* 桌面端导航 */}
          <nav className="hidden sm:flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          {/* 移动端下拉选择 */}
          <div className="sm:hidden px-4 py-3">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as TabType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.icon} {tab.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 标签页内容 */}
        <div className="p-4 sm:p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
