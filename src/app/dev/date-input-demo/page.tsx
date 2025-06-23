'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserData } from '@/contexts/providers/UserDataContext'
import { Language } from '@/types/core/constants'
import DateInput from '@/components/ui/forms/DateInput'
import InputField from '@/components/ui/forms/InputField'

export default function DateInputDemoPage() {
  const { t, language, setLanguage } = useLanguage()
  const { userSettings, updateUserSettings } = useUserData()

  // 表单状态
  const [formData, setFormData] = useState({
    transactionDate: '',
    startDate: '',
    endDate: '',
    birthDate: '',
    contractDate: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))

    // 清除错误
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  // 切换语言
  const toggleLanguage = () => {
    setLanguage(language === Language.ZH ? Language.EN : Language.ZH)
  }

  // 切换日期格式
  const changeDateFormat = (format: string) => {
    if (userSettings) {
      updateUserSettings({
        ...userSettings,
        dateFormat: format,
      })
    }
  }

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.transactionDate) {
      newErrors.transactionDate = t('form.required')
    }

    if (!formData.startDate) {
      newErrors.startDate = t('form.required')
    }

    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate > formData.endDate
    ) {
      newErrors.endDate = '结束日期不能早于开始日期'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      alert('表单验证通过！\n' + JSON.stringify(formData, null, 2))
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
      <div className='max-w-4xl mx-auto px-4'>
        {/* 页面标题 */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
            DateInput 组件演示
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>
            展示国际化日期输入组件的各种功能和效果
          </p>
        </div>

        {/* 翻译测试面板 */}
        <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6'>
          <h2 className='text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2'>
            🔍 翻译键测试
          </h2>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
            <div>
              <span className='text-yellow-700 dark:text-yellow-300'>
                form.date.calendar.year:
              </span>
              <span className='ml-2 font-mono bg-yellow-100 dark:bg-yellow-800 px-1 rounded'>
                &ldquo;{t('form.date.calendar.year')}&rdquo;
              </span>
            </div>
            <div>
              <span className='text-yellow-700 dark:text-yellow-300'>
                form.date.calendar.month:
              </span>
              <span className='ml-2 font-mono bg-yellow-100 dark:bg-yellow-800 px-1 rounded'>
                &ldquo;{t('form.date.calendar.month')}&rdquo;
              </span>
            </div>
            <div>
              <span className='text-yellow-700 dark:text-yellow-300'>
                common.date.today:
              </span>
              <span className='ml-2 font-mono bg-yellow-100 dark:bg-yellow-800 px-1 rounded'>
                &ldquo;{t('common.date.today')}&rdquo;
              </span>
            </div>
            <div>
              <span className='text-yellow-700 dark:text-yellow-300'>
                common.clear:
              </span>
              <span className='ml-2 font-mono bg-yellow-100 dark:bg-yellow-800 px-1 rounded'>
                &ldquo;{t('common.clear')}&rdquo;
              </span>
            </div>
          </div>
        </div>

        {/* 控制面板 */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4'>
            控制面板
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* 语言切换 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                当前语言: {language === Language.ZH ? '中文' : 'English'}
              </label>
              <button
                onClick={toggleLanguage}
                className='px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors'
              >
                切换到 {language === Language.ZH ? 'English' : '中文'}
              </button>
            </div>

            {/* 日期格式切换 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                当前日期格式: {userSettings?.dateFormat || 'YYYY-MM-DD'}
              </label>
              <div className='flex flex-wrap gap-2'>
                {['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY'].map(
                  format => (
                    <button
                      key={format}
                      onClick={() => changeDateFormat(format)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        userSettings?.dateFormat === format
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      {format}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 演示表单 */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6'>
            日期输入组件演示
          </h2>

          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* 使用新的自定义 DateInput 组件 */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <DateInput
                name='transactionDate'
                label='交易日期 (自定义日历)'
                value={formData.transactionDate}
                onChange={handleInputChange}
                error={errors.transactionDate}
                required
                showFormatHint={true}
                showCalendar={true}
                help='完全自定义的日期选择器，支持日历弹出'
              />

              <DateInput
                name='startDate'
                label='开始日期 (带时间选择)'
                value={formData.startDate}
                onChange={handleInputChange}
                error={errors.startDate}
                required
                showFormatHint={true}
                showCalendar={true}
                showTime={true}
                help='支持时间选择的日期输入'
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <DateInput
                name='endDate'
                label='结束日期 (仅输入框)'
                value={formData.endDate}
                onChange={handleInputChange}
                error={errors.endDate}
                showFormatHint={true}
                showCalendar={false}
                help='禁用日历弹出，仅支持手动输入'
              />

              <DateInput
                name='birthDate'
                label='出生日期 (隐藏格式提示)'
                value={formData.birthDate}
                onChange={handleInputChange}
                showFormatHint={false}
                showCalendar={true}
                help='隐藏格式提示的日期选择器'
              />
            </div>

            {/* 对比：使用原来的 InputField 组件 */}
            <div className='border-t pt-6'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-4'>
                对比：原来的 InputField 组件
              </h3>

              <InputField
                type='date'
                name='contractDate'
                label='合同日期 (InputField)'
                value={formData.contractDate}
                onChange={handleInputChange}
                help='这是使用原来 InputField 组件的日期输入'
              />
            </div>

            {/* 提交按钮 */}
            <div className='flex justify-end space-x-4 pt-6'>
              <button
                type='button'
                onClick={() => {
                  setFormData({
                    transactionDate: '',
                    startDate: '',
                    endDate: '',
                    birthDate: '',
                    contractDate: '',
                  })
                  setErrors({})
                }}
                className='px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors'
              >
                清空表单
              </button>

              <button
                type='submit'
                className='px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors'
              >
                提交表单
              </button>
            </div>
          </form>

          {/* 当前表单数据显示 */}
          <div className='mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-md'>
            <h3 className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-2'>
              当前表单数据:
            </h3>
            <pre className='text-xs text-gray-600 dark:text-gray-400 overflow-x-auto'>
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        </div>

        {/* 功能说明 */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4'>
            功能特性
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <h3 className='font-medium text-gray-900 dark:text-gray-100 mb-2'>
                ✅ 自定义DateInput功能
              </h3>
              <ul className='text-sm text-gray-600 dark:text-gray-400 space-y-1'>
                <li>• 🌐 完整的国际化支持（中英文界面）</li>
                <li>• 🎨 明暗主题自动适配</li>
                <li>• 📅 自定义日历弹出选择器</li>
                <li>• 🗓️ 快速年月选择功能</li>
                <li>• ⏰ 可选的时间选择功能</li>
                <li>• 📝 多种日期格式支持</li>
                <li>• 🎯 智能格式提示和验证</li>
                <li>• 📱 完全响应式设计</li>
                <li>• ⌨️ 键盘输入和日历点击双支持</li>
                <li>• 🔄 多级视图切换（年→月→日）</li>
              </ul>
            </div>

            <div>
              <h3 className='font-medium text-gray-900 dark:text-gray-100 mb-2'>
                🎯 测试要点
              </h3>
              <ul className='text-sm text-gray-600 dark:text-gray-400 space-y-1'>
                <li>• 点击日历图标打开日期选择器</li>
                <li>• 🆕 点击月份标题进入年月选择模式</li>
                <li>• 🆕 测试年份选择器（10年一页）</li>
                <li>• 🆕 测试月份选择器（12个月网格）</li>
                <li>• 切换月份和选择具体日期</li>
                <li>• 测试时间选择功能</li>
                <li>• 手动输入日期格式验证</li>
                <li>• 🆕 切换语言查看月份名称国际化</li>
                <li>• 切换日期格式查看效果</li>
                <li>• 测试&ldquo;今天&rdquo;和&ldquo;清除&rdquo;快捷操作</li>
                <li>• 验证主题切换适配</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
