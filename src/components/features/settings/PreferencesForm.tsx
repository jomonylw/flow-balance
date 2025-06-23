'use client'

import { useState, useEffect } from 'react'
import type { UserSettings, Currency } from '@prisma/client'
import SelectField from '@/components/ui/forms/SelectField'
import ToggleSwitch from '@/components/ui/forms/ToggleSwitch'
import Slider from '@/components/ui/forms/Slider'
import { LoadingSpinnerSVG } from '@/components/ui/feedback/LoadingSpinner'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useTheme } from '@/contexts/providers/ThemeContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { Theme, Language } from '@/types/core/constants'
import { VALIDATION, ApiEndpoints } from '@/lib/constants'

interface PreferencesFormProps {
  userSettings: (UserSettings & { baseCurrency: Currency | null }) | null
  currencies: Currency[]
}

export default function PreferencesForm({
  userSettings,
  currencies, // eslint-disable-line @typescript-eslint/no-unused-vars
}: PreferencesFormProps) {
  const { t, setLanguage } = useLanguage()
  const { setTheme } = useTheme()
  const { currencies: userCurrencies, updateUserSettings, refreshAll } = useUserData()
  const [formData, setFormData] = useState({
    baseCurrencyId: userSettings?.baseCurrency?.id || '', // 使用货币ID
    dateFormat: userSettings?.dateFormat || 'YYYY-MM-DD',
    theme: userSettings?.theme || 'system',
    language: userSettings?.language || 'zh',
    fireEnabled: userSettings?.fireEnabled || false,
    fireSWR: userSettings?.fireSWR || 4.0,
    futureDataDays: userSettings?.futureDataDays || 7,
    autoUpdateExchangeRates: userSettings?.autoUpdateExchangeRates || false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // 初始化主题和语言设置（优先使用数据库设置，其次是localStorage）
    const savedTheme = localStorage.getItem('theme')
    const savedLanguage = localStorage.getItem('language')

    setFormData(prev => ({
      ...prev,
      theme: userSettings?.theme || savedTheme || 'system',
      language: userSettings?.language || savedLanguage || 'zh',
      fireEnabled: userSettings?.fireEnabled || false,
      fireSWR: userSettings?.fireSWR || 4.0,
      autoUpdateExchangeRates: userSettings?.autoUpdateExchangeRates || false,
    }))
  }, [userSettings])

  const dateFormatOptions = [
    { value: 'YYYY-MM-DD', label: '2024-01-01 (YYYY-MM-DD)' },
    { value: 'DD/MM/YYYY', label: '01/01/2024 (DD/MM/YYYY)' },
    { value: 'MM/DD/YYYY', label: '01/01/2024 (MM/DD/YYYY)' },
    { value: 'DD-MM-YYYY', label: '01-01-2024 (DD-MM-YYYY)' },
  ]

  const themeOptions = [
    { value: 'light', label: t('preferences.theme.light') },
    { value: 'dark', label: t('preferences.theme.dark') },
    { value: 'system', label: t('preferences.theme.system') },
  ]

  const languageOptions = [
    { value: 'zh', label: t('preferences.language.zh') },
    { value: 'en', label: t('preferences.language.en') },
  ]

  const currencyOptions = userCurrencies.map(currency => ({
    value: currency.id, // 使用货币ID作为选项值
    label: `${currency.symbol} ${currency.name} (${currency.code})`,
    id: currency.id,
  }))

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))

    // 清除消息
    if (message) setMessage('')
    if (error) setError('')
  }

  const handleToggleChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }))

    // 清除消息
    if (message) setMessage('')
    if (error) setError('')
  }

  const handleSliderChange = (name: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
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
      const response = await fetch(ApiEndpoints.user.SETTINGS, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(t('settings.preferences.updated'))

        // 更新UserDataContext中的用户设置
        if (data.data?.userSettings) {
          updateUserSettings(data.data.userSettings)

          // 如果更新了本位币，需要刷新所有相关数据
          const oldBaseCurrencyId = userSettings?.baseCurrency?.id
          const newBaseCurrencyId = data.data.userSettings.baseCurrency?.id
          if (oldBaseCurrencyId !== newBaseCurrencyId) {
            // 本位币发生变化，刷新所有数据以确保汇率、余额等数据正确更新
            await refreshAll()
          }
        }

        // 应用主题设置
        if (formData.theme) {
          setTheme(formData.theme as Theme)
        }

        // 应用语言设置
        if (formData.language) {
          setLanguage(formData.language as Language)
        }
      } else {
        setError(data.error || t('settings.update.failed'))
      }
    } catch (error) {
      console.error('Update preferences error:', error)
      setError(t('error.network'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* 消息提示 */}
      {message && (
        <div className='bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg'>
          <div className='flex items-center'>
            <svg
              className='w-5 h-5 mr-2'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                clipRule='evenodd'
              />
            </svg>
            {message}
          </div>
        </div>
      )}

      {error && (
        <div className='bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg'>
          <div className='flex items-center'>
            <svg
              className='w-5 h-5 mr-2'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                clipRule='evenodd'
              />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* 外观设置 */}
      <div>
        <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
          {t('preferences.appearance.settings')}
        </h3>
        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          {t('preferences.appearance.description')}
        </p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <SelectField
            name='theme'
            label={t('preferences.theme.setting')}
            value={formData.theme}
            onChange={handleSelectChange}
            options={themeOptions}
            help={t('preferences.theme.help')}
          />

          <SelectField
            name='language'
            label={t('preferences.language.setting')}
            value={formData.language}
            onChange={handleSelectChange}
            options={languageOptions}
            help={t('preferences.language.help')}
          />

          {/* 货币设置 */}
          <div className='pt-6'>
            <h4 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-3'>
              {t('preferences.currency.settings')}
            </h4>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              {t('preferences.currency.settings.description')}
            </p>
          </div>

          <div className='space-y-4'>
            <SelectField
              name='baseCurrencyId'
              label={t('preferences.base.currency')}
              value={formData.baseCurrencyId}
              onChange={handleSelectChange}
              options={currencyOptions}
              help={t('preferences.base.currency.help')}
            />

            {userCurrencies.length === 0 && (
              <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
                <div className='flex items-start'>
                  <svg
                    className='w-5 h-5 text-yellow-600 mr-2 mt-0.5'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <div>
                    <p className='text-sm font-medium text-yellow-800'>
                      {t('preferences.currency.setup.needed')}
                    </p>
                    <p className='text-sm text-yellow-700 mt-1'>
                      {t('preferences.currency.setup.description')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <SelectField
              name='dateFormat'
              label={t('preferences.date.format')}
              value={formData.dateFormat}
              onChange={handleSelectChange}
              options={dateFormatOptions}
              help={t('preferences.date.format.help')}
            />

            {/* <ToggleSwitch
              name='autoUpdateExchangeRates'
              label={t('exchange.rate.auto.update')}
              checked={formData.autoUpdateExchangeRates}
              onChange={checked =>
                handleToggleChange('autoUpdateExchangeRates', checked)
              }
              help={t('exchange.rate.auto.update.description')}
              disabled={!formData.baseCurrencyId}
            /> */}
          </div>

          {/* FIRE 设置 */}
          <div className='pt-6'>
            <h4 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-3'>
              {t('preferences.fire.settings')}
            </h4>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              {t('preferences.fire.settings.description')}
            </p>
          </div>

          <div className='space-y-4'>
            <ToggleSwitch
              name='fireEnabled'
              label={t('preferences.fire.enabled')}
              checked={formData.fireEnabled}
              onChange={checked => handleToggleChange('fireEnabled', checked)}
              help={t('preferences.fire.enabled.help')}
            />

            {formData.fireEnabled && (
              <Slider
                name='fireSWR'
                label={t('preferences.fire.swr')}
                value={formData.fireSWR}
                onChange={value => handleSliderChange('fireSWR', value)}
                min={VALIDATION.FIRE_SWR_MIN}
                max={VALIDATION.FIRE_SWR_MAX}
                step={VALIDATION.FIRE_SWR_STEP}
                help={t('preferences.fire.swr.help')}
                formatValue={value => `${value.toFixed(1)}%`}
              />
            )}
          </div>

          {/* 数据生成设置 */}
          <div className='pt-6'>
            <h4 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-3'>
              {t('preferences.data.generation.settings')}
            </h4>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              {t('preferences.data.generation.description')}
            </p>
          </div>

          <div className='space-y-4'>
            <Slider
              name='futureDataDays'
              label={t('preferences.future.data.days')}
              value={formData.futureDataDays}
              onChange={value => handleSliderChange('futureDataDays', value)}
              min={VALIDATION.FUTURE_DATA_DAYS_MIN}
              max={VALIDATION.FUTURE_DATA_DAYS_MAX}
              step={VALIDATION.FUTURE_DATA_DAYS_STEP}
              help={t('preferences.future.data.days.help')}
              formatValue={value =>
                value === 0
                  ? t('preferences.future.data.days.disabled')
                  : `${value} ${t('common.days')}`
              }
            />
          </div>

          {/* 本位币说明 */}
          <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4'>
            <h4 className='text-sm font-medium text-blue-800 dark:text-blue-200 mb-3'>
              {t('preferences.about.base.currency')}
            </h4>
            <div className='text-sm text-blue-700 dark:text-blue-300 space-y-2'>
              <p>{t('preferences.base.currency.description')}</p>
              <p>{t('preferences.multi.currency.note')}</p>
              <p className='font-medium'>
                {t('preferences.base.currency.recommendation')}
              </p>
            </div>
          </div>

          {/* FIRE 说明 */}
          {formData.fireEnabled && (
            <div className='bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4'>
              <h4 className='text-sm font-medium text-orange-800 dark:text-orange-200 mb-3'>
                {t('preferences.fire.about')}
              </h4>
              <div className='text-sm text-orange-700 dark:text-orange-300 space-y-2'>
                <p>{t('preferences.fire.description')}</p>
                <p>{t('preferences.fire.swr.description')}</p>
                <p>{t('preferences.fire.swr.default.explanation')}</p>
                <p className='font-medium'>
                  {t('preferences.fire.swr.range.note')}
                </p>
              </div>
            </div>
          )}

          <div className='pt-4'>
            <button
              type='submit'
              disabled={isLoading}
              className='px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? (
                <span className='flex items-center'>
                  <LoadingSpinnerSVG size='sm' color='white' className='-ml-1 mr-2' />
                  {t('common.loading')}
                </span>
              ) : (
                t('common.save')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
