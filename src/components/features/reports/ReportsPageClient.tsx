'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/data-display/card'
import { AlertTriangle } from 'lucide-react'
import BalanceSheetCard from './BalanceSheetCard'
import CashFlowCard from './CashFlowCard'
import PageContainer from '@/components/ui/layout/PageContainer'
import TranslationLoader from '@/components/ui/data-display/TranslationLoader'
import { ReportsSkeleton } from '@/components/ui/data-display/page-skeletons'
import { useLanguage } from '@/contexts/providers/LanguageContext'

type ReportTab = 'balance-sheet' | 'cash-flow'

export default function ReportsPageClient() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<ReportTab>('balance-sheet')

  return (
    <TranslationLoader fallback={<ReportsSkeleton />}>
      <PageContainer
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
      >
        {/* 标签页导航 */}
        <div className='mb-6'>
          <div className='inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700'>
            <button
              onClick={() => setActiveTab('balance-sheet')}
              className={`
                relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md
                transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2
                focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800
                ${
                  activeTab === 'balance-sheet'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }
              `}
              aria-current={activeTab === 'balance-sheet' ? 'page' : undefined}
            >
              {t('reports.balance.sheet.title')}
            </button>
            <button
              onClick={() => setActiveTab('cash-flow')}
              className={`
                relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md
                transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2
                focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800
                ${
                  activeTab === 'cash-flow'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }
              `}
              aria-current={activeTab === 'cash-flow' ? 'page' : undefined}
            >
              {t('reports.cash.flow.title')}
            </button>
          </div>
        </div>

        {/* 报表内容 */}
        <div className='space-y-6'>
          {activeTab === 'balance-sheet' && <BalanceSheetCard />}
          {activeTab === 'cash-flow' && <CashFlowCard />}
        </div>

        {/* 账户类型设置提醒 */}
        <Card className='border-amber-200 bg-amber-50 mt-4'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-amber-700'>
              <AlertTriangle className='h-5 w-5' />
              {t('reports.important.reminder')}
            </CardTitle>
          </CardHeader>
          <CardContent className='text-amber-700'>
            <div className='space-y-2 text-sm'>
              <p>{t('reports.account.type.setup.message')}</p>
              <ul className='list-disc list-inside ml-4 space-y-1'>
                <li>
                  <strong>{t('reports.asset.type')}</strong>：
                  {t('reports.asset.type.examples')}
                </li>
                <li>
                  <strong>{t('reports.liability.type')}</strong>：
                  {t('reports.liability.type.examples')}
                </li>
                <li>
                  <strong>{t('reports.income.type')}</strong>：
                  {t('reports.income.type.examples')}
                </li>
                <li>
                  <strong>{t('reports.expense.type')}</strong>：
                  {t('reports.expense.type.examples')}
                </li>
              </ul>
              <p className='mt-2'>{t('reports.category.type.reminder')}</p>
            </div>
          </CardContent>
        </Card>

        {/* 使用说明 */}
        {/* <Card className='mt-4'>
          <CardHeader>
            <CardTitle>{t('reports.usage.instructions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 text-xs sm:text-sm'>
              <div>
                <h4 className='font-semibold mb-2'>
                  {t('reports.balance.sheet.tips')}
                </h4>
                <ul className='space-y-1 text-gray-600'>
                  <li>• {t('reports.balance.sheet.tip.1')}</li>
                  <li>• {t('reports.balance.sheet.tip.2')}</li>
                  <li>• {t('reports.balance.sheet.tip.3')}</li>
                  <li>• {t('reports.balance.sheet.tip.4')}</li>
                </ul>
              </div>
              <div>
                <h4 className='font-semibold mb-2'>
                  {t('reports.cash.flow.tips')}
                </h4>
                <ul className='space-y-1 text-gray-600'>
                  <li>• {t('reports.cash.flow.tip.1')}</li>
                  <li>• {t('reports.cash.flow.tip.2')}</li>
                  <li>• {t('reports.cash.flow.tip.3')}</li>
                  <li>• {t('reports.cash.flow.tip.4')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </PageContainer>
    </TranslationLoader>
  )
}
