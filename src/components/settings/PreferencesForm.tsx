'use client'

import { useState, useEffect } from 'react'
import { UserSettings, Currency } from '@prisma/client'
import SelectField from '@/components/ui/SelectField'

interface PreferencesFormProps {
  userSettings: (UserSettings & { baseCurrency: Currency }) | null
  currencies: Currency[]
}

export default function PreferencesForm({ userSettings, currencies }: PreferencesFormProps) {
  const [formData, setFormData] = useState({
    baseCurrencyCode: userSettings?.baseCurrencyCode || '',
    dateFormat: userSettings?.dateFormat || 'YYYY-MM-DD',
    theme: (userSettings as any)?.theme || 'system',
    language: (userSettings as any)?.language || 'zh'
  })
  const [userCurrencies, setUserCurrencies] = useState<Currency[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUserCurrencies()

    // 初始化主题和语言设置（优先使用数据库设置，其次是localStorage）
    const savedTheme = localStorage.getItem('theme')
    const savedLanguage = localStorage.getItem('language')

    setFormData(prev => ({
      ...prev,
      theme: (userSettings as any)?.theme || savedTheme || 'system',
      language: (userSettings as any)?.language || savedLanguage || 'zh'
    }))
  }, [userSettings])

  const fetchUserCurrencies = async () => {
    try {
      const response = await fetch('/api/user/currencies')
      if (response.ok) {
        const data = await response.json()
        setUserCurrencies(data.data.currencies)
      }
    } catch (error) {
      console.error('获取用户货币失败:', error)
    }
  }

  const dateFormatOptions = [
    { value: 'YYYY-MM-DD', label: '2024-01-01 (YYYY-MM-DD)' },
    { value: 'DD/MM/YYYY', label: '01/01/2024 (DD/MM/YYYY)' },
    { value: 'MM/DD/YYYY', label: '01/01/2024 (MM/DD/YYYY)' },
    { value: 'DD-MM-YYYY', label: '01-01-2024 (DD-MM-YYYY)' }
  ]

  const themeOptions = [
    { value: 'light', label: '明亮模式' },
    { value: 'dark', label: '深色模式' },
    { value: 'system', label: '跟随系统' }
  ]

  const languageOptions = [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' }
  ]

  const currencyOptions = userCurrencies.map(currency => ({
    value: currency.code,
    label: `${currency.symbol} ${currency.name} (${currency.code})`
  }))

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // 清除消息
    if (message) setMessage('')
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('偏好设置更新成功')

        // 应用主题设置
        if (formData.theme) {
          const root = document.documentElement
          if (formData.theme === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            root.classList.toggle('dark', systemPrefersDark)
          } else {
            root.classList.toggle('dark', formData.theme === 'dark')
          }
          localStorage.setItem('theme', formData.theme)
        }

        // 应用语言设置
        if (formData.language) {
          localStorage.setItem('language', formData.language)
          // 这里可以添加实际的语言切换逻辑
        }
      } else {
        setError(data.error || '更新失败')
      }
    } catch (error) {
      console.error('Update preferences error:', error)
      setError('网络错误，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 消息提示 */}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {message}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* 外观设置 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <span className="mr-2">🎨</span>
            外观设置
          </h3>
          <p className="text-sm text-gray-600 mt-1">配置主题和语言偏好</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField
            name="theme"
            label="主题设置"
            value={formData.theme}
            onChange={handleSelectChange}
            options={themeOptions}
            help="选择您偏好的主题模式。设置后将作为默认选项。"
          />

          <SelectField
            name="language"
            label="语言设置"
            value={formData.language}
            onChange={handleSelectChange}
            options={languageOptions}
            help="选择界面显示语言。设置后将作为默认选项。"
          />

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </span>
              ) : (
                '保存设置'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 货币设置 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <span className="mr-2">💰</span>
            货币设置
          </h3>
          <p className="text-sm text-gray-600 mt-1">配置您的主要货币和显示偏好</p>
        </div>

        <div className="space-y-4">
          <SelectField
            name="baseCurrencyCode"
            label="本位币"
            value={formData.baseCurrencyCode}
            onChange={handleSelectChange}
            options={currencyOptions}
            help="选择您的主要货币，用于汇总和报告。只能从您的可用货币中选择。"
          />

          {userCurrencies.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">需要设置可用货币</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    您还没有设置可用货币。请先在"货币管理"页面添加您需要使用的货币。
                  </p>
                </div>
              </div>
            </div>
          )}

          <SelectField
            name="dateFormat"
            label="日期格式"
            value={formData.dateFormat}
            onChange={handleSelectChange}
            options={dateFormatOptions}
            help="选择您偏好的日期显示格式"
          />
        </div>
      </div>

      {/* 本位币说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
        <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
          <span className="mr-2">ℹ️</span>
          关于本位币
        </h4>
        <div className="text-sm text-blue-700 space-y-2">
          <p>
            本位币是您的主要货币，用于计算净资产和生成财务报告。
          </p>
          <p>
            如果您有多种货币的账户，系统会自动进行汇率转换来统一显示。
          </p>
          <p className="font-medium">
            建议选择您最常使用的货币作为本位币。
          </p>
        </div>
      </div>

      {/* 设置说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
        <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
          <span className="mr-2">ℹ️</span>
          设置说明
        </h4>
        <div className="text-sm text-blue-700 space-y-2">
          <p>
            <strong>主题设置：</strong>选择您偏好的界面主题。"跟随系统"会根据您的设备设置自动切换。
          </p>
          <p>
            <strong>语言设置：</strong>选择界面显示语言。目前支持中文和英文。
          </p>
          <p>
            <strong>本位币：</strong>用于计算净资产和生成财务报告的主要货币。
          </p>
          <p className="font-medium">
            这些设置将作为您的默认偏好保存，与页面顶部的临时设置不同。
          </p>
        </div>
      </div>
    </div>
  )
}
