'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface FireParams {
  retirementExpenses: number
  safeWithdrawalRate: number
  currentInvestableAssets: number
  expectedAnnualReturn: number
  monthlyInvestment: number
}

interface Currency {
  code: string
  symbol: string
  name: string
}

interface CockpitControlsProps {
  params: FireParams
  currency: Currency
  onChange: (param: string, value: number) => void
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
}) => (
  <div id={id} className="transition-all duration-300">
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    <div className="flex items-center space-x-4">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
      />
      <div className="flex items-center space-x-2">
        <input
          type="number"
          value={value}
          onChange={e => onInputChange(e.target.value)}
          step={step}
          min={min}
          max={max}
          className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
      </div>
    </div>
  </div>
)

const ControlInput = ({
  id,
  label,
  description,
  value,
  onChange,
}: {
  id: string
  label: string
  description: string
  value: number
  onChange: (value: string) => void
}) => (
  <div id={id} className="transition-all duration-300">
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    <div className="flex items-center space-x-4">
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      />
    </div>
  </div>
)

export default function CockpitControls({
  params,
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
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('fire.cockpit.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('fire.cockpit.subtitle')}
        </p>
      </div>

      <div className="space-y-6">
        <ControlSlider
          id="cockpit-retirementExpenses"
          label={t('fire.cockpit.retirement.expenses')}
          description={t('fire.cockpit.retirement.expenses.description')}
          min={100000}
          max={1000000}
          step={10000}
          value={params.retirementExpenses}
          unit={t('fire.units.per.year')}
          onChange={value => handleSliderChange('retirementExpenses', value)}
          onInputChange={value => handleInputChange('retirementExpenses', value)}
        />

        <ControlSlider
          id="cockpit-safeWithdrawalRate"
          label={t('fire.cockpit.safe.withdrawal.rate')}
          description={t('fire.cockpit.safe.withdrawal.rate.description')}
          min={1.0}
          max={10.0}
          step={0.1}
          value={params.safeWithdrawalRate}
          unit="%"
          onChange={value => handleSliderChange('safeWithdrawalRate', value)}
          onInputChange={value => handleInputChange('safeWithdrawalRate', value)}
        />

        <ControlInput
          id="cockpit-currentInvestableAssets"
          label={t('fire.cockpit.current.investable.assets')}
          description={t(
            'fire.cockpit.current.investable.assets.description',
          )}
          value={params.currentInvestableAssets}
          onChange={value =>
            handleInputChange('currentInvestableAssets', value)
          }
        />

        <ControlSlider
          id="cockpit-expectedAnnualReturn"
          label={t('fire.cockpit.expected.annual.return')}
          description={t('fire.cockpit.expected.annual.return.description')}
          min={2}
          max={15}
          step={0.1}
          value={params.expectedAnnualReturn}
          unit="%"
          onChange={value => handleSliderChange('expectedAnnualReturn', value)}
          onInputChange={value =>
            handleInputChange('expectedAnnualReturn', value)
          }
        />

        <ControlSlider
          id="cockpit-monthlyInvestment"
          label={t('fire.cockpit.monthly.investment')}
          description={t('fire.cockpit.monthly.investment.description')}
          min={1000}
          max={50000}
          step={1000}
          value={params.monthlyInvestment}
          unit={t('fire.units.per.month')}
          onChange={value => handleSliderChange('monthlyInvestment', value)}
          onInputChange={value => handleInputChange('monthlyInvestment', value)}
        />
      </div>

      <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/50 border border-orange-200 dark:border-orange-700/50 rounded-lg">
        <p className="text-sm text-orange-800 dark:text-orange-200 text-center">
          {t('fire.cockpit.magic.description')}
        </p>
      </div>
    </div>
  )
}
