'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import { useUserDateFormatter } from '@/hooks/useUserDateFormatter'
import type { SimpleCurrency } from '@/types/core'

// 本地类型定义（用于这个组件的特定需求）
interface CAGRDetails {
  startDate: string
  endDate: string
  years: number
  initialNetWorth: number
  currentNetWorth: number
  totalNetContribution: number
  adjustedGrowth: number
  message: string
}

interface RealitySnapshotData {
  past12MonthsExpenses: number
  currentNetWorth: number
  historicalAnnualReturn: number
  monthlyNetInvestment: number
  cagrDetails?: CAGRDetails | null
}

interface RealitySnapshotProps {
  data: RealitySnapshotData
  currency: SimpleCurrency
  onCalibrate: (param: string, value: number) => void
}

export default function RealitySnapshot({
  data,
  currency,
  onCalibrate: _onCalibrate,
}: RealitySnapshotProps) {
  const { t } = useLanguage()
  const { formatCurrency } = useUserCurrencyFormatter()
  const { formatDate } = useUserDateFormatter()

  const handleCalibrate = (param: string) => {
    // 滚动到对应的控制面板参数
    const element = document.getElementById(`cockpit-${param}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // 添加和谐的高亮效果
      element.classList.add(
        // 柔和的边框效果
        'ring-2',
        'ring-orange-300/60',
        'dark:ring-orange-400/50',
        // 圆润的阴影
        'shadow-xl',
        'shadow-orange-100/80',
        'dark:shadow-orange-900/40',
        // 柔和的背景光晕
        'bg-gradient-to-r',
        'from-orange-50/30',
        'to-amber-50/30',
        'dark:from-orange-900/10',
        'dark:to-amber-900/10',
        // 增加内边距
        'p-4',
        // 平滑的动画
        'transition-all',
        'duration-700',
        'ease-out',
        // 轻微的缩放
        'transform',
        'scale-[1.02]',
        // 增加圆角
        'rounded-lg'
      )

      // 添加脉冲动画效果
      const pulseInterval = setInterval(() => {
        element.classList.toggle('ring-orange-300/60')
        element.classList.toggle('ring-orange-200/40')
        element.classList.toggle('dark:ring-orange-400/50')
        element.classList.toggle('dark:ring-orange-300/30')
      }, 800)

      setTimeout(() => {
        clearInterval(pulseInterval)
        element.classList.remove(
          'ring-2',
          'ring-orange-300/60',
          'ring-orange-200/40',
          'dark:ring-orange-400/50',
          'dark:ring-orange-300/30',
          'shadow-xl',
          'shadow-orange-100/80',
          'dark:shadow-orange-900/40',
          'bg-gradient-to-r',
          'from-orange-50/30',
          'to-amber-50/30',
          'dark:from-orange-900/10',
          'dark:to-amber-900/10',
          'p-4',
          'transition-all',
          'duration-700',
          'ease-out',
          'transform',
          'scale-[1.02]',
          'rounded-lg'
        )
      }, 3500)
    }
  }

  return (
    <div className='bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6'>
      {/* 标题 */}
      <div className='mb-6'>
        <h2 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
          {t('fire.reality.snapshot.title')}
        </h2>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          {t('fire.reality.snapshot.subtitle')}
        </p>
      </div>

      {/* 数据卡片网格 */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {/* 过去12个月总开销 */}
        <div className='bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col'>
          <div className='mb-3'>
            <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              {t('fire.reality.snapshot.past12months.expenses')}
            </h3>
            {/* <p className='text-xs text-gray-500 dark:text-gray-400'>
              ({t('fire.reality.snapshot.p1.source')})
            </p> */}
          </div>

          <div className='mb-3'>
            <div className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {formatCurrency(data.past12MonthsExpenses, currency.code)}
            </div>

            {/* 月平均开销 - 与CAGR样式统一 */}
            <div className='mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50'>
              <div className='flex items-center justify-between text-xs'>
                <span className='text-gray-600 dark:text-gray-400 font-medium'>
                  {t('fire.reality.snapshot.monthly.average')}
                </span>
                <span className='text-gray-800 dark:text-gray-200 font-mono font-semibold'>
                  {formatCurrency(data.past12MonthsExpenses / 12, currency.code)}
                  <span className='text-gray-500 dark:text-gray-400 font-normal ml-1'>
                    {t('fire.units.per.month')}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className='text-xs text-gray-500 dark:text-gray-400 mb-4 flex-grow'>
            {t('fire.reality.snapshot.expenses.source')}
          </div>

          <div className='flex justify-end mt-auto'>
            <button
              onClick={() => handleCalibrate('retirementExpenses')}
              className='inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md transition-all duration-200 hover:shadow-sm'
            >
              <span>{t('fire.reality.snapshot.calibrate')}</span>
              <svg
                className='w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 当前净资产 */}
        <div className='bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col'>
          <div className='mb-3'>
            <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              {t('fire.reality.snapshot.current.net.worth')}
            </h3>
            {/* <p className='text-xs text-gray-500 dark:text-gray-400'>
              ({t('fire.reality.snapshot.p3.source')})
            </p> */}
          </div>

          <div className='mb-3'>
            <div className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {formatCurrency(data.currentNetWorth, currency.code)}
            </div>
          </div>

          <div className='text-xs text-gray-500 dark:text-gray-400 mb-4 flex-grow'>
            {t('fire.reality.snapshot.networth.source')}
          </div>

          <div className='flex justify-end mt-auto'>
            <button
              onClick={() => handleCalibrate('currentInvestableAssets')}
              className='inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md transition-all duration-200 hover:shadow-sm'
            >
              <span>{t('fire.reality.snapshot.calibrate')}</span>
              <svg
                className='w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 历史年化回报率 (CAGR) */}
        <div className='bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col'>
          <div className='mb-3'>
            <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              {t('fire.reality.snapshot.historical.return')}
              {/* <span className='text-xs text-gray-500 dark:text-gray-400 ml-1'>(CAGR)</span> */}
            </h3>
          </div>

          <div className='mb-3'>
            <div
              className={`text-2xl font-bold ${
                data.historicalAnnualReturn >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {data.historicalAnnualReturn >= 0 ? '+' : ''}
              {data.historicalAnnualReturn.toFixed(1)}%
            </div>

            {/* CAGR详细信息 */}
            {data.cagrDetails && (
              <div className='mt-2 p-2  bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50'>
                <div className='grid grid-cols-1 gap-1.5 text-xs'>
                  {/* 计算期间 */}
                  <div className='flex items-center justify-between'>
                    <span className='text-gray-600 dark:text-gray-400 font-medium'>
                      {t('fire.reality.snapshot.cagr.period')}
                    </span>
                    <span className='text-gray-800 dark:text-gray-200 font-mono'>
                      {formatDate(new Date(data.cagrDetails.startDate))} {t('fire.reality.snapshot.cagr.to.now')}
                    </span>
                  </div>

                  {/* 历史年数 */}
                  <div className='flex items-center justify-between'>
                    <span className='text-gray-600 dark:text-gray-400 font-medium'>
                      {t('fire.reality.snapshot.cagr.history')}
                    </span>
                    <span className='text-gray-800 dark:text-gray-200 font-mono'>
                      {data.cagrDetails.years.toFixed(1)}{t('fire.units.years')}
                    </span>
                  </div>

                  {/* 分隔线 */}
                  <div className='border-t border-gray-200 dark:border-gray-600 my-1'></div>

                  {/* 初始净资产 */}
                  <div className='flex items-center justify-between'>
                    <span className='text-gray-600 dark:text-gray-400 font-medium'>
                      {t('fire.reality.snapshot.cagr.initial.net.worth')}
                    </span>
                    <span className='text-gray-800 dark:text-gray-200 font-mono font-semibold'>
                      {formatCurrency(data.cagrDetails.initialNetWorth, currency.code)}
                    </span>
                  </div>

                  {/* 投资增值 */}
                  <div className='flex items-center justify-between'>
                    <span className='text-gray-600 dark:text-gray-400 font-medium'>
                      {t('fire.reality.snapshot.cagr.investment.growth')}
                    </span>
                    <span className='text-green-600 dark:text-green-400 font-mono font-semibold'>
                      +{formatCurrency(data.cagrDetails.adjustedGrowth, currency.code)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className='text-xs text-gray-500 dark:text-gray-400 mb-4 flex-grow'>
            {data.cagrDetails
              ? t('fire.reality.snapshot.cagr.description')
              : t('fire.reality.snapshot.return.source')
            }
          </div>

          <div className='flex justify-end mt-auto'>
            <button
              onClick={() => handleCalibrate('expectedAnnualReturn')}
              className='inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md transition-all duration-200 hover:shadow-sm'
            >
              <span>{t('fire.reality.snapshot.calibrate')}</span>
              <svg
                className='w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 每月净投入 */}
        <div className='bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col'>
          <div className='mb-3'>
            <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              {t('fire.reality.snapshot.monthly.net.investment')}
            </h3>
          </div>

          <div className='mb-3'>
            <div className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              {formatCurrency(data.monthlyNetInvestment, currency.code)}
            </div>
          </div>

          <div className='text-xs text-gray-500 dark:text-gray-400 mb-4 flex-grow'>
            {t('fire.reality.snapshot.investment.source')}
          </div>

          <div className='flex justify-end mt-auto'>
            <button
              onClick={() => handleCalibrate('monthlyInvestment')}
              className='inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md transition-all duration-200 hover:shadow-sm'
            >
              <span>{t('fire.reality.snapshot.calibrate')}</span>
              <svg
                className='w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
