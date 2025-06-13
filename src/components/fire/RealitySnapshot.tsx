'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { formatCurrency } from '@/lib/utils'

interface RealitySnapshotData {
  past12MonthsExpenses: number
  currentNetWorth: number
  historicalAnnualReturn: number
  monthlyNetInvestment: number
}

interface Currency {
  code: string
  symbol: string
  name: string
}

interface RealitySnapshotProps {
  data: RealitySnapshotData
  currency: Currency
  onCalibrate: (param: string, value: number) => void
}

export default function RealitySnapshot({ data, currency, onCalibrate }: RealitySnapshotProps) {
  const { t } = useLanguage()

  const handleCalibrate = (param: string) => {
    // 滚动到对应的控制面板参数
    const element = document.getElementById(`cockpit-${param}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // 添加高亮效果
      element.classList.add('ring-2', 'ring-orange-500', 'ring-opacity-50')
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-orange-500', 'ring-opacity-50')
      }, 2000)
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      {/* 标题 */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          {t('fire.reality.snapshot.title')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('fire.reality.snapshot.subtitle')}
        </p>
      </div>

      {/* 数据卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 过去12个月总开销 */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('fire.reality.snapshot.past12months.expenses')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              (P1来源)
            </p>
          </div>
          
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(data.past12MonthsExpenses, currency.code)}
            </div>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t('fire.reality.snapshot.expenses.source')}
          </div>
          
          <button
            onClick={() => handleCalibrate('retirementExpenses')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            {t('fire.reality.snapshot.calibrate')} &gt;
          </button>
        </div>

        {/* 当前净资产 */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('fire.reality.snapshot.current.net.worth')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              (P3来源)
            </p>
          </div>
          
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(data.currentNetWorth, currency.code)}
            </div>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t('fire.reality.snapshot.networth.source')}
          </div>
          
          <button
            onClick={() => handleCalibrate('currentInvestableAssets')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            {t('fire.reality.snapshot.calibrate')} &gt;
          </button>
        </div>

        {/* 历史年化回报率 */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('fire.reality.snapshot.historical.return')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              (P4来源)
            </p>
          </div>
          
          <div className="mb-3">
            <div className={`text-2xl font-bold ${
              data.historicalAnnualReturn >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {data.historicalAnnualReturn >= 0 ? '+' : ''}{data.historicalAnnualReturn.toFixed(1)}%
            </div>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t('fire.reality.snapshot.return.source')}
          </div>
          
          <button
            onClick={() => handleCalibrate('expectedAnnualReturn')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            {t('fire.reality.snapshot.calibrate')} &gt;
          </button>
        </div>
      </div>
    </div>
  )
}
