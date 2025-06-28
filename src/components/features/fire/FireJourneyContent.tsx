'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/providers/LanguageContext'
import PageContainer from '@/components/ui/layout/PageContainer'
import TranslationLoader from '@/components/ui/data-display/TranslationLoader'
import { FirePageSkeleton } from '@/components/ui/data-display/page-skeletons'
import RealitySnapshot from './RealitySnapshot'
import NorthStarMetrics from './NorthStarMetrics'
import JourneyVisualization from './JourneyVisualization'
import CockpitControls from './CockpitControls'
import type { SimpleUser, SimpleCurrency } from '@/types/core'

// 本地类型定义（用于这个组件的特定需求）
interface FireUserSettings {
  fireEnabled: boolean
  fireSWR: number
  baseCurrency?: SimpleCurrency | null
}

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

interface FireData {
  realitySnapshot: {
    past12MonthsExpenses: number
    currentNetWorth: number
    historicalAnnualReturn: number
    monthlyNetInvestment: number
    cagrDetails?: CAGRDetails | null
  }
  userSettings: {
    fireEnabled: boolean
    fireSWR: number
  }
  baseCurrency: SimpleCurrency
}

interface FireJourneyContentProps {
  user: SimpleUser
  userSettings: FireUserSettings
}

export default function FireJourneyContent({
  user: _user,
  userSettings,
}: FireJourneyContentProps) {
  const { t } = useLanguage()
  const [fireData, setFireData] = useState<FireData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // FIRE 计算参数状态
  const [fireParams, setFireParams] = useState({
    retirementExpenses: 0,
    safeWithdrawalRate: userSettings.fireSWR || 4.0,
    currentInvestableAssets: 0,
    expectedAnnualReturn: 0.0,
    monthlyInvestment: 0,
  })

  useEffect(() => {
    fetchFireData()
  }, [])

  const fetchFireData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/fire/data')

      if (!response.ok) {
        throw new Error('Failed to fetch FIRE data')
      }

      const result = await response.json()
      if (result.success) {
        setFireData(result.data)

        // 初始化参数
        const newFireParams = {
          retirementExpenses: result.data.realitySnapshot.past12MonthsExpenses,
          safeWithdrawalRate: result.data.userSettings.fireSWR,
          currentInvestableAssets: result.data.realitySnapshot.currentNetWorth,
          expectedAnnualReturn:
            result.data.realitySnapshot.historicalAnnualReturn,
          monthlyInvestment: result.data.realitySnapshot.monthlyNetInvestment,
        }



        setFireParams(newFireParams)
      } else {
        setError(result.message || 'Failed to load FIRE data')
      }
    } catch (err) {
      console.error('Error fetching FIRE data:', err)
      setError(t('fire.error.calculation.failed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleParamChange = (param: string, value: number) => {
    setFireParams(prev => ({
      ...prev,
      [param]: value,
    }))
  }

  if (isLoading) {
    return <FirePageSkeleton />
  }

  if (error) {
    return (
      <PageContainer title={t('fire.title')} subtitle={t('fire.subtitle')}>
        <div className='bg-red-50 border border-red-200 rounded-lg p-6 text-center'>
          <div className='text-red-600 mb-2'>
            <svg
              className='w-12 h-12 mx-auto'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-medium text-red-800 mb-2'>
            {t('fire.error.calculation.failed')}
          </h3>
          <p className='text-red-600 mb-4'>{error}</p>
          <button
            onClick={fetchFireData}
            className='bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors'
          >
            {t('common.retry')}
          </button>
        </div>
      </PageContainer>
    )
  }

  if (!fireData) {
    return (
      <PageContainer title={t('fire.title')} subtitle={t('fire.subtitle')}>
        <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center'>
          <div className='text-yellow-600 mb-2'>
            <svg
              className='w-12 h-12 mx-auto'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-medium text-yellow-800 mb-2'>
            {t('fire.error.no.data')}
          </h3>
          <p className='text-yellow-600'>{t('fire.error.invalid.settings')}</p>
        </div>
      </PageContainer>
    )
  }

  return (
    <TranslationLoader fallback={<FirePageSkeleton />}>
      <PageContainer title={t('fire.title')} subtitle={t('fire.subtitle')}>
        <div className='space-y-8'>
          {/* 第零部分: 现实快照 */}
          <RealitySnapshot
            data={fireData.realitySnapshot}
            currency={fireData.baseCurrency}
            onCalibrate={handleParamChange}
          />

          {/* 第一部分: 核心指标 */}
          <NorthStarMetrics
            params={fireParams}
            currency={fireData.baseCurrency}
          />

          {/* 第二部分: 可视化预测图表 */}
          <JourneyVisualization
            params={fireParams}
            currency={fireData.baseCurrency}
          />

          {/* 第三部分: 未来掌控面板 */}
          <CockpitControls
            params={fireParams}
            currency={fireData.baseCurrency}
            onChange={handleParamChange}
          />
        </div>
      </PageContainer>
    </TranslationLoader>
  )
}
