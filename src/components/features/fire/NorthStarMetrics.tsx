'use client'

import { useLanguage } from '@/contexts/providers/LanguageContext'
import { useUserCurrencyFormatter } from '@/hooks/useUserCurrencyFormatter'
import type { SimpleCurrency, FireParams } from '@/types/core'

interface NorthStarMetricsProps {
  params: FireParams
  currency: SimpleCurrency
}

export default function NorthStarMetrics({
  params,
  currency,
}: NorthStarMetricsProps) {
  const { t } = useLanguage()
  const { formatCurrency } = useUserCurrencyFormatter()

  // FIRE 计算逻辑
  const fireTargetAmount =
    params.retirementExpenses / (params.safeWithdrawalRate / 100)

  // 计算 FIRE 日期 (使用 NPER 函数逻辑)
  const monthlyRate = params.expectedAnnualReturn / 100 / 12
  const monthlyPayment = params.monthlyInvestment
  const presentValue = -params.currentInvestableAssets // 必须为负数
  const futureValue = fireTargetAmount

  let monthsToFire = 0
  if (monthlyRate > 0 && monthlyPayment > 0) {
    // NPER 计算公式
    const numerator = Math.log(
      (futureValue * monthlyRate + monthlyPayment) /
        (presentValue * monthlyRate + monthlyPayment)
    )
    const denominator = Math.log(1 + monthlyRate)
    monthsToFire = numerator / denominator
  }

  const fireDate = new Date()
  fireDate.setMonth(fireDate.getMonth() + monthsToFire)

  const yearsToFire = Math.floor(monthsToFire / 12)
  const remainingMonths = Math.floor(monthsToFire % 12)

  // 当前进度
  const currentProgress =
    (params.currentInvestableAssets / fireTargetAmount) * 100

  // 退休后月薪
  const retirementMonthlySalary = params.retirementExpenses / 12

  return (
    <div className='bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6'>
      {/* 标题 */}
      <div className='mb-8 text-center'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
          {t('fire.north.star.title')}
        </h2>
        <p className='text-gray-600 dark:text-gray-400'>
          {t('fire.north.star.subtitle')}
        </p>
      </div>

      {/* 2x2 网格布局 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* FIRE 目标金额 */}
        <div className='bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-6 text-center'>
          <h3 className='text-lg font-medium text-blue-800 dark:text-blue-200 mb-2'>
            {t('fire.north.star.fire.target')}
          </h3>
          <div className='text-4xl font-bold text-blue-900 dark:text-blue-100 mb-2'>
            {formatCurrency(fireTargetAmount, currency.code)}
          </div>
          <p className='text-sm text-blue-700 dark:text-blue-300'>
            {t('fire.north.star.fire.target.description')}
          </p>
        </div>

        {/* 预计 FIRE 日期 */}
        <div className='bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg p-6 text-center relative overflow-hidden'>
          <h3 className='text-lg font-medium text-orange-800 dark:text-orange-200 mb-2'>
            {t('fire.north.star.fire.date')}
          </h3>
          <div className='text-4xl font-bold text-orange-900 dark:text-orange-100 mb-2 animate-pulse'>
            {t('fire.north.star.fire.date.format', {
              year: fireDate.getFullYear(),
              month: fireDate.getMonth() + 1,
            })}
          </div>
          <p className='text-sm text-orange-700 dark:text-orange-300'>
            {t('fire.north.star.fire.date.description', {
              years: yearsToFire,
              months: remainingMonths,
            })}
          </p>
          {/* 呼吸灯效果 */}
          <div className='absolute inset-0 bg-orange-200 dark:bg-orange-700 opacity-20 animate-ping rounded-lg'></div>
        </div>

        {/* 当前进度 */}
        <div className='bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-6 text-center'>
          <h3 className='text-lg font-medium text-green-800 dark:text-green-200 mb-4'>
            {t('fire.north.star.current.progress')}
          </h3>

          {/* 环形进度条 */}
          <div className='relative w-32 h-32 mx-auto mb-4'>
            <svg
              className='w-32 h-32 transform -rotate-90'
              viewBox='0 0 120 120'
            >
              {/* 背景圆环 */}
              <circle
                cx='60'
                cy='60'
                r='50'
                stroke='currentColor'
                strokeWidth='8'
                fill='none'
                className='text-green-200 dark:text-green-700'
              />
              {/* 进度圆环 */}
              <circle
                cx='60'
                cy='60'
                r='50'
                stroke='currentColor'
                strokeWidth='8'
                fill='none'
                strokeLinecap='round'
                className='text-green-600 dark:text-green-400'
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - currentProgress / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              />
            </svg>
            {/* 中心文字 */}
            <div className='absolute inset-0 flex items-center justify-center'>
              <span className='text-2xl font-bold text-green-900 dark:text-green-100'>
                {currentProgress.toFixed(0)}%
              </span>
            </div>
          </div>

          <p className='text-sm text-green-700 dark:text-green-300'>
            {t('fire.north.star.current.progress.description', {
              amount: formatCurrency(
                params.currentInvestableAssets,
                currency.code
              ),
            })}
          </p>
        </div>

        {/* 退休后的"月薪" */}
        <div className='bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-6 text-center'>
          <h3 className='text-lg font-medium text-purple-800 dark:text-purple-200 mb-2'>
            {t('fire.north.star.retirement.income')}
          </h3>
          <div className='text-4xl font-bold text-purple-900 dark:text-purple-100 mb-2'>
            {formatCurrency(retirementMonthlySalary, currency.code)}
            <span className='text-lg font-normal'>
              {t('fire.units.per.month')}
            </span>
          </div>
          <p className='text-sm text-purple-700 dark:text-purple-300'>
            {t('fire.north.star.retirement.income.description')}
          </p>
        </div>
      </div>
    </div>
  )
}
