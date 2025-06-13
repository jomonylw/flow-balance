'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { formatCurrency } from '@/lib/utils'

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

export default function CockpitControls({ params, currency, onChange }: CockpitControlsProps) {
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
      {/* 标题 */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('fire.cockpit.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('fire.cockpit.subtitle')}
        </p>
      </div>

      <div className="space-y-8">
        {/* P1: 退休后年开销 */}
        <div id="cockpit-retirementExpenses" className="transition-all duration-300 rounded-lg p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('fire.cockpit.retirement.expenses')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t('fire.cockpit.retirement.expenses.description')}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="100000"
              max="1000000"
              step="10000"
              value={params.retirementExpenses}
              onChange={(e) => handleSliderChange('retirementExpenses', e.target.value)}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={params.retirementExpenses}
                onChange={(e) => handleInputChange('retirementExpenses', e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('fire.units.per.year')}
              </span>
            </div>
          </div>
        </div>

        {/* P2: 安全提取率 */}
        <div id="cockpit-safeWithdrawalRate" className="transition-all duration-300 rounded-lg p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('fire.cockpit.safe.withdrawal.rate')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t('fire.cockpit.safe.withdrawal.rate.description')}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.1"
              value={params.safeWithdrawalRate}
              onChange={(e) => handleSliderChange('safeWithdrawalRate', e.target.value)}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={params.safeWithdrawalRate}
                onChange={(e) => handleInputChange('safeWithdrawalRate', e.target.value)}
                step="0.1"
                min="1.0"
                max="10.0"
                className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
            </div>
          </div>
        </div>

        {/* P3: 当前可投资资产 */}
        <div id="cockpit-currentInvestableAssets" className="transition-all duration-300 rounded-lg p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('fire.cockpit.current.investable.assets')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t('fire.cockpit.current.investable.assets.description')}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <input
              type="number"
              value={params.currentInvestableAssets}
              onChange={(e) => handleInputChange('currentInvestableAssets', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <button className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-md transition-colors">
              ⚙️ {t('fire.cockpit.configure')}
            </button>
          </div>
        </div>

        {/* P4: 预期年化回报率 */}
        <div id="cockpit-expectedAnnualReturn" className="transition-all duration-300 rounded-lg p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('fire.cockpit.expected.annual.return')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t('fire.cockpit.expected.annual.return.description')}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="2"
              max="15"
              step="0.1"
              value={params.expectedAnnualReturn}
              onChange={(e) => handleSliderChange('expectedAnnualReturn', e.target.value)}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={params.expectedAnnualReturn}
                onChange={(e) => handleInputChange('expectedAnnualReturn', e.target.value)}
                step="0.1"
                min="2"
                max="15"
                className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
            </div>
          </div>
        </div>

        {/* P5: 每月净投入 */}
        <div id="cockpit-monthlyInvestment" className="transition-all duration-300 rounded-lg p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('fire.cockpit.monthly.investment')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t('fire.cockpit.monthly.investment.description')}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={params.monthlyInvestment}
              onChange={(e) => handleSliderChange('monthlyInvestment', e.target.value)}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={params.monthlyInvestment}
                onChange={(e) => handleInputChange('monthlyInvestment', e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('fire.units.per.month')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部说明 */}
      <div className="mt-8 p-4 bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded-lg">
        <p className="text-sm text-orange-800 dark:text-orange-200 text-center">
          {t('fire.cockpit.magic.description')}
        </p>
      </div>
    </div>
  )
}
