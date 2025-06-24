'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useState, useEffect } from 'react'
import Slider from '@/components/ui/forms/Slider'
import type { SimpleCurrency, FireParams } from '@/types/core'

interface CockpitControlsProps {
  params: FireParams
  currency: SimpleCurrency
  onChange: (param: string, value: number) => void
}

// 可编辑的货币输入组件
const EditableCurrencyInput = ({
  value,
  onChange,
  currency,
  className = '',
  step: _step,
  min: _min,
  max: _max,
  ...props
}: {
  value: number
  onChange: (value: string) => void
  currency: SimpleCurrency
  className?: string
  step?: number
  min?: number
  max?: number
  [key: string]: unknown
}) => {
  const { formatNumber } = useUserCurrencyFormatter()
  const [isEditing, setIsEditing] = useState(false)
  const [displayValue, setDisplayValue] = useState('')

  // 更新显示值
  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(formatNumber(value, currency.code))
    }
  }, [value, currency.code, formatNumber, isEditing])

  const handleFocus = () => {
    setIsEditing(true)
    setDisplayValue(value.toString())
  }

  const handleBlur = () => {
    setIsEditing(false)
    onChange(displayValue)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  return (
    <input
      type={isEditing ? 'number' : 'text'}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${className} ${isEditing ? 'text-blue-600 dark:text-blue-400' : ''}`}
      {...props}
    />
  )
}

const ControlSlider = ({
  id,
  label,
  description,
  min,
  max,
  step,
  value,
  unit,
  onChange,
  onInputChange,
  currency,
}: {
  id: string
  label: string
  description: string
  min: number
  max: number
  step: number
  value: number
  unit: string
  onChange: (value: string) => void
  onInputChange: (value: string) => void
  currency?: SimpleCurrency
}) => {
  const { formatNumber } = useUserCurrencyFormatter()

  // 格式化函数，用于 Slider 组件
  const formatValue = (val: number) => {
    if (currency) {
      return formatNumber(val, currency.code)
    }
    return `${val}${unit}`
  }

  const handleSliderChange = (val: number) => {
    onChange(val.toString())
  }

  return (
    <div id={id} className='transition-all duration-300'>
      <div className='mb-3'>
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
          {label}
        </label>
        <p className='text-xs text-gray-500 dark:text-gray-400'>
          {description}
        </p>
      </div>
      <div className='flex items-center space-x-4'>
        {/* 使用统一的 Slider 组件，但只显示滑块部分 */}
        <div className='flex-1'>
          <Slider
            name={`${id}-slider`}
            label=''
            value={value}
            onChange={handleSliderChange}
            min={min}
            max={max}
            step={step}
            formatValue={formatValue}
            className='[&>div:first-child]:hidden [&>div:last-child]:hidden [&>div:nth-child(3)]:hidden'
          />
        </div>
        <div className='flex items-center space-x-2'>
          {currency ? (
            <EditableCurrencyInput
              value={value}
              onChange={onInputChange}
              currency={currency}
              step={step}
              min={min}
              max={max}
              className='w-32 h-9 px-3 py-2 border border-gray-300 rounded-md text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
            />
          ) : (
            <input
              type='number'
              value={value}
              onChange={e => onInputChange(e.target.value)}
              step={step}
              min={min}
              max={max}
              className='w-32 h-9 px-3 py-2 border border-gray-300 rounded-md text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
            />
          )}
          <span className='text-sm text-gray-500 dark:text-gray-400'>
            {unit}
          </span>
        </div>
      </div>
    </div>
  )
}

const ControlInput = ({
  id,
  label,
  description,
  value,
  onChange,
  currency,
}: {
  id: string
  label: string
  description: string
  value: number
  onChange: (value: string) => void
  currency?: SimpleCurrency
}) => {
  return (
    <div id={id} className='transition-all duration-300'>
      <div className='mb-3'>
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
          {label}
        </label>
        <p className='text-xs text-gray-500 dark:text-gray-400'>
          {description}
        </p>
      </div>
      {currency ? (
        <EditableCurrencyInput
          value={value}
          onChange={onChange}
          currency={currency}
          className='w-full h-9 px-3 py-2 border border-gray-300 rounded-md text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
        />
      ) : (
        <input
          type='number'
          value={value}
          onChange={e => onChange(e.target.value)}
          className='w-full h-9 px-3 py-2 border border-gray-300 rounded-md text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
        />
      )}
    </div>
  )
}

export default function CockpitControls({
  params,
  currency,
  onChange,
}: CockpitControlsProps) {
  const { t } = useLanguage()

  const handleSliderChange = (param: string, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      onChange(param, numValue)
    }
  }

  const handleInputChange = (param: string, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      onChange(param, numValue)
    }
  }

  return (
    <div className='bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6'>
      <div className='mb-6 text-center'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
          {t('fire.cockpit.title')}
        </h2>
        <p className='text-gray-600 dark:text-gray-400'>
          {t('fire.cockpit.subtitle')}
        </p>
      </div>

      <div className='space-y-6'>
        <ControlSlider
          id='cockpit-retirementExpenses'
          label={t('fire.cockpit.retirement.expenses')}
          description={t('fire.cockpit.retirement.expenses.description')}
          min={100000}
          max={1000000}
          step={10000}
          value={params.retirementExpenses}
          unit={t('fire.units.per.year')}
          currency={currency}
          onChange={value => handleSliderChange('retirementExpenses', value)}
          onInputChange={value =>
            handleInputChange('retirementExpenses', value)
          }
        />

        <ControlSlider
          id='cockpit-safeWithdrawalRate'
          label={t('fire.cockpit.safe.withdrawal.rate')}
          description={t('fire.cockpit.safe.withdrawal.rate.description')}
          min={1.0}
          max={10.0}
          step={0.1}
          value={params.safeWithdrawalRate}
          unit='%'
          onChange={value => handleSliderChange('safeWithdrawalRate', value)}
          onInputChange={value =>
            handleInputChange('safeWithdrawalRate', value)
          }
        />

        <ControlInput
          id='cockpit-currentInvestableAssets'
          label={t('fire.cockpit.current.investable.assets')}
          description={t('fire.cockpit.current.investable.assets.description')}
          value={params.currentInvestableAssets}
          currency={currency}
          onChange={value =>
            handleInputChange('currentInvestableAssets', value)
          }
        />

        <ControlSlider
          id='cockpit-expectedAnnualReturn'
          label={t('fire.cockpit.expected.annual.return')}
          description={t('fire.cockpit.expected.annual.return.description')}
          min={2}
          max={15}
          step={0.1}
          value={params.expectedAnnualReturn}
          unit='%'
          onChange={value => handleSliderChange('expectedAnnualReturn', value)}
          onInputChange={value =>
            handleInputChange('expectedAnnualReturn', value)
          }
        />

        <ControlSlider
          id='cockpit-monthlyInvestment'
          label={t('fire.cockpit.monthly.investment')}
          description={t('fire.cockpit.monthly.investment.description')}
          min={1000}
          max={50000}
          step={1000}
          value={params.monthlyInvestment}
          unit={t('fire.units.per.month')}
          currency={currency}
          onChange={value => handleSliderChange('monthlyInvestment', value)}
          onInputChange={value => handleInputChange('monthlyInvestment', value)}
        />
      </div>

      {/* <div className='mt-6 p-4 bg-orange-50 dark:bg-orange-900/50 border border-orange-200 dark:border-orange-700/50 rounded-lg'>
        <p className='text-sm text-orange-800 dark:text-orange-200 text-center'>
          {t('fire.cockpit.magic.description')}
        </p>
      </div> */}
    </div>
  )
}
