'use client'

import { useState } from 'react'
import { User, UserSettings, Currency } from '@prisma/client'
import ProfileSettingsForm from './ProfileSettingsForm'
import ChangePasswordForm from './ChangePasswordForm'
import PreferencesForm from './PreferencesForm'
import DataManagementSection from './DataManagementSection'

interface UserSettingsPageProps {
  user: User
  userSettings: (UserSettings & { baseCurrency: Currency }) | null
  currencies: Currency[]
}

type TabType = 'profile' | 'security' | 'preferences' | 'data'

export default function UserSettingsPage({ 
  user, 
  userSettings, 
  currencies 
}: UserSettingsPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile')

  const tabs = [
    { id: 'profile' as TabType, label: '个人资料', icon: '👤' },
    { id: 'security' as TabType, label: '安全设置', icon: '🔒' },
    { id: 'preferences' as TabType, label: '偏好设置', icon: '⚙️' },
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
      case 'data':
        return <DataManagementSection />
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">账户设置</h1>
        <p className="text-gray-600 mt-2">管理您的个人资料、安全设置和偏好</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        {/* 标签页导航 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
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
        </div>

        {/* 标签页内容 */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
